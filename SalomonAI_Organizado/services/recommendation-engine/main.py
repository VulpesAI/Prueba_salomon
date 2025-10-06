import asyncio
import base64
import binascii
import hashlib
import json
import logging
import time
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timedelta, timezone
from statistics import pstdev
from typing import Any, Callable, Dict, Iterable, List, Optional, Protocol, Set, Tuple
from uuid import UUID, uuid4

from typing import TYPE_CHECKING

try:  # pragma: no cover - dependency may be optional in some environments
    import asyncpg
except ImportError:  # pragma: no cover
    asyncpg = None  # type: ignore[assignment]

if TYPE_CHECKING:  # pragma: no cover - used only for static typing
    from asyncpg import Pool as AsyncPGPool
else:
    AsyncPGPool = Any
import httpx
import numpy as np
from fastapi import Body, FastAPI, Header, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

from prometheus_client import Counter, Gauge, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from .settings import get_settings

settings = get_settings()
logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
logger = logging.getLogger("recommendation-engine")


metrics_instrumentator = Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    should_instrument_requests_inprogress=True,
)

PIPELINE_RUNS = Counter(
    "recommendation_engine_pipeline_runs_total",
    "Ejecuciones del pipeline de recomendaciones",
    labelnames=("status",),
)
PIPELINE_RUN_DURATION = Histogram(
    "recommendation_engine_pipeline_duration_seconds",
    "Duración de cada ejecución del pipeline",
    buckets=(1, 5, 10, 30, 60, 120, 300, 600),
)
TRANSACTIONS_INGESTED = Counter(
    "recommendation_engine_transactions_ingested_total",
    "Total de transacciones ingeridas por el pipeline",
)
TRANSACTIONS_SKIPPED = Counter(
    "recommendation_engine_transactions_skipped_total",
    "Total de transacciones omitidas durante la ingesta",
)
INGEST_DURATION = Histogram(
    "recommendation_engine_ingest_duration_seconds",
    "Duración de cada ingesta de transacciones",
    buckets=(0.5, 1, 2, 5, 10, 30, 60),
)
FEATURES_UPDATED = Counter(
    "recommendation_engine_features_updated_total",
    "Número de features recalculadas por ejecución",
)
USERS_TRACKED = Gauge(
    "recommendation_engine_users_tracked",
    "Usuarios con features almacenadas en memoria",
)
RECOMMENDATIONS_SERVED = Counter(
    "recommendation_engine_recommendations_served_total",
    "Recomendaciones entregadas a los consumidores",
    labelnames=("endpoint",),
)
FEEDBACK_SUBMISSIONS = Counter(
    "recommendation_engine_feedback_submissions_total",
    "Cantidad de feedback recibido",
    labelnames=("has_comment",),
)
FEEDBACK_SCORE = Histogram(
    "recommendation_engine_feedback_score",
    "Distribución de los puntajes de feedback",
    buckets=(0.2, 0.4, 0.6, 0.8, 1.0),
)
PIPELINE_REFRESH_INTERVAL = Gauge(
    "recommendation_engine_pipeline_refresh_seconds",
    "Intervalo configurado para ejecutar el pipeline",
)

def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def parse_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def hash_identifier(value: Optional[str]) -> str:
    if not value:
        return "anon"
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    return digest[:12]


def _decode_jwt_payload(token: str) -> Dict[str, Any]:
    parts = token.split(".")
    if len(parts) < 2:
        raise ValueError("invalid_token")
    payload_segment = parts[1]
    padding = "=" * (-len(payload_segment) % 4)
    try:
        decoded = base64.urlsafe_b64decode(payload_segment + padding)
    except (binascii.Error, ValueError) as error:
        raise ValueError("invalid_token") from error
    try:
        payload: Any = json.loads(decoded.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("invalid_token") from error
    if not isinstance(payload, dict):
        raise ValueError("invalid_token")
    return payload


def _authorize_recommendations_request(
    authorization: str,
    user_id: str,
    *,
    required_scope: str = "recs:read",
) -> None:
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_authorization")

    try:
        payload = _decode_jwt_payload(token.strip())
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token") from None

    exp = payload.get("exp")
    if isinstance(exp, (int, float)):
        expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
        if expires_at < utcnow():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token_expired")

    scopes_raw = payload.get("scope") or payload.get("scopes") or payload.get("permissions")
    if isinstance(scopes_raw, str):
        scopes = {scope.strip().lower() for scope in scopes_raw.split() if scope.strip()}
    elif isinstance(scopes_raw, (list, tuple, set)):
        scopes = {str(scope).strip().lower() for scope in scopes_raw if scope}
    else:
        scopes = set()

    subject = str(payload.get("sub") or payload.get("user_id") or payload.get("uid") or "")
    required = required_scope.lower()
    if required and required in scopes:
        return

    alternative_scopes = {
        "recs:read": {"recs:write", "recs:admin", "service:recommendations", "service:recs"},
        "recs:write": {"recs:admin", "service:recommendations", "service:recs"},
    }
    if any(scope in scopes for scope in alternative_scopes.get(required, set())):
        return

    if subject and subject == user_id:
        return

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")


def _rule_identifier(user_id: str, rule_key: str, as_of_date: date) -> str:
    raw = f"{user_id}:{rule_key}:{as_of_date.isoformat()}".encode("utf-8")
    return hashlib.sha1(raw).hexdigest()


def _allowed_feedback_scores(mode: str) -> Set[int]:
    normalized = mode.lower()
    if normalized == "five_star":
        return {0, 1, 2, 3, 4, 5}
    return {-1, 0, 1}


def validate_feedback_score(score: Optional[int], mode: str) -> bool:
    if score is None:
        return True
    return score in _allowed_feedback_scores(mode)


def normalize_score_for_metrics(score: Optional[int], mode: str) -> Optional[float]:
    if score is None:
        return None
    if mode == "five_star":
        return max(min(score, 5), 0) / 5.0
    return (score + 1) / 2.0


def sanitize_feedback_comment(comment: Optional[str]) -> Optional[str]:
    if comment is None:
        return None
    cleaned = "".join(ch if ch.isprintable() or ch in "\n\r\t" else " " for ch in comment)
    cleaned = cleaned.strip()
    if not cleaned:
        return None
    if len(cleaned) > 1000:
        raise ValueError("comment_too_long")
    return cleaned


class UnauthorizedError(RuntimeError):
    """Señala que el Core API rechazó las credenciales."""


class APINotFoundError(RuntimeError):
    """Señala que el endpoint remoto no está disponible."""


@dataclass
class UserFeatures:
    user_id: str
    total_income: float
    total_expenses: float
    net_cash_flow: float
    average_transaction: float
    discretionary_ratio: float
    essential_ratio: float
    savings_rate: float
    top_category: Optional[str]
    category_totals: Dict[str, float]
    category_shares: Dict[str, float]
    merchant_diversity: int
    recurring_flags: Dict[str, bool]
    volatility_expense: float
    transaction_count: int
    last_transaction_at: Optional[datetime]
    updated_at: datetime
    window: str = "90d"
    run_id: Optional[str] = None


@dataclass
class RecommendationRecord:
    id: str
    user_id: str
    title: str
    description: str
    score: float
    category: str
    explanation: str
    generated_at: datetime
    cluster: Optional[int] = None
    source: str = "rules"
    priority: int = 5
    valid_from: datetime = field(default_factory=utcnow)
    valid_to: Optional[datetime] = None
    payload: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FeedbackEntry:
    id: str
    user_id: str
    recommendation_id: Optional[str]
    score: Optional[int]
    comment: Optional[str]
    rule_key: Optional[str]
    cluster_id: Optional[int]
    model_version: Optional[str]
    run_id: Optional[str]
    client_submission_id: Optional[str]
    created_at: datetime
    backend: str = "memory"


@dataclass
class WindowedUserFeatures:
    id: str
    run_id: str
    user_id: str
    as_of_date: date
    window: str
    income_total: float
    expense_total: float
    net_cashflow: float
    savings_rate: float
    top_category: Optional[str]
    category_shares: Dict[str, float]
    merchant_diversity: int
    recurring_flags: Dict[str, bool]
    volatility_expense: float
    updated_at: datetime


@dataclass
class ClusterTrainingResult:
    model_version: str
    run_id: str
    k: int
    scaler: StandardScaler
    centroids: List[List[float]]
    assignments: Dict[str, int]
    trained_at: datetime
    silhouette: Optional[float]
    profiles: Dict[int, Dict[str, float]]


@dataclass
class NormalizedTransaction:
    id: str
    user_id: str
    amount: float
    currency: str
    date: datetime
    category: str
    subcategory: Optional[str]
    description: Optional[str]
    merchant: Optional[str]
    updated_at: datetime
    internal_category: str
    confidence_score: Optional[float]
    raw: Dict[str, Any]
    ingested_at: datetime = field(default_factory=utcnow)

    def to_record(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "amount": self.amount,
            "currency": self.currency,
            "date": ensure_utc(self.date),
            "category": self.category,
            "subcategory": self.subcategory,
            "description": self.description,
            "merchant": self.merchant,
            "internal_category": self.internal_category,
            "confidence_score": self.confidence_score,
            "updated_at": ensure_utc(self.updated_at),
            "ingested_at": ensure_utc(self.ingested_at),
            "raw_payload": json.dumps(self.raw, default=str),
        }

    def to_feature_payload(self) -> Dict[str, Any]:
        timestamp = ensure_utc(self.date).isoformat()
        return {
            "user_id": self.user_id,
            "amount": self.amount,
            "category": self.internal_category or self.category,
            "subcategory": self.subcategory,
            "description": self.description,
            "currency": self.currency,
            "merchant": self.merchant,
            "timestamp": timestamp,
            "transaction_date": timestamp,
            "updated_at": ensure_utc(self.updated_at).isoformat(),
        }


class TransactionNormalizer:
    category_mapping: Dict[str, Tuple[str, float]] = {
        "groceries": ("essential_spending", 0.9),
        "supermercado": ("essential_spending", 0.85),
        "supermarket": ("essential_spending", 0.85),
        "food": ("essential_spending", 0.8),
        "restaurante": ("dining", 0.8),
        "restaurants": ("dining", 0.8),
        "entertainment": ("leisure", 0.7),
        "entretenimiento": ("leisure", 0.7),
        "travel": ("travel", 0.75),
        "viajes": ("travel", 0.75),
        "transport": ("transportation", 0.8),
        "transporte": ("transportation", 0.8),
        "debt payments": ("debt_obligations", 0.9),
        "debt": ("debt_obligations", 0.9),
        "utilities": ("utilities", 0.85),
        "servicios": ("utilities", 0.85),
        "income": ("income", 0.95),
        "salary": ("income", 0.95),
        "sueldo": ("income", 0.95),
        "ahorro": ("savings", 0.8),
        "savings": ("savings", 0.8),
    }

    def __init__(self, fallback_category: str = "otros") -> None:
        self.fallback_category = fallback_category

    def normalize_many(self, transactions: List[Dict[str, Any]]) -> Tuple[List[NormalizedTransaction], int]:
        normalized: List[NormalizedTransaction] = []
        skipped = 0
        for raw in transactions:
            try:
                result = self.normalize(raw)
            except ValueError as error:
                masked_user = hash_identifier(str(raw.get("user_id") or raw.get("userId")))
                logger.warning(
                    "Transacción descartada por error de normalización: %s", error, extra={"user": masked_user}
                )
                skipped += 1
                continue
            if result is not None:
                normalized.append(result)
            else:
                skipped += 1
        return normalized, skipped

    def normalize(self, data: Dict[str, Any]) -> Optional[NormalizedTransaction]:
        transaction_id = str(data.get("id") or data.get("transaction_id") or data.get("external_id") or "").strip()
        if not transaction_id:
            raise ValueError("id es obligatorio")

        user_id = str(data.get("user_id") or data.get("userId") or "").strip()
        if not user_id:
            raise ValueError("user_id es obligatorio")

        amount_value = data.get("amount")
        try:
            amount = float(amount_value)
        except (TypeError, ValueError):
            raise ValueError("amount inválido")

        currency_raw = str(data.get("currency") or data.get("currency_code") or "").strip()
        currency = currency_raw.upper() if 2 < len(currency_raw) <= 3 else currency_raw.upper()[:3] or "XXX"

        date_source = (
            data.get("date")
            or data.get("timestamp")
            or data.get("transaction_date")
            or data.get("transactionDate")
        )
        date = parse_datetime(str(date_source)) if date_source else None
        if date is None:
            raise ValueError("date inválida")

        updated_source = (
            data.get("updated_at")
            or data.get("updatedAt")
            or data.get("updated")
            or date_source
        )
        updated_at = parse_datetime(str(updated_source)) if updated_source else None
        if updated_at is None:
            raise ValueError("updated_at inválido")

        category_value = data.get("category") or data.get("subcategory") or self.fallback_category
        category = str(category_value).strip() or self.fallback_category
        normalized_category = category.lower()

        subcategory_value = data.get("subcategory") or data.get("subCategory")
        subcategory = str(subcategory_value).strip() if subcategory_value else None

        description_value = data.get("description") or data.get("concept")
        description = str(description_value).strip() if description_value else None

        merchant_value = data.get("merchant") or data.get("merchant_name")
        merchant = str(merchant_value).strip() if merchant_value else None

        internal_category, confidence = self.map_category(normalized_category, subcategory)

        return NormalizedTransaction(
            id=transaction_id,
            user_id=user_id,
            amount=round(amount, 2),
            currency=currency,
            date=ensure_utc(date),
            category=normalized_category,
            subcategory=subcategory,
            description=description,
            merchant=merchant,
            updated_at=ensure_utc(updated_at),
            internal_category=internal_category,
            confidence_score=confidence,
            raw=data,
        )

    def map_category(self, category: str, subcategory: Optional[str]) -> Tuple[str, Optional[float]]:
        lookup_key = category.lower()
        if lookup_key in self.category_mapping:
            return self.category_mapping[lookup_key]

        if subcategory:
            normalized_sub = subcategory.lower()
            if normalized_sub in self.category_mapping:
                return self.category_mapping[normalized_sub]

        if "ingres" in lookup_key:
            return "income", 0.7
        if any(token in lookup_key for token in ("loan", "credito", "deuda")):
            return "debt_obligations", 0.6
        if any(token in lookup_key for token in ("ahorro", "inversion")):
            return "savings", 0.6
        return self.fallback_category, None


class DatabaseClient:
    def __init__(self, dsn: Optional[str], min_size: int = 1, max_size: int = 5) -> None:
        self.dsn = dsn
        self.min_size = min_size
        self.max_size = max_size
        self._pool: Optional[AsyncPGPool] = None
        self._lock = asyncio.Lock()

    async def get_pool(self) -> Optional[AsyncPGPool]:
        if not self.dsn:
            return None
        if asyncpg is None:
            raise RuntimeError("asyncpg no está instalado; configure las dependencias de base de datos")
        async with self._lock:
            if self._pool is None:
                try:
                    self._pool = await asyncpg.create_pool(
                        dsn=self.dsn,
                        min_size=self.min_size,
                        max_size=self.max_size,
                    )
                    await self._ensure_schema(self._pool)
                    logger.info("Conexión a base de datos inicializada para Recommendation Engine")
                except Exception as error:  # pragma: no cover - connection errors propagate
                    logger.exception("No fue posible inicializar la conexión a la base de datos: %s", error)
                    raise
        return self._pool

    async def close(self) -> None:
        async with self._lock:
            if self._pool is not None:
                await self._pool.close()
                self._pool = None

    async def _ensure_schema(self, pool: AsyncPGPool) -> None:
        async with pool.acquire() as connection:
            await connection.execute(
                """
                CREATE TABLE IF NOT EXISTS rx_transactions_raw (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    amount NUMERIC(18,2) NOT NULL,
                    currency TEXT NOT NULL,
                    date TIMESTAMPTZ NOT NULL,
                    category TEXT NOT NULL,
                    subcategory TEXT NULL,
                    description TEXT NULL,
                    merchant TEXT NULL,
                    internal_category TEXT NOT NULL,
                    confidence_score DOUBLE PRECISION NULL,
                    updated_at TIMESTAMPTZ NOT NULL,
                    ingested_at TIMESTAMPTZ NOT NULL,
                    raw_payload JSONB NULL
                )
                """
            )
            await connection.execute(
                """
                CREATE TABLE IF NOT EXISTS rx_ingest_state (
                    user_id TEXT PRIMARY KEY,
                    last_synced_at TIMESTAMPTZ NULL,
                    last_seen_id TEXT NULL,
                    updated_at TIMESTAMPTZ NOT NULL
                )
                """
            )
            await connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_rx_transactions_raw_user_id ON rx_transactions_raw(user_id)"
            )
            await connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_rx_transactions_raw_date ON rx_transactions_raw(date)"
            )
            await connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_rx_transactions_raw_updated_at ON rx_transactions_raw(updated_at)"
            )
            await connection.execute(
                """
                CREATE TABLE IF NOT EXISTS rx_features_user_daily (
                    id UUID PRIMARY KEY,
                    run_id UUID NOT NULL,
                    user_id TEXT NOT NULL,
                    as_of_date DATE NOT NULL,
                    window TEXT NOT NULL,
                    income_total NUMERIC(18,2) NOT NULL,
                    expense_total NUMERIC(18,2) NOT NULL,
                    net_cashflow NUMERIC(18,2) NOT NULL,
                    savings_rate DOUBLE PRECISION NOT NULL,
                    top_category TEXT NULL,
                    category_shares JSONB NOT NULL,
                    merchant_diversity INTEGER NOT NULL,
                    recurring_flags JSONB NOT NULL,
                    volatility_expense DOUBLE PRECISION NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL,
                    UNIQUE (user_id, as_of_date, window)
                )
                """
            )
            await connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_rx_features_user_daily_user ON rx_features_user_daily(user_id)"
            )
            await connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_rx_features_user_daily_run ON rx_features_user_daily(run_id)"
            )
            await connection.execute(
                """
                CREATE TABLE IF NOT EXISTS rx_cluster_models (
                    id UUID PRIMARY KEY,
                    run_id UUID NOT NULL,
                    model_version TEXT UNIQUE NOT NULL,
                    k INTEGER NOT NULL,
                    scaler JSONB NOT NULL,
                    centroids JSONB NOT NULL,
                    silhouette DOUBLE PRECISION NULL,
                    trained_at TIMESTAMPTZ NOT NULL,
                    hyperparameters JSONB NOT NULL
                )
                """
            )
            await connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_rx_cluster_models_run ON rx_cluster_models(run_id)"
            )
            await connection.execute(
                """
                CREATE TABLE IF NOT EXISTS rx_user_cluster_assignments (
                    id UUID PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    model_version TEXT NOT NULL,
                    cluster_id INTEGER NOT NULL,
                    assigned_at TIMESTAMPTZ NOT NULL,
                    UNIQUE (user_id, model_version)
                )
                """
            )
            await connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_rx_user_cluster_assignments_model ON rx_user_cluster_assignments(model_version)"
            )
            await connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_rx_user_cluster_assignments_user ON rx_user_cluster_assignments(user_id)"
            )
            await connection.execute(
                """
                CREATE TABLE IF NOT EXISTS rx_recommendations_out (
                    id UUID PRIMARY KEY,
                    run_id UUID NOT NULL,
                    user_id TEXT NOT NULL,
                    source TEXT NOT NULL,
                    cluster_id INTEGER NULL,
                    payload JSONB NOT NULL,
                    priority INTEGER NOT NULL,
                    valid_from TIMESTAMPTZ NOT NULL,
                    valid_to TIMESTAMPTZ NULL,
                    created_at TIMESTAMPTZ NOT NULL
                )
                """
            )
            await connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_rx_recommendations_out_user ON rx_recommendations_out(user_id)"
            )
            await connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_rx_recommendations_out_run ON rx_recommendations_out(run_id)"
            )
            await connection.execute(
                """
                CREATE TABLE IF NOT EXISTS pipeline_runs (
                    run_id UUID PRIMARY KEY,
                    started_at TIMESTAMPTZ NOT NULL,
                    finished_at TIMESTAMPTZ NULL,
                    status TEXT NOT NULL,
                    data_origin TEXT NULL,
                    ingest_source TEXT NULL,
                    metadata JSONB NULL
                )
                """
            )
            await connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_pipeline_runs_started_at ON pipeline_runs(started_at DESC)"
            )


