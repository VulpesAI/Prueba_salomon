from __future__ import annotations

from typing import Iterable

import numpy as np
import pandas as pd
import pytest

from app.config import Settings
from app.forecasting import ForecastingEngine


def _series(values: Iterable[float], start: str) -> pd.Series:
    index = pd.date_range(start=start, periods=len(values), freq="D")
    return pd.Series(values, index=index, dtype=float)


def _make_engine(monkeypatch: pytest.MonkeyPatch, history: pd.Series, *, minimum_days: int = 5) -> ForecastingEngine:
    settings = Settings(default_horizon_days=3, minimum_history_days=minimum_days)
    engine = ForecastingEngine(engine=None, settings=settings)
    monkeypatch.setattr(engine, "_load_history", lambda _user_id: history)
    return engine


def test_generate_forecast_without_history_uses_neutral_projection(monkeypatch: pytest.MonkeyPatch) -> None:
    engine = _make_engine(monkeypatch, pd.Series(dtype=float))

    response = engine.generate_forecast("user-123")

    assert response.model_type == "auto"
    assert len(response.forecasts) == engine.settings.default_horizon_days
    assert all(point.amount == 0.0 for point in response.forecasts)
    assert response.metadata["reason"] == "no_history"


def test_insufficient_history_skips_statistical_models(monkeypatch: pytest.MonkeyPatch) -> None:
    history = _series([100.0, 120.0, 130.0], start="2024-01-01")
    engine = _make_engine(monkeypatch, history, minimum_days=7)
    monkeypatch.setattr(
        engine,
        "_run_model",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("statistical model should not run")),
    )

    response = engine.generate_forecast("user-456")

    assert response.model_type == "auto"
    assert response.metadata["reason"] == "insufficient_history"
    assert response.metadata["minimum_history_days"] == 7


def test_auto_preference_falls_back_to_arima(monkeypatch: pytest.MonkeyPatch) -> None:
    history = _series([110.0 + day for day in range(10)], start="2024-02-01")
    engine = _make_engine(monkeypatch, history, minimum_days=5)

    monkeypatch.setattr("app.forecasting.PROPHET_AVAILABLE", True, raising=False)

    def failing_prophet(*_args, **_kwargs):
        raise RuntimeError("prophet boom")

    monkeypatch.setattr(engine, "_fit_prophet", failing_prophet)
    monkeypatch.setattr(engine, "_fit_arima", lambda *_args, **_kwargs: np.array([1.0, 2.0, 3.0]))

    response = engine.generate_forecast("user-789", model_preference="auto")

    assert response.model_type == "arima"
    assert response.forecasts[0].amount == 1.0
    assert response.metadata["history_start"] == "2024-02-01"
    assert response.metadata["history_end"] == "2024-02-10"
    assert response.metadata["reason"] == "model_degraded"
    assert response.metadata["model_errors"]["prophet"] == "prophet boom"
