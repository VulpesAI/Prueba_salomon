import asyncio
import hashlib
import json
import logging
import time
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional, Tuple
from uuid import uuid4

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
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from sklearn.cluster import KMeans

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
    top_category: Optional[str]
    category_totals: Dict[str, float]
    transaction_count: int
    last_transaction_at: Optional[datetime]
    updated_at: datetime


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


@dataclass
class FeedbackEntry:
    recommendation_id: str
    user_id: str
    score: float
    comment: Optional[str]
    created_at: datetime


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
            "timestamp": timestamp,
            "transaction_date": timestamp,
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


class FeatureBuilder:
    """Transforma transacciones en features agregadas por usuario."""

    discretionary_categories = {
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

    def build(self, transactions: List[Dict[str, Any]]) -> List[UserFeatures]:
        grouped: Dict[str, Dict[str, Any]] = defaultdict(
            lambda: {
                "income": 0.0,
                "expenses": 0.0,
                "count": 0,
                "discretionary": 0.0,
                "essential": 0.0,
                "category_totals": defaultdict(float),
                "last_transaction_at": None,
            }
        )

        for tx in transactions:
            user_id = tx.get("user_id") or tx.get("userId")
            if not user_id:
                continue

            try:
                amount = float(tx.get("amount", 0))
            except (TypeError, ValueError):
                logger.debug("Transacción inválida, se omite: %s", tx)
                continue

            raw_category = (
                tx.get("internal_category")
                or tx.get("internalCategory")
                or tx.get("category")
                or tx.get("subcategory")
                or "otros"
            ).lower()
            category = raw_category.replace(" ", "_")
            timestamp = parse_datetime(
                tx.get("timestamp")
                or tx.get("transaction_date")
                or tx.get("transactionDate")
                or tx.get("date")
            )

            stats = grouped[user_id]
            stats["count"] += 1

            if amount >= 0:
                stats["income"] += amount
            else:
                expense = abs(amount)
                stats["expenses"] += expense
                stats["category_totals"][category] += expense
                if category in self.discretionary_categories:
                    stats["discretionary"] += expense
                else:
                    stats["essential"] += expense

            if timestamp:
                previous = stats["last_transaction_at"]
                stats["last_transaction_at"] = max(timestamp, previous) if previous else timestamp

        now = utcnow()
        features: List[UserFeatures] = []
        for user_id, stats in grouped.items():
            total_expenses = stats["expenses"]
            total_income = stats["income"]
            count = max(stats["count"], 1)
            average_transaction = (total_income + total_expenses) / count
            discretionary_ratio = stats["discretionary"] / total_expenses if total_expenses > 0 else 0.0
            essential_ratio = stats["essential"] / total_expenses if total_expenses > 0 else 0.0
            category_totals = dict(sorted(stats["category_totals"].items(), key=lambda item: item[1], reverse=True))
            top_category = next(iter(category_totals.keys()), None)

            features.append(
                UserFeatures(
                    user_id=user_id,
                    total_income=round(total_income, 2),
                    total_expenses=round(total_expenses, 2),
                    net_cash_flow=round(total_income - total_expenses, 2),
                    average_transaction=round(average_transaction, 2),
                    discretionary_ratio=round(discretionary_ratio, 4),
                    essential_ratio=round(essential_ratio, 4),
                    top_category=top_category,
                    category_totals=category_totals,
                    transaction_count=stats["count"],
                    last_transaction_at=stats["last_transaction_at"],
                    updated_at=now,
                )
            )

        return features


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

    async def get_feedback(self, user_id: str) -> List[FeedbackEntry]:
        async with self._lock:
            return list(self._feedback.get(user_id, []))


class RecommendationModelManager:
    def __init__(self, n_clusters: int = 4) -> None:
        self.n_clusters = n_clusters
        self.model: Optional[KMeans] = None
        self.user_labels: Dict[str, int] = {}
        self.cluster_profiles: Dict[int, Dict[str, float]] = {}
        self.last_trained_at: Optional[datetime] = None

    def train(self, features: List[UserFeatures]) -> None:
        if not features:
            self.model = None
            self.user_labels = {}
            self.cluster_profiles = {}
            self.last_trained_at = None
            return

        matrix = np.array(
            [
                [
                    feature.total_income,
                    feature.total_expenses,
                    feature.discretionary_ratio,
                    feature.average_transaction,
                    feature.net_cash_flow,
                ]
                for feature in features
            ],
            dtype=float,
        )

        if matrix.shape[0] == 1:
            self.model = None
            self.user_labels = {features[0].user_id: 0}
            self.cluster_profiles = {
                0: {
                    "avg_income": features[0].total_income,
                    "avg_expenses": features[0].total_expenses,
                    "avg_discretionary_ratio": features[0].discretionary_ratio,
                    "avg_cash_flow": features[0].net_cash_flow,
                }
            }
            self.last_trained_at = utcnow()
            return

        cluster_count = min(self.n_clusters, matrix.shape[0])
        model = KMeans(n_clusters=cluster_count, n_init="auto", random_state=42)
        labels = model.fit_predict(matrix)

        self.model = model
        self.user_labels = {feature.user_id: int(label) for feature, label in zip(features, labels)}
        self.cluster_profiles = self._build_cluster_profiles(features, labels)
        self.last_trained_at = utcnow()

    def _build_cluster_profiles(self, features: List[UserFeatures], labels: np.ndarray) -> Dict[int, Dict[str, float]]:
        clusters: Dict[int, Dict[str, Any]] = defaultdict(lambda: {
            "income": [],
            "expenses": [],
            "discretionary": [],
            "cash_flow": [],
        })

        for feature, label in zip(features, labels):
            cluster = clusters[int(label)]
            cluster["income"].append(feature.total_income)
            cluster["expenses"].append(feature.total_expenses)
            cluster["discretionary"].append(feature.discretionary_ratio)
            cluster["cash_flow"].append(feature.net_cash_flow)

        profiles: Dict[int, Dict[str, float]] = {}
        for label, stats in clusters.items():
            profiles[label] = {
                "avg_income": float(np.mean(stats["income"]) if stats["income"] else 0.0),
                "avg_expenses": float(np.mean(stats["expenses"]) if stats["expenses"] else 0.0),
                "avg_discretionary_ratio": float(np.mean(stats["discretionary"]) if stats["discretionary"] else 0.0),
                "avg_cash_flow": float(np.mean(stats["cash_flow"]) if stats["cash_flow"] else 0.0),
            }
        return profiles

    def get_cluster(self, user_id: str) -> Optional[int]:
        return self.user_labels.get(user_id)

    def generate_recommendations(self, features: UserFeatures) -> List[RecommendationRecord]:
        recommendations: List[RecommendationRecord] = []
        cluster = self.get_cluster(features.user_id)
        generated_at = utcnow()

        if features.total_expenses > features.total_income:
            over_budget = features.total_expenses - features.total_income
            expense_ratio = features.total_expenses / (features.total_income + 1e-6)
            recommendations.append(
                RecommendationRecord(
                    id=str(uuid4()),
                    user_id=features.user_id,
                    title="Controla tus gastos este mes",
                    description="Tus gastos superan a tus ingresos. Define un presupuesto semanal y congela compras innecesarias.",
                    score=min(1.0, round(expense_ratio, 2)),
                    category="control-de-gastos",
                    explanation=f"Estás gastando {expense_ratio:.2f} veces tus ingresos mensuales, con un exceso de {over_budget:,.0f}.",
                    generated_at=generated_at,
                    cluster=cluster,
                )
            )

        if features.discretionary_ratio > 0.3 and features.total_expenses > 0:
            recommendations.append(
                RecommendationRecord(
                    id=str(uuid4()),
                    user_id=features.user_id,
                    title="Reduce gastos discrecionales",
                    description="Establece límites para entretenimiento y servicios no esenciales por las próximas 4 semanas.",
                    score=min(1.0, round(features.discretionary_ratio / 0.3, 2)),
                    category="gasto-discrecional",
                    explanation=f"El {features.discretionary_ratio * 100:.1f}% de tus gastos son discrecionales.",
                    generated_at=generated_at,
                    cluster=cluster,
                )
            )

        if features.top_category and features.total_expenses > 0:
            top_value = features.category_totals.get(features.top_category, 0.0)
            share = top_value / features.total_expenses if features.total_expenses else 0.0
            if share > 0.25:
                recommendations.append(
                    RecommendationRecord(
                        id=str(uuid4()),
                        user_id=features.user_id,
                        title=f"Optimiza tus gastos en {features.top_category}",
                        description="Negocia precios o busca alternativas más económicas en tu categoría de mayor gasto.",
                        score=min(1.0, round(share / 0.25, 2)),
                        category="categoria-prioritaria",
                        explanation=f"La categoría {features.top_category} representa el {share * 100:.1f}% de tus gastos.",
                        generated_at=generated_at,
                        cluster=cluster,
                    )
                )

        if features.net_cash_flow > 0 and features.total_income > 0:
            savings_rate = features.net_cash_flow / (features.total_income + 1e-6)
            recommendations.append(
                RecommendationRecord(
                    id=str(uuid4()),
                    user_id=features.user_id,
                    title="Destina el excedente a tus metas",
                    description="Automatiza transferencias a ahorros o inversiones para consolidar tu superávit mensual.",
                    score=min(1.0, round(max(savings_rate, 0.15), 2)),
                    category="ahorro-inversion",
                    explanation=f"Tu flujo neto positivo es de {features.net_cash_flow:,.0f}, equivalente al {savings_rate * 100:.1f}% de tus ingresos.",
                    generated_at=generated_at,
                    cluster=cluster,
                )
            )
        elif features.net_cash_flow < 0:
            deficit = abs(features.net_cash_flow)
            recommendations.append(
                RecommendationRecord(
                    id=str(uuid4()),
                    user_id=features.user_id,
                    title="Ajusta tu flujo de caja",
                    description="Reduce gastos fijos y pospone compras grandes para recuperar flujo positivo.",
                    score=min(1.0, round(deficit / (features.total_income + 1e-6), 2) + 0.2),
                    category="flujo-caja",
                    explanation=f"Tu flujo neto es negativo en {deficit:,.0f} este período.",
                    generated_at=generated_at,
                    cluster=cluster,
                )
            )

        if cluster is not None:
            profile = self.cluster_profiles.get(cluster)
            if profile and features.net_cash_flow < profile.get("avg_cash_flow", 0):
                delta = profile.get("avg_cash_flow", 0) - features.net_cash_flow
                recommendations.append(
                    RecommendationRecord(
                        id=str(uuid4()),
                        user_id=features.user_id,
                        title="Aprende de tu grupo financiero",
                        description="Compara tus hábitos con usuarios similares y replica estrategias de ahorro efectivas.",
                        score=min(1.0, round(delta / (abs(profile.get("avg_cash_flow", 1)) + 1e-6), 2) + 0.1),
                        category="benchmarking",
                        explanation="Tu flujo neto está por debajo del promedio de tu clúster de comportamiento.",
                        generated_at=generated_at,
                        cluster=cluster,
                    )
                )

        if not recommendations:
            recommendations.append(
                RecommendationRecord(
                    id=str(uuid4()),
                    user_id=features.user_id,
                    title="Sigue consolidando tus finanzas",
                    description="Mantén tus hábitos, revisa tus metas y reserva un porcentaje fijo de tus ingresos.",
                    score=0.35,
                    category="buenas-practicas",
                    explanation="No se detectaron desviaciones relevantes en tu comportamiento reciente.",
                    generated_at=generated_at,
                    cluster=cluster,
                )
            )

        recommendations.sort(key=lambda rec: rec.score, reverse=True)
        return recommendations


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

    def _default_client_factory(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=self.timeout)

    async def fetch_transactions(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        if self.mode == "kafka":
            return await self._consume_from_kafka()
        if self.mode == "db":
            return await self._fetch_from_db(since)

        try:
            return await self._fetch_from_api(since)
        except APINotFoundError:
            if self.db_reader:
                logger.warning("Endpoint de movimientos no disponible; usando fallback a BD")
                return await self._fetch_from_db(since)
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
        model_manager: RecommendationModelManager,
        normalizer: TransactionNormalizer,
        repository: TransactionRepository,
        state_repository: IngestStateRepository,
        interval_seconds: int = 300,
    ) -> None:
        self.fetcher = fetcher
        self.builder = builder
        self.store = store
        self.model_manager = model_manager
        self.normalizer = normalizer
        self.repository = repository
        self.state_repository = state_repository
        self.interval_seconds = interval_seconds
        self._task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()
        self._last_run: Optional[datetime] = None
        self._last_summary: Optional[Dict[str, Any]] = None
        self._last_since: Optional[datetime] = None
        self._state_snapshot: Dict[str, datetime] = {}
        self._unauthorized = False

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

    async def run_once(self) -> Dict[str, Any]:
        async with self._lock:
            start_time = time.perf_counter()
            since = await self.state_repository.get_global_since()
            try:
                transactions = await self.fetcher.fetch_transactions(since)
                self._unauthorized = False

                ingest_start = time.perf_counter()
                normalized, invalid_count = self.normalizer.normalize_many(transactions)
                ingest_duration = time.perf_counter() - ingest_start
                INGEST_DURATION.observe(ingest_duration)

                ingested_count, duplicate_count = await self.repository.bulk_upsert(normalized)
                await self.state_repository.update_from_transactions(normalized)
                self._state_snapshot = await self.state_repository.snapshot()
                self._last_since = await self.state_repository.get_global_since()

                feature_source = await self.repository.fetch_all()
                if not feature_source and normalized:
                    feature_source = [item.to_feature_payload() for item in normalized]

                features = self.builder.build(feature_source)
                await self.store.bulk_upsert(features)
                all_features = await self.store.get_all()
                self.model_manager.train(all_features)

                skipped_total = invalid_count + duplicate_count

                TRANSACTIONS_INGESTED.inc(ingested_count)
                if skipped_total:
                    TRANSACTIONS_SKIPPED.inc(skipped_total)
                FEATURES_UPDATED.inc(len(features))
                USERS_TRACKED.set(len(all_features))
                PIPELINE_RUNS.labels(status="success").inc()
                PIPELINE_RUN_DURATION.observe(time.perf_counter() - start_time)

                summary = {
                    "status": "ok",
                    "transactions": len(transactions),
                    "normalized": len(normalized),
                    "ingested_count": ingested_count,
                    "skipped_count": skipped_total,
                    "invalid_count": invalid_count,
                    "duplicate_count": duplicate_count,
                    "features_updated": len(features),
                    "users_tracked": len(all_features),
                    "since": since.isoformat() if since else None,
                    "last_synced_at": self._last_since.isoformat() if self._last_since else None,
                    "ingest_duration_ms": round(ingest_duration * 1000, 2),
                }

                self._last_run = utcnow()
                self._last_summary = summary

                logger.info("Pipeline ejecutado: %s", summary)
                return summary
            except UnauthorizedError as error:
                PIPELINE_RUNS.labels(status="unauthorized").inc()
                duration = time.perf_counter() - start_time
                PIPELINE_RUN_DURATION.observe(duration)
                logger.error("Pipeline detenido por credenciales inválidas: %s", error)
                self._unauthorized = True
                summary = {
                    "status": "unauthorized",
                    "transactions": 0,
                    "normalized": 0,
                    "ingested_count": 0,
                    "skipped_count": 0,
                    "features_updated": 0,
                    "users_tracked": len(await self.store.get_all()),
                    "since": since.isoformat() if since else None,
                    "last_synced_at": self._last_since.isoformat() if self._last_since else None,
                }
                self._last_run = utcnow()
                self._last_summary = summary
                return summary
            except Exception:
                PIPELINE_RUNS.labels(status="error").inc()
                PIPELINE_RUN_DURATION.observe(time.perf_counter() - start_time)
                raise

    async def _schedule_loop(self) -> None:
        logger.info("Iniciando loop del pipeline con intervalo %ss", self.interval_seconds)
        try:
            while True:
                try:
                    if self._unauthorized:
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
            "last_summary": self._last_summary,
            "trained_at": self.model_manager.last_trained_at.isoformat() if self.model_manager.last_trained_at else None,
            "last_synced_at": self._last_since.isoformat() if self._last_since else None,
            "state_snapshot": {user: ts.isoformat() for user, ts in self._state_snapshot.items()},
            "unauthorized": self._unauthorized,
        }


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


