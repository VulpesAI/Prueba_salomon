from __future__ import annotations

from typing import Dict, Iterable, Optional

import numpy as np
import pandas as pd

from .base import BaseForecastModel, CalibrationResult, compute_error_metrics

try:  # pragma: no cover - optional dependency
    from prophet import Prophet  # type: ignore

    PROPHET_AVAILABLE = True
except Exception:  # pragma: no cover - executed when Prophet is missing
    Prophet = None  # type: ignore
    PROPHET_AVAILABLE = False


class ProphetForecastModel(BaseForecastModel):
    name = "prophet"

    def __init__(
        self,
        *,
        changepoint_prior_scales: Iterable[float] = (0.05, 0.1, 0.5, 1.0),
    ) -> None:
        super().__init__()
        self._changepoint_prior_scales = tuple(changepoint_prior_scales)
        self._best_config: Dict[str, object] = {}
        self._model: Optional[Prophet] = None

    def calibrate(self, history: pd.Series) -> CalibrationResult:
        if not PROPHET_AVAILABLE:
            raise RuntimeError("Prophet no está disponible en el entorno actual")

        super().calibrate(history)
        history = history.asfreq("D", fill_value=0.0)
        evaluation_window = max(1, min(len(history) // 4 or 1, 14))
        if len(history) <= evaluation_window:
            train_series = history
            validation_series = history
        else:
            train_series = history.iloc[:-evaluation_window]
            validation_series = history.iloc[-evaluation_window:]

        best_metrics: Optional[Dict[str, float]] = None
        best_config: Optional[Dict[str, object]] = None
        best_model: Optional[Prophet] = None

        for config in self._seasonality_grid(len(train_series)):
            for cps in self._changepoint_prior_scales:
                candidate_config = dict(config)
                candidate_config["changepoint_prior_scale"] = float(cps)
                try:
                    model = self._build_model(candidate_config)
                    model.fit(self._to_prophet_frame(train_series))
                    forecast = self._forecast_validation(model, len(validation_series))
                except Exception:
                    continue

                metrics = compute_error_metrics(validation_series, forecast)
                if best_metrics is None or self._is_better(metrics, best_metrics):
                    best_metrics = metrics
                    best_config = candidate_config
                    best_model = model

        if best_model is None or best_config is None:
            raise RuntimeError("No se pudo ajustar Prophet con los parámetros evaluados")

        self._model = best_model
        self._best_config = best_config
        self._parameters = dict(best_config)
        self._last_metrics = best_metrics
        return CalibrationResult(model_name=self.name, parameters=self.parameters, metrics=best_metrics)

    def fit(self, history: Optional[pd.Series] = None) -> None:
        if not PROPHET_AVAILABLE:
            raise RuntimeError("Prophet no está disponible en el entorno actual")

        if history is None:
            history = self._history
        if history is None:
            raise RuntimeError("El historial no fue proporcionado para ajustar Prophet")

        config = self._best_config or {"daily_seasonality": True, "weekly_seasonality": True, "yearly_seasonality": False}
        if "changepoint_prior_scale" not in config:
            config = dict(config)
            config["changepoint_prior_scale"] = 0.1

        self._model = self._build_model(config)
        self._model.fit(self._to_prophet_frame(history.asfreq("D", fill_value=0.0)))
        self._parameters = dict(config)

    def forecast(self, horizon: int) -> np.ndarray:
        if not PROPHET_AVAILABLE:
            raise RuntimeError("Prophet no está disponible en el entorno actual")
        if self._model is None:
            raise RuntimeError("El modelo Prophet no ha sido ajustado")

        future = self._model.make_future_dataframe(periods=horizon, freq="D", include_history=False)
        forecast = self._model.predict(future)["yhat"].to_numpy()
        return np.asarray(forecast, dtype=float)

    def _seasonality_grid(self, history_len: int) -> Iterable[Dict[str, bool]]:
        yearly_candidate = history_len >= 365
        grid = [
            {"daily_seasonality": False, "weekly_seasonality": True, "yearly_seasonality": False},
            {"daily_seasonality": True, "weekly_seasonality": True, "yearly_seasonality": False},
        ]
        if yearly_candidate:
            grid.append({"daily_seasonality": True, "weekly_seasonality": True, "yearly_seasonality": True})
        return grid

    def _build_model(self, config: Dict[str, object]) -> Prophet:
        if not PROPHET_AVAILABLE:
            raise RuntimeError("Prophet no está disponible en el entorno actual")

        return Prophet(
            daily_seasonality=bool(config.get("daily_seasonality", True)),
            weekly_seasonality=bool(config.get("weekly_seasonality", True)),
            yearly_seasonality=bool(config.get("yearly_seasonality", False)),
            changepoint_prior_scale=float(config.get("changepoint_prior_scale", 0.1)),
        )

    @staticmethod
    def _to_prophet_frame(series: pd.Series) -> pd.DataFrame:
        df = series.reset_index()
        df.columns = ["ds", "y"]
        return df

    def _forecast_validation(self, model: Prophet, horizon: int) -> np.ndarray:
        future = model.make_future_dataframe(periods=horizon, freq="D", include_history=False)
        forecast = model.predict(future)["yhat"].to_numpy()
        return np.asarray(forecast, dtype=float)

    @staticmethod
    def _is_better(candidate: Dict[str, float], baseline: Dict[str, float]) -> bool:
        return candidate["rmse"] < baseline["rmse"] or (
            np.isclose(candidate["rmse"], baseline["rmse"]) and candidate["mae"] < baseline["mae"]
        )
