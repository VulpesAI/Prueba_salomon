from __future__ import annotations

import logging
from typing import Literal, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings
from .database import create_db_engine, verify_financial_history
from .forecasting import ForecastingEngine
from .models import (
    ErrorResponse,
    ForecastResponse,
    ForecastSaveRequest,
    ForecastSaveResponse,
)
from .storage import ForecastStorage, build_storage
from .supabase_client import get_supabase_client

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
_forecast_storage: Optional[ForecastStorage] = None
_storage_error_logged = False


def get_forecasting_engine() -> ForecastingEngine:
    return _forecasting_engine


def get_settings_dependency() -> Settings:
    return get_settings()


def _get_storage() -> Optional[ForecastStorage]:
    global _forecast_storage, _storage_error_logged
    if _forecast_storage is not None:
        return _forecast_storage

    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_key:
        if not _storage_error_logged:
            logger.warning("Supabase persistence is disabled because credentials are missing")
            _storage_error_logged = True
        return None

    try:
        client = get_supabase_client()
    except RuntimeError as exc:
        if not _storage_error_logged:
            logger.error("Unable to initialize Supabase client: %s", exc)
            _storage_error_logged = True
        return None

    _forecast_storage = build_storage(client, table_name=settings.forecast_table_name)
    logger.info("Forecast persistence enabled using Supabase table %s", settings.forecast_table_name)
    return _forecast_storage


def get_optional_storage_dependency() -> Optional[ForecastStorage]:
    return _get_storage()


def get_required_storage_dependency() -> ForecastStorage:
    storage = _get_storage()
    if storage is None:
        raise HTTPException(status_code=503, detail="Persistencia de pronósticos no configurada")
    return storage


@app.get("/health")
def health(settings: Settings = Depends(get_settings_dependency)) -> dict[str, object]:
    try:
        database_status = verify_financial_history(
            _engine,
            minimum_days=settings.minimum_history_days,
        )
    except RuntimeError as exc:
        logger.exception("Database health check failed")
        raise HTTPException(status_code=503, detail={"status": "error", "reason": str(exc)}) from exc

    if not database_status["has_enough_history"]:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "degraded",
                "database": database_status,
                "reason": "Insuficiente historial de movimientos financieros para generar pronósticos confiables.",
            },
        )

    return {"status": "ok", "database": database_status}


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
    forecast_type: str = Query("cashflow_projection", min_length=1, max_length=128),
    engine: ForecastingEngine = Depends(get_forecasting_engine),
    storage: Optional[ForecastStorage] = Depends(get_optional_storage_dependency),
) -> ForecastResponse:
    try:
        response = engine.generate_forecast(user_id, horizon=horizon, model_preference=model)
    except RuntimeError as exc:
        logger.exception("Forecasting error for user %s", user_id)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - general safeguard
        logger.exception("Unexpected error generating forecast for user %s", user_id)
        raise HTTPException(status_code=500, detail="Error generando proyección") from exc

    if storage is not None:
        try:
            storage.save_response(response, forecast_type=forecast_type)
        except RuntimeError as exc:
            logger.error("Failed to persist forecast for user %s: %s", response.user_id, exc)
    else:
        logger.debug("Skipping forecast persistence for user %s because Supabase is disabled", user_id)

    return response


@app.post("/forecast/save", response_model=ForecastSaveResponse, status_code=201)
def save_forecast(
    payload: ForecastSaveRequest,
    storage: ForecastStorage = Depends(get_required_storage_dependency),
) -> ForecastSaveResponse:
    logger.info(
        "Received request to store forecast for user %s with type %s",
        payload.user_id,
        payload.forecast_type,
    )
    try:
        record = storage.save_payload(payload)
    except RuntimeError as exc:
        logger.exception("Failed to persist forecast for user %s", payload.user_id)
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return ForecastSaveResponse(id=record.id)
