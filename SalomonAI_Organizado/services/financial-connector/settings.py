from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List, Optional

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
    storage_backend: str = Field(default="local", alias="FINANCIAL_CONNECTOR_STORAGE_BACKEND")
    local_storage_path: Path = Field(
        default=Path("/tmp/financial-connector"),
        alias="FINANCIAL_CONNECTOR_LOCAL_STORAGE_PATH",
    )

    supabase_url: Optional[str] = Field(default=None, alias="SUPABASE_URL")
    supabase_service_role_key: Optional[str] = Field(default=None, alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_bucket: str = Field(default="statements", alias="FINANCIAL_CONNECTOR_SUPABASE_BUCKET")

    s3_bucket: Optional[str] = Field(default=None, alias="FINANCIAL_CONNECTOR_S3_BUCKET")
    s3_region: Optional[str] = Field(default=None, alias="FINANCIAL_CONNECTOR_S3_REGION")
    s3_endpoint_url: Optional[str] = Field(default=None, alias="FINANCIAL_CONNECTOR_S3_ENDPOINT_URL")
    s3_access_key_id: Optional[str] = Field(default=None, alias="AWS_ACCESS_KEY_ID")
    s3_secret_access_key: Optional[str] = Field(default=None, alias="AWS_SECRET_ACCESS_KEY")

    status_backend: str = Field(default="auto", alias="FINANCIAL_CONNECTOR_STATUS_BACKEND")
    core_api_base_url: Optional[str] = Field(default=None, alias="CORE_API_BASE_URL")
    core_api_token: Optional[str] = Field(default=None, alias="CORE_API_TOKEN")

    parsing_engine_endpoint: Optional[str] = Field(default=None, alias="PARSING_ENGINE_ENDPOINT")
    parsing_engine_api_key: Optional[str] = Field(default=None, alias="PARSING_ENGINE_API_KEY")

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

