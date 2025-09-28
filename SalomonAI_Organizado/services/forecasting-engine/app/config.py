from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    """Application settings for the forecasting engine."""

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

    class Config:
        env_prefix = "FORECASTING_"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Return a cached instance of Settings."""

    return Settings()
