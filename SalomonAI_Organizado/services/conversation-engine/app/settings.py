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
    openai_api_key: Optional[str] = Field(default=None, alias="OPENAI_API_KEY")
    openai_base_url: Optional[str] = Field(default=None, alias="OPENAI_BASE_URL")
    openai_model: str = Field(default="gpt-4o-mini", alias="CONVERSATION_ENGINE_OPENAI_MODEL")
    openai_embedding_model: str = Field(
        default="text-embedding-3-small", alias="CONVERSATION_ENGINE_OPENAI_EMBEDDING_MODEL"
    )
    openai_timeout_seconds: float = Field(default=20.0, alias="CONVERSATION_ENGINE_OPENAI_TIMEOUT_SECONDS")
    llm_system_prompt: str = Field(
        default=(
            "Eres SalomonAI, un asesor financiero virtual que utiliza el contexto entregado para resolver "
            "preguntas. Responde siempre en español, con tono profesional y empático. "
            "Si no existe información suficiente, explica la limitación y orienta al usuario sobre los "
            "siguientes pasos." 
        ),
        alias="CONVERSATION_ENGINE_LLM_SYSTEM_PROMPT",
    )
    llm_temperature: float = Field(default=0.2, alias="CONVERSATION_ENGINE_LLM_TEMPERATURE")
    llm_max_tokens: int = Field(default=600, alias="CONVERSATION_ENGINE_LLM_MAX_TOKENS")
    llm_max_context_items: int = Field(default=5, alias="CONVERSATION_ENGINE_LLM_CONTEXT_ITEMS")
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

