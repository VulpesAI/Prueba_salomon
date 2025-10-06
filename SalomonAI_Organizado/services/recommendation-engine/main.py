import asyncio
import base64
import binascii
import hashlib
import json
import logging
import threading
import time
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from statistics import pstdev
from typing import Any, Callable, Dict, Iterable, List, Mapping, Optional, Protocol, Sequence, Set, Tuple
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
import yaml
from fastapi import Body, FastAPI, Header, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

from openai import AsyncOpenAI
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qm

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
    rule_key: Optional[str] = None
    evidence: Dict[str, Any] = field(default_factory=dict)


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


class SafeFormatDict(dict):
    """Formato seguro que mantiene los marcadores ausentes."""

    def __missing__(self, key: str) -> str:  # pragma: no cover - fallback simple
        return "{" + key + "}"


ESSENTIAL_CATEGORIES: Set[str] = {
    "arriendo",
    "alquiler",
    "rent",
    "renta",
    "servicios",
    "servicios básicos",
    "electricidad",
    "luz",
    "agua",
    "gas",
    "educación",
    "educacion",
    "colegio",
    "salud",
    "medico",
    "médico",
    "medicina",
    "farmacia",
}


@dataclass
class RuleFallback:
    title: str
    message: str
    priority: int = 5
    score: float = 0.55
    category: str = "education"
    explanation: str = "Recomendación educativa por guardrail"


@dataclass
class RuleActionTemplate:
    title: str
    message_template: str
    category: str
    explanation: str
    actions: List[Dict[str, Any]] = field(default_factory=list)
    language: str = "es-CL"

    def render(self, context: Mapping[str, Any]) -> Tuple[str, str, List[Dict[str, Any]]]:
        formatter = SafeFormatDict(context)
        title = self.title.format_map(formatter)
        message = self.message_template.format_map(formatter)
        rendered_actions: List[Dict[str, Any]] = []
        for action in self.actions:
            if not isinstance(action, dict):
                continue
            action_formatter = SafeFormatDict({**context, **action})
            rendered_actions.append(
                {
                    "type": str(action.get("type") or "education"),
                    "label": str(action.get("label") or "Ver detalle").format_map(action_formatter),
                    "url": action.get("url"),
                }
            )
        return title, message, rendered_actions


@dataclass
class RuleDefinition:
    rule_key: str
    enabled: bool
    windows: Tuple[str, ...]
    preconditions: Dict[str, Any]
    triggers: Dict[str, Any]
    evidence_config: Dict[str, Any]
    action: RuleActionTemplate
    priority: int
    base_score: float
    max_repeats_per_month: int
    tags: Tuple[str, ...] = ()
    policy: Optional[str] = None
    fallback: Optional[RuleFallback] = None
    description: Optional[str] = None

    @classmethod
    def from_dict(cls, raw: Mapping[str, Any]) -> "RuleDefinition":
        rule_key = str(raw.get("rule_key") or raw.get("key") or "").strip()
        if not rule_key:
            raise ValueError("rule_key is required")
        enabled = bool(raw.get("enabled", True))
        windows_raw = raw.get("windows")
        if isinstance(windows_raw, str):
            windows = (windows_raw.lower(),)
        elif isinstance(windows_raw, Iterable):
            windows = tuple(str(item).lower() for item in windows_raw if str(item).strip())
        else:
            windows = ()
        preconditions = dict(raw.get("preconditions") or {})
        triggers = dict(raw.get("triggers") or {})
        evidence_config = dict(raw.get("evidence") or {})
        action_raw = raw.get("action") or {}
        title = str(action_raw.get("title") or raw.get("title") or rule_key.replace("_", " ").title())
        message_template = str(action_raw.get("message_template") or action_raw.get("message") or "")
        if not message_template:
            raise ValueError(f"Rule {rule_key} requires an action message_template")
        category = str(action_raw.get("category") or raw.get("category") or "general")
        explanation = str(action_raw.get("explanation") or raw.get("explanation") or "Regla dinámica")
        actions_field = action_raw.get("actions") or []
        actions: List[Dict[str, Any]] = []
        if isinstance(actions_field, Mapping):
            actions = [dict(actions_field)]
        elif isinstance(actions_field, Iterable):
            actions = [dict(item) for item in actions_field if isinstance(item, Mapping)]
        action = RuleActionTemplate(
            title=title,
            message_template=message_template,
            category=category,
            explanation=explanation,
            actions=actions,
            language=str(action_raw.get("language") or "es-CL"),
        )
        priority = int(raw.get("priority", 5))
        base_score = float(raw.get("base_score", raw.get("score", 0.7)))
        max_repeats_per_month = int(raw.get("max_repeats_per_month", raw.get("max_repeats", 0)))
        tags_field = raw.get("tags")
        if isinstance(tags_field, str):
            tags = (tags_field.lower(),)
        elif isinstance(tags_field, Iterable):
            tags = tuple(str(tag).lower() for tag in tags_field if str(tag).strip())
        else:
            tags = ()
        policy = str(raw.get("policy") or "").strip() or None
        fallback_raw = raw.get("fallback")
        fallback: Optional[RuleFallback]
        if isinstance(fallback_raw, Mapping):
            fallback = RuleFallback(
                title=str(fallback_raw.get("title") or "Paso educativo"),
                message=str(
                    fallback_raw.get("message")
                    or "Revisa tu presupuesto base y asegura el pago de categorías esenciales."
                ),
                priority=int(fallback_raw.get("priority", 5)),
                score=float(fallback_raw.get("score", 0.55)),
                category=str(fallback_raw.get("category") or "education"),
                explanation=str(
                    fallback_raw.get("explanation")
                    or "Guardrail activado: se ofrece contenido educativo"
                ),
            )
        else:
            fallback = None
        description = raw.get("description")
        return cls(
            rule_key=rule_key,
            enabled=enabled,
            windows=windows,
            preconditions=preconditions,
            triggers=triggers,
            evidence_config=evidence_config,
            action=action,
            priority=priority,
            base_score=base_score,
            max_repeats_per_month=max_repeats_per_month,
            tags=tags,
            policy=policy,
            fallback=fallback,
            description=str(description) if description is not None else None,
        )

    def applies_to_window(self, window: Optional[str]) -> bool:
        if not self.windows:
            return True
        if not window:
            return False
        return window.lower() in self.windows


