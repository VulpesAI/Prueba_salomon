from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field, field_validator
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
    pipeline_cluster_count: int = Field(default=4, alias="PIPELINE_CLUSTER_COUNT")
    pipeline_api_timeout: float = Field(default=15.0, alias="PIPELINE_API_TIMEOUT")
    pipeline_kafka_batch: int = Field(default=500, alias="PIPELINE_KAFKA_BATCH")
    allowed_origins: List[str] = Field(default_factory=lambda: ["*"], alias="ALLOWED_ORIGINS")
    port: int = Field(default=8000, alias="PORT")

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def split_origins(cls, value: List[str] | str | None) -> List[str]:
        if value is None:
            return ["*"]
        if isinstance(value, list):
            return value or ["*"]
        parts = [item.strip() for item in value.split(",") if item.strip()]
        return parts or ["*"]


@lru_cache()
def get_settings() -> RecommendationSettings:
    return RecommendationSettings()

