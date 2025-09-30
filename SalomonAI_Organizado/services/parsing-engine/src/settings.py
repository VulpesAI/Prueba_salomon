from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV_PATH = Path(__file__).resolve().parents[3] / ".env"


class ParsingSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_ENV_PATH, extra="allow")

    kafka_broker_url: str = Field(default="kafka:9092", alias="KAFKA_BROKER_URL")
    kafka_topic: str = Field(default="salomon.documents.new", alias="KAFKA_TOPIC")
    consumer_group_id: str = Field(default="parsing-engine-group", alias="PARSING_ENGINE_GROUP_ID")
    connection_retries: int = Field(default=5, alias="PARSING_ENGINE_CONNECTION_RETRIES")
    retry_delay_seconds: int = Field(default=5, alias="PARSING_ENGINE_RETRY_DELAY_SECONDS")


@lru_cache()
def get_settings() -> ParsingSettings:
    return ParsingSettings()

