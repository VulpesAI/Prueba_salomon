from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

import numpy as np
import pandas as pd


@dataclass
class CalibrationResult:
    model_name: str
    parameters: Dict[str, Any]
    metrics: Optional[Dict[str, float]]


def compute_error_metrics(actual: pd.Series, predicted: np.ndarray) -> Dict[str, float]:
    if len(actual) == 0:
        return {"rmse": float("nan"), "mae": float("nan"), "mape": float("nan")}

    actual_values = actual.to_numpy(dtype=float)
    predicted_values = np.asarray(predicted, dtype=float)
    if len(predicted_values) != len(actual_values):
        raise ValueError("Las dimensiones de los vectores real y pronosticado no coinciden")

    error = predicted_values - actual_values
    rmse = float(np.sqrt(np.mean(np.square(error))))
    mae = float(np.mean(np.abs(error)))
    non_zero_actual = np.where(actual_values == 0, np.nan, actual_values)
    mape = float(np.nanmean(np.abs(error / non_zero_actual)) * 100.0)
    return {"rmse": rmse, "mae": mae, "mape": mape}


class BaseForecastModel:
    name: str = "base"

    def __init__(self) -> None:
        self._history: Optional[pd.Series] = None
        self._last_metrics: Optional[Dict[str, float]] = None
        self._parameters: Dict[str, Any] = {}

    @property
    def parameters(self) -> Dict[str, Any]:
        return dict(self._parameters)

    @property
    def last_metrics(self) -> Optional[Dict[str, float]]:
        return self._last_metrics

    def calibrate(self, history: pd.Series) -> CalibrationResult:
        self._history = history
        self._parameters = {}
        self._last_metrics = None
        return CalibrationResult(model_name=self.name, parameters={}, metrics=None)

    def fit(self, history: Optional[pd.Series] = None) -> None:
        raise NotImplementedError

    def forecast(self, horizon: int) -> np.ndarray:
        raise NotImplementedError

    def evaluate(self, history: pd.Series, evaluation_window: int) -> CalibrationResult:
        if len(history) == 0:
            raise ValueError("No hay historial suficiente para evaluar el modelo")

        evaluation_window = max(1, min(len(history), evaluation_window))
        training_series = history.iloc[:-evaluation_window]
        if training_series.empty:
            training_series = history
        test_series = history.iloc[-evaluation_window:]

        self.calibrate(training_series)
        self.fit(training_series)
        forecast = self.forecast(len(test_series))
        metrics = compute_error_metrics(test_series, forecast)
        self._last_metrics = metrics
        return CalibrationResult(model_name=self.name, parameters=self.parameters, metrics=metrics)
