from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable, Sequence, Set

from jiwer import cer, wer

__all__ = [
    "SpeechMetrics",
    "compute_metrics",
]


_NUMBER_PATTERN = re.compile(r"[-+]?\d[\d.,]*")


@dataclass(frozen=True)
class SpeechMetrics:
    wer: float
    cer: float
    entity_f1: float
    numeric_accuracy: float


def _normalize_entity(entity: str) -> str:
    return re.sub(r"\s+", " ", entity.strip().lower())


def _extract_entities(text: str, reference_entities: Iterable[str]) -> Set[str]:
    lowered = text.lower()
    found = {
        entity
        for entity in (_normalize_entity(item) for item in reference_entities)
        if entity and entity in lowered
    }
    return found


def _normalize_number(value: str) -> str:
    cleaned = value.replace(" ", "").replace(".", "").replace(",", ".")
    try:
        number = float(cleaned)
    except ValueError:
        return cleaned
    return f"{number:.4f}".rstrip("0").rstrip(".")


def _extract_numbers(text: str) -> Set[str]:
    matches = _NUMBER_PATTERN.findall(text)
    return {_normalize_number(match) for match in matches if match}


def compute_metrics(
    reference_text: str,
    hypothesis_text: str,
    *,
    entities: Sequence[str],
    expected_numbers: Sequence[str],
) -> SpeechMetrics:
    reference_clean = reference_text.strip().lower()
    hypothesis_clean = hypothesis_text.strip().lower()

    wer_value = wer(reference_clean, hypothesis_clean)
    cer_value = cer(reference_clean, hypothesis_clean)

    gold_entities = {_normalize_entity(item) for item in entities if item.strip()}
    predicted_entities = _extract_entities(hypothesis_text, entities)
    true_positives = len(gold_entities & predicted_entities)
    precision = true_positives / len(predicted_entities) if predicted_entities else 1.0
    recall = true_positives / len(gold_entities) if gold_entities else 1.0
    if precision + recall == 0:
        entity_f1 = 0.0
    else:
        entity_f1 = 2 * precision * recall / (precision + recall)

    expected_set = {_normalize_number(value) for value in expected_numbers if value}
    predicted_set = _extract_numbers(hypothesis_text)
    if expected_set:
        matched = sum(1 for item in expected_set if item in predicted_set)
        numeric_accuracy = matched / len(expected_set)
    else:
        numeric_accuracy = 1.0

    return SpeechMetrics(
        wer=wer_value,
        cer=cer_value,
        entity_f1=entity_f1,
        numeric_accuracy=numeric_accuracy,
    )
