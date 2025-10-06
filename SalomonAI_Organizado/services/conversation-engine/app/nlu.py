from __future__ import annotations

import logging
import os
import unicodedata
from typing import Any, Dict, Iterable, List, Tuple

try:  # pragma: no cover - dependencia externa opcional en entornos de prueba
    import spacy
    from spacy.language import Language
    from spacy.tokens import Doc
except ModuleNotFoundError:  # pragma: no cover
    spacy = None  # type: ignore[assignment]
    Language = Any  # type: ignore[assignment]
    Doc = Any  # type: ignore[assignment]

from .models import IntentCandidate

logger = logging.getLogger(__name__)

_INTENT_DEFINITIONS: Dict[str, Dict[str, List[str] | str]] = {
    "saldo_actual": {
        "keywords": [
            "saldo",
            "saldo actual",
            "balance",
            "dinero disponible",
            "cuánto tengo",
            "cuanto tengo",
            "cuanto dinero",
            "total en mi cuenta",
            "disponible en cuenta",
        ],
        "description": "Consulta sobre balance general",
    },
    "gasto_mes": {
        "keywords": [
            "gasto",
            "gastos",
            "gasto mensual",
            "categoría",
            "categoria",
            "gastos por categoría",
            "gastos por categoria",
            "distribución de gastos",
            "mayor gasto",
            "en qué gasto",
        ],
        "description": "Detalle de gastos por categoría",
    },
    "proyeccion_flujo": {
        "keywords": [
            "proyección",
            "proyeccion",
            "flujo",
            "flujo de caja",
            "cashflow",
            "proyección de gastos",
            "proyeccion de gastos",
            "proyección de ingresos",
        ],
        "description": "Proyección de flujo de caja",
    },
    "plan_ahorro": {
        "keywords": [
            "ahorrar",
            "ahorro",
            "meta",
            "plan",
            "objetivo de ahorro",
            "guardar dinero",
        ],
        "description": "Planes o metas de ahorro",
    },
    "limite_credito": {
        "keywords": [
            "límite",
            "limite",
            "cupo",
            "cupos",
            "tope",
            "tarjeta de crédito",
            "tarjeta de credito",
            "línea de crédito",
            "linea de credito",
            "crédito disponible",
            "credito disponible",
        ],
        "description": "Consulta por límites o cupos de crédito",
    },
}


class SpanishNLU:
    """Lightweight spaCy-based NLU pipeline for Spanish financial intents."""

    def __init__(self) -> None:
        model_name = os.getenv("SPACY_MODEL", "es_core_news_md")
        self._nlp = self._load_pipeline(model_name)
        self._intent_keywords: Dict[str, List[Tuple[str, str]]] = {}
        for intent, config in _INTENT_DEFINITIONS.items():
            keywords = [kw.lower() for kw in config.get("keywords", [])]
            self._intent_keywords[intent] = [
                (kw, self._normalize_text(kw)) for kw in keywords
            ]

    def _load_pipeline(self, model_name: str) -> Any:
        if spacy is None:
            logger.warning("spaCy no está instalado; se usará un tokenizador básico en memoria")
            return _SimpleSpanishTokenizer()

        try:
            nlp: Language = spacy.load(model_name)
            logger.info("Loaded spaCy model '%s'", model_name)
            return nlp
        except OSError:
            logger.warning(
                "spaCy model '%s' not available, falling back to blank Spanish pipeline",
                model_name,
            )
            nlp = spacy.blank("es")
            if "sentencizer" not in nlp.pipe_names:
                nlp.add_pipe("sentencizer")
            return nlp

    def detect_intents(self, text: str) -> List[IntentCandidate]:
        doc = self._nlp(text)
        lowered = doc.text.lower()
        normalized = self._normalize_text(lowered)
        intents: List[IntentCandidate] = []

        for intent, keywords in self._intent_keywords.items():
            confidence = self._keyword_confidence(lowered, normalized, keywords)
            if confidence > 0:
                intents.append(
                    IntentCandidate(
                        name=intent,
                        confidence=confidence,
                        description=self._describe_intent(intent),
                        entities=self._extract_entities(doc, intent),
                    )
                )

        if not intents:
            intents.append(
                IntentCandidate(
                    name="consulta_general",
                    confidence=0.35,
                    description="Consulta general financiera",
                    entities=self._extract_entities(doc, "consulta_general"),
                )
            )
        intents.sort(key=lambda candidate: candidate.confidence, reverse=True)
        return intents

    def _keyword_confidence(
        self,
        lowered_text: str,
        normalized_text: str,
        keywords: List[Tuple[str, str]],
    ) -> float:
        matches = 0
        for keyword, normalized_keyword in keywords:
            if keyword in lowered_text or normalized_keyword in normalized_text:
                matches += 1
        if not matches:
            return 0.0
        return min(0.95, 0.4 + 0.15 * matches)

    def _extract_entities(self, doc: Any, intent: str) -> Dict[str, str]:
        entities: Dict[str, str] = {}
        for ent in getattr(doc, "ents", []):
            label = getattr(ent, "label_", "").lower()
            text = getattr(ent, "text", "")
            if label:
                entities[label] = text
        if intent == "plan_ahorro":
            numbers = [token.text for token in self._iterate_tokens(doc) if self._is_number(token)]
            if numbers:
                entities.setdefault("monto", numbers[0])
        if intent == "limite_credito":
            numbers = [
                token.text for token in self._iterate_tokens(doc) if self._is_number(token)
            ]
            if numbers:
                entities.setdefault("monto_referencial", numbers[0])
        return entities

    def _describe_intent(self, intent: str) -> str:
        description = _INTENT_DEFINITIONS.get(intent, {}).get("description")
        return str(description) if description else "Consulta financiera"

    def _normalize_text(self, text: str) -> str:
        normalized = unicodedata.normalize("NFD", text)
        return "".join(char for char in normalized if unicodedata.category(char) != "Mn")

    def _iterate_tokens(self, doc: Any) -> Iterable[Any]:
        if doc is None:
            return []
        if hasattr(doc, "__iter__"):
            return doc
        return []

    def _is_number(self, token: Any) -> bool:
        text = getattr(token, "text", str(token))
        cleaned = text.replace("$", "").replace("%", "").replace(",", "").strip()
        if not cleaned:
            return False
        try:
            float(cleaned)
        except ValueError:
            return False
        return True


class _SimpleToken:
    def __init__(self, text: str) -> None:
        self.text = text

    def __repr__(self) -> str:  # pragma: no cover - debug
        return f"_SimpleToken(text={self.text!r})"


class _SimpleDoc:
    def __init__(self, text: str) -> None:
        self.text = text
        self.ents: List[Any] = []
        self._tokens = [_SimpleToken(token) for token in text.split()]

    def __iter__(self) -> Iterable[_SimpleToken]:
        return iter(self._tokens)


class _SimpleSpanishTokenizer:
    def __call__(self, text: str) -> _SimpleDoc:
        return _SimpleDoc(text)