@dataclass
class RuleTraceEntry:
    rule: str
    passed_preconditions: bool
    triggered: bool
    reason: Optional[str] = None
    score: Optional[float] = None
    emitted: bool = False
    guardrail: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None


@dataclass
class RuleMetrics:
    positive: int = 0
    total: int = 0
    satisfaction_total: float = 0.0
    satisfaction_count: int = 0
    last_updated: datetime = field(default_factory=utcnow)

    @property
    def accept_rate(self) -> Optional[float]:
        if self.total <= 0:
            return None
        return self.positive / self.total


class RuleMetricsTracker:
    def __init__(self, min_accept: float, score_mode: str) -> None:
        self._min_accept = min_accept
        self._score_mode = score_mode
        self._metrics: Dict[str, RuleMetrics] = {}
        self._lock = threading.Lock()

    def _is_positive(self, score: Optional[int]) -> Optional[bool]:
        if score is None:
            return None
        if self._score_mode == "five_star":
            return score >= 4
        return score > 0

    def record_feedback(self, rule_key: Optional[str], score: Optional[int], satisfaction: Optional[float] = None) -> None:
        if not rule_key:
            return
        with self._lock:
            metrics = self._metrics.setdefault(rule_key, RuleMetrics())
            metrics.total += 1
            positive = self._is_positive(score)
            if positive:
                metrics.positive += 1
            if satisfaction is not None:
                metrics.satisfaction_total += satisfaction
                metrics.satisfaction_count += 1
            metrics.last_updated = utcnow()

    def snapshot(self) -> Dict[str, Dict[str, Any]]:
        with self._lock:
            return {
                key: {
                    "accept_rate": metrics.accept_rate,
                    "total": metrics.total,
                    "positive": metrics.positive,
                }
                for key, metrics in self._metrics.items()
            }

    def adjust_priority(self, rule_key: str, base_priority: int) -> int:
        with self._lock:
            metrics = self._metrics.get(rule_key)
            if not metrics or metrics.total < 5:
                return base_priority
            accept_rate = metrics.accept_rate
            if accept_rate is not None and accept_rate < self._min_accept:
                return min(base_priority + 1, 10)
            if accept_rate is not None and accept_rate > 0.8:
                return max(base_priority - 1, 1)
            return base_priority

    def adjust_score(self, rule_key: str, score: float) -> float:
        with self._lock:
            metrics = self._metrics.get(rule_key)
            if not metrics or metrics.total < 5:
                return score
            accept_rate = metrics.accept_rate
            if accept_rate is None:
                return score
            if accept_rate < self._min_accept:
                return max(score * 0.85, 0.2)
            if accept_rate > 0.85:
                return min(score + 0.05, 1.0)
            return score


class RuleConfigLoader:
    def __init__(self, path: str, *, hot_reload: bool = False) -> None:
        base_path = Path(path)
        if not base_path.is_absolute():
            base_path = (Path(__file__).resolve().parent / base_path).resolve()
        self._path = base_path
        self._hot_reload = hot_reload
        self._lock = threading.Lock()
        self._rules: List[RuleDefinition] = []
        self._last_mtime: float = 0.0
        self._load_rules()

    def _load_rules(self) -> None:
        rules: List[RuleDefinition] = []
        try:
            if not self._path.exists():
                logger.warning("rules_config_missing", extra={"path": str(self._path)})
            else:
                with self._path.open("r", encoding="utf-8") as handle:
                    payload = yaml.safe_load(handle) or []
                if isinstance(payload, Mapping):
                    entries = payload.get("rules") or payload.get("items") or []
                else:
                    entries = payload
                if not isinstance(entries, Iterable):
                    entries = []
                for entry in entries:
                    if not isinstance(entry, Mapping):
                        continue
                    try:
                        rules.append(RuleDefinition.from_dict(entry))
                    except Exception as exc:  # pragma: no cover - config errors should not break service
                        logger.warning("rules_config_invalid_entry", extra={"error": str(exc), "entry": entry})
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("rules_config_load_failed", extra={"error": str(exc), "path": str(self._path)})
            rules = []
        with self._lock:
            self._rules = rules
            try:
                self._last_mtime = self._path.stat().st_mtime
            except OSError:
                self._last_mtime = 0.0

    def _maybe_reload(self) -> None:
        if not self._hot_reload:
            return
        try:
            mtime = self._path.stat().st_mtime
        except OSError:
            mtime = 0.0
        if mtime and mtime != self._last_mtime:
            self._load_rules()

    def load(self, policy: Optional[str] = None) -> List[RuleDefinition]:
        self._maybe_reload()
        with self._lock:
            rules = list(self._rules)
        if policy:
            return [rule for rule in rules if rule.policy in {None, policy}]
        return rules


