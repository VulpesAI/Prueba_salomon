from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Literal, Optional

import numpy as np
import pandas as pd
from sqlalchemy import text

from .config import Settings, get_settings
from .database import session_scope
from .models import ModelPreference, ModelSelector, metrics_to_float
from .schemas import ForecastMetrics, ForecastPoint, ForecastResponse

logger = logging.getLogger(__name__)


class ForecastingEngine:
    """Generate calibrated time-series forecasts for user cash flow."""

    def __init__(
        self,
        engine,
        settings: Optional[Settings] = None,
        model_selector: Optional[ModelSelector] = None,
    ) -> None:
        self._engine = engine
        self._settings = settings or get_settings()
        self._selector = model_selector or ModelSelector(
            evaluation_window=self._settings.evaluation_window_days,
            enable_lstm=self._settings.enable_lstm,
        )

    @property
    def settings(self) -> Settings:
        return self._settings

    def _load_history_frame(self, user_id: str) -> pd.DataFrame:
        query_with_category = text(
            """
            SELECT DATE(transaction_date) AS date,
                   COALESCE(category, 'sin_categoria') AS category,
                   SUM(amount) AS total_amount
            FROM financial_movements
            WHERE user_id = :user_id
            GROUP BY DATE(transaction_date), category
            ORDER BY DATE(transaction_date)
            """
        )
        fallback_query = text(
            """
            SELECT DATE(transaction_date) AS date,
                   SUM(amount) AS total_amount
            FROM financial_movements
            WHERE user_id = :user_id
            GROUP BY DATE(transaction_date)
            ORDER BY DATE(transaction_date)
            """
        )

        try:
            with session_scope(self._engine) as conn:
                dataframe = pd.read_sql_query(query_with_category, conn, params={"user_id": user_id})
        except Exception as exc:
            logger.debug("Fallo consulta categorizada, se usa modo resumido: %s", exc)
            with session_scope(self._engine) as conn:
                dataframe = pd.read_sql_query(fallback_query, conn, params={"user_id": user_id})
            dataframe["category"] = "sin_categoria"

        if dataframe.empty:
            return dataframe

        dataframe["date"] = pd.to_datetime(dataframe["date"])
        return dataframe

    def _load_history(self, user_id: str) -> pd.Series:
        dataframe = self._load_history_frame(user_id)
        if dataframe.empty:
            return pd.Series(dtype=float)

        grouped = dataframe.groupby("date")["total_amount"].sum().astype(float)
        return grouped.asfreq("D", fill_value=0.0)

    def _load_category_histories(self, user_id: str) -> Dict[str, pd.Series]:
        dataframe = self._load_history_frame(user_id)
        if dataframe.empty or "category" not in dataframe.columns:
            return {}

        histories: Dict[str, pd.Series] = {}
        dataframe["category"] = dataframe["category"].fillna("sin_categoria")
        for category, group in dataframe.groupby("category"):
            series = group.set_index("date")["total_amount"].astype(float)
            histories[str(category)] = series.asfreq("D", fill_value=0.0)
        return histories

    def _fallback_projection(self, history: pd.Series, horizon: int) -> np.ndarray:
        if history.empty:
            return np.zeros(horizon)

        rolling_mean = history.tail(min(len(history), 7)).mean()
        trend = 0.0
        if len(history) > 1:
            trend = (history.iloc[-1] - history.iloc[0]) / max(len(history) - 1, 1)

        forecast = rolling_mean + trend * np.arange(1, horizon + 1)
        return forecast

    def _train_and_forecast(
        self,
        history: pd.Series,
        horizon: int,
        preference: ModelPreference,
    ) -> tuple[np.ndarray, str, Optional[Dict[str, float]], Dict[str, object]]:
        training = self._selector.train(history, preference)
        forecast_values = training.model.forecast(horizon)
        metrics = metrics_to_float(training.calibration.metrics)
        parameters = dict(training.calibration.parameters)
        return forecast_values, training.model.name, metrics, parameters

    def _collect_category_metrics(
        self,
        user_id: str,
        preference: ModelPreference,
    ) -> Dict[str, Dict[str, float]]:
        results: Dict[str, Dict[str, float]] = {}
        for category, series in self._load_category_histories(user_id).items():
            if len(series) < self.settings.minimum_history_days:
                continue
            try:
                training = self._selector.train(series, preference)
            except RuntimeError as exc:
                logger.debug(
                    "Omitiendo categoría %s para métricas por error de entrenamiento: %s",
                    category,
                    exc,
                )
                continue
            metrics = metrics_to_float(training.calibration.metrics)
            if metrics:
                results[category] = metrics
        return results

    @staticmethod
    def _build_metrics(metrics: Optional[Dict[str, float]]) -> Optional[ForecastMetrics]:
        if not metrics:
            return None
        cleaned = {key: float(value) for key, value in metrics.items() if np.isfinite(value)}
        required = {"rmse", "mae", "mape"}
        if not required.issubset(cleaned.keys()):
            return None
        return ForecastMetrics(rmse=cleaned["rmse"], mae=cleaned["mae"], mape=cleaned["mape"])

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

        metrics: Optional[ForecastMetrics] = None
        metrics_dict: Optional[Dict[str, float]] = None
        category_metrics: Dict[str, Dict[str, float]] = {}

        if history_days == 0:
            forecast_values = self._fallback_projection(history, horizon_days)
            model_used: str = "auto"
            metadata: Dict[str, object] = {
                "reason": "no_history",
                "message": "No se encontraron movimientos históricos, se devolvió una proyección neutra.",
            }
        else:
            model_used = model_preference
            metadata: Dict[str, object] = {
                "history_start": history.index.min().date().isoformat(),
                "history_end": history.index.max().date().isoformat(),
                "history_sum": float(history.sum()),
            }

            if history_days < self.settings.minimum_history_days:
                forecast_values = self._fallback_projection(history, horizon_days)
                model_used = "auto"
                metadata.update(
                    {
                        "reason": "insufficient_history",
                        "minimum_history_days": self.settings.minimum_history_days,
                        "message": "Historial insuficiente para modelos estadísticos; se usó promedio móvil.",
                    }
                )
            else:
                try:
                    (
                        forecast_values,
                        selected_model,
                        metrics_dict,
                        parameters,
                    ) = self._train_and_forecast(history, horizon_days, model_preference)
                    model_used = selected_model
                    metrics = self._build_metrics(metrics_dict)
                    if metrics_dict:
                        metadata["metrics"] = metrics_dict
                    if parameters:
                        metadata["model_parameters"] = parameters
                    category_metrics = self._collect_category_metrics(user_id, model_preference)
                    if category_metrics:
                        metadata["category_metrics"] = category_metrics
                except RuntimeError as exc:
                    logger.warning(
                        "Falling back to heuristic projection for user %s: %s",
                        user_id,
                        exc,
                    )
                    forecast_values = self._fallback_projection(history, horizon_days)
                    model_used = "auto"
                    metadata["reason"] = "model_error"
                    metadata["error"] = str(exc)

        generated_at = datetime.now(timezone.utc)
        start_date = generated_at.date() if history.empty else history.index.max().date()

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

        log_payload = {
            "event": "forecast_generated",
            "user_id": user_id,
            "model_type": model_used,
            "error_metrics": metrics_dict,
            "timestamp": generated_at.isoformat(),
        }
        logger.info("forecast_generated", extra=log_payload)

        return ForecastResponse(
            user_id=user_id,
            model_type=model_used,
            horizon_days=horizon_days,
            generated_at=generated_at,
            history_days=history_days,
            forecasts=forecast_points,
            metadata=metadata,
            metrics=metrics,
        )

    def train_user(
        self,
        user_id: str,
        *,
        horizon: Optional[int] = None,
        model_preference: Literal["auto", "arima", "prophet"] = "auto",
    ) -> Dict[str, object]:
        horizon_days = horizon or self.settings.default_horizon_days
        history = self._load_history(user_id)
        history_days = len(history)
        if history_days < self.settings.minimum_history_days:
            raise RuntimeError("No hay historial suficiente para entrenar modelos estadísticos")

        forecast_values, model_used, metrics_dict, parameters = self._train_and_forecast(
            history, horizon_days, model_preference
        )
        metrics = self._build_metrics(metrics_dict)
        category_metrics = self._collect_category_metrics(user_id, model_preference)

        return {
            "user_id": user_id,
            "model_type": model_used,
            "history_days": history_days,
            "trained_at": datetime.now(timezone.utc),
            "metrics": metrics,
            "metrics_raw": metrics_dict,
            "parameters": parameters,
            "category_metrics": category_metrics,
            "forecast": forecast_values,
        }

    def evaluate_user(
        self,
        user_id: str,
        *,
        horizon: Optional[int] = None,
        model_preference: Literal["auto", "arima", "prophet"] = "auto",
    ) -> Dict[str, object]:
        training_summary = self.train_user(
            user_id,
            horizon=horizon,
            model_preference=model_preference,
        )
        training_summary["evaluated_at"] = datetime.now(timezone.utc)
        return training_summary
