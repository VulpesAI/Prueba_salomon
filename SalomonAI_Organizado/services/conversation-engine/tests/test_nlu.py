"""Tests para la detección de intents del motor conversacional."""
from __future__ import annotations

import importlib
import sys
from pathlib import Path

import pytest

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

SpanishNLU = importlib.import_module("app.nlu").SpanishNLU


@pytest.fixture(scope="module")
def spanish_nlu() -> SpanishNLU:
    """Instancia única del pipeline NLU para reutilizar en las pruebas."""
    return SpanishNLU()


@pytest.mark.parametrize(
    "query,expected_intent",
    [
        ("¿Cuál es mi saldo actual en la cuenta?", "consulta_balance"),
        ("Muéstrame mis gastos por categoría este mes", "gastos_categoria"),
        ("Necesito un plan para ahorrar para mis vacaciones", "plan_ahorro"),
        ("¿Cuál es mi límite disponible en la tarjeta de crédito?", "limite_credito"),
    ],
)
def test_detects_top_intent(spanish_nlu: SpanishNLU, query: str, expected_intent: str) -> None:
    intents = spanish_nlu.detect_intents(query)
    assert intents, "El motor debe devolver al menos un intent"  # noqa: S101
    top_intent = intents[0]
    assert top_intent.name == expected_intent
    assert top_intent.confidence >= 0.4


def test_returns_general_intent_when_no_match(spanish_nlu: SpanishNLU) -> None:
    query = "Recuérdame comprar pan mañana"
    intents = spanish_nlu.detect_intents(query)
    assert intents, "Debe existir un intent por defecto"  # noqa: S101
    assert intents[0].name == "consulta_general"
    assert intents[0].confidence == pytest.approx(0.35)
