from __future__ import annotations

import logging
import os
from typing import Dict, List

import spacy
from spacy.language import Language

from .models import IntentCandidate

logger = logging.getLogger(__name__)

_KEYWORDS = {
    "consulta_balance": ["balance", "saldo", "dinero disponible", "cuánto tengo"],
    "gastos_categoria": ["gasto", "categoría", "aliment", "transporte", "mayor gasto"],
    "plan_ahorro": ["ahorrar", "ahorro", "meta", "plan"]
}


class SpanishNLU:
    """Lightweight spaCy-based NLU pipeline for Spanish financial intents."""

    def __init__(self) -> None:
        model_name = os.getenv("SPACY_MODEL", "es_core_news_md")
        try:
            self._nlp: Language = spacy.load(model_name)
            logger.info("Loaded spaCy model '%s'", model_name)
        except OSError:
            logger.warning("spaCy model '%s' not available, falling back to blank Spanish pipeline", model_name)
            self._nlp = spacy.blank("es")
            if "sentencizer" not in self._nlp.pipe_names:
                self._nlp.add_pipe("sentencizer")

    def detect_intents(self, text: str) -> List[IntentCandidate]:
        doc = self._nlp(text)
        lowered = doc.text.lower()
        intents: List[IntentCandidate] = []

        for intent, keywords in _KEYWORDS.items():
            confidence = self._keyword_confidence(lowered, keywords)
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

    def _keyword_confidence(self, lowered_text: str, keywords: List[str]) -> float:
        matches = sum(1 for kw in keywords if kw in lowered_text)
        if not matches:
            return 0.0
        return min(0.95, 0.4 + 0.15 * matches)

    def _extract_entities(self, doc: Language, intent: str) -> Dict[str, str]:
        entities: Dict[str, str] = {}
        for ent in doc.ents:
            entities[ent.label_.lower()] = ent.text
        if intent == "plan_ahorro":
            numbers = [token.text for token in doc if token.like_num]
            if numbers:
                entities.setdefault("monto", numbers[0])
        return entities

    def _describe_intent(self, intent: str) -> str:
        descriptions = {
            "consulta_balance": "Consulta sobre balance general",
            "gastos_categoria": "Detalle de gastos por categoría",
            "plan_ahorro": "Planes o metas de ahorro",
        }
        return descriptions.get(intent, "Consulta financiera")