class DatabaseTransactionReader:
    def __init__(self, client: DatabaseClient, page_limit: int = 500) -> None:
        self.client = client
        self.page_limit = page_limit

    async def fetch(self, since: Optional[datetime]) -> List[Dict[str, Any]]:
        pool = await self.client.get_pool()
        if pool is None:
            logger.warning("Lectura directa en BD no configurada; se omite fallback")
            return []

        results: List[Dict[str, Any]] = []
        offset = 0
        since_value = ensure_utc(since) if since else None
        query = """
            SELECT
                t.id,
                s.user_id,
                t.amount,
                COALESCE(t.currency, a.currency, 'CLP') AS currency,
                COALESCE(t.posted_at, t.created_at, s.statement_date, s.period_end, NOW()) AS date,
                COALESCE(t.category, 'otros') AS category,
                NULL::text AS subcategory,
                COALESCE(t.description, t.normalized_description, t.raw_description) AS description,
                t.merchant,
                COALESCE(t.updated_at, t.created_at, s.updated_at, s.created_at, NOW()) AS updated_at
            FROM public.transactions t
            JOIN public.statements s ON s.id = t.statement_id
            LEFT JOIN public.accounts a ON a.id = s.account_id
            WHERE ($1::timestamptz IS NULL OR COALESCE(t.updated_at, t.created_at, s.updated_at, s.created_at, NOW()) > $1)
            ORDER BY COALESCE(t.updated_at, t.created_at, s.updated_at, s.created_at, NOW()), t.id
            LIMIT $2 OFFSET $3
        """

        async with pool.acquire() as connection:
            while True:
                rows = await connection.fetch(query, since_value, self.page_limit, offset)
                if not rows:
                    break
                for row in rows:
                    results.append(
                        {
                            "id": row["id"],
                            "user_id": row["user_id"],
                            "amount": float(row["amount"]),
                            "currency": row["currency"],
                            "date": ensure_utc(row["date"]).isoformat(),
                            "category": row["category"],
                            "subcategory": row["subcategory"],
                            "description": row["description"],
                            "merchant": row["merchant"],
                            "updated_at": ensure_utc(row["updated_at"]).isoformat(),
                        }
                    )
                offset += len(rows)
                if len(rows) < self.page_limit:
                    break

        if results:
            logger.info(
                "source=db mode=fallback fetched=%s since=%s", len(results), since_value.isoformat() if since_value else "none"
            )
        return results


class TransactionRepository:
    def __init__(self, client: DatabaseClient) -> None:
        self.client = client

    async def bulk_upsert(self, transactions: List[NormalizedTransaction]) -> Tuple[int, int]:
        if not transactions:
            return 0, 0

        pool = await self.client.get_pool()
        if pool is None:
            logger.warning("Persistencia deshabilitada; %s transacciones no se almacenaron", len(transactions))
            return 0, len(transactions)

        ingested = 0
        duplicates = 0
        query = """
            INSERT INTO rx_transactions_raw (
                id,
                user_id,
                amount,
                currency,
                date,
                category,
                subcategory,
                description,
                merchant,
                internal_category,
                confidence_score,
                updated_at,
                ingested_at,
                raw_payload
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
            )
            ON CONFLICT (id) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                amount = EXCLUDED.amount,
                currency = EXCLUDED.currency,
                date = EXCLUDED.date,
                category = EXCLUDED.category,
                subcategory = EXCLUDED.subcategory,
                description = EXCLUDED.description,
                merchant = EXCLUDED.merchant,
                internal_category = EXCLUDED.internal_category,
                confidence_score = EXCLUDED.confidence_score,
                updated_at = EXCLUDED.updated_at,
                ingested_at = EXCLUDED.ingested_at,
                raw_payload = EXCLUDED.raw_payload
            WHERE rx_transactions_raw.updated_at < EXCLUDED.updated_at
            RETURNING xmax = 0 AS inserted
        """

        async with pool.acquire() as connection:
            async with connection.transaction():
                for item in transactions:
                    record = item.to_record()
                    row = await connection.fetchrow(
                        query,
                        record["id"],
                        record["user_id"],
                        record["amount"],
                        record["currency"],
                        record["date"],
                        record["category"],
                        record["subcategory"],
                        record["description"],
                        record["merchant"],
                        record["internal_category"],
                        record["confidence_score"],
                        record["updated_at"],
                        record["ingested_at"],
                        record["raw_payload"],
                    )
                    if row:
                        ingested += 1
                    else:
                        duplicates += 1
        return ingested, duplicates

    async def fetch_all(self) -> List[Dict[str, Any]]:
        pool = await self.client.get_pool()
        if pool is None:
            return []
        query = """
            SELECT
                id,
                user_id,
                amount,
                currency,
                date,
                category,
                subcategory,
                description,
                merchant,
                internal_category,
                updated_at
            FROM rx_transactions_raw
        """
        async with pool.acquire() as connection:
            rows = await connection.fetch(query)
        return [
            {
                "id": row["id"],
                "user_id": row["user_id"],
                "amount": float(row["amount"]),
                "currency": row["currency"],
                "date": ensure_utc(row["date"]).isoformat(),
                "category": row["category"],
                "subcategory": row["subcategory"],
                "description": row["description"],
                "merchant": row["merchant"],
                "internal_category": row["internal_category"],
                "updated_at": ensure_utc(row["updated_at"]).isoformat(),
            }
            for row in rows
        ]


class IngestStateRepository:
    def __init__(self, client: DatabaseClient) -> None:
        self.client = client
        self._global_key = "__global__"

    async def get_global_since(self) -> Optional[datetime]:
        pool = await self.client.get_pool()
        if pool is None:
            return None
        row = await pool.fetchrow(
            "SELECT last_synced_at FROM rx_ingest_state WHERE user_id = $1",
            self._global_key,
        )
        if row and row["last_synced_at"]:
            return ensure_utc(row["last_synced_at"])
        return None

    async def snapshot(self) -> Dict[str, datetime]:
        pool = await self.client.get_pool()
        if pool is None:
            return {}
        rows = await pool.fetch(
            "SELECT user_id, last_synced_at FROM rx_ingest_state WHERE user_id <> $1",
            self._global_key,
        )
        result: Dict[str, datetime] = {}
        for row in rows:
            if row["last_synced_at"]:
                result[row["user_id"]] = ensure_utc(row["last_synced_at"])
        return result

    async def update_from_transactions(self, transactions: List[NormalizedTransaction]) -> None:
        if not transactions:
            return
        pool = await self.client.get_pool()
        if pool is None:
            return

        per_user: Dict[str, Tuple[datetime, str]] = {}
        global_state: Optional[Tuple[datetime, str]] = None
        for tx in transactions:
            updated = ensure_utc(tx.updated_at)
            current = per_user.get(tx.user_id)
            if current is None or updated > current[0] or (updated == current[0] and tx.id > current[1]):
                per_user[tx.user_id] = (updated, tx.id)
            if global_state is None or updated > global_state[0] or (updated == global_state[0] and tx.id > global_state[1]):
                global_state = (updated, tx.id)

        async with pool.acquire() as connection:
            async with connection.transaction():
                now = utcnow()
                for user_id, (last_synced, last_seen_id) in per_user.items():
                    await connection.execute(
                        """
                        INSERT INTO rx_ingest_state (user_id, last_synced_at, last_seen_id, updated_at)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (user_id) DO UPDATE SET
                            last_synced_at = GREATEST(rx_ingest_state.last_synced_at, EXCLUDED.last_synced_at),
                            last_seen_id = CASE
                                WHEN EXCLUDED.last_synced_at >= COALESCE(rx_ingest_state.last_synced_at, EXCLUDED.last_synced_at)
                                    THEN EXCLUDED.last_seen_id
                                ELSE rx_ingest_state.last_seen_id
                            END,
                            updated_at = EXCLUDED.updated_at
                        """,
                        user_id,
                        last_synced,
                        last_seen_id,
                        now,
                    )

                if global_state is not None:
                    await connection.execute(
                        """
                        INSERT INTO rx_ingest_state (user_id, last_synced_at, last_seen_id, updated_at)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (user_id) DO UPDATE SET
                            last_synced_at = GREATEST(rx_ingest_state.last_synced_at, EXCLUDED.last_synced_at),
                            last_seen_id = CASE
                                WHEN EXCLUDED.last_synced_at >= COALESCE(rx_ingest_state.last_synced_at, EXCLUDED.last_synced_at)
                                    THEN EXCLUDED.last_seen_id
                                ELSE rx_ingest_state.last_seen_id
                            END,
                            updated_at = EXCLUDED.updated_at
                        """,
                        self._global_key,
                        global_state[0],
                        global_state[1],
                        now,
                    )