class RecommendationRuleEngine:
    def __init__(
        self,
        settings: "RecommendationSettings",
        loader: RuleConfigLoader,
        metrics: RuleMetricsTracker,
    ) -> None:
        self.settings = settings
        self.loader = loader
        self.metrics = metrics
        self.essential_categories = {item.lower() for item in ESSENTIAL_CATEGORIES}
        self._history: Dict[Tuple[str, str], List[datetime]] = defaultdict(list)
        self._lock = threading.Lock()

    def _window_to_days(self, window: Optional[str]) -> Optional[int]:
        if not window:
            return None
        window = window.lower()
        if window.endswith("d"):
            try:
                return int(window[:-1])
            except ValueError:
                return None
        if window == "month":
            return 30
        return None

    def _net_cashflow(self, features: UserFeatures, windows: Mapping[str, WindowedUserFeatures], window: Optional[str]) -> float:
        if window:
            snapshot = windows.get(window)
            if snapshot:
                return float(snapshot.net_cashflow)
        return float(features.net_cash_flow)

    def _category_share(
        self,
        features: UserFeatures,
        windows: Mapping[str, WindowedUserFeatures],
        category: str,
        window: Optional[str],
    ) -> float:
        category_key = category.lower()
        if window:
            snapshot = windows.get(window)
            if snapshot:
                share = snapshot.category_shares.get(category_key)
                if share is not None:
                    try:
                        return float(share)
                    except (TypeError, ValueError):
                        return 0.0
        share = features.category_shares.get(category_key)
        if share is None:
            return 0.0
        try:
            return float(share)
        except (TypeError, ValueError):
            return 0.0

    def _top_non_essential_category(self, features: UserFeatures) -> Tuple[Optional[str], float]:
        sorted_items = sorted(
            ((key, value) for key, value in features.category_shares.items()),
            key=lambda item: item[1],
            reverse=True,
        )
        for category, share in sorted_items:
            normalized = str(category).lower()
            if normalized in self.essential_categories:
                continue
            try:
                return str(category), float(share)
            except (TypeError, ValueError):
                continue
        return None, 0.0

    def _check_preconditions(
        self,
        rule: RuleDefinition,
        features: UserFeatures,
        windows: Mapping[str, WindowedUserFeatures],
    ) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        context: Dict[str, Any] = {}
        target_window = features.window.lower() if features.window else None
        if rule.windows and target_window and target_window not in rule.windows:
            # Permitir reglas de 30d cuando solo hay 90d si el contexto existe
            if not any(window in windows for window in rule.windows):
                return False, "window_mismatch", context
        min_days = max(
            int(rule.preconditions.get("min_days_history", 0) or 0),
            int(self.settings.min_days_history),
        )
        available_days = self._window_to_days(features.window) or 0
        if available_days and available_days < min_days:
            return False, "insufficient_history", context
        min_tx = max(
            int(rule.preconditions.get("min_tx_per_window", 0) or 0),
            int(self.settings.min_tx_per_window),
        )
        if features.transaction_count < min_tx:
            return False, "insufficient_transactions", context
        required_features = rule.preconditions.get("require_features") or []
        if isinstance(required_features, Iterable):
            for feature_name in required_features:
                attr = getattr(features, feature_name, None)
                if attr in {None, 0}:
                    return False, f"missing_feature:{feature_name}", context
        return True, None, context

    def _check_guardrails(
        self,
        rule: RuleDefinition,
        features: UserFeatures,
        context: Dict[str, Any],
    ) -> Tuple[bool, Optional[str]]:
        if self.settings.investing_guardrail and any(tag in {"investing", "investment"} for tag in rule.tags):
            return False, "investing_guardrail"
        if rule.preconditions.get("exclude_categories_essential"):
            category = context.get("top_overspend_category")
            if category and str(category).lower() in self.essential_categories:
                return False, "essential_category"
        return True, None

    def _evaluate_triggers(
        self,
        rule: RuleDefinition,
        features: UserFeatures,
        windows: Mapping[str, WindowedUserFeatures],
    ) -> Tuple[bool, Dict[str, Any], Optional[str]]:
        context: Dict[str, Any] = {}
        triggers = rule.triggers
        if not triggers:
            return True, context, None

        if "savings_rate_lt" in triggers:
            try:
                threshold = float(triggers["savings_rate_lt"])
            except (TypeError, ValueError):
                threshold = 0.0
            context["savings_rate"] = features.savings_rate
            context["savings_threshold"] = threshold
            if not (features.savings_rate < threshold):
                return False, context, "savings_rate"

        if triggers.get("expenses_gte_income"):
            if not (features.total_expenses >= features.total_income > 0):
                return False, context, "expenses_vs_income"

        if "category_share_gt" in triggers:
            raw = triggers["category_share_gt"]
            if isinstance(raw, Mapping):
                category = str(raw.get("category") or raw.get("name") or "")
                window = str(raw.get("window") or "").lower() or None
                threshold = float(raw.get("threshold") or raw.get("value") or 0.0)
            else:
                category = str(raw)
                window = None
                threshold = 0.0
            if not category:
                return False, context, "invalid_category"
            share = self._category_share(features, windows, category, window)
            context["category"] = category
            context["category_share"] = share
            context["category_share_threshold"] = threshold
            if not (share > threshold):
                return False, context, "category_share"
            context["category_share_pct"] = round(share * 100, 1)

        if "recurring_category" in triggers:
            category = str(triggers["recurring_category"]).lower()
            recurring = bool(features.recurring_flags.get(category))
            if not recurring:
                recurring = any(
                    snapshot.recurring_flags.get(category)
                    for snapshot in windows.values()
                    if isinstance(snapshot.recurring_flags, Mapping)
                )
            context["recurring_category"] = category
            if not recurring:
                return False, context, "recurring"

        if "net_cashflow_lt" in triggers:
            raw = triggers["net_cashflow_lt"]
            if isinstance(raw, Mapping):
                threshold = float(raw.get("value") or raw.get("threshold") or 0.0)
                window = str(raw.get("window") or "").lower() or None
            else:
                threshold = float(raw or 0.0)
                window = None
            net_cashflow = self._net_cashflow(features, windows, window)
            context["net_cashflow"] = net_cashflow
            context["net_cashflow_threshold"] = threshold
            if not (net_cashflow < threshold):
                return False, context, "net_cashflow"

        if rule.preconditions.get("exclude_categories_essential") and "top_overspend_category" not in context:
            category, share = self._top_non_essential_category(features)
            if category:
                context["top_overspend_category"] = category
                context["top_overspend_share"] = share
                context["top_overspend_share_pct"] = round(share * 100, 1)

        return True, context, None

    def _compute_score(self, rule: RuleDefinition, context: Mapping[str, Any]) -> float:
        score = max(min(rule.base_score, 1.0), 0.0)
        if "savings_threshold" in context and context.get("savings_threshold"):
            threshold = float(context["savings_threshold"])
            actual = float(context.get("savings_rate", 0.0))
            if threshold > 0:
                severity = max(min((threshold - actual) / threshold, 1.0), 0.0)
                score = max(score, self.settings.min_confidence + severity * 0.4)
        if "category_share_threshold" in context and context.get("category_share_threshold"):
            threshold = float(context["category_share_threshold"])
            share = float(context.get("category_share", 0.0))
            if threshold > 0:
                severity = max(min((share - threshold) / threshold, 1.0), 0.0)
                score = max(score, self.settings.min_confidence + severity * 0.3)
        if "net_cashflow_threshold" in context:
            threshold = float(context["net_cashflow_threshold"])
            value = float(context.get("net_cashflow", 0.0))
            if threshold < 0:
                severity = max(min((threshold - value) / abs(threshold), 1.0), 0.0)
                score = max(score, self.settings.min_confidence + severity * 0.3)
        return max(min(score, 1.0), 0.0)

    def _build_evidence(self, rule: RuleDefinition, context: Mapping[str, Any]) -> Dict[str, Any]:
        evidence: Dict[str, Any] = {}
        required = rule.evidence_config.get("require_features") or []
        if isinstance(required, Iterable):
            for name in required:
                value = context.get(name)
                if value is None:
                    continue
                evidence[name] = value
        if "category_share_pct" in context:
            evidence.setdefault("category_share_pct", context["category_share_pct"])
        if "top_overspend_category" in context:
            evidence.setdefault("top_overspend_category", context["top_overspend_category"])
            evidence.setdefault("top_overspend_share_pct", context.get("top_overspend_share_pct"))
        if "net_cashflow" in context:
            evidence.setdefault("net_cashflow", round(float(context["net_cashflow"]), 2))
        if "savings_rate" in context:
            evidence.setdefault("savings_rate", round(float(context["savings_rate"]), 3))
        return evidence

    def _exceeded_max_repeats(self, user_id: str, rule: RuleDefinition, now: datetime) -> bool:
        if rule.max_repeats_per_month <= 0:
            return False
        key = (user_id, rule.rule_key)
        cutoff = now - timedelta(days=30)
        with self._lock:
            history = self._history.get(key, [])
            history = [item for item in history if item >= cutoff]
            self._history[key] = history
            if len(history) >= rule.max_repeats_per_month:
                return True
        return False

    def _register_emission(self, user_id: str, rule: RuleDefinition, timestamp: datetime) -> None:
        if rule.max_repeats_per_month <= 0:
            return
        key = (user_id, rule.rule_key)
        with self._lock:
            self._history.setdefault(key, []).append(timestamp)

    def evaluate(
        self,
        features: UserFeatures,
        windows: Mapping[str, WindowedUserFeatures],
        *,
        policy: Optional[str] = None,
        now: Optional[datetime] = None,
    ) -> Tuple[List[RecommendationRecord], List[RuleTraceEntry]]:
        now = now or utcnow()
        results: List[RecommendationRecord] = []
        traces: List[RuleTraceEntry] = []
        rules = self.loader.load(policy)
        for rule in rules:
            if not rule.enabled:
                continue
            pre_ok, pre_reason, pre_context = self._check_preconditions(rule, features, windows)
            trace = RuleTraceEntry(rule=rule.rule_key, passed_preconditions=pre_ok, triggered=False)
            if not pre_ok:
                trace.reason = pre_reason
                traces.append(trace)
                continue
            triggered, trigger_context, trigger_reason = self._evaluate_triggers(rule, features, windows)
            trace.triggered = triggered
            context = {**pre_context, **trigger_context}
            if not triggered:
                trace.reason = trigger_reason
                traces.append(trace)
                continue
            guard_ok, guard_reason = self._check_guardrails(rule, features, context)
            trace.guardrail = guard_reason
            if not guard_ok:
                if rule.fallback:
                    fallback_record = RecommendationRecord(
                        id=str(uuid4()),
                        user_id=features.user_id,
                        title=rule.fallback.title,
                        description=rule.fallback.message,
                        score=max(rule.fallback.score, self.settings.min_confidence),
                        category=rule.fallback.category,
                        explanation=rule.fallback.explanation,
                        generated_at=now,
                        source="rules",
                        priority=rule.fallback.priority,
                        payload={
                            "rule_key": f"{rule.rule_key}:fallback",
                            "actions": [],
                            "evidence": {},
                            "guardrail": guard_reason,
                        },
                        rule_key=f"{rule.rule_key}:fallback",
                        evidence={},
                    )
                    results.append(fallback_record)
                    trace.reason = guard_reason
                    trace.emitted = True
                else:
                    trace.reason = guard_reason
                traces.append(trace)
                continue
            score = self._compute_score(rule, context)
            score = self.metrics.adjust_score(rule.rule_key, score)
            if score < self.settings.min_confidence:
                trace.reason = "low_confidence"
                trace.score = score
                traces.append(trace)
                continue
            if self._exceeded_max_repeats(features.user_id, rule, now):
                trace.reason = "max_repeats"
                trace.score = score
                traces.append(trace)
                continue
            title, message, actions = rule.action.render(context)
            evidence = self._build_evidence(rule, context)
            priority = self.metrics.adjust_priority(rule.rule_key, rule.priority)
            payload = {
                "rule_key": rule.rule_key,
                "actions": actions,
                "evidence": evidence,
                "policy": rule.policy,
            }
            record = RecommendationRecord(
                id=str(uuid4()),
                user_id=features.user_id,
                title=title,
                description=message,
                score=score,
                category=rule.action.category,
                explanation=rule.action.explanation,
                generated_at=now,
                priority=priority,
                payload=payload,
                rule_key=rule.rule_key,
                evidence=evidence,
            )
            results.append(record)
            trace.emitted = True
            trace.score = score
            trace.evidence = evidence
            traces.append(trace)
            self._register_emission(features.user_id, rule, now)
        ranked = sorted(results, key=lambda item: (item.priority, -item.score))
        return ranked, traces

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


