from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV_PATH = Path(__file__).resolve().parents[3] / ".env"


class SimulationSettings(BaseSettings):
    """Environment configuration for the Simulation Engine."""

    model_config = SettingsConfigDict(env_file=ROOT_ENV_PATH, extra="allow")

    supabase_project_ref: Optional[str] = Field(default=None, alias="SUPABASE_PROJECT_REF")
    supabase_jwks_url: Optional[str] = Field(default=None, alias="SUPABASE_JWKS_URL")
    feature_simulations: bool = Field(default=False, alias="FEATURE_SIMULATIONS")
    allowed_origins: List[str] = Field(default_factory=lambda: ["*"], alias="SIMULATION_ALLOWED_ORIGINS")
    rate_limit_requests: int = Field(default=30, alias="SIMULATION_RATE_LIMIT_REQUESTS")
    rate_limit_window_seconds: int = Field(default=60, alias="SIMULATION_RATE_LIMIT_WINDOW_SECONDS")

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: List[str] | str | None) -> List[str]:
        if value is None:
            return ["*"]
        if isinstance(value, list):
            return value or ["*"]
        parts = [item.strip() for item in value.split(",") if item.strip()]
        return parts or ["*"]

    @property
    def jwks_url(self) -> str:
        if self.supabase_jwks_url:
            return self.supabase_jwks_url
        if not self.supabase_project_ref:
            raise ValueError("SUPABASE_PROJECT_REF is required when SUPABASE_JWKS_URL is not provided")
        return f"https://{self.supabase_project_ref}.supabase.co/auth/v1/.well-known/jwks.json"

    @property
    def cors_origins(self) -> List[str]:
        return self.allowed_origins


@lru_cache()
def get_settings() -> SimulationSettings:
    return SimulationSettings()
