from __future__ import annotations

from datetime import date as date_type, datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator
from pydantic.config import ConfigDict


class ForecastPoint(BaseModel):
    date: date_type = Field(..., description="Date of the forecasted value")
    amount: float = Field(..., description="Predicted net cash flow for the date")


class ForecastResponse(BaseModel):
    user_id: str = Field(..., description="Identifier of the user for which the forecast was generated")
    model_type: Literal["arima", "prophet", "auto"]
    horizon_days: int = Field(..., ge=1)
    generated_at: datetime = Field(..., description="Timestamp when the forecast was generated")
    history_days: int = Field(..., ge=0, description="Number of historical days used for training")
    forecasts: List[ForecastPoint]
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    detail: str
    metadata: Optional[Dict[str, Any]] = None


class ForecastSaveRequest(BaseModel):
    user_id: UUID = Field(..., description="User owning the forecast")
    forecast_type: str = Field(..., min_length=1, max_length=128)
    forecast_data: Dict[str, Any] = Field(..., description="Serialized forecasting payload")
    calculated_at: datetime = Field(..., description="UTC timestamp for when the forecast was generated")

    @field_validator("forecast_type")
    @classmethod
    def _strip_type(cls, value: str) -> str:
        sanitized = value.strip()
        if not sanitized:
            raise ValueError("forecast_type no puede estar vacío")
        return sanitized

    @field_validator("calculated_at")
    @classmethod
    def _ensure_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class ForecastSaveResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: UUID
    user_id: UUID
    forecast_type: str
    forecast_data: Dict[str, Any]
    calculated_at: datetime
    created_at: Optional[datetime] = None


class ForecastSaveResponse(BaseModel):
    id: UUID
    status: Literal["stored"] = Field(default="stored")