class EmbeddingGenerator(Protocol):
    async def generate(self, texts: Sequence[str]) -> List[List[float]]:
        ...


class OpenAIEmbeddingGenerator:
    def __init__(self, client: AsyncOpenAI, model: str, dimensions: int) -> None:
        self._client = client
        self._model = model
        self._dimensions = dimensions

    async def generate(self, texts: Sequence[str]) -> List[List[float]]:
        if not texts:
            return []
        response = await self._client.embeddings.create(model=self._model, input=list(texts))
        ordered = sorted(response.data, key=lambda item: getattr(item, "index", 0))
        embeddings: List[List[float]] = []
        for item in ordered:
            vector = [float(value) for value in item.embedding]
            if len(vector) != self._dimensions:
                raise ValueError("embedding_dimension_mismatch")
            embeddings.append(vector)
        return embeddings


def compute_user_hash(user_id: str) -> str:
    digest = hashlib.sha256(user_id.encode("utf-8")).hexdigest()
    return digest


def build_user_profile_text(user_hash: str, features: Dict[str, Any]) -> str:
    shares = json.dumps(features.get("category_shares", {}), ensure_ascii=False, sort_keys=True)
    totals = json.dumps(features.get("category_totals", {}), ensure_ascii=False, sort_keys=True)
    recurring = json.dumps(features.get("recurring_flags", {}), ensure_ascii=False, sort_keys=True)
    last_transaction = features.get("last_transaction_at")
    lines = [
        f"Perfil financiero usuario {user_hash}:",
        f"window={features.get('window', '90d')}",
        f"ingresos_mensuales={features.get('income_total')}",
        f"gastos_mensuales={features.get('expense_total')}",
        f"neto={features.get('net_cashflow')}",
        f"tasa_ahorro={features.get('savings_rate')}",
        f"top_category={features.get('top_category')}",
        f"shares={shares}",
        f"totales={totals}",
        f"recurrencias={recurring}",
        f"volatilidad_gasto={features.get('volatility_expense')}",
        f"discrecional={features.get('discretionary_ratio')}",
        f"esencial={features.get('essential_ratio')}",
        f"promedio_transaccion={features.get('average_transaction')}",
        f"merchant_diversity={features.get('merchant_diversity')}",
        f"transaction_count={features.get('transaction_count')}",
        f"ultimo_movimiento={last_transaction}",
    ]
    return "\n".join(str(line) for line in lines)


