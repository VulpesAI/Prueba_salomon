from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class ForecastPoint(BaseModel):
    date: date = Field(..., description="Date of the forecasted value")
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
