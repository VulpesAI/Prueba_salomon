from __future__ import annotations

import logging
import os
from typing import Optional

import numpy as np
import pandas as pd

from .base import BaseForecastModel, CalibrationResult

logger = logging.getLogger(__name__)

ENABLE_LSTM = os.getenv("ENABLE_LSTM", "false").lower() == "true"

try:  # pragma: no cover - optional dependency
    if ENABLE_LSTM:
        import tensorflow as tf  # type: ignore  # noqa: F401
        import torch  # type: ignore  # noqa: F401
except Exception as exc:  # pragma: no cover - executed when dependencies missing
    logger.warning("Dependencias para modelos neuronales no disponibles: %s", exc)
    ENABLE_LSTM = False


class LSTMForecastModel(BaseForecastModel):
    name = "lstm"

    def calibrate(self, history: pd.Series) -> CalibrationResult:  # pragma: no cover - placeholder implementation
        if not ENABLE_LSTM:
            raise RuntimeError(
                "Modelos LSTM deshabilitados. Establece ENABLE_LSTM=true y provee dependencias para activarlos."
            )
        raise NotImplementedError("La calibración LSTM se implementará en futuras iteraciones")

    def fit(self, history: Optional[pd.Series] = None) -> None:  # pragma: no cover - placeholder implementation
        if not ENABLE_LSTM:
            raise RuntimeError(
                "Modelos LSTM deshabilitados. Establece ENABLE_LSTM=true y provee dependencias para activarlos."
            )
        raise NotImplementedError("El entrenamiento LSTM se implementará en futuras iteraciones")

    def forecast(self, horizon: int) -> np.ndarray:  # pragma: no cover - placeholder implementation
        if not ENABLE_LSTM:
            raise RuntimeError(
                "Modelos LSTM deshabilitados. Establece ENABLE_LSTM=true y provee dependencias para activarlos."
            )
        raise NotImplementedError("La inferencia LSTM se implementará en futuras iteraciones")
