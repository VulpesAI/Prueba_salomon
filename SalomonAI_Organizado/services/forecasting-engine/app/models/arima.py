from __future__ import annotations

from typing import Dict, Iterable, Optional, Tuple

import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA

from .base import BaseForecastModel, CalibrationResult


class ARIMAForecastModel(BaseForecastModel):
    name = "arima"

    def __init__(
        self,
        *,
        p_range: Tuple[int, int] = (0, 3),
        d_range: Tuple[int, int] = (0, 2),
        q_range: Tuple[int, int] = (0, 3),
    ) -> None:
        super().__init__()
        self.p_range = p_range
        self.d_range = d_range
        self.q_range = q_range
        self._order: Tuple[int, int, int] = (1, 1, 1)
        self._fitted = None

    def calibrate(self, history: pd.Series) -> CalibrationResult:
        super().calibrate(history)
        best_model = None
        best_aic = np.inf
        best_bic = np.inf
        best_order: Optional[Tuple[int, int, int]] = None

        candidate_orders = self._candidate_orders()
        for order in candidate_orders:
            try:
                model = ARIMA(history, order=order)
                fitted = model.fit()
            except Exception:
                continue

            if not np.isfinite(fitted.aic) or not np.isfinite(fitted.bic):
                continue

            if fitted.aic < best_aic or (np.isclose(fitted.aic, best_aic) and fitted.bic < best_bic):
                best_model = fitted
                best_order = order
                best_aic = float(fitted.aic)
                best_bic = float(fitted.bic)

        if best_model is None or best_order is None:
            raise RuntimeError("No se pudo ajustar un modelo ARIMA con los parámetros evaluados")

        self._order = best_order
        self._fitted = best_model
        self._parameters = {"order": best_order, "aic": best_aic, "bic": best_bic}
        return CalibrationResult(
            model_name=self.name,
            parameters=self.parameters,
            metrics=self.last_metrics,
        )

    def fit(self, history: Optional[pd.Series] = None) -> None:
        if history is None:
            history = self._history
        if history is None:
            raise RuntimeError("El historial no fue proporcionado para ajustar ARIMA")

        model = ARIMA(history, order=self._order)
        self._fitted = model.fit()

    def forecast(self, horizon: int) -> np.ndarray:
        if self._fitted is None:
            raise RuntimeError("El modelo ARIMA no ha sido ajustado")
        forecast = self._fitted.forecast(steps=horizon)
        return np.asarray(forecast, dtype=float)

    def _candidate_orders(self) -> Iterable[Tuple[int, int, int]]:
        for p in range(self.p_range[0], self.p_range[1] + 1):
            for d in range(self.d_range[0], self.d_range[1] + 1):
                for q in range(self.q_range[0], self.q_range[1] + 1):
                    if p == d == q == 0:
                        continue
                    yield (p, d, q)