class QdrantEmbeddingSynchronizer:
    def __init__(
        self,
        client: AsyncQdrantClient,
        generator: EmbeddingGenerator,
        *,
        user_collection: str,
        item_collection: Optional[str],
        vector_size: int,
        model: str,
        version: str = "v1",
    ) -> None:
        self._client = client
        self._generator = generator
        self._user_collection = user_collection
        self._item_collection = item_collection
        self._vector_size = vector_size
        self._model = model
        self._version = version
        self._collections_ready = False
        self._lock = asyncio.Lock()

    async def ensure_collections(self) -> None:
        if self._collections_ready:
            return
        async with self._lock:
            if self._collections_ready:
                return
            response = await self._client.get_collections()
            existing = {collection.name for collection in getattr(response, "collections", [])}
            params = qm.VectorParams(size=self._vector_size, distance=qm.Distance.COSINE)
            if self._user_collection not in existing:
                await self._client.recreate_collection(
                    collection_name=self._user_collection,
                    vectors_config=params,
                )
            if self._item_collection and self._item_collection not in existing:
                await self._client.recreate_collection(
                    collection_name=self._item_collection,
                    vectors_config=params,
                )
            self._collections_ready = True

    def _build_feature_payload(self, features: "UserFeatures") -> Dict[str, Any]:
        payload = {
            "window": features.window,
            "income_total": float(features.total_income),
            "expense_total": float(features.total_expenses),
            "net_cashflow": float(features.net_cash_flow),
            "savings_rate": float(features.savings_rate),
            "top_category": features.top_category,
            "category_shares": dict(features.category_shares),
            "category_totals": dict(features.category_totals),
            "recurring_flags": dict(features.recurring_flags),
            "volatility_expense": float(features.volatility_expense),
            "merchant_diversity": int(features.merchant_diversity),
            "transaction_count": int(features.transaction_count),
            "discretionary_ratio": float(features.discretionary_ratio),
            "essential_ratio": float(features.essential_ratio),
            "average_transaction": float(features.average_transaction),
            "last_transaction_at": ensure_utc(features.last_transaction_at).isoformat()
            if features.last_transaction_at
            else None,
        }
        return payload

    async def sync_user_profiles(self, features: Mapping[str, "UserFeatures"]) -> Dict[str, Any]:
        if not features:
            return {"status": "skipped", "reason": "no_users"}

        await self.ensure_collections()
        start = time.perf_counter()
        entries: List[Tuple[str, str, Dict[str, Any], str]] = []
        skipped = 0
        for user_id, feature in features.items():
            if not user_id:
                skipped += 1
                continue
            user_hash = compute_user_hash(user_id)
            feature_payload = self._build_feature_payload(feature)
            feature_payload.setdefault("window", feature.window)
            feature_payload.setdefault("model", self._model)
            as_of = ensure_utc(feature.updated_at).isoformat()
            feature_payload.setdefault("as_of", as_of)
            text = build_user_profile_text(user_hash, feature_payload)
            entries.append((user_hash, text, feature_payload, as_of))

        if not entries:
            return {"status": "skipped", "reason": "no_profiles"}

        vectors = await self._generator.generate([entry[1] for entry in entries])
        if len(vectors) != len(entries):
            raise RuntimeError("embedding_count_mismatch")

        points: List[qm.PointStruct] = []
        for (user_hash, _, feature_payload, as_of_date), vector in zip(entries, vectors):
            if len(vector) != self._vector_size:
                raise ValueError("embedding_dimension_mismatch")
            payload = {
                "user_id_hash": user_hash,
                "as_of_date": as_of_date,
                "features": feature_payload,
                "model": self._model,
                "version": self._version,
            }
            points.append(
                qm.PointStruct(
                    id=user_hash,
                    vector=vector,
                    payload=payload,
                )
            )

        await self._client.upsert(collection_name=self._user_collection, points=points, wait=True)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        return {
            "status": "ok",
            "synced": len(points),
            "skipped": skipped,
            "model": self._model,
            "duration_ms": duration_ms,
        }

    async def find_similar_users(self, user_id: str, top_k: int = 20) -> List[Dict[str, Any]]:
        if top_k <= 0:
            return []
        await self.ensure_collections()
        user_hash = compute_user_hash(user_id)
        records = await self._client.retrieve(
            collection_name=self._user_collection,
            ids=[user_hash],
            with_vectors=True,
        )
        if not records:
            raise ValueError("vector_not_found_for_user")
        reference = records[0]
        vector = getattr(reference, "vector", None)
        if vector is None:
            raise ValueError("vector_not_found_for_user")
        results = await self._client.search(
            collection_name=self._user_collection,
            query_vector=vector,
            limit=top_k + 1,
            with_payload=True,
        )
        neighbors: List[Dict[str, Any]] = []
        for item in results:
            if str(item.id) == user_hash:
                continue
            payload = getattr(item, "payload", {}) or {}
            neighbor_hash = str(payload.get("user_id_hash") or item.id)
            neighbors.append({"user_id_hash": neighbor_hash, "score": float(item.score)})
            if len(neighbors) >= top_k:
                break
        return neighbors

    async def recommend_by_similarity(self, user_id: str, top_k: int = 5) -> Dict[str, Any]:
        neighbors = await self.find_similar_users(user_id, top_k=top_k)
        return {"user_id": compute_user_hash(user_id), "neighbors": neighbors}

    async def close(self) -> None:
        await self._client.close()


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
                    if record.rule_key:
                        payload.setdefault("rule_key", record.rule_key)
                    if record.evidence:
                        payload.setdefault("evidence", record.evidence)
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
        self.rule_metrics = RuleMetricsTracker(settings.rule_min_accept, settings.feedback_score_mode)
        self.rule_loader = RuleConfigLoader(settings.rules_config_path, hot_reload=settings.rules_hot_reload)
        self.rule_engine = RecommendationRuleEngine(settings, self.rule_loader, self.rule_metrics)
        self._user_windows: Dict[str, Dict[str, WindowedUserFeatures]] = defaultdict(dict)
        self._decision_traces: Dict[str, List[RuleTraceEntry]] = {}

    def update_window_features(self, snapshots: Sequence[WindowedUserFeatures]) -> None:
        for snapshot in snapshots:
            window_label = snapshot.window.lower()
            self._user_windows.setdefault(snapshot.user_id, {})[window_label] = snapshot

    def get_window_features(self, user_id: str) -> Dict[str, WindowedUserFeatures]:
        return dict(self._user_windows.get(user_id, {}))

    def last_trace(self, user_id: str) -> List[RuleTraceEntry]:
        return list(self._decision_traces.get(user_id, []))

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

    def evaluate(
        self,
        features: UserFeatures,
        *,
        policy: Optional[str] = None,
        include_cluster: bool = True,
    ) -> Tuple[List[RecommendationRecord], List[RuleTraceEntry]]:
        now = utcnow()
        windows = self.get_window_features(features.user_id)
        rule_records, trace_entries = self.rule_engine.evaluate(features, windows, policy=policy, now=now)
        combined = list(rule_records)

        if include_cluster:
            cluster_id = self.user_labels.get(features.user_id)
            cluster_records, cluster_traces = self._cluster_recommendations(features, cluster_id, now)
            combined.extend(cluster_records)
            trace_entries.extend(cluster_traces)

        combined = sorted(combined, key=lambda item: (item.priority, -item.score))
        limited = combined[: settings.max_recs_per_run]
        self._decision_traces[features.user_id] = trace_entries
        return limited, trace_entries

    def generate_recommendations(
        self, features: UserFeatures, *, policy: Optional[str] = None
    ) -> List[RecommendationRecord]:
        records, _ = self.evaluate(features, policy=policy)
        return records

    def _cluster_recommendations(
        self,
        features: UserFeatures,
        cluster_id: Optional[int],
        now: datetime,
    ) -> Tuple[List[RecommendationRecord], List[RuleTraceEntry]]:
        if cluster_id is None:
            return [], []
        profile = self.cluster_profiles.get(cluster_id, {})
        recs: List[RecommendationRecord] = []
        traces: List[RuleTraceEntry] = []

        def _append(record: RecommendationRecord, rule_suffix: str, evidence: Dict[str, Any]) -> None:
            record.rule_key = f"cluster_{rule_suffix}"
            record.evidence = evidence
            record.payload.setdefault("rule_key", record.rule_key)
            record.payload.setdefault("evidence", evidence)
            recs.append(record)
            traces.append(
                RuleTraceEntry(
                    rule=record.rule_key,
                    passed_preconditions=True,
                    triggered=True,
                    reason=None,
                    score=record.score,
                    emitted=True,
                    evidence=evidence,
                )
            )

        if profile.get("savings_rate", 0.0) < 0.15:
            evidence = {
                "cluster_id": cluster_id,
                "cluster_savings_rate": round(float(profile.get("savings_rate", 0.0)), 3),
                "user_savings_rate": round(float(features.savings_rate), 3),
            }
            record = RecommendationRecord(
                id=str(uuid4()),
                user_id=features.user_id,
                title="Refuerza tu fondo de emergencia",
                description="Usuarios similares ahorran poco. Automatiza un aporte mensual y protege tu liquidez.",
                score=max(0.82, settings.min_confidence),
                category="cluster",
                explanation="Cluster con baja tasa de ahorro promedio.",
                generated_at=now,
                cluster=cluster_id,
                source="cluster",
                priority=3,
                payload={"type": "cluster_low_savings", "cluster_id": cluster_id},
            )
            _append(record, "low_savings", evidence)

        if profile.get("expense_total", 0.0) > profile.get("income_total", 0.0):
            evidence = {
                "cluster_id": cluster_id,
                "cluster_expense_total": round(float(profile.get("expense_total", 0.0)), 2),
                "cluster_income_total": round(float(profile.get("income_total", 0.0)), 2),
            }
            record = RecommendationRecord(
                id=str(uuid4()),
                user_id=features.user_id,
                title="Ajusta tu flujo de caja",
                description="El promedio de tu clúster gasta por sobre sus ingresos. Evalúa consolidar deudas y activar alertas.",
                score=max(0.78, settings.min_confidence),
                category="cluster",
                explanation="Cluster con gastos mayores a ingresos.",
                generated_at=now,
                cluster=cluster_id,
                source="cluster",
                priority=4,
                payload={"type": "cluster_high_expense", "cluster_id": cluster_id},
            )
            _append(record, "high_expense", evidence)

        if not recs:
            evidence = {"cluster_id": cluster_id}
            record = RecommendationRecord(
                id=str(uuid4()),
                user_id=features.user_id,
                title="Plan financiero recomendado",
                description=f"Eres parte del clúster #{cluster_id}. Revisa la guía sugerida para tu perfil.",
                score=max(0.6, settings.min_confidence),
                category="cluster",
                explanation="Sugerencia basada en pertenencia al clúster.",
                generated_at=now,
                cluster=cluster_id,
                source="cluster",
                priority=5,
                payload={"type": "cluster_template", "cluster_id": cluster_id},
            )
            _append(record, "template", evidence)

        return recs, traces




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
        embedding_sync: Optional[QdrantEmbeddingSynchronizer] = None,
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
        self.embedding_sync = embedding_sync
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
        self._last_embedding_sync: Optional[datetime] = None

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
            self.model_manager.update_window_features(window_features)

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

            if self.embedding_sync:
                self._current_stage = "embeddings"
                selected_feature_map = {
                    feature.user_id: feature
                    for feature in user_features
                    if feature.user_id in selected_user_set
                }
                try:
                    embedding_stage = await self.embedding_sync.sync_user_profiles(selected_feature_map)
                except Exception as exc:  # pragma: no cover - resiliencia ante dependencias externas
                    logger.warning(
                        "embedding_sync_failed",
                        extra={"error": str(exc), "run_id": run_id},
                    )
                    stages.append(
                        {
                            "name": "embeddings",
                            "status": "error",
                            "reason": str(exc),
                        }
                    )
                else:
                    if embedding_stage.get("status") == "ok":
                        self._last_embedding_sync = utcnow()
                    stage_payload = {"name": "embeddings"}
                    stage_payload.update(embedding_stage)
                    stages.append(stage_payload)

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
            "embeddings_enabled": self.embedding_sync is not None,
            "last_embedding_sync": self._last_embedding_sync.isoformat() if self._last_embedding_sync else None,
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


