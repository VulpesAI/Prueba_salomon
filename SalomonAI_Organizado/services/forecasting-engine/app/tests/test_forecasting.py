from __future__ import annotations

from typing import Iterable, Optional

import numpy as np
import pandas as pd
import pytest

from app.config import Settings
from app.forecasting import ForecastingEngine
from app.models import BaseForecastModel, CalibrationResult, ModelSelector


def _series(values: Iterable[float], start: str) -> pd.Series:
    index = pd.date_range(start=start, periods=len(values), freq="D")
    return pd.Series(values, index=index, dtype=float)


def _make_engine(
    monkeypatch: pytest.MonkeyPatch,
    history: pd.Series,
    *,
    minimum_days: int = 5,
) -> ForecastingEngine:
    settings = Settings(default_horizon_days=3, minimum_history_days=minimum_days, evaluation_window_days=2)
    engine = ForecastingEngine(engine=None, settings=settings)
    monkeypatch.setattr(engine, "_load_history", lambda _user_id: history)
    monkeypatch.setattr(engine, "_load_category_histories", lambda _user_id: {})
    return engine


def test_generate_forecast_without_history_uses_neutral_projection(monkeypatch: pytest.MonkeyPatch) -> None:
    engine = _make_engine(monkeypatch, pd.Series(dtype=float))

    response = engine.generate_forecast("user-123")

    assert response.model_type == "auto"
    assert len(response.forecasts) == engine.settings.default_horizon_days
    assert all(point.amount == 0.0 for point in response.forecasts)
    assert response.metadata["reason"] == "no_history"
    assert response.metrics is None


def test_insufficient_history_skips_statistical_models(monkeypatch: pytest.MonkeyPatch) -> None:
    history = _series([100.0, 120.0, 130.0], start="2024-01-01")
    engine = _make_engine(monkeypatch, history, minimum_days=7)
    monkeypatch.setattr(
        engine,
        "_train_and_forecast",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("statistical model should not run")),
    )

    response = engine.generate_forecast("user-456")

    assert response.model_type == "auto"
    assert response.metadata["reason"] == "insufficient_history"
    assert response.metadata["minimum_history_days"] == 7
    assert response.metrics is None


def test_generate_forecast_includes_metrics(monkeypatch: pytest.MonkeyPatch) -> None:
    history = _series([110.0 + day for day in range(10)], start="2024-02-01")
    engine = _make_engine(monkeypatch, history, minimum_days=5)

    def fake_train_and_forecast(*_args, **_kwargs):
        return np.array([1.0, 2.0, 3.0]), "arima", {"rmse": 0.5, "mae": 0.3, "mape": 5.0}, {"order": (1, 1, 1)}

    monkeypatch.setattr(engine, "_train_and_forecast", fake_train_and_forecast)
    monkeypatch.setattr(engine, "_collect_category_metrics", lambda *_: {"food": {"rmse": 0.7, "mae": 0.4, "mape": 8.0}})

    response = engine.generate_forecast("user-789", model_preference="auto")

    assert response.model_type == "arima"
    assert response.forecasts[0].amount == 1.0
    assert response.metadata["model_parameters"] == {"order": (1, 1, 1)}
    assert response.metadata["metrics"] == {"rmse": 0.5, "mae": 0.3, "mape": 5.0}
    assert response.metrics is not None
    assert response.metrics.rmse == 0.5
    assert "category_metrics" in response.metadata


class _FakeModel(BaseForecastModel):
    def __init__(self, name: str, rmse: float) -> None:
        super().__init__()
        self.name = name
        self._rmse = rmse
        self.fitted = False

    def evaluate(self, history: pd.Series, evaluation_window: int) -> CalibrationResult:  # type: ignore[override]
        metrics = {"rmse": self._rmse, "mae": self._rmse, "mape": self._rmse}
        return CalibrationResult(model_name=self.name, parameters={}, metrics=metrics)

    def calibrate(self, history: pd.Series) -> CalibrationResult:  # type: ignore[override]
        return CalibrationResult(model_name=self.name, parameters={}, metrics={})

    def fit(self, history: Optional[pd.Series] = None) -> None:  # type: ignore[override]
        self.fitted = True

    def forecast(self, horizon: int) -> np.ndarray:  # type: ignore[override]
        return np.zeros(horizon)


def test_model_selector_prefers_lower_rmse(monkeypatch: pytest.MonkeyPatch) -> None:
    selector = ModelSelector(evaluation_window=2)

    fake_factory = selector._factory  # type: ignore[attr-defined]
    monkeypatch.setattr(fake_factory, "available_models", lambda _pref: ["arima", "prophet"])

    def build(model_name: str) -> _FakeModel:
        return _FakeModel(model_name, rmse=0.2 if model_name == "prophet" else 0.8)

    monkeypatch.setattr(fake_factory, "build", build)

    history = _series([10, 12, 11, 13, 12], start="2024-01-01")
    result = selector.train(history, "auto")

    assert result.model.name == "prophet"
    assert result.calibration.metrics == {"rmse": 0.2, "mae": 0.2, "mape": 0.2}
