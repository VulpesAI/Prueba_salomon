from __future__ import annotations

import logging
from typing import Literal, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings
from .database import create_db_engine
from .forecasting import ForecastingEngine
from .models import ErrorResponse, ForecastResponse

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


app = FastAPI(title="SalomonAI Forecasting Engine", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_engine = create_db_engine()
_forecasting_engine = ForecastingEngine(_engine)


def get_forecasting_engine() -> ForecastingEngine:
    return _forecasting_engine


def get_settings_dependency() -> Settings:
    return get_settings()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get(
    "/forecasts/{user_id}",
    response_model=ForecastResponse,
    responses={503: {"model": ErrorResponse}},
)
def generate_forecast(
    user_id: str,
    *,
    horizon: Optional[int] = Query(None, ge=1, le=120),
    model: Literal["auto", "arima", "prophet"] = Query("auto"),
    engine: ForecastingEngine = Depends(get_forecasting_engine),
) -> ForecastResponse:
    try:
        return engine.generate_forecast(user_id, horizon=horizon, model_preference=model)
    except RuntimeError as exc:
        logger.exception("Forecasting error for user %s", user_id)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - general safeguard
        logger.exception("Unexpected error generating forecast for user %s", user_id)
        raise HTTPException(status_code=500, detail="Error generando proyección") from exc