def _build_item_from_record(
    record: RecommendationRecord,
    *,
    include_cluster: bool,
    cluster_info: Optional[Dict[str, Any]],
) -> Optional[PersonalizedRecommendationItem]:
    payload = dict(record.payload or {})
    payload.setdefault("title", record.title)
    payload.setdefault("message", record.description)
    payload.setdefault("description", record.description)
    payload.setdefault("score", record.score)
    payload.setdefault("category", record.category)
    payload.setdefault("explanation", record.explanation)
    payload.setdefault("actions", payload.get("actions") or [])
    payload.setdefault("evidence", record.evidence)
    persisted_like = {
        "id": record.id,
        "source": record.source,
        "cluster_id": record.cluster,
        "priority": record.priority,
        "valid_from": record.valid_from,
        "valid_to": record.valid_to,
        "created_at": record.generated_at,
        "payload": payload,
    }
    return _build_item_from_persisted(
        persisted_like,
        include_cluster=include_cluster,
        cluster_info=cluster_info,
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
        if window_label:
            feature_map[window_label] = snapshot

    default_window = settings.features_default_window.lower()
    base_feature = feature_map.get(default_window)
    if base_feature is None and features:
        base_feature = features[0]

    if base_feature is None:
        return []

    def _to_float(value: Any, default: float = 0.0) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    def _to_datetime(value: Any) -> datetime:
        if isinstance(value, datetime):
            return ensure_utc(value)
        if isinstance(value, str):
            try:
                return ensure_utc(datetime.fromisoformat(value.replace("Z", "+00:00")))
            except ValueError:
                return utcnow()
        return utcnow()

    updated_at = _to_datetime(base_feature.get("updated_at") or utcnow())
    last_tx = base_feature.get("last_transaction_at") or base_feature.get("last_transaction")
    last_transaction_at = _to_datetime(last_tx) if last_tx else None
    category_totals = dict(base_feature.get("category_totals") or {})
    category_shares_raw = dict(base_feature.get("category_shares") or {})
    category_shares = {str(k).lower(): _to_float(v) for k, v in category_shares_raw.items()}
    recurring_flags_raw = base_feature.get("recurring_flags") or {}
    recurring_flags = {str(k).lower(): bool(v) for k, v in recurring_flags_raw.items() if isinstance(k, str)}

    user_features = UserFeatures(
        user_id=user_id,
        total_income=_to_float(base_feature.get("income_total")),
        total_expenses=_to_float(base_feature.get("expense_total")),
        net_cash_flow=_to_float(base_feature.get("net_cashflow")),
        average_transaction=_to_float(base_feature.get("average_transaction")),
        discretionary_ratio=_to_float(base_feature.get("discretionary_ratio")),
        essential_ratio=_to_float(base_feature.get("essential_ratio")),
        savings_rate=_to_float(base_feature.get("savings_rate")),
        top_category=str(base_feature.get("top_category") or "") or None,
        category_totals=category_totals,
        category_shares=category_shares,
        merchant_diversity=int(base_feature.get("merchant_diversity") or 0),
        recurring_flags=recurring_flags,
        volatility_expense=_to_float(base_feature.get("volatility_expense")),
        transaction_count=int(base_feature.get("transaction_count") or 0),
        last_transaction_at=last_transaction_at,
        updated_at=updated_at,
        window=str(base_feature.get("window") or default_window),
        run_id=str(base_feature.get("run_id") or "") or None,
    )

    windows_map: Dict[str, WindowedUserFeatures] = {}
    for snapshot in features:
        label = str(snapshot.get("window") or "").lower()
        if not label:
            continue
        snapshot_updated = _to_datetime(snapshot.get("updated_at") or updated_at)
        as_of_value = snapshot.get("as_of_date") or snapshot.get("asOfDate")
        if isinstance(as_of_value, date):
            as_of_dt = as_of_value
        elif isinstance(as_of_value, str):
            try:
                as_of_dt = datetime.fromisoformat(as_of_value.replace("Z", "+00:00")).date()
            except ValueError:
                as_of_dt = as_of_date
        else:
            as_of_dt = as_of_date
        window_entry = WindowedUserFeatures(
            id=str(snapshot.get("id") or uuid4()),
            run_id=str(snapshot.get("run_id") or uuid4()),
            user_id=user_id,
            as_of_date=as_of_dt,
            window=label,
            income_total=_to_float(snapshot.get("income_total")),
            expense_total=_to_float(snapshot.get("expense_total")),
            net_cashflow=_to_float(snapshot.get("net_cashflow")),
            savings_rate=_to_float(snapshot.get("savings_rate")),
            top_category=str(snapshot.get("top_category") or "") or None,
            category_shares={
                str(k).lower(): _to_float(v) for k, v in (snapshot.get("category_shares") or {}).items()
            },
            merchant_diversity=int(snapshot.get("merchant_diversity") or 0),
            recurring_flags={
                str(k).lower(): bool(v) for k, v in (snapshot.get("recurring_flags") or {}).items()
            },
            volatility_expense=_to_float(snapshot.get("volatility_expense")),
            updated_at=snapshot_updated,
        )
        windows_map[label] = window_entry

    now = utcnow()
    rule_records, trace_entries = model_manager.rule_engine.evaluate(
        user_features, windows_map, policy=None, now=now
    )

    combined_records = list(rule_records)
    if include_cluster and cluster_info:
        cluster_id = cluster_info.get("cluster_id")
        cluster_records, cluster_traces = model_manager._cluster_recommendations(
            user_features,
            cluster_id if isinstance(cluster_id, int) else None,
            now,
        )
        combined_records.extend(cluster_records)
        trace_entries.extend(cluster_traces)

    combined_records = sorted(combined_records, key=lambda item: (item.priority, -item.score))
    if limit > 0:
        combined_records = combined_records[:limit]

    if combined_records:
        model_manager._decision_traces[user_id] = trace_entries

    items: List[PersonalizedRecommendationItem] = []
    for record in combined_records:
        item = _build_item_from_record(record, include_cluster=include_cluster, cluster_info=cluster_info)
        if item:
            items.append(item)
    return items


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
    embeddings_enabled: bool = Field(False, alias="embeddingsEnabled")
    last_embedding_sync: Optional[str] = Field(None, alias="lastEmbeddingSync")


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

embedding_synchronizer: Optional[QdrantEmbeddingSynchronizer]
_openai_embedding_client: Optional[AsyncOpenAI]
_qdrant_async_client: Optional[AsyncQdrantClient]

embedding_synchronizer = None
_openai_embedding_client = None
_qdrant_async_client = None

if settings.enable_qdrant_sync:
    missing: List[str] = []
    if not settings.qdrant_url:
        missing.append("QDRANT_URL")
    if not settings.openai_api_key:
        missing.append("OPENAI_API_KEY")
    if settings.embedding_dim <= 0:
        missing.append("EMBEDDING_DIM")
    if missing:
        logger.warning(
            "Sincronización con Qdrant deshabilitada: faltan configuraciones %s",
            ", ".join(missing),
        )
    else:
        try:
            _qdrant_async_client = AsyncQdrantClient(
                url=settings.qdrant_url,
                api_key=settings.qdrant_api_key,
                timeout=settings.qdrant_timeout,
            )
            _openai_embedding_client = AsyncOpenAI(api_key=settings.openai_api_key)
            embedding_generator = OpenAIEmbeddingGenerator(
                client=_openai_embedding_client,
                model=settings.embedding_model,
                dimensions=settings.embedding_dim,
            )
            embedding_synchronizer = QdrantEmbeddingSynchronizer(
                client=_qdrant_async_client,
                generator=embedding_generator,
                user_collection=settings.qdrant_collection_users,
                item_collection=settings.qdrant_collection_items,
                vector_size=settings.embedding_dim,
                model=settings.embedding_model,
                version=settings.embedding_version,
            )
            logger.info("Sincronización con Qdrant habilitada")
        except Exception as exc:  # pragma: no cover - inicialización defensiva
            logger.warning("No se pudo inicializar la integración con Qdrant: %s", exc)
            embedding_synchronizer = None
            _qdrant_async_client = None
            _openai_embedding_client = None

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
    embedding_sync=embedding_synchronizer,
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
    if embedding_synchronizer:
        try:
            await embedding_synchronizer.ensure_collections()
        except Exception as exc:  # pragma: no cover - inicialización defensiva
            logger.warning("No se pudieron preparar las colecciones en Qdrant: %s", exc)
    await recommendation_pipeline.start()


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await recommendation_pipeline.stop()
    await database_client.close()
    if embedding_synchronizer:
        try:
            await embedding_synchronizer.close()
        except Exception as exc:  # pragma: no cover - cierre defensivo
            logger.warning("Error al cerrar cliente de Qdrant: %s", exc)
    if _openai_embedding_client:
        try:
            await _openai_embedding_client.close()
        except Exception:  # pragma: no cover - cierre defensivo
            pass


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


@app.post("/qdrant/sync/user/{user_id}", response_model=Dict[str, Any])
async def sync_user_embedding(user_id: UUID) -> Dict[str, Any]:
    if not embedding_synchronizer:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="embeddings_not_enabled")
    user_id_str = str(user_id)
    features = await feature_store.get(user_id_str)
    if not features:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="features_not_found")
    result = await embedding_synchronizer.sync_user_profiles({user_id_str: features})
    return {
        "user_id": user_id_str,
        "user_id_hash": compute_user_hash(user_id_str),
        "result": result,
    }


@app.get("/qdrant/users/{user_id}/similar", response_model=Dict[str, Any])
async def get_similar_users(user_id: UUID, top_k: int = Query(20, ge=1, le=100)) -> Dict[str, Any]:
    if not embedding_synchronizer:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="embeddings_not_enabled")
    user_id_str = str(user_id)
    try:
        neighbors = await embedding_synchronizer.find_similar_users(user_id_str, top_k=top_k)
    except ValueError as exc:
        message = str(exc)
        if message == "vector_not_found_for_user":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message) from None
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message) from None
    return {
        "user_id": user_id_str,
        "user_id_hash": compute_user_hash(user_id_str),
        "neighbors": neighbors,
        "requested_top_k": top_k,
    }


async def recommend_by_similarity(user_id: str, top_k: int = 5) -> Dict[str, Any]:
    if not embedding_synchronizer:
        raise RuntimeError("embeddings_not_enabled")
    return await embedding_synchronizer.recommend_by_similarity(user_id, top_k=top_k)


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
    model_manager.rule_metrics.record_feedback(rule_key, score_value, normalized_score)
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