class UserFeatureSummary(BaseModel):
    total_income: float
    total_expenses: float
    net_cash_flow: float
    average_transaction: float
    discretionary_ratio: float
    essential_ratio: float
    top_category: Optional[str]
    transaction_count: int
    last_transaction_at: Optional[datetime]


class PersonalizedRecommendationsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(..., alias="userId")
    generated_at: datetime = Field(..., alias="generatedAt")
    recommendations: List[RecommendationItem]
    feature_summary: UserFeatureSummary = Field(..., alias="featureSummary")


class FeedbackRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    recommendation_id: str = Field(..., alias="recommendationId")
    user_id: Optional[str] = Field(None, alias="userId")
    score: float = Field(..., ge=0.0, le=1.0)
    comment: Optional[str] = Field(None, max_length=500)


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: str
    submitted_at: datetime = Field(..., alias="submittedAt")


class PipelineStatusResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    mode: str
    interval_seconds: int = Field(..., alias="intervalSeconds")
    last_run: Optional[str] = Field(None, alias="lastRun")
    last_summary: Optional[Dict[str, Any]] = Field(None, alias="lastSummary")
    trained_at: Optional[str] = Field(None, alias="trainedAt")
    last_synced_at: Optional[str] = Field(None, alias="lastSyncedAt")
    state_snapshot: Dict[str, str] = Field(default_factory=dict, alias="stateSnapshot")
    unauthorized: bool = Field(False, alias="unauthorized")


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
model_manager = RecommendationModelManager(n_clusters=settings.pipeline_cluster_count)
transaction_normalizer = TransactionNormalizer()
database_client = DatabaseClient(settings.build_database_dsn())
db_reader = DatabaseTransactionReader(database_client, page_limit=settings.pipeline_page_limit)
transaction_repository = TransactionRepository(database_client)
state_repository = IngestStateRepository(database_client)
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
    model_manager=model_manager,
    normalizer=transaction_normalizer,
    repository=transaction_repository,
    state_repository=state_repository,
    interval_seconds=pipeline_interval,
)


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


