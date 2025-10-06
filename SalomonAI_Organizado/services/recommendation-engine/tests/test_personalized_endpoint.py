import base64
import importlib.util
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List

import pytest

pytest.importorskip("httpx")
pytest.importorskip("fastapi")

MODULE_PATH = Path(__file__).resolve().parents[1] / "main.py"
spec = importlib.util.spec_from_file_location("recommendation_engine_main", MODULE_PATH)
recommendation_main = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(recommendation_main)  # type: ignore[misc]


def _build_token(payload: Dict[str, object]) -> str:
    header = base64.urlsafe_b64encode(json.dumps({"alg": "none"}).encode()).rstrip(b"=")
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b"=")
    return f"{header.decode()}.{body.decode()}."


def test_authorize_allows_subject_token() -> None:
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    token = _build_token({"sub": "user-123", "exp": int(expires.timestamp())})
    recommendation_main._authorize_recommendations_request(f"Bearer {token}", "user-123")


def test_authorize_requires_scope_or_subject() -> None:
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    token = _build_token({"sub": "other-user", "exp": int(expires.timestamp())})
    with pytest.raises(recommendation_main.HTTPException) as exc:
        recommendation_main._authorize_recommendations_request(f"Bearer {token}", "user-999")
    assert exc.value.status_code == 403


def test_build_item_from_persisted_preserves_actions() -> None:
    now = datetime.now(timezone.utc)
    record = {
        "id": "rec-1",
        "source": "rules",
        "cluster_id": 4,
        "payload": {
            "title": "Reduce gastos",
            "message": "Disminuye tus gastos variables.",
            "score": 0.82,
            "actions": [
                {"type": "education", "label": "Aprende más", "url": "https://salomon.ai"},
            ],
            "evidence": {"net_cashflow": -120000},
            "model_version": "mv-1",
        },
        "priority": 1,
        "valid_from": now,
        "valid_to": None,
        "created_at": now,
    }

    item = recommendation_main._build_item_from_persisted(
        record,
        include_cluster=True,
        cluster_info=None,
    )

    assert item is not None
    assert item.title == "Reduce gastos"
    assert item.cluster_id == 4
    assert item.actions[0].label == "Aprende más"


def test_generate_rule_recommendations_from_features() -> None:
    today = date.today()
    features: List[Dict[str, object]] = [
        {
            "window": "30d",
            "as_of_date": today,
            "income_total": 500000.0,
            "expense_total": 490000.0,
            "net_cashflow": -30000.0,
            "savings_rate": 0.05,
            "category_shares": {"restaurantes": 0.3},
            "recurring_flags": {"arriendo": True},
            "updated_at": datetime.now(timezone.utc),
        },
        {
            "window": "90d",
            "as_of_date": today,
            "income_total": 1500000.0,
            "expense_total": 1550000.0,
            "net_cashflow": -50000.0,
            "savings_rate": 0.06,
            "category_shares": {"restaurantes": 0.22},
            "recurring_flags": {"arriendo": True},
            "updated_at": datetime.now(timezone.utc),
        },
    ]

    recs = recommendation_main._generate_rule_recommendations(
        user_id="user-abc",
        features=features,
        as_of_date=today,
        lang="es-CL",
        cluster_info={"cluster_id": 2, "model_version": "mv-9"},
        include_cluster=True,
        limit=5,
    )

    assert recs, "expected at least one rule-based recommendation"
    titles = {item.title for item in recs}
    assert "Aumenta tu ahorro mensual" in titles
    assert any(item.cluster_id == 2 for item in recs)
