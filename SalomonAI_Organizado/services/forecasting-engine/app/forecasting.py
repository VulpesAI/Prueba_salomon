from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Dict, Literal, Optional

import numpy as np
import pandas as pd
from sqlalchemy import text

try:
    from prophet import Prophet  # type: ignore

    PROPHET_AVAILABLE = True
except Exception:  # pragma: no cover - optional dependency
    Prophet = None  # type: ignore
    PROPHET_AVAILABLE = False

from statsmodels.tsa.arima.model import ARIMA

from .config import Settings, get_settings
from .database import session_scope
from .models import ForecastPoint, ForecastResponse

logger = logging.getLogger(__name__)


class ForecastingEngine:
    """Generate time-series forecasts for user cash flow."""

    def __init__(self, engine, settings: Optional[Settings] = None) -> None:
        self._engine = engine
        self._settings = settings or get_settings()

    @property
    def settings(self) -> Settings:
        return self._settings

    def _load_history(self, user_id: str) -> pd.Series:
        query = text(
            """
            SELECT DATE(transaction_date) AS date, SUM(amount) AS total_amount
            FROM financial_movements
            WHERE user_id = :user_id
            GROUP BY DATE(transaction_date)
            ORDER BY DATE(transaction_date)
            """
        )

        with session_scope(self._engine) as conn:
            dataframe = pd.read_sql_query(query, conn, params={"user_id": user_id})

        if dataframe.empty:
            return pd.Series(dtype=float)

        series = dataframe.set_index("date")["total_amount"].astype(float)
        series.index = pd.to_datetime(series.index)
        return series.asfreq("D", fill_value=0.0)

    def _fallback_projection(self, history: pd.Series, horizon: int) -> np.ndarray:
        if history.empty:
            return np.zeros(horizon)

        rolling_mean = history.tail(min(len(history), 7)).mean()
        trend = 0.0
        if len(history) > 1:
            trend = (history.iloc[-1] - history.iloc[0]) / max(len(history) - 1, 1)

        forecast = rolling_mean + trend * np.arange(1, horizon + 1)
        return forecast

    def _fit_arima(self, history: pd.Series, horizon: int) -> np.ndarray:
        model = ARIMA(history, order=(1, 1, 1))
        fitted = model.fit()
        forecast = fitted.forecast(steps=horizon)
        return forecast

    def _fit_prophet(self, history: pd.Series, horizon: int) -> np.ndarray:
        if not PROPHET_AVAILABLE:
            raise RuntimeError("Prophet is not available in the current environment")

        df = history.reset_index()
        df.columns = ["ds", "y"]
        model = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=False)
        model.fit(df)
        future = model.make_future_dataframe(periods=horizon, freq="D", include_history=False)
        forecast = model.predict(future)["yhat"].to_numpy()
        return forecast

    def generate_forecast(
        self,
        user_id: str,
        *,
        horizon: Optional[int] = None,
        model_preference: Literal["auto", "arima", "prophet"] = "auto",
    ) -> ForecastResponse:
        horizon_days = horizon or self.settings.default_horizon_days
        history = self._load_history(user_id)
        history_days = len(history)

        if history_days == 0:
            forecast_values = self._fallback_projection(history, horizon_days)
            model_used: Literal["auto", "arima", "prophet"] = "auto"
            metadata: Dict[str, object] = {
                "reason": "no_history",
                "message": "No se encontraron movimientos históricos, se devolvió una proyección neutra.",
            }
        else:
            model_used = model_preference
            metadata = {
                "history_start": history.index.min().date().isoformat(),
                "history_end": history.index.max().date().isoformat(),
                "history_sum": float(history.sum()),
            }

            try:
                if model_preference == "prophet":
                    forecast_values = self._fit_prophet(history, horizon_days)
                elif model_preference == "arima":
                    forecast_values = self._fit_arima(history, horizon_days)
                else:
                    if PROPHET_AVAILABLE and history_days >= self.settings.minimum_history_days:
                        forecast_values = self._fit_prophet(history, horizon_days)
                        model_used = "prophet"
                    else:
                        forecast_values = self._fit_arima(history, horizon_days)
                        model_used = "arima"
            except Exception as exc:
                logger.warning("Falling back to heuristic projection for user %s: %s", user_id, exc)
                forecast_values = self._fallback_projection(history, horizon_days)
                model_used = "auto"
                metadata["reason"] = "model_error"
                metadata["error"] = str(exc)

        generated_at = datetime.utcnow()
        start_date = history.index.max().date() if not history.empty else datetime.utcnow().date()
        if history.empty:
            start_date = datetime.utcnow().date()
        else:
            start_date = history.index.max().date()

        forecast_points = []
        current_date = start_date
        for value in forecast_values:
            current_date += timedelta(days=1)
            forecast_points.append(
                ForecastPoint(
                    date=current_date,
                    amount=float(np.round(value, 2)),
                )
            )

        return ForecastResponse(
            user_id=user_id,
            model_type=model_used,
            horizon_days=horizon_days,
            generated_at=generated_at,
            history_days=history_days,
            forecasts=forecast_points,
            metadata=metadata,
        )
