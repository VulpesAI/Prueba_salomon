from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, Iterable, Literal, Optional, Tuple

import numpy as np
import pandas as pd

from .arima import ARIMAForecastModel
from .base import BaseForecastModel, CalibrationResult
from .neural import LSTMForecastModel, ENABLE_LSTM
from .prophet import PROPHET_AVAILABLE, ProphetForecastModel

logger = logging.getLogger(__name__)

ModelPreference = Literal["auto", "arima", "prophet", "lstm"]


@dataclass
class ModelTrainingResult:
    model: BaseForecastModel
    calibration: CalibrationResult


class ModelFactory:
    def __init__(self, *, enable_lstm: bool = ENABLE_LSTM) -> None:
        self._enable_lstm = enable_lstm

    def build(self, preference: ModelPreference) -> BaseForecastModel:
        if preference == "arima":
            return ARIMAForecastModel()
        if preference == "prophet":
            if not PROPHET_AVAILABLE:
                raise RuntimeError("Prophet no está disponible para su selección explícita")
            return ProphetForecastModel()
        if preference == "lstm":
            if not self._enable_lstm:
                raise RuntimeError("Los modelos LSTM están deshabilitados por configuración")
            return LSTMForecastModel()
        raise RuntimeError(f"Preferencia de modelo desconocida: {preference}")

    def available_models(self, preference: ModelPreference) -> Iterable[ModelPreference]:
        if preference == "auto":
            yield "arima"
            if PROPHET_AVAILABLE:
                yield "prophet"
            if self._enable_lstm:
                yield "lstm"
        else:
            yield preference


class ModelSelector:
    def __init__(self, *, evaluation_window: int = 14, enable_lstm: bool = ENABLE_LSTM) -> None:
        self._evaluation_window = evaluation_window
        self._factory = ModelFactory(enable_lstm=enable_lstm)

    def train(self, history: pd.Series, preference: ModelPreference) -> ModelTrainingResult:
        last_exception: Optional[Exception] = None
        best_result: Optional[ModelTrainingResult] = None
        best_rmse = np.inf

        for model_name in self._factory.available_models(preference):
            try:
                model = self._factory.build(model_name)
                calibration = model.evaluate(history, self._evaluation_window)
            except Exception as exc:
                last_exception = exc
                logger.warning("Fallo calibrando modelo %s: %s", model_name, exc)
                continue

            metrics = calibration.metrics or {}
            rmse = metrics.get("rmse", np.inf)
            if rmse < best_rmse:
                best_rmse = rmse
                best_result = ModelTrainingResult(model=model, calibration=calibration)

        if best_result is None:
            if last_exception is not None:
                raise RuntimeError("No fue posible ajustar modelos de forecasting") from last_exception
            raise RuntimeError("No existen modelos disponibles para el entrenamiento solicitado")

        model = best_result.model
        try:
            model.calibrate(history)
            model.fit(history)
        except Exception as exc:
            raise RuntimeError("Error ajustando el modelo seleccionado con el historial completo") from exc

        return ModelTrainingResult(model=model, calibration=best_result.calibration)


def metrics_to_float(metrics: Optional[Dict[str, float]]) -> Optional[Dict[str, float]]:
    if metrics is None:
        return None
    return {key: float(value) if value is not None else float("nan") for key, value in metrics.items()}