@app.post("/pipeline/run", response_model=PipelineStatusResponse)
async def trigger_pipeline_run() -> PipelineStatusResponse:
    summary = await recommendation_pipeline.run_once()
    status = recommendation_pipeline.status()
    status["last_summary"] = summary
    return PipelineStatusResponse(**status)


@app.get("/pipeline/status", response_model=PipelineStatusResponse)
async def get_pipeline_status() -> PipelineStatusResponse:
    return PipelineStatusResponse(**recommendation_pipeline.status())


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
        top_category=features.top_category,
        transaction_count=features.transaction_count,
        last_transaction_at=features.last_transaction_at,
    )


@app.get("/recommendations/personalized/{user_id}", response_model=PersonalizedRecommendationsResponse)
async def get_personalized_recommendations(
    user_id: str,
    refresh: bool = Query(False, description="Forzar actualización del pipeline antes de responder"),
) -> PersonalizedRecommendationsResponse:
    if refresh:
        await recommendation_pipeline.run_once()

    features = await feature_store.get(user_id)
    if not features:
        logger.info("No se encontraron features para usuario %s, ejecutando pipeline de respaldo", user_id)
        await recommendation_pipeline.run_once()
        features = await feature_store.get(user_id)
        if not features:
            raise HTTPException(status_code=404, detail="No hay transacciones suficientes para generar recomendaciones")

    recommendations = model_manager.generate_recommendations(features)
    await recommendation_store.save(user_id, recommendations)

    RECOMMENDATIONS_SERVED.labels(endpoint="personalized").inc(len(recommendations))

    response = PersonalizedRecommendationsResponse(
        userId=user_id,
        generatedAt=utcnow(),
        recommendations=[RecommendationItem(**asdict(rec)) for rec in recommendations],
        featureSummary=UserFeatureSummary(
            total_income=features.total_income,
            total_expenses=features.total_expenses,
            net_cash_flow=features.net_cash_flow,
            average_transaction=features.average_transaction,
            discretionary_ratio=features.discretionary_ratio,
            essential_ratio=features.essential_ratio,
            top_category=features.top_category,
            transaction_count=features.transaction_count,
            last_transaction_at=features.last_transaction_at,
        ),
    )
    return response


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


@app.post("/recommendations/feedback", response_model=FeedbackResponse)
async def submit_feedback(feedback: FeedbackRequest) -> FeedbackResponse:
    entry = FeedbackEntry(
        recommendation_id=feedback.recommendation_id,
        user_id=feedback.user_id or "anonymous",
        score=feedback.score,
        comment=feedback.comment,
        created_at=utcnow(),
    )
    await recommendation_store.add_feedback(entry)
    FEEDBACK_SUBMISSIONS.labels(has_comment="yes" if feedback.comment else "no").inc()
    FEEDBACK_SCORE.observe(feedback.score)
    return FeedbackResponse(status="received", submittedAt=entry.created_at)


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