class FeatureRepository:
    def __init__(self, client: DatabaseClient) -> None:
        self.client = client

    async def bulk_upsert(self, features: List[WindowedUserFeatures]) -> int:
        if not features:
            return 0
        pool = await self.client.get_pool()
        if pool is None:
            logger.warning("Persistencia deshabilitada para features; se omite guardado")
            return 0

        query = """
            INSERT INTO rx_features_user_daily (
                id,
                run_id,
                user_id,
                as_of_date,
                window,
                income_total,
                expense_total,
                net_cashflow,
                savings_rate,
                top_category,
                category_shares,
                merchant_diversity,
                recurring_flags,
                volatility_expense,
                updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
            )
            ON CONFLICT (user_id, as_of_date, window) DO UPDATE SET
                run_id = EXCLUDED.run_id,
                income_total = EXCLUDED.income_total,
                expense_total = EXCLUDED.expense_total,
                net_cashflow = EXCLUDED.net_cashflow,
                savings_rate = EXCLUDED.savings_rate,
                top_category = EXCLUDED.top_category,
                category_shares = EXCLUDED.category_shares,
                merchant_diversity = EXCLUDED.merchant_diversity,
                recurring_flags = EXCLUDED.recurring_flags,
                volatility_expense = EXCLUDED.volatility_expense,
                updated_at = EXCLUDED.updated_at
        """

        async with pool.acquire() as connection:
            async with connection.transaction():
                for feature in features:
                    await connection.execute(
                        query,
                        feature.id,
                        feature.run_id,
                        feature.user_id,
                        feature.as_of_date,
                        feature.window,
                        feature.income_total,
                        feature.expense_total,
                        feature.net_cashflow,
                        feature.savings_rate,
                        feature.top_category,
                        json.dumps(feature.category_shares),
                        feature.merchant_diversity,
                        json.dumps(feature.recurring_flags),
                        feature.volatility_expense,
                        feature.updated_at,
                    )
        return len(features)

    async def fetch_latest_for_user(
        self,
        user_id: str,
        *,
        as_of_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        pool = await self.client.get_pool()
        if pool is None:
            return []

        query = """
            SELECT
                run_id,
                user_id,
                as_of_date,
                window,
                income_total,
                expense_total,
                net_cashflow,
                savings_rate,
                top_category,
                category_shares,
                merchant_diversity,
                recurring_flags,
                volatility_expense,
                updated_at
            FROM rx_features_user_daily
            WHERE user_id = $1
              AND ($2::date IS NULL OR as_of_date <= $2)
            ORDER BY as_of_date DESC, updated_at DESC
        """

        async with pool.acquire() as connection:
            rows = await connection.fetch(query, user_id, as_of_date)

        snapshots: List[Dict[str, Any]] = []
        seen_windows: Set[str] = set()
        for row in rows:
            window_label = row["window"]
            if window_label in seen_windows:
                continue
            seen_windows.add(window_label)
            category_shares = row["category_shares"]
            if isinstance(category_shares, str):
                category_shares = json.loads(category_shares)
            recurring_flags = row["recurring_flags"]
            if isinstance(recurring_flags, str):
                recurring_flags = json.loads(recurring_flags)
            snapshots.append(
                {
                    "run_id": row["run_id"],
                    "user_id": row["user_id"],
                    "as_of_date": row["as_of_date"],
                    "window": window_label,
                    "income_total": float(row["income_total"]),
                    "expense_total": float(row["expense_total"]),
                    "net_cashflow": float(row["net_cashflow"]),
                    "savings_rate": float(row["savings_rate"]),
                    "top_category": row["top_category"],
                    "category_shares": category_shares or {},
                    "merchant_diversity": row["merchant_diversity"],
                    "recurring_flags": recurring_flags or {},
                    "volatility_expense": float(row["volatility_expense"]),
                    "updated_at": ensure_utc(row["updated_at"]),
                }
            )
        return snapshots


class ClusterModelRepository:
    def __init__(self, client: DatabaseClient) -> None:
        self.client = client

    async def save(self, result: ClusterTrainingResult) -> None:
        pool = await self.client.get_pool()
        if pool is None:
            logger.warning("Persistencia deshabilitada para modelos de clúster")
            return

        scaler_payload = {
            "mean": result.scaler.mean_.tolist(),
            "scale": result.scaler.scale_.tolist(),
        }
        hyperparameters = {
            "algorithm": "kmeans",
            "n_clusters": result.k,
            "random_state": 42,
            "n_init": "auto",
        }

        query = """
            INSERT INTO rx_cluster_models (
                id,
                run_id,
                model_version,
                k,
                scaler,
                centroids,
                silhouette,
                trained_at,
                hyperparameters
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9
            )
            ON CONFLICT (model_version) DO UPDATE SET
                run_id = EXCLUDED.run_id,
                k = EXCLUDED.k,
                scaler = EXCLUDED.scaler,
                centroids = EXCLUDED.centroids,
                silhouette = EXCLUDED.silhouette,
                trained_at = EXCLUDED.trained_at,
                hyperparameters = EXCLUDED.hyperparameters
        """

        async with pool.acquire() as connection:
            await connection.execute(
                query,
                uuid4(),
                result.run_id,
                result.model_version,
                result.k,
                json.dumps(scaler_payload),
                json.dumps(result.centroids),
                result.silhouette,
                result.trained_at,
                json.dumps(hyperparameters),
            )


class ClusterAssignmentRepository:
    def __init__(self, client: DatabaseClient) -> None:
        self.client = client

    async def replace(self, model_version: str, assignments: Dict[str, int]) -> None:
        pool = await self.client.get_pool()
        if pool is None:
            logger.warning("Persistencia deshabilitada para asignaciones de clúster")
            return

        async with pool.acquire() as connection:
            async with connection.transaction():
                await connection.execute(
                    "DELETE FROM rx_user_cluster_assignments WHERE model_version = $1",
                    model_version,
                )
                query = """
                    INSERT INTO rx_user_cluster_assignments (
                        id,
                        user_id,
                        model_version,
                        cluster_id,
                        assigned_at
                    ) VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (user_id, model_version) DO UPDATE SET
                        cluster_id = EXCLUDED.cluster_id,
                        assigned_at = EXCLUDED.assigned_at
                """
                now = utcnow()
                for user_id, cluster_id in assignments.items():
                    await connection.execute(
                        query,
                        uuid4(),
                        user_id,
                        model_version,
                        cluster_id,
                        now,
                    )

    async def fetch_latest(self, user_id: str) -> Optional[Dict[str, Any]]:
        pool = await self.client.get_pool()
        if pool is None:
            return None

        query = """
            SELECT model_version, cluster_id, assigned_at
            FROM rx_user_cluster_assignments
            WHERE user_id = $1
            ORDER BY assigned_at DESC
            LIMIT 1
        """

        async with pool.acquire() as connection:
            row = await connection.fetchrow(query, user_id)
        if not row:
            return None
        return {
            "model_version": row["model_version"],
            "cluster_id": row["cluster_id"],
            "assigned_at": ensure_utc(row["assigned_at"]),
        }


class RecommendationOutputRepository:
    def __init__(self, client: DatabaseClient) -> None:
        self.client = client

    async def replace_for_run(self, run_id: str, records: List[RecommendationRecord]) -> None:
        if not records:
            return
        pool = await self.client.get_pool()
        if pool is None:
            logger.warning("Persistencia deshabilitada para recomendaciones")
            return

        async with pool.acquire() as connection:
            async with connection.transaction():
                await connection.execute(
                    "DELETE FROM rx_recommendations_out WHERE run_id = $1",
                    run_id,
                )
                query = """
                    INSERT INTO rx_recommendations_out (
                        id,
                        run_id,
                        user_id,
                        source,
                        cluster_id,
                        payload,
                        priority,
                        valid_from,
                        valid_to,
                        created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """
                for record in records:
                    if isinstance(record.payload, dict):
                        payload = dict(record.payload)
                    else:
                        payload = {}
                    payload.setdefault("title", record.title)
                    payload.setdefault("message", record.description)
                    payload.setdefault("description", record.description)
                    payload.setdefault("score", record.score)
                    payload.setdefault("category", record.category)
                    payload.setdefault("explanation", record.explanation)
                    payload.setdefault("priority", record.priority)
                    payload.setdefault("generated_at", record.generated_at.isoformat())
                    if record.cluster is not None:
                        payload.setdefault("cluster_id", record.cluster)
                    await connection.execute(
                        query,
                        uuid4(),
                        run_id,
                        record.user_id,
                        record.source,
                        record.cluster,
                        json.dumps(payload),
                        record.priority,
                        record.valid_from,
                        record.valid_to,
                        record.generated_at,
                    )

    async def fetch_for_user(
        self,
        user_id: str,
        *,
        as_of_date: Optional[date] = None,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        pool = await self.client.get_pool()
        if pool is None:
            return []

        query = """
            SELECT
                id,
                source,
                cluster_id,
                payload,
                priority,
                valid_from,
                valid_to,
                created_at,
                run_id
            FROM rx_recommendations_out
            WHERE user_id = $1
              AND (
                    $2::date IS NULL
                    OR (
                        valid_from::date <= $2
                        AND (valid_to IS NULL OR valid_to::date >= $2)
                    )
                )
            ORDER BY priority ASC, created_at DESC
            LIMIT $3
        """

        async with pool.acquire() as connection:
            rows = await connection.fetch(query, user_id, as_of_date, limit)

        results: List[Dict[str, Any]] = []
        for row in rows:
            payload = row["payload"]
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except json.JSONDecodeError:
                    payload = {}
            results.append(
                {
                    "id": row["id"],
                    "source": row["source"],
                    "cluster_id": row["cluster_id"],
                    "payload": payload or {},
                    "priority": row["priority"],
                    "valid_from": ensure_utc(row["valid_from"]),
                    "valid_to": ensure_utc(row["valid_to"]) if row["valid_to"] else None,
                    "created_at": ensure_utc(row["created_at"]),
                    "run_id": row["run_id"],
                }
            )
        return results
class PipelineRunRepository:
    def __init__(self, client: DatabaseClient) -> None:
        self.client = client

    async def record(
        self,
        run_id: str,
        *,
        started_at: datetime,
        status: str,
        finished_at: Optional[datetime] = None,
        data_origin: Optional[str] = None,
        ingest_source: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        pool = await self.client.get_pool()
        if pool is None:
            return

        metadata_payload = json.dumps(metadata) if metadata else None

        async with pool.acquire() as connection:
            await connection.execute(
                """
                INSERT INTO pipeline_runs (
                    run_id,
                    started_at,
                    finished_at,
                    status,
                    data_origin,
                    ingest_source,
                    metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (run_id) DO UPDATE SET
                    finished_at = EXCLUDED.finished_at,
                    status = EXCLUDED.status,
                    data_origin = EXCLUDED.data_origin,
                    ingest_source = EXCLUDED.ingest_source,
                    metadata = COALESCE(EXCLUDED.metadata, pipeline_runs.metadata)
                """,
                run_id,
                started_at,
                finished_at,
                status,
                data_origin,
                ingest_source,
                metadata_payload,
            )

    async def get_last_success(self) -> Optional[Dict[str, Any]]:
        pool = await self.client.get_pool()
        if pool is None:
            return None

        query = """
            SELECT run_id, started_at, finished_at, status, data_origin, ingest_source
            FROM pipeline_runs
            WHERE status IN ('ok', 'success')
            ORDER BY started_at DESC
            LIMIT 1
        """

        async with pool.acquire() as connection:
            row = await connection.fetchrow(query)
        if not row:
            return None
        return {
            "run_id": row["run_id"],
            "started_at": ensure_utc(row["started_at"]),
            "finished_at": ensure_utc(row["finished_at"]) if row["finished_at"] else None,
            "status": row["status"],
            "data_origin": row["data_origin"],
            "ingest_source": row["ingest_source"],
        }


class FeatureBuilder:
    """Transforma transacciones en features agregadas por usuario."""

    discretionary_categories: Set[str] = {
        "entretenimiento",
        "restaurante",
        "restaurantes",
        "viajes",
        "shopping",
        "ocio",
        "suscripciones",
        "moda",
        "regalos",
    }
    rent_keywords: Set[str] = {"arriendo", "rent", "alquiler"}
    services_keywords: Set[str] = {"servicio", "servicios", "utility", "utilities", "luz", "agua", "internet", "telefono", "electricidad"}
    dining_categories: Set[str] = {"restaurantes", "restaurant", "dining"}

    def build_windowed(
        self,
        transactions: List[Dict[str, Any]],
        *,
        run_id: str,
        as_of: Optional[datetime] = None,
        windows: Optional[Iterable[str]] = None,
    ) -> Tuple[List[WindowedUserFeatures], List[UserFeatures]]:
        as_of_dt = ensure_utc(as_of or utcnow())
        window_labels = tuple(windows) if windows else ("30d", "90d", "month")
        window_boundaries: Dict[str, datetime] = {}
        for label in window_labels:
            if label.endswith("d"):
                try:
                    days = int(label.rstrip("d"))
                except ValueError:
                    continue
                window_boundaries[label] = as_of_dt - timedelta(days=days)
            elif label == "month":
                month_start = as_of_dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                window_boundaries[label] = month_start

        normalized_transactions = [entry for entry in (self._normalize_transaction(tx) for tx in transactions) if entry]

        grouped: Dict[Tuple[str, str], List[Dict[str, Any]]] = defaultdict(list)
        overall_latest: Dict[str, datetime] = {}
        overall_counts: Dict[str, int] = defaultdict(int)
        for tx in normalized_transactions:
            user_id = tx["user_id"]
            tx_date = tx["date"]
            overall_counts[user_id] += 1
            latest = overall_latest.get(user_id)
            if latest is None or tx_date > latest:
                overall_latest[user_id] = tx_date
            for window, start in window_boundaries.items():
                if tx_date >= start:
                    grouped[(user_id, window)].append(tx)

        window_features: List[WindowedUserFeatures] = []
        user_features: Dict[str, UserFeatures] = {}
        for (user_id, window), items in grouped.items():
            summary = self._compute_summary(items)
            window_features.append(
                WindowedUserFeatures(
                    id=str(uuid4()),
                    run_id=run_id,
                    user_id=user_id,
                    as_of_date=as_of_dt.date(),
                    window=window,
                    income_total=summary["income_total"],
                    expense_total=summary["expense_total"],
                    net_cashflow=summary["net_cashflow"],
                    savings_rate=summary["savings_rate"],
                    top_category=summary["top_category"],
                    category_shares=summary["category_shares"],
                    merchant_diversity=summary["merchant_diversity"],
                    recurring_flags=summary["recurring_flags"],
                    volatility_expense=summary["volatility_expense"],
                    updated_at=as_of_dt,
                )
            )

            if window == "90d":
                user_features[user_id] = UserFeatures(
                    user_id=user_id,
                    total_income=summary["income_total"],
                    total_expenses=summary["expense_total"],
                    net_cash_flow=summary["net_cashflow"],
                    average_transaction=summary["average_transaction"],
                    discretionary_ratio=summary["discretionary_ratio"],
                    essential_ratio=summary["essential_ratio"],
                    savings_rate=summary["savings_rate"],
                    top_category=summary["top_category"],
                    category_totals=summary["category_totals"],
                    category_shares=summary["category_shares"],
                    merchant_diversity=summary["merchant_diversity"],
                    recurring_flags=summary["recurring_flags"],
                    volatility_expense=summary["volatility_expense"],
                    transaction_count=summary["transaction_count"],
                    last_transaction_at=overall_latest.get(user_id),
                    updated_at=as_of_dt,
                    window="90d",
                    run_id=run_id,
                )

        # Fallback for usuarios sin ventana de 90 días
        now = utcnow()
        for user_id, latest in overall_latest.items():
            if user_id not in user_features:
                summary = self._compute_summary([tx for tx in normalized_transactions if tx["user_id"] == user_id])
                user_features[user_id] = UserFeatures(
                    user_id=user_id,
                    total_income=summary["income_total"],
                    total_expenses=summary["expense_total"],
                    net_cash_flow=summary["net_cashflow"],
                    average_transaction=summary["average_transaction"],
                    discretionary_ratio=summary["discretionary_ratio"],
                    essential_ratio=summary["essential_ratio"],
                    savings_rate=summary["savings_rate"],
                    top_category=summary["top_category"],
                    category_totals=summary["category_totals"],
                    category_shares=summary["category_shares"],
                    merchant_diversity=summary["merchant_diversity"],
                    recurring_flags=summary["recurring_flags"],
                    volatility_expense=summary["volatility_expense"],
                    transaction_count=summary["transaction_count"],
                    last_transaction_at=latest,
                    updated_at=now,
                    window="90d",
                    run_id=run_id,
                )

        return window_features, list(user_features.values())

    def build(self, transactions: List[Dict[str, Any]]) -> List[UserFeatures]:
        windowed, summaries = self.build_windowed(
            transactions,
            run_id=str(uuid4()),
            as_of=utcnow(),
            windows=("90d",),
        )
        return summaries

    def _normalize_transaction(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        user_id = str(data.get("user_id") or data.get("userId") or "").strip()
        if not user_id:
            return None

        try:
            amount = float(data.get("amount"))
        except (TypeError, ValueError):
            return None

        date_value = parse_datetime(
            data.get("date")
            or data.get("timestamp")
            or data.get("transaction_date")
            or data.get("transactionDate")
        )
        if date_value is None:
            return None

        updated_value = parse_datetime(data.get("updated_at") or data.get("updatedAt"))
        if updated_value is None:
            updated_value = date_value

        category_raw = (
            data.get("internal_category")
            or data.get("internalCategory")
            or data.get("category")
            or data.get("subcategory")
            or "otros"
        )
        category = str(category_raw).strip().lower() or "otros"
        merchant_value = data.get("merchant") or data.get("merchant_name")
        merchant = str(merchant_value).strip() if merchant_value else None
        description_value = data.get("description") or data.get("concept")
        description = str(description_value).strip().lower() if description_value else ""

        return {
            "user_id": user_id,
            "amount": amount,
            "date": ensure_utc(date_value),
            "updated_at": ensure_utc(updated_value),
            "category": category,
            "merchant": merchant.lower() if merchant else None,
            "description": description,
        }

    def _compute_summary(self, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        income_total = 0.0
        expense_total = 0.0
        discretionary_total = 0.0
        essential_total = 0.0
        category_totals: Dict[str, float] = defaultdict(float)
        category_shares: Dict[str, float]
        expense_by_day: Dict[date, float] = defaultdict(float)
        merchants: Set[str] = set()
        transaction_count = 0

        for tx in transactions:
            amount = float(tx["amount"])
            category = tx["category"]
            transaction_count += 1
            if amount >= 0:
                income_total += amount
            else:
                expense = abs(amount)
                expense_total += expense
                category_totals[category] += expense
                expense_by_day[tx["date"].date()] += expense
                if category in self.discretionary_categories:
                    discretionary_total += expense
                else:
                    essential_total += expense
                merchant = tx.get("merchant")
                if merchant:
                    merchants.add(merchant)

        total_transactions_amount = income_total + expense_total
        average_transaction = total_transactions_amount / transaction_count if transaction_count else 0.0
        discretionary_ratio = discretionary_total / expense_total if expense_total else 0.0
        essential_ratio = essential_total / expense_total if expense_total else 0.0
        net_cashflow = income_total - expense_total
        savings_rate = (income_total - expense_total) / income_total if income_total > 0 else 0.0
        sorted_categories = dict(sorted(category_totals.items(), key=lambda item: item[1], reverse=True))
        top_category = next(iter(sorted_categories.keys()), None)
        if expense_total > 0:
            category_shares = {key: round(value / expense_total, 4) for key, value in sorted_categories.items()}
        else:
            category_shares = {}
        volatility_expense = pstdev(expense_by_day.values()) if len(expense_by_day) >= 2 else 0.0

        recurring_flags = {
            "arriendo": self._has_keyword(transactions, self.rent_keywords),
            "servicios": self._has_keyword(transactions, self.services_keywords),
        }

        return {
            "income_total": round(income_total, 2),
            "expense_total": round(expense_total, 2),
            "net_cashflow": round(net_cashflow, 2),
            "savings_rate": round(max(savings_rate, 0.0), 4),
            "top_category": top_category,
            "category_totals": {k: round(v, 2) for k, v in sorted_categories.items()},
            "category_shares": category_shares,
            "merchant_diversity": len(merchants),
            "recurring_flags": recurring_flags,
            "volatility_expense": round(float(volatility_expense), 4),
            "average_transaction": round(average_transaction, 2),
            "discretionary_ratio": round(discretionary_ratio, 4),
            "essential_ratio": round(essential_ratio, 4),
            "transaction_count": transaction_count,
        }

    def _has_keyword(self, transactions: List[Dict[str, Any]], keywords: Set[str]) -> bool:
        for tx in transactions:
            category = tx.get("category", "")
            description = tx.get("description", "")
            merchant = tx.get("merchant", "") or ""
            text = " ".join(filter(None, [category, description, merchant])).lower()
            if any(keyword in text for keyword in keywords):
                return True
        return False


class FeatureStore:
    def __init__(self) -> None:
        self._features: Dict[str, UserFeatures] = {}
        self._lock = asyncio.Lock()

    async def bulk_upsert(self, features: List[UserFeatures]) -> None:
        async with self._lock:
            for feature in features:
                self._features[feature.user_id] = feature

    async def get(self, user_id: str) -> Optional[UserFeatures]:
        async with self._lock:
            return self._features.get(user_id)

    async def get_all(self) -> List[UserFeatures]:
        async with self._lock:
            return list(self._features.values())

    async def snapshot(self) -> Dict[str, UserFeatures]:
        async with self._lock:
            return dict(self._features)


class RecommendationStore:
    def __init__(self, history_limit: int = 50) -> None:
        self._latest: Dict[str, List[RecommendationRecord]] = {}
        self._history: Dict[str, List[RecommendationRecord]] = {}
        self._feedback: Dict[str, List[FeedbackEntry]] = {}
        self._feedback_by_submission: Dict[Tuple[str, str], FeedbackEntry] = {}
        self._feedback_by_id: Dict[str, FeedbackEntry] = {}
        self._history_limit = history_limit
        self._lock = asyncio.Lock()

    async def save(self, user_id: str, recommendations: List[RecommendationRecord]) -> None:
        async with self._lock:
            self._latest[user_id] = recommendations
            history = self._history.setdefault(user_id, [])
            history.extend(recommendations)
            if len(history) > self._history_limit:
                self._history[user_id] = history[-self._history_limit :]

    async def get_latest(self, user_id: str) -> List[RecommendationRecord]:
        async with self._lock:
            return list(self._latest.get(user_id, []))

    async def get_history(self, user_id: str) -> List[RecommendationRecord]:
        async with self._lock:
            return list(self._history.get(user_id, []))

    async def add_feedback(self, feedback: FeedbackEntry) -> None:
        async with self._lock:
            self._feedback.setdefault(feedback.user_id, []).append(feedback)
            self._feedback_by_id[feedback.id] = feedback
            if feedback.client_submission_id:
                key = (feedback.user_id, feedback.client_submission_id)
                self._feedback_by_submission[key] = feedback

    async def get_feedback(self, user_id: str) -> List[FeedbackEntry]:
        async with self._lock:
            return list(self._feedback.get(user_id, []))

    async def find_feedback_by_submission(self, user_id: str, client_submission_id: str) -> Optional[FeedbackEntry]:
        async with self._lock:
            return self._feedback_by_submission.get((user_id, client_submission_id))

    async def get_feedback_by_id(self, feedback_id: str) -> Optional[FeedbackEntry]:
        async with self._lock:
            return self._feedback_by_id.get(feedback_id)

    async def recommendation_belongs_to_user(self, recommendation_id: str, user_id: str) -> bool:
        async with self._lock:
            for collection in (self._latest.get(user_id, []), self._history.get(user_id, [])):
                if any(rec.id == recommendation_id for rec in collection):
                    return True
        return False

    async def clear_feedback(self) -> None:
        async with self._lock:
            self._feedback.clear()
            self._feedback_by_submission.clear()
            self._feedback_by_id.clear()


class FeedbackRepository(Protocol):
    backend: str

    async def save(self, feedback: FeedbackEntry) -> FeedbackEntry:
        ...

    async def find_by_submission(self, user_id: str, client_submission_id: str) -> Optional[FeedbackEntry]:
        ...


class MemoryFeedbackRepository:
    backend = "memory"

    def __init__(self, store: RecommendationStore) -> None:
        self._store = store

    async def save(self, feedback: FeedbackEntry) -> FeedbackEntry:
        await self._store.add_feedback(feedback)
        return feedback

    async def find_by_submission(self, user_id: str, client_submission_id: str) -> Optional[FeedbackEntry]:
        return await self._store.find_feedback_by_submission(user_id, client_submission_id)


class SupabaseFeedbackRepository:
    backend = "supabase"

    def __init__(
        self,
        base_url: str,
        service_key: str,
        *,
        table_name: str = "rx_recommendations_feedback",
        timeout: float = 10.0,
    ) -> None:
        if not base_url or not service_key:
            raise ValueError("Supabase URL and key are required to enable feedback persistence")
        self._base_url = base_url.rstrip("/")
        self._service_key = service_key
        self._table_name = table_name
        self._timeout = timeout

    @property
    def _rest_endpoint(self) -> str:
        return f"{self._base_url}/rest/v1/{self._table_name}"

    def _headers(self) -> Dict[str, str]:
        return {
            "apikey": self._service_key,
            "Authorization": f"Bearer {self._service_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=representation",
        }

    async def save(self, feedback: FeedbackEntry) -> FeedbackEntry:
        payload = {
            "id": feedback.id,
            "user_id": feedback.user_id,
            "recommendation_id": feedback.recommendation_id,
            "score": feedback.score,
            "comment": feedback.comment,
            "rule_key": feedback.rule_key,
            "cluster_id": feedback.cluster_id,
            "model_version": feedback.model_version,
            "run_id": feedback.run_id,
            "client_submission_id": feedback.client_submission_id,
            "created_at": feedback.created_at.isoformat(),
        }
        params = {"on_conflict": "user_id,client_submission_id"}
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(
                    self._rest_endpoint,
                    json=payload,
                    params=params,
                    headers=self._headers(),
                )
        except httpx.HTTPError as exc:  # pragma: no cover - network failures are logged
            logger.warning("Error enviando feedback a Supabase: %s", exc)
            return feedback

        if response.status_code not in {200, 201}:
            logger.warning(
                "Supabase rechazó el feedback con estado %s: %s",
                response.status_code,
                response.text,
            )
            return feedback

        try:
            records = response.json()
        except json.JSONDecodeError:
            return feedback

        if isinstance(records, list) and records:
            mapped = self._map_record(records[0])
            if mapped:
                mapped.backend = self.backend
                return mapped
        return feedback

    async def find_by_submission(self, user_id: str, client_submission_id: str) -> Optional[FeedbackEntry]:
        params = {
            "select": "*",
            "user_id": f"eq.{user_id}",
            "client_submission_id": f"eq.{client_submission_id}",
            "limit": 1,
        }
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(
                    self._rest_endpoint,
                    params=params,
                    headers=self._headers(),
                )
        except httpx.HTTPError as exc:  # pragma: no cover - network failures are logged
            logger.warning("Error consultando feedback en Supabase: %s", exc)
            return None

        if response.status_code != 200:
            logger.warning(
                "Supabase devolvió estado %s al consultar feedback: %s",
                response.status_code,
                response.text,
            )
            return None

        try:
            records = response.json()
        except json.JSONDecodeError:
            return None

        if not isinstance(records, list) or not records:
            return None

        entry = self._map_record(records[0])
        if entry:
            entry.backend = self.backend
        return entry

    def _map_record(self, record: Dict[str, Any]) -> Optional[FeedbackEntry]:
        try:
            created_at_raw = record.get("created_at")
            created_at = (
                datetime.fromisoformat(created_at_raw.replace("Z", "+00:00"))
                if isinstance(created_at_raw, str)
                else utcnow()
            )
            return FeedbackEntry(
                id=str(record.get("id")),
                user_id=str(record.get("user_id")),
                recommendation_id=(str(record.get("recommendation_id")) if record.get("recommendation_id") else None),
                score=int(record["score"]) if record.get("score") is not None else None,
                comment=record.get("comment"),
                rule_key=record.get("rule_key"),
                cluster_id=int(record["cluster_id"]) if record.get("cluster_id") is not None else None,
                model_version=record.get("model_version"),
                run_id=str(record.get("run_id")) if record.get("run_id") else None,
                client_submission_id=(
                    str(record.get("client_submission_id")) if record.get("client_submission_id") else None
                ),
                created_at=ensure_utc(created_at),
                backend=self.backend,
            )
        except Exception:  # pragma: no cover - defensive parsing
            return None

class RecommendationModelManager:
    def __init__(self, n_clusters: int = 4) -> None:
        self.n_clusters = n_clusters
        self.model: Optional[KMeans] = None
        self.scaler: Optional[StandardScaler] = None
        self.user_labels: Dict[str, int] = {}
        self.cluster_profiles: Dict[int, Dict[str, float]] = {}
        self.last_trained_at: Optional[datetime] = None
        self.model_version: Optional[str] = None
        self.last_silhouette: Optional[float] = None

    def train(
        self,
        features: List[WindowedUserFeatures],
        *,
        run_id: str,
        k: int,
    ) -> Optional[ClusterTrainingResult]:
        if not features:
            self.model = None
            self.scaler = None
            self.user_labels = {}
            self.cluster_profiles = {}
            self.last_trained_at = None
            self.model_version = None
            self.last_silhouette = None
            return None

        matrix = np.array(
            [
                [
                    feature.income_total,
                    feature.expense_total,
                    feature.savings_rate,
                    feature.merchant_diversity,
                    feature.volatility_expense,
                    feature.category_shares.get("restaurantes", 0.0),
                ]
                for feature in features
            ],
            dtype=float,
        )

        scaler = StandardScaler()
        scaled = scaler.fit_transform(matrix)
        cluster_count = max(1, min(k, scaled.shape[0]))
        model = KMeans(n_clusters=cluster_count, n_init="auto", random_state=42)
        labels = model.fit_predict(scaled)

        if cluster_count > 1 and len(set(labels)) > 1:
            silhouette = float(silhouette_score(scaled, labels))
        else:
            silhouette = None

        assignments = {feature.user_id: int(label) for feature, label in zip(features, labels)}
        profiles = self._build_cluster_profiles(features, assignments)

        self.model = model
        self.scaler = scaler
        self.user_labels = assignments
        self.cluster_profiles = profiles
        self.last_trained_at = utcnow()
        self.model_version = f"v{self.last_trained_at.strftime('%Y%m%d%H%M%S')}-{uuid4().hex[:6]}"
        self.last_silhouette = silhouette

        return ClusterTrainingResult(
            model_version=self.model_version,
            run_id=run_id,
            k=cluster_count,
            scaler=scaler,
            centroids=model.cluster_centers_.tolist(),
            assignments=assignments,
            trained_at=self.last_trained_at,
            silhouette=silhouette,
            profiles=profiles,
        )

    def assign_clusters(self, features: List[WindowedUserFeatures]) -> Dict[str, int]:
        if not features or not self.model or not self.scaler:
            return {}
        matrix = np.array(
            [
                [
                    feature.income_total,
                    feature.expense_total,
                    feature.savings_rate,
                    feature.merchant_diversity,
                    feature.volatility_expense,
                    feature.category_shares.get("restaurantes", 0.0),
                ]
                for feature in features
            ],
            dtype=float,
        )
        scaled = self.scaler.transform(matrix)
        labels = self.model.predict(scaled)
        assignments = {feature.user_id: int(label) for feature, label in zip(features, labels)}
        self.user_labels.update(assignments)
        return assignments

    def _build_cluster_profiles(
        self,
        features: List[WindowedUserFeatures],
        assignments: Dict[str, int],
    ) -> Dict[int, Dict[str, float]]:
        clusters: Dict[int, Dict[str, List[float]]] = defaultdict(lambda: defaultdict(list))
        for feature in features:
            label = assignments.get(feature.user_id)
            if label is None:
                continue
            clusters[label]["income_total"].append(feature.income_total)
            clusters[label]["expense_total"].append(feature.expense_total)
            clusters[label]["savings_rate"].append(feature.savings_rate)
            clusters[label]["volatility"].append(feature.volatility_expense)

        result: Dict[int, Dict[str, float]] = {}
        for cluster_id, metrics in clusters.items():
            result[cluster_id] = {
                "income_total": float(np.mean(metrics.get("income_total", [0.0]))),
                "expense_total": float(np.mean(metrics.get("expense_total", [0.0]))),
                "savings_rate": float(np.mean(metrics.get("savings_rate", [0.0]))),
                "volatility": float(np.mean(metrics.get("volatility", [0.0]))),
            }
        return result

    def generate_recommendations(self, features: UserFeatures) -> List[RecommendationRecord]:
        now = utcnow()
        cluster_id = self.user_labels.get(features.user_id)
        recommendations: Dict[str, RecommendationRecord] = {}

        if features.savings_rate < 0.1 and features.total_expenses >= features.total_income:
            self._add_recommendation(
                recommendations,
                RecommendationRecord(
                    id=str(uuid4()),
                    user_id=features.user_id,
                    title="Activa un presupuesto base",
                    description="Tu tasa de ahorro es muy baja y tus gastos superan tus ingresos. Configura alertas y un presupuesto base.",
                    score=0.9,
                    category="budgeting",
                    explanation="savings_rate<10% y gastos >= ingresos",
                    generated_at=now,
                    cluster=cluster_id,
                    source="rules",
                    priority=1,
                    payload={"type": "low_savings"},
                ),
            )

        if features.recurring_flags.get("arriendo"):
            self._add_recommendation(
                recommendations,
                RecommendationRecord(
                    id=str(uuid4()),
                    user_id=features.user_id,
                    title="Planifica tu pago de arriendo",
                    description="Detectamos gastos recurrentes de arriendo. Programa recordatorios y crea un fondo de emergencia.",
                    score=0.8,
                    category="recurring",
                    explanation="recurring_flags.arriendo activo",
                    generated_at=now,
                    cluster=cluster_id,
                    source="rules",
                    priority=2,
                    payload={"type": "rent_recurring"},
                ),
            )

        if features.recurring_flags.get("servicios"):
            self._add_recommendation(
                recommendations,
                RecommendationRecord(
                    id=str(uuid4()),
                    user_id=features.user_id,
                    title="Optimiza tus servicios mensuales",
                    description="Revisa tus servicios básicos y automatiza pagos para evitar recargos.",
                    score=0.7,
                    category="recurring",
                    explanation="Pagos recurrentes de servicios identificados.",
                    generated_at=now,
                    cluster=cluster_id,
                    source="rules",
                    priority=3,
                    payload={"type": "services_recurring"},
                ),
            )

        if features.category_shares.get("restaurantes", 0.0) > 0.25:
            self._add_recommendation(
                recommendations,
                RecommendationRecord(
                    id=str(uuid4()),
                    user_id=features.user_id,
                    title="Reduce gastos en restaurantes",
                    description="Más del 25% de tus gastos se concentran en restaurantes. Define un tope y refuerza tu educación financiera.",
                    score=0.75,
                    category="spending",
                    explanation="category_shares.restaurantes > 25%",
                    generated_at=now,
                    cluster=cluster_id,
                    source="rules",
                    priority=2,
                    payload={"type": "dining_cap"},
                ),
            )

        if cluster_id is not None:
            for record in self._cluster_recommendations(features, cluster_id, now):
                self._add_recommendation(recommendations, record)

        if not recommendations:
            self._add_recommendation(
                recommendations,
                RecommendationRecord(
                    id=str(uuid4()),
                    user_id=features.user_id,
                    title="Sigue así",
                    description="Tus métricas financieras se mantienen saludables. Continúa con tu plan actual.",
                    score=0.5,
                    category="insight",
                    explanation="Sin alertas significativas.",
                    generated_at=now,
                    cluster=cluster_id,
                    source="rules",
                    priority=5,
                    payload={"type": "healthy"},
                ),
            )

        return sorted(recommendations.values(), key=lambda item: (item.priority, -item.score))

    def _cluster_recommendations(
        self,
        features: UserFeatures,
        cluster_id: int,
        now: datetime,
    ) -> List[RecommendationRecord]:
        profile = self.cluster_profiles.get(cluster_id, {})
        recs: List[RecommendationRecord] = []

        if profile.get("savings_rate", 0.0) < 0.15:
            recs.append(
                RecommendationRecord(
                    id=str(uuid4()),
                    user_id=features.user_id,
                    title="Refuerza tu fondo de emergencia",
                    description="Otros usuarios de tu clúster tienen baja tasa de ahorro. Considera automatizar un ahorro mensual.",
                    score=0.82,
                    category="cluster",
                    explanation="Cluster con bajo savings_rate promedio.",
                    generated_at=now,
                    cluster=cluster_id,
                    source="cluster",
                    priority=3,
                    payload={"type": "cluster_low_savings", "cluster_id": cluster_id},
                )
            )

        if profile.get("expense_total", 0.0) > profile.get("income_total", 0.0):
            recs.append(
                RecommendationRecord(
                    id=str(uuid4()),
                    user_id=features.user_id,
                    title="Ajusta tu flujo de caja",
                    description="Tu clúster muestra gastos superiores a ingresos. Activa alertas y evalúa consolidar deudas.",
                    score=0.78,
                    category="cluster",
                    explanation="Cluster con gastos promedio mayores que ingresos.",
                    generated_at=now,
                    cluster=cluster_id,
                    source="cluster",
                    priority=4,
                    payload={"type": "cluster_high_expense", "cluster_id": cluster_id},
                )
            )

        if not recs:
            recs.append(
                RecommendationRecord(
                    id=str(uuid4()),
                    user_id=features.user_id,
                    title="Plan financiero recomendado",
                    description=f"Eres parte del clúster #{cluster_id}. Revisa nuestra plantilla sugerida para tu perfil.",
                    score=0.6,
                    category="cluster",
                    explanation="Sugerencia basada en pertenencia al clúster.",
                    generated_at=now,
                    cluster=cluster_id,
                    source="cluster",
                    priority=5,
                    payload={"type": "cluster_template", "cluster_id": cluster_id},
                )
            )

        return recs

    def _add_recommendation(
        self,
        collection: Dict[str, RecommendationRecord],
        record: RecommendationRecord,
    ) -> None:
        existing = collection.get(record.title)
        if existing is None or record.priority < existing.priority:
            collection[record.title] = record



class TransactionFetcher:
    def __init__(
        self,
        mode: str,
        api_url: Optional[str],
        kafka_bootstrap: Optional[str],
        kafka_topic: Optional[str],
        timeout: float = 15.0,
        kafka_batch_size: int = 500,
        auth_token: Optional[str] = None,
        page_limit: int = 500,
        db_reader: Optional[DatabaseTransactionReader] = None,
        http_client_factory: Optional[Callable[[], httpx.AsyncClient]] = None,
    ) -> None:
        self.mode = mode
        self.api_url = api_url
        self.kafka_bootstrap = kafka_bootstrap
        self.kafka_topic = kafka_topic
        self.timeout = timeout
        self.kafka_batch_size = kafka_batch_size
        self.auth_token = auth_token
        self.page_limit = page_limit
        self.db_reader = db_reader
        self._http_client_factory = http_client_factory or self._default_client_factory
        self._last_origin: Optional[str] = None
        self._last_ingest_source: Optional[str] = None

    def _default_client_factory(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=self.timeout)

    @property
    def last_origin(self) -> Optional[str]:
        return self._last_origin

    @property
    def last_ingest_source(self) -> Optional[str]:
        return self._last_ingest_source

    async def fetch_transactions(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        self._last_origin = None
        self._last_ingest_source = None

        if self.mode == "kafka":
            self._last_origin = "kafka"
            records = await self._consume_from_kafka()
            self._update_ingest_source(records)
            return records
        if self.mode == "db":
            records = await self._fetch_from_db(since)
            self._last_origin = "database"
            self._update_ingest_source(records)
            return records

        try:
            self._last_origin = "core_api"
            records = await self._fetch_from_api(since)
            self._update_ingest_source(records)
            return records
        except APINotFoundError:
            if self.db_reader:
                logger.warning("Endpoint de movimientos no disponible; usando fallback a BD")
                records = await self._fetch_from_db(since)
                self._last_origin = "database"
                self._update_ingest_source(records)
                return records
            raise

    async def _fetch_from_db(self, since: Optional[datetime]) -> List[Dict[str, Any]]:
        if not self.db_reader:
            logger.warning("No hay lector de base de datos configurado")
            return []
        return await self.db_reader.fetch(since)

    async def _fetch_from_api(self, since: Optional[datetime]) -> List[Dict[str, Any]]:
        if not self.api_url:
            logger.warning("FINANCIAL_MOVEMENTS_API_URL no configurado; se retorna lista vacía")
            return []

        results: List[Dict[str, Any]] = []
        page = 1
        since_param = ensure_utc(since).isoformat() if since else None

        async with self._http_client_factory() as client:
            while True:
                query_params: Dict[str, Any] = {"limit": self.page_limit, "page": page}
                if since_param:
                    query_params["since"] = since_param

                headers: Dict[str, str] = {}
                if self.auth_token:
                    headers["Authorization"] = f"Bearer {self.auth_token}"

                response = await self._perform_request(client, query_params, headers, page)

                payload = response.json()
                page_data = self._extract_transactions(payload)
                results.extend(page_data)

                logger.info(
                    "source=core_api mode=%s page=%s since=%s status_code=%s fetched=%s",
                    self.mode,
                    page,
                    since_param or "none",
                    response.status_code,
                    len(page_data),
                )

                if not self._has_next_page(payload, len(page_data)):
                    break
                page += 1

        if results:
            logger.info(
                "source=core_api mode=%s pages=%s total_fetched=%s since=%s",
                self.mode,
                page,
                len(results),
                since_param or "none",
            )
        else:
            logger.info("API de movimientos respondió sin datos")
        return results

    async def _perform_request(
        self,
        client: httpx.AsyncClient,
        params: Dict[str, Any],
        headers: Dict[str, str],
        page: int,
    ) -> httpx.Response:
        attempt = 0
        while True:
            try:
                response = await client.get(self.api_url or "", params=params, headers=headers)
            except (httpx.TimeoutException, httpx.TransportError) as error:
                if attempt >= 2:
                    logger.error("source=core_api mode=%s page=%s error=%s", self.mode, page, error)
                    raise
                backoff = 2**attempt
                logger.warning(
                    "source=core_api mode=%s page=%s error=%s retry_in=%ss",
                    self.mode,
                    page,
                    str(error),
                    backoff,
                )
                await asyncio.sleep(backoff)
                attempt += 1
                continue

            if response.status_code in (401, 403):
                logger.error("source=core_api mode=%s page=%s status=%s", self.mode, page, response.status_code)
                raise UnauthorizedError("Credenciales inválidas para Core API")
            if response.status_code == 404:
                raise APINotFoundError("Endpoint de movimientos categorizados no encontrado")
            if response.status_code in (429,) or response.status_code >= 500:
                if attempt >= 2:
                    logger.error(
                        "source=core_api mode=%s page=%s status=%s no more retries",
                        self.mode,
                        page,
                        response.status_code,
                    )
                    response.raise_for_status()
                backoff = 2**attempt
                logger.warning(
                    "source=core_api mode=%s page=%s status=%s retry_in=%ss",
                    self.mode,
                    page,
                    response.status_code,
                    backoff,
                )
                await asyncio.sleep(backoff)
                attempt += 1
                continue

            response.raise_for_status()
            return response

    def _extract_transactions(self, payload: Any) -> List[Dict[str, Any]]:
        if isinstance(payload, list):
            data = payload
        elif isinstance(payload, dict):
            data = payload.get("data") or payload.get("transactions") or []
        else:
            data = []

        if not isinstance(data, list):
            return []
        return [item for item in data if isinstance(item, dict)]

    def _has_next_page(self, payload: Any, current_count: int) -> bool:
        if isinstance(payload, dict):
            meta = payload.get("meta") or payload.get("pagination") or {}
            if isinstance(meta, dict):
                if meta.get("next_page") or meta.get("nextPage"):
                    return True
                if "has_next" in meta:
                    return bool(meta["has_next"])
                if "hasNext" in meta:
                    return bool(meta["hasNext"])
                total_pages = meta.get("total_pages") or meta.get("totalPages")
                current_page = meta.get("page") or meta.get("current_page") or meta.get("currentPage")
                if total_pages and current_page:
                    try:
                        return int(current_page) < int(total_pages)
                    except (TypeError, ValueError):
                        pass
        return current_count >= self.page_limit

    def _update_ingest_source(self, transactions: List[Dict[str, Any]]) -> None:
        self._last_ingest_source = None
        for item in transactions:
            if not isinstance(item, dict):
                continue
            for key in ("ingest_source", "ingestSource", "source", "data_origin"):
                value = item.get(key)
                if isinstance(value, str) and value:
                    self._last_ingest_source = value.lower()
                    return
        if self._last_ingest_source is None:
            self._last_ingest_source = self._last_origin

    async def _consume_from_kafka(self) -> List[Dict[str, Any]]:
        try:
            from aiokafka import AIOKafkaConsumer  # type: ignore
        except ImportError:
            logger.error("aiokafka no está instalado; cambia PIPELINE_MODE=api para usar HTTP")
            return []

        if not self.kafka_bootstrap or not self.kafka_topic:
            logger.error("Configuración de Kafka incompleta; se omite consumo")
            return []

        consumer = AIOKafkaConsumer(
            self.kafka_topic,
            bootstrap_servers=self.kafka_bootstrap,
            auto_offset_reset="latest",
            enable_auto_commit=False,
            value_deserializer=lambda value: json.loads(value.decode("utf-8")),
        )

        await consumer.start()
        try:
            result: List[Dict[str, Any]] = []
            message_map = await consumer.getmany(timeout_ms=2000, max_records=self.kafka_batch_size)
            for _, records in message_map.items():
                for record in records:
                    payload = record.value
                    if isinstance(payload, dict):
                        result.append(payload)
            await consumer.commit()
            if result:
                logger.info("Consumidas %s transacciones desde Kafka", len(result))
            return result
        finally:
            await consumer.stop()


class RecommendationPipeline:
    def __init__(
        self,
        fetcher: TransactionFetcher,
        builder: FeatureBuilder,
        store: FeatureStore,
        recommendation_cache: RecommendationStore,
        model_manager: RecommendationModelManager,
        normalizer: TransactionNormalizer,
        repository: TransactionRepository,
        state_repository: IngestStateRepository,
        feature_repository: FeatureRepository,
        cluster_repository: ClusterModelRepository,
        assignment_repository: ClusterAssignmentRepository,
        recommendation_repository: RecommendationOutputRepository,
        pipeline_run_repository: PipelineRunRepository,
        interval_seconds: int = 300,
        min_cluster_users: int = 50,
        cluster_count: int = 5,
        max_fetch_limit: int = 1000,
    ) -> None:
        self.fetcher = fetcher
        self.builder = builder
        self.store = store
        self.recommendation_cache = recommendation_cache
        self.model_manager = model_manager
        self.normalizer = normalizer
        self.repository = repository
        self.state_repository = state_repository
        self.feature_repository = feature_repository
        self.cluster_repository = cluster_repository
        self.assignment_repository = assignment_repository
        self.recommendation_repository = recommendation_repository
        self.pipeline_run_repository = pipeline_run_repository
        self.interval_seconds = interval_seconds
        self.min_cluster_users = max(min_cluster_users, 1)
        self.cluster_count = max(cluster_count, 1)
        self.max_fetch_limit = max_fetch_limit
        self._task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()
        self._last_run: Optional[datetime] = None
        self._last_summary: Optional[Dict[str, Any]] = None
        self._last_since: Optional[datetime] = None
        self._state_snapshot: Dict[str, datetime] = {}
        self._unauthorized = False
        self._last_run_id: Optional[str] = None
        self._current_run_id: Optional[str] = None
        self._current_stage: Optional[str] = None
        self._running = False

    async def start(self) -> None:
        if self._task is None:
            self._task = asyncio.create_task(self._schedule_loop())

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def run_once(
        self,
        *,
        since_override: Optional[datetime] = None,
        force_recluster: bool = False,
        limit_users: Optional[int] = None,
    ) -> Dict[str, Any]:
        if limit_users is not None and limit_users <= 0:
            limit_users = None
        async with self._lock:
            if self._running:
                raise RuntimeError("pipeline_busy")
            self._running = True
            run_id = str(uuid4())
            self._current_run_id = run_id

        started_at = utcnow()
        since = since_override or await self.state_repository.get_global_since()
        stages: List[Dict[str, Any]] = []
        metrics_start = time.perf_counter()
        data_origin: Optional[str] = None
        ingest_source: Optional[str] = None
        try:
            # Fetch stage
            self._current_stage = "fetch"
            transactions = await self.fetcher.fetch_transactions(since)
            data_origin = self.fetcher.last_origin
            ingest_source = self.fetcher.last_ingest_source
            if self.max_fetch_limit and len(transactions) > self.max_fetch_limit:
                logger.info(
                    "fetch_limit_applied", extra={"limit": self.max_fetch_limit, "fetched": len(transactions)}
                )
                transactions = transactions[: self.max_fetch_limit]
            stages.append(
                {
                    "name": "fetch",
                    "status": "ok",
                    "received": len(transactions),
                    "since": since.isoformat() if since else None,
                }
            )

            # Normalization and ingestion
            self._current_stage = "ingest"
            ingest_start = time.perf_counter()
            normalized, invalid_count = self.normalizer.normalize_many(transactions)
            ingest_duration = time.perf_counter() - ingest_start
            INGEST_DURATION.observe(ingest_duration)

            ingested_count, duplicate_count = await self.repository.bulk_upsert(normalized)
            await self.state_repository.update_from_transactions(normalized)
            self._state_snapshot = await self.state_repository.snapshot()
            self._last_since = await self.state_repository.get_global_since()

            skipped_total = invalid_count + duplicate_count
            TRANSACTIONS_INGESTED.inc(ingested_count)
            if skipped_total:
                TRANSACTIONS_SKIPPED.inc(skipped_total)

            stages.append(
                {
                    "name": "ingest",
                    "status": "ok",
                    "normalized": len(normalized),
                    "ingested": ingested_count,
                    "invalid": invalid_count,
                    "duplicates": duplicate_count,
                    "skipped": skipped_total,
                    "duration_ms": round(ingest_duration * 1000, 2),
                }
            )

            # Feature generation
            self._current_stage = "features"
            feature_source = await self.repository.fetch_all()
            if not feature_source and normalized:
                feature_source = [item.to_feature_payload() for item in normalized]

            as_of = utcnow()
            window_features, user_features = self.builder.build_windowed(
                feature_source,
                run_id=run_id,
                as_of=as_of,
                windows=("30d", "90d", "month"),
            )
            await self.feature_repository.bulk_upsert(window_features)
            await self.store.bulk_upsert(user_features)

            FEATURES_UPDATED.inc(len(window_features))
            USERS_TRACKED.set(len(user_features))

            stages.append(
                {
                    "name": "features",
                    "status": "ok",
                    "users": len(user_features),
                    "records": len(window_features),
                }
            )

            # Determine user scope
            selected_user_ids = sorted({feature.user_id for feature in user_features})
            if limit_users is not None:
                selected_user_ids = selected_user_ids[:limit_users]
            selected_user_set = set(selected_user_ids)

            train_features = [
                feature for feature in window_features if feature.window == "90d" and feature.user_id in selected_user_set
            ]

            # Clustering stage
            self._current_stage = "clustering"
            clustering_stage: Dict[str, Any]
            assignments: Dict[str, int] = {}
            if train_features and (len(train_features) >= self.min_cluster_users or force_recluster):
                result = self.model_manager.train(
                    train_features,
                    run_id=run_id,
                    k=self.cluster_count,
                )
                if result:
                    await self.cluster_repository.save(result)
                    await self.assignment_repository.replace(result.model_version, result.assignments)
                    assignments = result.assignments
                    clustering_stage = {
                        "name": "clustering",
                        "status": "ok",
                        "k": result.k,
                        "users": len(result.assignments),
                        "silhouette": result.silhouette,
                        "model_version": result.model_version,
                    }
                else:
                    assignments = self.model_manager.assign_clusters(train_features)
                    clustering_stage = {
                        "name": "clustering",
                        "status": "skipped",
                        "reason": "model_not_trained",
                        "users": len(train_features),
                    }
            else:
                assignments = self.model_manager.assign_clusters(train_features)
                clustering_stage = {
                    "name": "clustering",
                    "status": "skipped",
                    "reason": "not_enough_users",
                    "users": len(train_features),
                }
            stages.append(clustering_stage)

            # Recommendation stage
            self._current_stage = "recommendations"
            all_recommendations: List[RecommendationRecord] = []
            for feature in user_features:
                if feature.user_id not in selected_user_set:
                    continue
                user_recommendations = self.model_manager.generate_recommendations(feature)
                all_recommendations.extend(user_recommendations)
                await self.recommendation_cache.save(feature.user_id, user_recommendations)

            await self.recommendation_repository.replace_for_run(run_id, all_recommendations)

            stages.append(
                {
                    "name": "recommendations",
                    "status": "ok",
                    "generated": len(all_recommendations),
                    "users": len(selected_user_ids),
                }
            )

            PIPELINE_RUNS.labels(status="success").inc()
            PIPELINE_RUN_DURATION.observe(time.perf_counter() - metrics_start)

            duration_ms = round((utcnow() - started_at).total_seconds() * 1000, 2)
            summary = {
                "run_id": run_id,
                "started_at": started_at,
                "stages": stages,
                "duration_ms": duration_ms,
            }

            await self._record_run(
                run_id,
                started_at=started_at,
                status="success",
                finished_at=utcnow(),
                data_origin=data_origin,
                ingest_source=ingest_source,
                stages=stages,
            )

            self._last_run = started_at
            self._last_summary = summary
            self._last_run_id = run_id
            self._unauthorized = False
            return summary
        except UnauthorizedError:
            PIPELINE_RUNS.labels(status="unauthorized").inc()
            PIPELINE_RUN_DURATION.observe(time.perf_counter() - metrics_start)
            self._unauthorized = True
            summary = {
                "run_id": run_id,
                "started_at": started_at,
                "stages": stages
                + [
                    {
                        "name": self._current_stage or "fetch",
                        "status": "error",
                        "reason": "unauthorized",
                    }
                ],
                "duration_ms": round((utcnow() - started_at).total_seconds() * 1000, 2),
            }
            await self._record_run(
                run_id,
                started_at=started_at,
                status="unauthorized",
                finished_at=utcnow(),
                data_origin=data_origin,
                ingest_source=ingest_source,
                stages=stages,
            )
            self._last_summary = summary
            self._last_run = started_at
            self._last_run_id = run_id
            return summary
        except Exception:
            PIPELINE_RUNS.labels(status="error").inc()
            PIPELINE_RUN_DURATION.observe(time.perf_counter() - metrics_start)
            await self._record_run(
                run_id,
                started_at=started_at,
                status="error",
                finished_at=utcnow(),
                data_origin=data_origin,
                ingest_source=ingest_source,
                stages=stages,
            )
            raise
        finally:
            async with self._lock:
                self._running = False
                self._current_run_id = None
                self._current_stage = None

    async def _record_run(
        self,
        run_id: str,
        *,
        started_at: datetime,
        status: str,
        finished_at: Optional[datetime],
        data_origin: Optional[str],
        ingest_source: Optional[str],
        stages: List[Dict[str, Any]],
    ) -> None:
        try:
            await self.pipeline_run_repository.record(
                run_id,
                started_at=started_at,
                finished_at=finished_at,
                status=status,
                data_origin=data_origin,
                ingest_source=ingest_source,
                metadata={"stages": stages},
            )
        except Exception:  # pragma: no cover - logging only
            logger.exception("pipeline_run_record_failed", extra={"run_id": run_id, "status": status})


    async def _schedule_loop(self) -> None:
        logger.info("Iniciando loop del pipeline con intervalo %ss", self.interval_seconds)
        try:
            while True:
                try:
                    if self._running:
                        logger.info("pipeline_busy", extra={"stage": "scheduler"})
                    elif self._unauthorized:
                        logger.warning(
                            "Pipeline en estado unauthorized; esperando renovación de credenciales antes de reintentar"
                        )
                    else:
                        await self.run_once()
                except Exception as error:  # pylint: disable=broad-except
                    logger.exception("Error en pipeline de recomendaciones: %s", error)
                await asyncio.sleep(self.interval_seconds)
        except asyncio.CancelledError:
            logger.info("Loop del pipeline detenido")
            raise

    def status(self) -> Dict[str, Any]:
        return {
            "mode": self.fetcher.mode,
            "interval_seconds": self.interval_seconds,
            "last_run": self._last_run.isoformat() if self._last_run else None,
            "last_run_id": self._last_run_id,
            "current_run_id": self._current_run_id,
            "current_stage": self._current_stage,
            "running": self._running,
            "last_summary": self._last_summary,
            "trained_at": self.model_manager.last_trained_at.isoformat() if self.model_manager.last_trained_at else None,
            "last_synced_at": self._last_since.isoformat() if self._last_since else None,
            "state_snapshot": {user: ts.isoformat() for user, ts in self._state_snapshot.items()},
            "unauthorized": self._unauthorized,
        }

    def is_running(self) -> bool:
        return self._running


class TransactionData(BaseModel):
    amount: float
    category: str
    description: str
    user_id: str = Field(..., alias="userId")


class RecommendationItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    description: str
    score: float
    category: str
    explanation: str
    generated_at: datetime = Field(..., alias="generatedAt")
    cluster: Optional[int] = None
    source: str = Field("rules", alias="source")
    priority: int = Field(5, alias="priority")
    valid_from: datetime = Field(default_factory=utcnow, alias="validFrom")
    valid_to: Optional[datetime] = Field(None, alias="validTo")
    payload: Dict[str, Any] = Field(default_factory=dict)


class RecommendationAction(BaseModel):
    type: str
    label: str
    url: Optional[str] = None


class PersonalizedRecommendationItem(BaseModel):
    id: str
    source: str
    cluster_id: Optional[int] = None
    model_version: Optional[str] = None
    title: str
    message: str
    actions: List[RecommendationAction] = Field(default_factory=list)
    evidence: Dict[str, Any] = Field(default_factory=dict)
    priority: int = 5
    score: float = Field(0.0, ge=0.0, le=1.0)
    valid_from: date
    valid_to: Optional[date] = None
    created_at: datetime


class UserFeatureSummary(BaseModel):
    total_income: float
    total_expenses: float
    net_cash_flow: float
    average_transaction: float
    discretionary_ratio: float
    essential_ratio: float
    savings_rate: float
    top_category: Optional[str]
    category_totals: Dict[str, float] = Field(default_factory=dict)
    category_shares: Dict[str, float] = Field(default_factory=dict)
    merchant_diversity: int
    recurring_flags: Dict[str, bool] = Field(default_factory=dict)
    volatility_expense: float
    transaction_count: int
    last_transaction_at: Optional[datetime]


class PersonalizedRecommendationsEnvelope(BaseModel):
    user_id: str
    generated_at: datetime
    as_of_date: date
    items: List[PersonalizedRecommendationItem]
    meta: Dict[str, Any] = Field(default_factory=dict)


def _build_item_from_persisted(
    record: Dict[str, Any],
    *,
    include_cluster: bool,
    cluster_info: Optional[Dict[str, Any]],
) -> Optional[PersonalizedRecommendationItem]:
    payload = record.get("payload") or {}
    if not isinstance(payload, dict):
        payload = {}

    title = str(payload.get("title") or payload.get("name") or payload.get("type") or "Recomendación financiera")
    message = str(payload.get("message") or payload.get("description") or payload.get("explanation") or "")

    actions_payload = payload.get("actions")
    actions: List[RecommendationAction] = []
    if isinstance(actions_payload, list):
        for action in actions_payload:
            if not isinstance(action, dict):
                continue
            action_type = str(action.get("type") or "link")
            label = str(action.get("label") or action.get("title") or "Más información")
            url = action.get("url")
            actions.append(RecommendationAction(type=action_type, label=label, url=url))

    evidence = payload.get("evidence")
    if not isinstance(evidence, dict):
        evidence = {}

    score_value = payload.get("score") or payload.get("confidence")
    try:
        score = float(score_value) if score_value is not None else 0.0
    except (TypeError, ValueError):  # pragma: no cover - defensive
        score = 0.0

    priority_raw = record.get("priority") or payload.get("priority")
    try:
        priority = int(priority_raw) if priority_raw is not None else 5
    except (TypeError, ValueError):
        priority = 5

    cluster_id = record.get("cluster_id") if include_cluster else None
    if include_cluster and cluster_id is None:
        cluster_id = payload.get("cluster_id")
    model_version = payload.get("model_version") if include_cluster else None
    if include_cluster and model_version is None and cluster_info:
        model_version = cluster_info.get("model_version")
    if include_cluster and cluster_id is None and cluster_info:
        cluster_id = cluster_info.get("cluster_id")

    valid_from_value = record.get("valid_from")
    valid_to_value = record.get("valid_to")
    created_at_value = record.get("created_at")

    if isinstance(valid_from_value, datetime):
        valid_from = ensure_utc(valid_from_value).date()
    elif isinstance(valid_from_value, date):
        valid_from = valid_from_value
    else:
        valid_from = None

    if isinstance(valid_to_value, datetime):
        valid_to = ensure_utc(valid_to_value).date()
    elif isinstance(valid_to_value, date):
        valid_to = valid_to_value
    else:
        valid_to = None

    if isinstance(created_at_value, datetime):
        created_at = ensure_utc(created_at_value)
    else:
        created_at = utcnow()

    if valid_from is None:
        valid_from = created_at.date()

    identifier = record.get("id")
    if identifier is None:
        return None

    return PersonalizedRecommendationItem(
        id=str(identifier),
        source=str(record.get("source") or payload.get("source") or "rules"),
        cluster_id=cluster_id if include_cluster else None,
        model_version=model_version if include_cluster else None,
        title=title,
        message=message,
        actions=actions,
        evidence=evidence,
        priority=priority,
        score=score,
        valid_from=valid_from,
        valid_to=valid_to,
        created_at=created_at,
    )


def _generate_rule_recommendations(
    *,
    user_id: str,
    features: List[Dict[str, Any]],
    as_of_date: date,
    lang: str,
    cluster_info: Optional[Dict[str, Any]],
    include_cluster: bool,
    limit: int,
) -> List[PersonalizedRecommendationItem]:
    feature_map: Dict[str, Dict[str, Any]] = {}
    for snapshot in features:
        window_label = str(snapshot.get("window") or "").lower()
        feature_map[window_label] = snapshot

    default_window = settings.features_default_window.lower()
    base_feature = feature_map.get(default_window)
    if base_feature is None and features:
        base_feature = features[0]

    if base_feature is None:
        return []

    window_30 = feature_map.get("30d") or base_feature
    window_90 = feature_map.get("90d") or feature_map.get("90days")

    now = utcnow()
    recommendations: Dict[str, PersonalizedRecommendationItem] = {}

    def add_rule(
        rule_key: str,
        *,
        title: str,
        message: str,
        priority: int,
        score: float,
        evidence: Dict[str, Any],
        actions: List[RecommendationAction],
    ) -> None:
        if score < settings.recs_min_score:
            return
        identifier = _rule_identifier(user_id, rule_key, as_of_date)
        cluster_id = cluster_info.get("cluster_id") if include_cluster and cluster_info else None
        model_version = cluster_info.get("model_version") if include_cluster and cluster_info else None
        item = PersonalizedRecommendationItem(
            id=identifier,
            source="rules",
            cluster_id=cluster_id,
            model_version=model_version,
            title=title,
            message=message,
            actions=list(actions),
            evidence=evidence,
            priority=priority,
            score=score,
            valid_from=as_of_date,
            valid_to=as_of_date + timedelta(days=30),
            created_at=now,
        )
        existing = recommendations.get(rule_key)
        if existing is None or (priority < existing.priority or score > existing.score):
            recommendations[rule_key] = item

    income_total = float(base_feature.get("income_total") or 0.0)
    expense_total = float(base_feature.get("expense_total") or 0.0)
    savings_rate = float(base_feature.get("savings_rate") or 0.0)

    net_cashflow_30d = float(window_30.get("net_cashflow") or 0.0)
    category_shares = window_30.get("category_shares") or {}
    if not isinstance(category_shares, dict):
        category_shares = {}
    recurring_flags = window_30.get("recurring_flags") or {}
    if not isinstance(recurring_flags, dict):
        recurring_flags = {}

    restaurants_share = 0.0
    for key in ("restaurantes", "restaurant", "dining"):
        if key in category_shares:
            try:
                restaurants_share = float(category_shares[key])
                break
            except (TypeError, ValueError):  # pragma: no cover - defensive
                continue

    if savings_rate < 0.1 and income_total > 0:
        actions = [
            RecommendationAction(
                type="education",
                label="Cómo armar presupuesto base" if lang.startswith("es") else "Build a basic budget",
                url="https://salomon.ai/recursos/presupuesto-base",
            )
        ]
        evidence = {
            "savings_rate": round(savings_rate, 4),
            "income_total": round(income_total, 2),
            "expense_total": round(expense_total, 2),
            "net_cashflow_30d": round(net_cashflow_30d, 2),
        }
        message = (
            "Ahorra al menos 10% de tus ingresos mensuales. Ajusta tu presupuesto y automatiza un aporte." if lang.startswith("es")
            else "Grow your monthly savings to at least 10% by adjusting your baseline budget."
        )
        add_rule(
            "low_savings",
            title="Aumenta tu ahorro mensual" if lang.startswith("es") else "Increase your monthly savings",
            message=message,
            priority=2,
            score=0.8,
            evidence=evidence,
            actions=actions,
        )

    if restaurants_share > 0.25:
        actions = [
            RecommendationAction(
                type="limit",
                label="Define un tope semanal" if lang.startswith("es") else "Set a weekly cap",
                url="https://salomon.ai/recursos/gasto-restaurantes",
            )
        ]
        evidence = {
            "category_shares": {"restaurantes": round(restaurants_share, 4)},
            "net_cashflow_30d": round(net_cashflow_30d, 2),
        }
        message = (
            "Tus gastos en restaurantes superan el 25% del total. Define un tope y planifica comidas en casa." if lang.startswith("es")
            else "Restaurant spending exceeds 25% of your expenses. Set a cap and plan more meals at home."
        )
        add_rule(
            "dining_cap",
            title="Reduce tus gastos en restaurantes" if lang.startswith("es") else "Reduce restaurant spending",
            message=message,
            priority=3,
            score=0.75,
            evidence=evidence,
            actions=actions,
        )

    has_rent = bool(recurring_flags.get("arriendo") or recurring_flags.get("rent"))
    late_payment_risk = net_cashflow_30d < 0
    if has_rent and late_payment_risk:
        actions = [
            RecommendationAction(
                type="reminder",
                label="Activa recordatorios de arriendo" if lang.startswith("es") else "Set rent reminders",
                url="https://salomon.ai/recursos/arriendo",
            )
        ]
        evidence = {
            "recurring_flags": {"arriendo": True},
            "net_cashflow_30d": round(net_cashflow_30d, 2),
        }
        message = (
            "Tu flujo de caja es negativo y tienes arriendo recurrente. Activa recordatorios y reserva un fondo de emergencia."
            if lang.startswith("es")
            else "Cash flow is negative and rent is recurring. Schedule reminders and build an emergency buffer."
        )
        add_rule(
            "rent_buffer",
            title="Protege tu pago de arriendo" if lang.startswith("es") else "Protect your rent payment",
            message=message,
            priority=2,
            score=0.72,
            evidence=evidence,
            actions=actions,
        )

    net_cashflow_90d = 0.0
    if window_90:
        try:
            net_cashflow_90d = float(window_90.get("net_cashflow") or 0.0)
        except (TypeError, ValueError):
            net_cashflow_90d = 0.0
    if window_90 and net_cashflow_90d < 0:
        actions = [
            RecommendationAction(
                type="coaching",
                label="Agenda asesoría" if lang.startswith("es") else "Book a coaching session",
                url="https://salomon.ai/recursos/consolidacion",
            )
        ]
        evidence = {"net_cashflow_90d": round(net_cashflow_90d, 2)}
        message = (
            "Registra gastos variables y activa alertas para revertir el flujo negativo en 90 días." if lang.startswith("es")
            else "Track discretionary spending and set alerts to reverse the negative 90-day cash flow."
        )
        add_rule(
            "consolidation_plan",
            title="Planifica un plan de consolidación" if lang.startswith("es") else "Plan a consolidation strategy",
            message=message,
            priority=4,
            score=0.7,
            evidence=evidence,
            actions=actions,
        )

    ordered = sorted(recommendations.values(), key=lambda item: (item.priority, -item.score))
    if limit > 0:
        ordered = ordered[:limit]
    return ordered


class FeedbackRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    user_id: UUID = Field(..., validation_alias=AliasChoices("user_id", "userId"))
    recommendation_id: Optional[UUID] = Field(
        None, validation_alias=AliasChoices("recommendation_id", "recommendationId")
    )
    score: Optional[int] = Field(None, validation_alias=AliasChoices("score"))
    comment: Optional[str] = Field(
        None,
        max_length=1000,
        validation_alias=AliasChoices("comment"),
    )
    rule_key: Optional[str] = Field(None, validation_alias=AliasChoices("rule_key", "ruleKey"))
    cluster_id: Optional[int] = Field(None, validation_alias=AliasChoices("cluster_id", "clusterId"))
    model_version: Optional[str] = Field(None, validation_alias=AliasChoices("model_version", "modelVersion"))
    run_id: Optional[UUID] = Field(None, validation_alias=AliasChoices("run_id", "runId"))
    client_submission_id: Optional[UUID] = Field(
        None,
        validation_alias=AliasChoices("client_submission_id", "clientSubmissionId"),
    )


class FeedbackSubmissionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    feedback_id: UUID = Field(..., alias="feedback_id")
    stored: str
    will_persist: str = Field(..., alias="will_persist")
    duplicate: bool = False


class PipelineStatusResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    mode: str
    interval_seconds: int = Field(..., alias="intervalSeconds")
    last_run: Optional[str] = Field(None, alias="lastRun")
    last_run_id: Optional[str] = Field(None, alias="lastRunId")
    current_run_id: Optional[str] = Field(None, alias="currentRunId")
    current_stage: Optional[str] = Field(None, alias="currentStage")
    running: bool = Field(False, alias="running")
    last_summary: Optional[Dict[str, Any]] = Field(None, alias="lastSummary")
    trained_at: Optional[str] = Field(None, alias="trainedAt")
    last_synced_at: Optional[str] = Field(None, alias="lastSyncedAt")
    state_snapshot: Dict[str, str] = Field(default_factory=dict, alias="stateSnapshot")
    unauthorized: bool = Field(False, alias="unauthorized")


class PipelineRunRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    since: Optional[datetime] = Field(None, alias="since")
    force_recluster: bool = Field(False, alias="forceRecluster")
    limit_users: Optional[int] = Field(None, alias="limitUsers")


class PipelineRunResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    run_id: str = Field(..., alias="runId")
    started_at: datetime = Field(..., alias="startedAt")
    stages: List[Dict[str, Any]]
    duration_ms: float = Field(..., alias="durationMs")


app = FastAPI(
    title="SalomónAI - Recommendation Engine",
    description="Motor de recomendaciones financieras inteligentes",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

metrics_instrumentator.instrument(
    app,
    excluded_handlers=["/metrics", "/health"],
).expose(app, include_in_schema=False)


pipeline_mode = settings.pipeline_mode.lower()
financial_movements_url = settings.financial_movements_api_url
kafka_bootstrap = settings.kafka_bootstrap_servers
kafka_topic = settings.kafka_transactions_topic
pipeline_interval = settings.refresh_interval

PIPELINE_REFRESH_INTERVAL.set(pipeline_interval)

feature_builder = FeatureBuilder()
feature_store = FeatureStore()
recommendation_store = RecommendationStore()
model_manager = RecommendationModelManager(n_clusters=settings.cluster_count)
transaction_normalizer = TransactionNormalizer()
database_client = DatabaseClient(settings.build_database_dsn())
db_reader = DatabaseTransactionReader(database_client, page_limit=settings.pipeline_page_limit)
transaction_repository = TransactionRepository(database_client)
state_repository = IngestStateRepository(database_client)
feature_repository = FeatureRepository(database_client)
cluster_model_repository = ClusterModelRepository(database_client)
cluster_assignment_repository = ClusterAssignmentRepository(database_client)
recommendation_output_repository = RecommendationOutputRepository(database_client)
pipeline_run_repository = PipelineRunRepository(database_client)
transaction_fetcher = TransactionFetcher(
    mode=pipeline_mode,
    api_url=financial_movements_url,
    kafka_bootstrap=kafka_bootstrap,
    kafka_topic=kafka_topic,
    timeout=settings.pipeline_api_timeout,
    kafka_batch_size=settings.pipeline_kafka_batch,
    auth_token=settings.core_api_token,
    page_limit=settings.pipeline_page_limit,
    db_reader=db_reader,
)
recommendation_pipeline = RecommendationPipeline(
    fetcher=transaction_fetcher,
    builder=feature_builder,
    store=feature_store,
    recommendation_cache=recommendation_store,
    model_manager=model_manager,
    normalizer=transaction_normalizer,
    repository=transaction_repository,
    state_repository=state_repository,
    feature_repository=feature_repository,
    cluster_repository=cluster_model_repository,
    assignment_repository=cluster_assignment_repository,
    recommendation_repository=recommendation_output_repository,
    pipeline_run_repository=pipeline_run_repository,
    interval_seconds=pipeline_interval,
    min_cluster_users=settings.min_cluster_users,
    cluster_count=settings.cluster_count,
    max_fetch_limit=settings.max_fetch_limit,
)

feedback_memory_repository = MemoryFeedbackRepository(recommendation_store)
supabase_feedback_repository: Optional[SupabaseFeedbackRepository]
if settings.enable_supabase_feedback and settings.supabase_url and settings.supabase_anon_key:
    try:
        supabase_feedback_repository = SupabaseFeedbackRepository(
            base_url=settings.supabase_url,
            service_key=settings.supabase_anon_key,
        )
        logger.info("Feedback persistence en Supabase habilitada")
    except ValueError as exc:
        logger.warning("No fue posible habilitar Supabase para feedback: %s", exc)
        supabase_feedback_repository = None
else:
    if settings.enable_supabase_feedback:
        logger.warning("Supabase feedback habilitado pero faltan credenciales")
    supabase_feedback_repository = None


@app.on_event("startup")
async def startup_event() -> None:
    logger.info("Iniciando servicio Recommendation Engine")
    await recommendation_pipeline.start()


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await recommendation_pipeline.stop()
    await database_client.close()


@app.get("/", response_model=Dict[str, Any])
async def root() -> Dict[str, Any]:
    return {
        "message": "SalomónAI Recommendation Engine",
        "status": "active",
        "version": "2.0.0",
    }


@app.get("/health", response_model=Dict[str, Any])
async def health_check() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "recommendation-engine",
        "version": "2.0.0",
        "pipeline": recommendation_pipeline.status(),
    }


@app.get("/pipeline/status", response_model=PipelineStatusResponse)
async def get_pipeline_status() -> PipelineStatusResponse:
    return PipelineStatusResponse(**recommendation_pipeline.status())


@app.post("/pipeline/run", response_model=PipelineRunResponse)
async def trigger_pipeline_run(
    request: Optional[PipelineRunRequest] = Body(default=None),
    authorization: str = Header(..., alias="Authorization"),
) -> PipelineRunResponse:
    expected_token = settings.pipeline_admin_token
    scheme, _, token_value = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token_value:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization scheme")
    if expected_token and token_value.strip() != expected_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if recommendation_pipeline.is_running():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="pipeline_run_in_progress")

    payload = request or PipelineRunRequest()

    try:
        summary = await recommendation_pipeline.run_once(
            since_override=payload.since,
            force_recluster=payload.force_recluster,
            limit_users=payload.limit_users,
        )
    except RuntimeError as error:
        logger.warning("pipeline_run_conflict", extra={"error": str(error)})
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="pipeline_run_in_progress") from None

    started_at = summary.get("started_at")
    if isinstance(started_at, str):
        started_dt = parse_datetime(started_at) or utcnow()
    elif isinstance(started_at, datetime):
        started_dt = ensure_utc(started_at)
    else:
        started_dt = utcnow()

    stages_payload: List[Dict[str, Any]] = []
    for stage in summary.get("stages", []):
        if isinstance(stage, dict):
            entry = dict(stage)
            name = entry.pop("name", "")
            status_value = entry.pop("status", "")
            stage_payload = {"name": name, "status": status_value}
            stage_payload.update(entry)
            stages_payload.append(stage_payload)

    return PipelineRunResponse(
        runId=summary.get("run_id", ""),
        startedAt=started_dt,
        stages=stages_payload,
        durationMs=float(summary.get("duration_ms", 0.0)),
    )


@app.get("/features/{user_id}", response_model=UserFeatureSummary)
async def get_user_features(user_id: str) -> UserFeatureSummary:
    features = await feature_store.get(user_id)
    if not features:
        raise HTTPException(status_code=404, detail="No se encontraron features para el usuario")
    return UserFeatureSummary(
        total_income=features.total_income,
        total_expenses=features.total_expenses,
        net_cash_flow=features.net_cash_flow,
        average_transaction=features.average_transaction,
        discretionary_ratio=features.discretionary_ratio,
        essential_ratio=features.essential_ratio,
        savings_rate=features.savings_rate,
        top_category=features.top_category,
        category_totals=features.category_totals,
        category_shares=features.category_shares,
        merchant_diversity=features.merchant_diversity,
        recurring_flags=features.recurring_flags,
        volatility_expense=features.volatility_expense,
        transaction_count=features.transaction_count,
        last_transaction_at=features.last_transaction_at,
    )


@app.get(
    "/recommendations/personalized/{user_id}",
    response_model=PersonalizedRecommendationsEnvelope,
    responses={204: {"description": "No Content"}},
)
async def get_personalized_recommendations(
    user_id: UUID,
    limit: int = Query(20, ge=1),
    include_cluster: bool = Query(True),
    as_of_date: Optional[date] = Query(None),
    lang: str = Query("es-CL"),
    authorization: str = Header(..., alias="Authorization"),
) -> PersonalizedRecommendationsEnvelope | Response:
    user_id_str = str(user_id)
    _authorize_recommendations_request(authorization, user_id_str)

    effective_limit = max(1, min(limit, settings.recs_max_items))

    last_run = await pipeline_run_repository.get_last_success()
    if not last_run:
        raise HTTPException(status_code=status.HTTP_424_FAILED_DEPENDENCY, detail="pipeline_not_ready")

    origin_value = (last_run.get("ingest_source") or last_run.get("data_origin") or "").lower()
    allowed_origins = {value.strip().lower() for value in settings.pipeline_required_origin.split(",") if value.strip()}
    if origin_value == "mock":
        raise HTTPException(status_code=status.HTTP_424_FAILED_DEPENDENCY, detail="pipeline_not_ready")
    if allowed_origins:
        valid_set = allowed_origins | {"belvo"}
        if origin_value and origin_value not in valid_set:
            raise HTTPException(status_code=status.HTTP_424_FAILED_DEPENDENCY, detail="pipeline_not_ready")
        if not origin_value:
            raise HTTPException(status_code=status.HTTP_424_FAILED_DEPENDENCY, detail="pipeline_not_ready")

    reference_dt = last_run.get("finished_at") or last_run.get("started_at") or utcnow()
    if isinstance(reference_dt, datetime):
        reference_dt = ensure_utc(reference_dt)
        reference_date = reference_dt.date()
    elif isinstance(reference_dt, date):
        reference_date = reference_dt
    else:
        reference_date = utcnow().date()

    effective_as_of = as_of_date or reference_date

    persisted_records = await recommendation_output_repository.fetch_for_user(
        user_id=user_id_str,
        as_of_date=effective_as_of,
        limit=effective_limit,
    )

    cluster_info: Optional[Dict[str, Any]] = None
    if include_cluster:
        cluster_info = await cluster_assignment_repository.fetch_latest(user_id_str)

    items: List[PersonalizedRecommendationItem] = []
    for record in persisted_records:
        item = _build_item_from_persisted(
            record,
            include_cluster=include_cluster,
            cluster_info=cluster_info,
        )
        if item and item.score >= settings.recs_min_score:
            items.append(item)

    response_as_of = effective_as_of

    if not items:
        feature_snapshots = await feature_repository.fetch_latest_for_user(user_id_str, as_of_date=effective_as_of)
        if not feature_snapshots:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="no_real_data")
        snapshot_dates = [snap.get("as_of_date") for snap in feature_snapshots if isinstance(snap.get("as_of_date"), date)]
        if snapshot_dates:
            response_as_of = max(snapshot_dates)
        items = _generate_rule_recommendations(
            user_id=user_id_str,
            features=feature_snapshots,
            as_of_date=response_as_of,
            lang=lang,
            cluster_info=cluster_info if include_cluster else None,
            include_cluster=include_cluster,
            limit=effective_limit,
        )
    else:
        persisted_dates = [item.valid_from for item in items if item.valid_from]
        if persisted_dates:
            response_as_of = max(persisted_dates)

    if not items:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    response_items = items[:effective_limit]
    RECOMMENDATIONS_SERVED.labels(endpoint="personalized").inc(len(response_items))

    return PersonalizedRecommendationsEnvelope(
        user_id=user_id_str,
        generated_at=utcnow(),
        as_of_date=response_as_of,
        items=response_items,
        meta={"count": len(response_items)},
    )


@app.get("/recommendations/personalized/{user_id}/history", response_model=List[RecommendationItem])
async def get_recommendation_history(user_id: str) -> List[RecommendationItem]:
    history = await recommendation_store.get_history(user_id)
    if not history:
        raise HTTPException(status_code=404, detail="No hay historial de recomendaciones disponible")
    return [RecommendationItem(**asdict(rec)) for rec in history]


@app.get("/recommendations/personalized/{user_id}/feedback", response_model=List[Dict[str, Any]])
async def get_recommendation_feedback(user_id: str) -> List[Dict[str, Any]]:
    feedback_entries = await recommendation_store.get_feedback(user_id)
    if not feedback_entries:
        return []
    return [
        {
            "recommendationId": entry.recommendation_id,
            "score": entry.score,
            "comment": entry.comment,
            "createdAt": entry.created_at,
        }
        for entry in feedback_entries
    ]


@app.post(
    "/recommendations/feedback",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=FeedbackSubmissionResponse,
)
async def submit_feedback(
    feedback: FeedbackRequest,
    authorization: str = Header(..., alias="Authorization"),
) -> Response:
    user_id_str = str(feedback.user_id)
    _authorize_recommendations_request(authorization, user_id_str, required_scope="recs:write")

    score_value = feedback.score
    mode = settings.feedback_score_mode
    if not validate_feedback_score(score_value, mode):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_score")

    try:
        sanitized_comment = sanitize_feedback_comment(feedback.comment)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="comment_too_long") from None

    recommendation_id = str(feedback.recommendation_id) if feedback.recommendation_id else None
    run_id = str(feedback.run_id) if feedback.run_id else None
    client_submission_id = str(feedback.client_submission_id) if feedback.client_submission_id else None
    rule_key = feedback.rule_key.strip() if feedback.rule_key else None
    model_version = feedback.model_version.strip() if feedback.model_version else None

    if recommendation_id:
        belongs = await recommendation_store.recommendation_belongs_to_user(recommendation_id, user_id_str)
        if not belongs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="recommendation_not_found_for_user",
            )

    duplicate_entry: Optional[FeedbackEntry] = None
    if client_submission_id:
        duplicate_entry = await recommendation_store.find_feedback_by_submission(
            user_id_str, client_submission_id
        )
        if not duplicate_entry and supabase_feedback_repository:
            duplicate_entry = await supabase_feedback_repository.find_by_submission(
                user_id_str, client_submission_id
            )
            if duplicate_entry:
                await recommendation_store.add_feedback(duplicate_entry)

    if duplicate_entry:
        response_payload = FeedbackSubmissionResponse(
            feedback_id=UUID(duplicate_entry.id),
            stored=duplicate_entry.backend,
            will_persist="supabase" if supabase_feedback_repository else "supabase_when_enabled",
            duplicate=True,
        )
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=response_payload.model_dump(by_alias=True),
        )

    entry = FeedbackEntry(
        id=str(uuid4()),
        user_id=user_id_str,
        recommendation_id=recommendation_id,
        score=score_value,
        comment=sanitized_comment,
        rule_key=rule_key,
        cluster_id=feedback.cluster_id,
        model_version=model_version,
        run_id=run_id,
        client_submission_id=client_submission_id,
        created_at=utcnow(),
    )

    await feedback_memory_repository.save(entry)

    if supabase_feedback_repository:
        try:
            persisted = await supabase_feedback_repository.save(entry)
            if persisted and persisted.id == entry.id:
                entry.backend = persisted.backend
        except Exception:  # pragma: no cover - defensive guard
            logger.warning("Fallo al persistir feedback en Supabase", exc_info=True)

    FEEDBACK_SUBMISSIONS.labels(has_comment="yes" if sanitized_comment else "no").inc()
    normalized_score = normalize_score_for_metrics(score_value, mode)
    if normalized_score is not None:
        FEEDBACK_SCORE.observe(normalized_score)

    logger.info(
        "event=feedback_received user_hash=%s recommendation_id=%s rule_key=%s cluster_id=%s score=%s has_comment=%s backend=%s",
        hash_identifier(user_id_str),
        recommendation_id or "none",
        rule_key or "none",
        feedback.cluster_id if feedback.cluster_id is not None else "none",
        score_value if score_value is not None else "none",
        "yes" if sanitized_comment else "no",
        entry.backend,
    )

    response_payload = FeedbackSubmissionResponse(
        feedback_id=UUID(entry.id),
        stored="memory",
        will_persist="supabase" if supabase_feedback_repository else "supabase_when_enabled",
        duplicate=False,
    )
    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content=response_payload.model_dump(by_alias=True),
    )


@app.post("/recommendations", response_model=RecommendationItem)
async def generate_recommendation(transaction: TransactionData) -> RecommendationItem:
    """Compatibilidad con versiones anteriores para una recomendación rápida basada en una transacción."""
    features = feature_builder.build(
        [
            {
                "user_id": transaction.user_id,
                "amount": transaction.amount,
                "category": transaction.category,
                "description": transaction.description,
            }
        ]
    )
    if not features:
        raise HTTPException(status_code=400, detail="Transacción inválida")

    recommendation = model_manager.generate_recommendations(features[0])[0]
    await recommendation_store.save(transaction.user_id, [recommendation])
    RECOMMENDATIONS_SERVED.labels(endpoint="transactional").inc()
    return RecommendationItem(**asdict(recommendation))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
        log_level="info",
    )
