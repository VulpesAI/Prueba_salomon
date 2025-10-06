"""Application settings for the parsing engine service."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV_PATH = Path(__file__).resolve().parents[3] / ".env"


class ParsingSettings(BaseSettings):
    """Environment-backed configuration for the parsing engine."""

    model_config = SettingsConfigDict(env_file=ROOT_ENV_PATH, extra="allow")

    kafka_brokers: List[str] = Field(default_factory=lambda: ["kafka:9092"], alias="KAFKA_BROKERS")
    statements_in_topic: str = Field(default="statements.in", alias="STATEMENTS_IN_TOPIC")
    statements_out_topic: str = Field(default="statements.out", alias="STATEMENTS_OUT_TOPIC")
    consumer_group_id: str = Field(default="parsing-engine", alias="PARSING_ENGINE_GROUP_ID")

    connection_retries: int = Field(default=5, alias="PARSING_ENGINE_CONNECTION_RETRIES")
    retry_delay_seconds: int = Field(default=5, alias="PARSING_ENGINE_RETRY_DELAY_SECONDS")

    metrics_host: str = Field(default="0.0.0.0", alias="PARSING_ENGINE_METRICS_HOST")
    metrics_port: int = Field(default=9101, alias="PARSING_ENGINE_METRICS_PORT")

    supabase_url: str | None = Field(default=None, alias="SUPABASE_URL")
    supabase_service_role_key: str | None = Field(default=None, alias="SUPABASE_SERVICE_ROLE_KEY")
    statements_bucket: str = Field(default="statements", alias="STATEMENTS_BUCKET")

    default_currency: str = Field(default="CLP", alias="DEFAULT_CURRENCY")
    ocr_languages: str = Field(default="spa+eng", alias="OCR_LANGUAGES")

    @field_validator("kafka_brokers", mode="before")
    @classmethod
    def _parse_brokers(cls, value: str | List[str] | None) -> List[str]:
        if value is None:
            return ["kafka:9092"]

        if isinstance(value, list):
            return value

        if isinstance(value, str):
            brokers = [item.strip() for item in value.split(",") if item.strip()]
            return brokers or ["kafka:9092"]

        raise TypeError("Invalid value for KAFKA_BROKERS")


@lru_cache()
def get_settings() -> ParsingSettings:
    """Return a cached settings instance."""

    return ParsingSettings()

