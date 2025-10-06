import importlib.util
from pathlib import Path
from uuid import uuid4

import pytest

pytest.importorskip("httpx")
pytest.importorskip("fastapi")

MODULE_PATH = Path(__file__).resolve().parents[1] / "main.py"
spec = importlib.util.spec_from_file_location("recommendation_engine_main", MODULE_PATH)
recommendation_main = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(recommendation_main)  # type: ignore[misc]


def _build_base_features(user_id: str, *, savings_rate: float, category_shares: dict[str, float], transaction_count: int) -> recommendation_main.UserFeatures:
    now = recommendation_main.utcnow()
    return recommendation_main.UserFeatures(
        user_id=user_id,
        total_income=800_000.0,
        total_expenses=820_000.0,
        net_cash_flow=-20_000.0,
        average_transaction=45_000.0,
        discretionary_ratio=0.3,
        essential_ratio=0.7,
        savings_rate=savings_rate,
        top_category=next(iter(category_shares.keys()), None),
        category_totals={key: value * 820_000.0 for key, value in category_shares.items()},
        category_shares=category_shares,
        merchant_diversity=4,
        recurring_flags={"arriendo": True},
        volatility_expense=0.2,
        transaction_count=transaction_count,
        last_transaction_at=now,
        updated_at=now,
        window="90d",
        run_id=str(uuid4()),
    )


def _build_window_snapshot(user_id: str, *, category_shares: dict[str, float]) -> recommendation_main.WindowedUserFeatures:
    now = recommendation_main.utcnow()
    return recommendation_main.WindowedUserFeatures(
        id=str(uuid4()),
        run_id=str(uuid4()),
        user_id=user_id,
        as_of_date=now.date(),
        window="30d",
        income_total=780_000.0,
        expense_total=800_000.0,
        net_cashflow=-20_000.0,
        savings_rate=0.05,
        top_category=next(iter(category_shares.keys()), None),
        category_shares=category_shares,
        merchant_diversity=3,
        recurring_flags={"arriendo": True},
        volatility_expense=0.18,
        updated_at=now,
    )


def test_budget_rule_uses_fallback_for_essential_category() -> None:
    manager = recommendation_main.RecommendationModelManager()
    category_shares = {"arriendo": 0.6, "servicios": 0.4}
    features = _build_base_features("user-essential", savings_rate=0.05, category_shares=category_shares, transaction_count=24)
    window_snapshot = _build_window_snapshot("user-essential", category_shares=category_shares)
    manager.update_window_features([window_snapshot])

    records, trace = manager.evaluate(features, include_cluster=False)

    rule_keys = {record.rule_key for record in records}
    assert "budget_10pct:fallback" in rule_keys
    guardrails = {entry.guardrail for entry in trace if entry.rule == "budget_10pct"}
    assert "essential_category" in guardrails


def test_budget_rule_skipped_when_transactions_insufficient() -> None:
    manager = recommendation_main.RecommendationModelManager()
    category_shares = {"restaurantes": 0.4, "entretenimiento": 0.3}
    features = _build_base_features("user-fewtx", savings_rate=0.05, category_shares=category_shares, transaction_count=5)
    window_snapshot = _build_window_snapshot("user-fewtx", category_shares=category_shares)
    manager.update_window_features([window_snapshot])

    records, trace = manager.evaluate(features, include_cluster=False)

    assert all(record.rule_key != "budget_10pct" for record in records)
    reasons = {entry.reason for entry in trace if entry.rule == "budget_10pct"}
    assert "insufficient_transactions" in reasons


def test_budget_rule_respects_max_repeats() -> None:
    manager = recommendation_main.RecommendationModelManager()
    category_shares = {"restaurantes": 0.4, "supermercado": 0.2}
    features = _build_base_features("user-repeat", savings_rate=0.05, category_shares=category_shares, transaction_count=30)
    window_snapshot = _build_window_snapshot("user-repeat", category_shares=category_shares)
    manager.update_window_features([window_snapshot])

    for _ in range(2):
        records, _ = manager.evaluate(features, include_cluster=False)
        assert any(record.rule_key == "budget_10pct" for record in records)

    third_records, third_trace = manager.evaluate(features, include_cluster=False)
    assert all(record.rule_key != "budget_10pct" for record in third_records)
    reasons = {entry.reason for entry in third_trace if entry.rule == "budget_10pct"}
    assert "max_repeats" in reasons
