from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List, Optional
from urllib.parse import quote_plus

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


class RecommendationSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_ENV_PATH, extra="allow", env_prefix="RECOMMENDATION_")

    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    pipeline_mode: str = Field(default="api", alias="PIPELINE_MODE")
    financial_movements_api_url: str = Field(
        default="http://financial-movements:8002/api/v1/categorized",
        alias="FINANCIAL_MOVEMENTS_API_URL",
    )
    kafka_bootstrap_servers: str = Field(default="kafka:9092", alias="KAFKA_BOOTSTRAP_SERVERS")
    kafka_transactions_topic: str = Field(
        default="financial.movements.categorized",
        alias="KAFKA_TRANSACTIONS_TOPIC",
    )
    pipeline_refresh_seconds: int = Field(default=300, alias="PIPELINE_REFRESH_SECONDS")
    ingest_poll_seconds: Optional[int] = Field(default=None, alias="INGEST_POLL_SECONDS")
    pipeline_cluster_count: int = Field(default=5, alias="PIPELINE_CLUSTER_COUNT")
    pipeline_api_timeout: float = Field(default=15.0, alias="PIPELINE_API_TIMEOUT")
    pipeline_kafka_batch: int = Field(default=500, alias="PIPELINE_KAFKA_BATCH")
    allowed_origins: List[str] = Field(default_factory=lambda: ["*"], alias="ALLOWED_ORIGINS")
    port: int = Field(default=8000, alias="PORT")
    core_api_token: Optional[str] = Field(default=None, alias="CORE_API_TOKEN")
    pipeline_page_limit: int = Field(default=500, alias="PIPELINE_PAGE_LIMIT")
    min_cluster_users: int = Field(default=50, alias="MIN_CLUSTER_USERS")
    pipeline_admin_token: Optional[str] = Field(default=None, alias="PIPELINE_ADMIN_TOKEN")
    max_fetch_limit: int = Field(default=1000, alias="MAX_FETCH_LIMIT")
    kmeans_k: Optional[int] = Field(default=None, alias="KMEANS_K")

    db_host: Optional[str] = Field(default=None, alias="DB_HOST")
    db_port: Optional[int] = Field(default=5432, alias="DB_PORT")
    db_user: Optional[str] = Field(default=None, alias="DB_USER")
    db_pass: Optional[str] = Field(default=None, alias="DB_PASS")
    db_name: Optional[str] = Field(default=None, alias="DB_NAME")
    db_schema: Optional[str] = Field(default="public", alias="DB_SCHEMA")
    db_sslmode: Optional[str] = Field(default=None, alias="DB_SSLMODE")
    recs_max_items: int = Field(default=20, alias="RECS_MAX_ITEMS")
    recs_min_score: float = Field(default=0.3, alias="RECS_MIN_SCORE")
    features_default_window: str = Field(default="30d", alias="FEATURES_DEFAULT_WINDOW")
    pipeline_required_origin: str = Field(default="core_api", alias="PIPELINE_REQUIRED_ORIGIN")
    feedback_score_mode: str = Field(default="ternary", alias="FEEDBACK_SCORE_MODE")
    enable_supabase_feedback: bool = Field(default=False, alias="ENABLE_SUPABASE_FEEDBACK")
    supabase_url: Optional[str] = Field(default=None, alias="SUPABASE_URL")
    supabase_anon_key: Optional[str] = Field(default=None, alias="SUPABASE_ANON_KEY")
    min_tx_per_window: int = Field(default=12, alias="MIN_TX_PER_WINDOW")
    min_days_history: int = Field(default=45, alias="MIN_DAYS_HISTORY")
    min_confidence: float = Field(default=0.6, alias="MIN_CONFIDENCE")
    investing_guardrail: bool = Field(default=True, alias="INVESTING_GUARDRAIL")
    max_recs_per_run: int = Field(default=5, alias="MAX_RECS_PER_RUN")
    rules_config_path: str = Field(default="./config/rules.yaml", alias="RULES_CONFIG_PATH")
    rules_hot_reload: bool = Field(default=False, alias="RULES_HOT_RELOAD")
    rule_min_accept: float = Field(default=0.35, alias="RULE_MIN_ACCEPT")
    enable_qdrant_sync: bool = Field(default=False, validation_alias=AliasChoices("ENABLE_QDRANT_SYNC", "RECOMMENDATION_ENABLE_QDRANT_SYNC"))
    qdrant_url: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("QDRANT_URL", "RECOMMENDATION_QDRANT_URL"),
    )
    qdrant_api_key: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("QDRANT_API_KEY", "RECOMMENDATION_QDRANT_API_KEY"),
    )
    qdrant_collection_users: str = Field(
        default="user_finance_profiles",
        validation_alias=AliasChoices("QDRANT_COLLECTION_USERS", "RECOMMENDATION_QDRANT_COLLECTION_USERS"),
    )
    qdrant_collection_items: str = Field(
        default="reco_items",
        validation_alias=AliasChoices("QDRANT_COLLECTION_ITEMS", "RECOMMENDATION_QDRANT_COLLECTION_ITEMS"),
    )
    qdrant_timeout: float = Field(
        default=5.0,
        validation_alias=AliasChoices("QDRANT_TIMEOUT", "RECOMMENDATION_QDRANT_TIMEOUT"),
    )
    openai_api_key: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("OPENAI_API_KEY", "RECOMMENDATION_OPENAI_API_KEY"),
    )
    embedding_model: str = Field(
        default="text-embedding-3-small",
        validation_alias=AliasChoices("EMBEDDING_MODEL", "RECOMMENDATION_EMBEDDING_MODEL"),
    )
    embedding_dim: int = Field(
        default=1536,
        validation_alias=AliasChoices("EMBEDDING_DIM", "RECOMMENDATION_EMBEDDING_DIM"),
    )
    embedding_version: str = Field(
        default="v1",
        validation_alias=AliasChoices("EMBEDDING_VERSION", "RECOMMENDATION_EMBEDDING_VERSION"),
    )

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def split_origins(cls, value: List[str] | str | None) -> List[str]:
        if value is None:
            return ["*"]
        if isinstance(value, list):
            return value or ["*"]
        parts = [item.strip() for item in value.split(",") if item.strip()]
        return parts or ["*"]

    @field_validator("feedback_score_mode", mode="before")
    @classmethod
    def normalize_feedback_mode(cls, value: str | None) -> str:
        if not value:
            return "ternary"
        normalized = str(value).strip().lower()
        if normalized in {"ternary", "-1_0_1"}:
            return "ternary"
        if normalized in {"five_star", "0_5", "0-5"}:
            return "five_star"
        raise ValueError("feedback_score_mode must be 'ternary' or 'five_star'")

    @property
    def refresh_interval(self) -> int:
        if self.ingest_poll_seconds is not None and self.ingest_poll_seconds > 0:
            return self.ingest_poll_seconds
        return max(self.pipeline_refresh_seconds, 1)

    @property
    def cluster_count(self) -> int:
        if self.kmeans_k is not None and self.kmeans_k > 0:
            return self.kmeans_k
        return max(self.pipeline_cluster_count, 1)

    def build_database_dsn(self) -> Optional[str]:
        if not self.db_host or not self.db_user or not self.db_name:
            return None

        password = quote_plus(self.db_pass or "")
        schema = self.db_schema or "public"
        sslmode = self.db_sslmode
        base = f"postgresql://{self.db_user}:{password}@{self.db_host}:{self.db_port or 5432}/{self.db_name}"
        params: List[str] = []
        if sslmode:
            params.append(f"sslmode={sslmode}")
        if schema != "public":
            params.append(f"options=-csearch_path%3D{quote_plus(schema)}")
        if params:
            return f"{base}?{'&'.join(params)}"
        return base


@lru_cache()
def get_settings() -> RecommendationSettings:
    return RecommendationSettings()

