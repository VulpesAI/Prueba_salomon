"""Pruebas para el streaming JSONL del motor conversacional."""
from __future__ import annotations

import importlib
import json
import sys
from pathlib import Path
from typing import Any, Dict, List
from unittest.mock import AsyncMock

import pytest

pytest.importorskip("fastapi")

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

main = importlib.import_module("app.main")
models = importlib.import_module("app.models")

ChatRequest = models.ChatRequest
ChatChunk = models.ChatChunk
FinancialInsight = models.FinancialInsight
FinancialSummary = models.FinancialSummary
IntentCandidate = models.IntentCandidate
IntentResolution = models.IntentResolution


class _FakeNLU:
    def __init__(self, intents: List[IntentCandidate]):
        self._intents = intents

    def detect_intents(self, _: str) -> List[IntentCandidate]:
        return list(self._intents)


class _FakeCoreClient:
    def __init__(self, resolution: IntentResolution, summary: FinancialSummary):
        self._resolution = resolution
        self._summary = summary

    async def resolve_intent(
        self,
        intent: IntentCandidate,
        *,
        session_id: str,
        query_text: str,
        metadata: Dict[str, Any] | None,
    ) -> IntentResolution:
        assert intent.name == self._resolution.intent.name
        assert session_id
        assert query_text
        return self._resolution

    async def fetch_financial_summary(
        self, session_id: str, *, metadata: Dict[str, Any] | None = None
    ) -> FinancialSummary:
        assert session_id
        return self._summary


def _build_services() -> Dict[str, Any]:
    intent = IntentCandidate(
        name="saldo_actual",
        confidence=0.9,
        description="Consulta sobre balance",
        entities={"account": "principal"},
    )
    resolution = IntentResolution(
        intent=intent,
        response_text="Saldo disponible actual",
        insights=[FinancialInsight(label="Saldo", value="$1.000.000")],
        data={"balance": 1_000_000},
    )
    summary = FinancialSummary(
        total_balance=1_000_000,
        monthly_income=750_000,
        monthly_expenses=450_000,
        expense_breakdown={"Vivienda": 200_000},
        recent_transactions=[],
    )
    return {
        "nlu": _FakeNLU([intent]),
        "core_client": _FakeCoreClient(resolution, summary),
        "data_service": None,
    }


def _decode_chunk(chunk: bytes) -> Dict[str, Any]:
    text = chunk.decode("utf-8").strip()
    assert text, "Cada chunk debe contener un objeto JSON"  # noqa: S101
    payload = json.loads(text)
    assert "type" in payload  # noqa: S101
    return payload


@pytest.mark.asyncio
async def test_chat_event_stream_emits_expected_sequence(monkeypatch: pytest.MonkeyPatch) -> None:
    services = _build_services()
    monkeypatch.setattr(main.asyncio, "sleep", AsyncMock(return_value=None))

    request = ChatRequest(session_id="abc123", message="¿Cuál es mi saldo?")
    events: List[Dict[str, Any]] = []

    async for raw_chunk in main.chat_event_stream(request, services):
        events.append(_decode_chunk(raw_chunk))

    types = [event["type"] for event in events]
    assert types == [
        "intent",
        "insight",
        "token",
        "token",
        "token",
        "metadata",
        "summary",
        "done",
    ]
    assert events[0]["intent"]["name"] == "saldo_actual"
    assert events[1]["insight"]["label"] == "Saldo"
    tokens = [event["token"] for event in events if event["type"] == "token"]
    assert "Saldo" in "".join(tokens)
    assert events[-2]["summary"]["total_balance"] == 1_000_000
    assert events[-1]["intent"] == "saldo_actual"


@pytest.mark.asyncio
async def test_chat_stream_returns_jsonl_stream(monkeypatch: pytest.MonkeyPatch) -> None:
    services = _build_services()
    monkeypatch.setattr(main.asyncio, "sleep", AsyncMock(return_value=None))

    request = ChatRequest(session_id="stream-1", message="Necesito el saldo")
    response = await main.chat_stream(request, services)

    assert response.media_type == "application/jsonl"

    collected: List[ChatChunk] = []
    async for raw_chunk in response.body_iterator:  # type: ignore[union-attr]
        payload = _decode_chunk(raw_chunk)
        collected.append(ChatChunk(type=payload["type"], data={k: v for k, v in payload.items() if k != "type"}))

    assert collected[0].type == "intent"
    assert collected[-1].type == "done"
