from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV_PATH = Path(__file__).resolve().parents[3] / ".env"


class ConversationSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_ENV_PATH, extra="allow")

    core_api_base_url: Optional[str] = Field(default=None, alias="CORE_API_BASE_URL")
    supabase_url: Optional[str] = Field(default=None, alias="SUPABASE_URL")
    supabase_service_role_key: Optional[str] = Field(default=None, alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_timeout_seconds: float = Field(default=10.0, alias="CONVERSATION_ENGINE_SUPABASE_TIMEOUT_SECONDS")
    qdrant_url: Optional[str] = Field(default=None, alias="QDRANT_URL")
    qdrant_api_key: Optional[str] = Field(default=None, alias="QDRANT_API_KEY")
    qdrant_collection: str = Field(default="financial_insights", alias="QDRANT_COLLECTION")
    qdrant_result_limit: int = Field(default=5, alias="CONVERSATION_ENGINE_QDRANT_RESULT_LIMIT")
    qdrant_score_threshold: float = Field(default=0.6, alias="CONVERSATION_ENGINE_QDRANT_SCORE_THRESHOLD")
    allowed_origins: List[str] = Field(default_factory=lambda: ["*"], alias="CONVERSATION_ENGINE_ALLOWED_ORIGINS")
    request_timeout_seconds: float = Field(default=10.0, alias="CONVERSATION_ENGINE_CORE_TIMEOUT_SECONDS")

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def split_origins(cls, value: List[str] | str | None) -> List[str]:
        if value is None:
            return ["*"]
        if isinstance(value, list):
            return value or ["*"]
        parts = [item.strip() for item in value.split(",") if item.strip()]
        return parts or ["*"]

    @property
    def cors_origins(self) -> List[str]:
        return self.allowed_origins


@lru_cache()
def get_settings() -> ConversationSettings:
    return ConversationSettings()

