import asyncio
import base64
import importlib.util
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict
from uuid import UUID, uuid4

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("httpx")

from fastapi.testclient import TestClient

MODULE_PATH = Path(__file__).resolve().parents[1] / "main.py"
spec = importlib.util.spec_from_file_location("recommendation_engine_main_feedback", MODULE_PATH)
recommendation_main = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(recommendation_main)  # type: ignore[misc]


def _build_token(payload: Dict[str, object]) -> str:
    header = base64.urlsafe_b64encode(json.dumps({"alg": "none"}).encode()).rstrip(b"=")
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b"=")
    return f"{header.decode()}.{body.decode()}."


def _store_recommendation(user_id: UUID, recommendation_id: UUID) -> None:
    record = recommendation_main.RecommendationRecord(
        id=str(recommendation_id),
        user_id=str(user_id),
        title="Ahorra",
        description="Reduce tus gastos variables",
        score=0.7,
        category="ahorro",
        explanation="Basado en tus gastos recientes",
        generated_at=datetime.now(timezone.utc),
    )
    asyncio.run(recommendation_main.recommendation_store.save(str(user_id), [record]))


@pytest.fixture(autouse=True)
def clear_feedback_cache() -> None:
    asyncio.run(recommendation_main.recommendation_store.clear_feedback())


def test_submit_feedback_accepts_valid_payload() -> None:
    client = TestClient(recommendation_main.app)
    user_id = uuid4()
    recommendation_id = uuid4()
    _store_recommendation(user_id, recommendation_id)

    expires = datetime.now(timezone.utc) + timedelta(minutes=30)
    token = _build_token({"sub": str(user_id), "exp": int(expires.timestamp()), "scope": "recs:write"})

    submission_id = uuid4()
    payload = {
        "user_id": str(user_id),
        "recommendation_id": str(recommendation_id),
        "score": 1,
        "comment": "  ¡Gracias por la sugerencia!  ",
        "rule_key": "budget_10pct",
        "cluster_id": 4,
        "model_version": "mv-test",
        "run_id": str(uuid4()),
        "client_submission_id": str(submission_id),
    }

    response = client.post(
        "/recommendations/feedback",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 202
    body = response.json()
    assert UUID(body["feedback_id"])
    assert body["stored"] == "memory"
    assert body["will_persist"] == "supabase_when_enabled"
    assert body["duplicate"] is False

    feedback_entries = asyncio.run(recommendation_main.recommendation_store.get_feedback(str(user_id)))
    assert len(feedback_entries) == 1
    assert feedback_entries[0].comment == "¡Gracias por la sugerencia!"


def test_submit_feedback_validates_score_by_mode() -> None:
    client = TestClient(recommendation_main.app)
    user_id = uuid4()
    recommendation_id = uuid4()
    _store_recommendation(user_id, recommendation_id)

    expires = datetime.now(timezone.utc) + timedelta(minutes=30)
    token = _build_token({"sub": str(user_id), "exp": int(expires.timestamp()), "scope": "recs:write"})

    payload = {
        "user_id": str(user_id),
        "recommendation_id": str(recommendation_id),
        "score": 5,
    }

    response = client.post(
        "/recommendations/feedback",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "invalid_score"


def test_submit_feedback_is_idempotent_with_client_submission() -> None:
    client = TestClient(recommendation_main.app)
    user_id = uuid4()
    recommendation_id = uuid4()
    _store_recommendation(user_id, recommendation_id)

    expires = datetime.now(timezone.utc) + timedelta(minutes=30)
    token = _build_token({"sub": str(user_id), "exp": int(expires.timestamp()), "scope": "recs:write"})

    submission_id = uuid4()
    payload = {
        "user_id": str(user_id),
        "recommendation_id": str(recommendation_id),
        "score": 1,
        "client_submission_id": str(submission_id),
    }

    first = client.post(
        "/recommendations/feedback",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert first.status_code == 202

    second = client.post(
        "/recommendations/feedback",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert second.status_code == 409
    duplicate_body = second.json()
    assert duplicate_body["duplicate"] is True
    assert duplicate_body["stored"] == "memory"


def test_submit_feedback_requires_matching_user() -> None:
    client = TestClient(recommendation_main.app)
    user_id = uuid4()
    recommendation_id = uuid4()
    _store_recommendation(user_id, recommendation_id)

    expires = datetime.now(timezone.utc) + timedelta(minutes=30)
    token = _build_token({"sub": "another-user", "exp": int(expires.timestamp())})

    payload = {
        "user_id": str(user_id),
        "recommendation_id": str(recommendation_id),
        "score": 0,
    }

    response = client.post(
        "/recommendations/feedback",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
