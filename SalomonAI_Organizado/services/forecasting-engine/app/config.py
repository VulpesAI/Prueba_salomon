from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV_PATH = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    """Application settings for the forecasting engine."""

    model_config = SettingsConfigDict(env_prefix="FORECASTING_", env_file=ROOT_ENV_PATH, extra="allow")

    database_url: str = Field(
        default="postgresql+psycopg://salomon_user:salomon_password@postgres:5432/salomon_db",
        description="SQLAlchemy compatible database URL",
    )
    default_model: Literal["auto", "arima", "prophet"] = Field(
        default="auto",
        description="Preferred forecasting model when the client does not specify one.",
    )
    default_horizon_days: int = Field(
        default=30,
        description="Number of days to forecast when not provided explicitly.",
    )
    minimum_history_days: int = Field(
        default=30,
        description="Minimum number of days required in the historical series to attempt a statistical model.",
    )
    supabase_url: str = Field(
        default="",
        validation_alias=AliasChoices("FORECASTING_SUPABASE_URL", "SUPABASE_URL"),
        description="Supabase project URL used to persist forecasting results.",
    )
    supabase_key: str = Field(
        default="",
        validation_alias=AliasChoices(
            "FORECASTING_SUPABASE_KEY",
            "SUPABASE_SERVICE_ROLE_KEY",
            "SUPABASE_KEY",
        ),
        description="Service key used to authenticate against Supabase from the forecasting engine.",
    )
    forecast_table_name: str = Field(
        default="forecast_results",
        description="Supabase table where forecasting runs are stored.",
    )


@lru_cache()
def get_settings() -> Settings:
    """Return a cached instance of Settings."""

    return Settings()

