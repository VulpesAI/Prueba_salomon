from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


class FinancialConnectorSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_ENV_PATH, extra="allow")

    port: int = Field(
        default=8000,
        validation_alias=AliasChoices("FINANCIAL_CONNECTOR_PORT", "PORT"),
    )
    allowed_origins: List[str] = Field(default_factory=lambda: ["*"], alias="FINANCIAL_CONNECTOR_ALLOWED_ORIGINS")

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
def get_settings() -> FinancialConnectorSettings:
    return FinancialConnectorSettings()

