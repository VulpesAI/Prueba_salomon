from __future__ import annotations

import argparse
import asyncio
import base64
import json
import statistics
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, TYPE_CHECKING

DEFAULT_MAX_WER = 0.18
DEFAULT_MIN_NUMERIC = 0.98

if TYPE_CHECKING:  # pragma: no cover - solo para hints estáticos
    from app.providers import BaseTTSClient, STTProvider
    from .metrics import SpeechMetrics
else:
    BaseTTSClient = STTProvider = Any  # type: ignore[misc,assignment]
    SpeechMetrics = Any  # type: ignore[misc,assignment]


@dataclass
class ScriptCase:
    identifier: str
    accent: str
    text: str
    entities: List[str]
    numbers: List[str]


@dataclass
class VoiceEvaluation:
    voice_id: str
    metrics: SpeechMetrics
    latency_ms: float
    accent: str
    mos: Optional[float]


def load_dataset(path: Path) -> List[ScriptCase]:
    cases: List[ScriptCase] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        payload = json.loads(line)
        cases.append(
            ScriptCase(
                identifier=payload["id"],
                accent=payload.get("accent", "unknown"),
                text=payload["text"],
                entities=list(payload.get("entities", [])),
                numbers=list(payload.get("numbers", [])),
            )
        )
    if not cases:
        raise RuntimeError(f"El dataset {path} está vacío")
    return cases


def load_mos(path: Optional[Path]) -> Dict[str, Dict[str, float]]:
    if not path or not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    normalized: Dict[str, Dict[str, float]] = {}
    for voice_id, accents in data.items():
        normalized[voice_id] = {accent: float(value) for accent, value in accents.items()}
    return normalized


def resolve_mos(mos_table: Dict[str, Dict[str, float]], voice: str, accent: str) -> Optional[float]:
    by_voice = mos_table.get(voice)
    if not by_voice:
        return None
    if accent in by_voice:
        return by_voice[accent]
    return by_voice.get("*")


async def evaluate_voice(
    voice_id: str,
    cases: Iterable[ScriptCase],
    tts: BaseTTSClient,
    stt: STTProvider,
    settings,
    mos_table: Dict[str, Dict[str, float]],
) -> Dict[str, Any]:
    from .metrics import compute_metrics

    evaluations: List[VoiceEvaluation] = []

    for case in cases:
        start = time.perf_counter()
        synthesis = await tts.synthesize(
            text=case.text,
            language=settings.resolved_tts_language,
            voice=voice_id,
            audio_format="mp3",
            speed=settings.tts_default_speed,
        )
        latency_ms = synthesis.get("duration_ms")
        if latency_ms is None:
            latency_ms = (time.perf_counter() - start) * 1000

        audio_base64 = synthesis.get("audio_base64")
        if not isinstance(audio_base64, str):
            raise RuntimeError(f"Respuesta TTS inválida para la voz {voice_id}")
        audio_bytes = base64.b64decode(audio_base64)
        stt_result = stt.transcribe(audio_bytes, mime="audio/mp3", language="es")
        hypothesis = stt_result.get("text", "")
        metrics = compute_metrics(
            case.text,
            hypothesis,
            entities=case.entities,
            expected_numbers=case.numbers,
        )
        evaluations.append(
            VoiceEvaluation(
                voice_id=voice_id,
                metrics=metrics,
                latency_ms=float(latency_ms),
                accent=case.accent,
                mos=resolve_mos(mos_table, voice_id, case.accent),
            )
        )

    wer_values = [item.metrics.wer for item in evaluations]
    cer_values = [item.metrics.cer for item in evaluations]
    entity_f1_values = [item.metrics.entity_f1 for item in evaluations]
    numeric_values = [item.metrics.numeric_accuracy for item in evaluations]
    latency_values = [item.latency_ms for item in evaluations]
    mos_values = [item.mos for item in evaluations if item.mos is not None]

    return {
        "voice": voice_id,
        "cases": len(evaluations),
        "wer": statistics.mean(wer_values) if wer_values else 0.0,
        "cer": statistics.mean(cer_values) if cer_values else 0.0,
        "entity_f1": statistics.mean(entity_f1_values) if entity_f1_values else 0.0,
        "numeric_accuracy": statistics.mean(numeric_values) if numeric_values else 0.0,
        "latency_ms_avg": statistics.mean(latency_values) if latency_values else 0.0,
        "latency_ms_p95": percentile(latency_values, 0.95) if latency_values else 0.0,
        "mos": statistics.mean(mos_values) if mos_values else None,
        "per_case": [
            {
                "case": item.metrics,
                "accent": evaluation.accent,
                "latency_ms": evaluation.latency_ms,
                "mos": evaluation.mos,
            }
            for evaluation in evaluations
            for item in [evaluation]
        ],
    }


def percentile(values: List[float], q: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = int(round((len(ordered) - 1) * q))
    return ordered[index]


async def main() -> int:
    parser = argparse.ArgumentParser(description="Voice QA runner")
    parser.add_argument(
        "--dataset",
        type=Path,
        default=Path(__file__).resolve().parent / "datasets" / "financial_spanish.jsonl",
        help="Ruta al dataset JSONL de frases financieras",
    )
    parser.add_argument(
        "--mos",
        type=Path,
        default=Path(__file__).resolve().parent / "mos_reference.json",
        help="Archivo opcional con anotaciones MOS",
    )
    parser.add_argument("--max-wer", type=float, default=DEFAULT_MAX_WER)
    parser.add_argument("--min-numeric", type=float, default=DEFAULT_MIN_NUMERIC)
    parser.add_argument("--output", type=Path, help="Archivo donde guardar el reporte JSON")
    args = parser.parse_args()

    try:
        from app.providers import (
            BaseTTSClient as RuntimeBaseTTSClient,
            get_stt_provider,
            get_tts_client,
        )
        from app.settings import get_settings
        from app.voice_registry import voice_registry
    except ModuleNotFoundError as exc:
        hint = "pip install -r services/voice-gateway/requirements.txt"
        print(
            f"[voice-qa] Dependencias ausentes para el harness: {exc}. Ejecuta `{hint}`.",
            file=sys.stderr,
        )
        return 1

    settings = get_settings()
    if not settings.resolved_openai_api_key:
        print("[voice-qa] OPENAI_API_KEY no configurada, se omite la evaluación", file=sys.stderr)
        return 0

    dataset = load_dataset(args.dataset)
    mos_table = load_mos(args.mos)

    await voice_registry.refresh_availability()

    available = [
        voice for voice in voice_registry.availability_snapshot() if voice["supports"].get("tts")
    ]
    if not available:
        print("[voice-qa] No hay voces disponibles para TTS", file=sys.stderr)
        return 1

    tts = get_tts_client()
    stt = get_stt_provider()

    if not isinstance(tts, RuntimeBaseTTSClient):
        raise RuntimeError("El cliente TTS no implementa la interfaz esperada")

    reports: List[Dict[str, Any]] = []
    threshold_failures: List[str] = []

    for voice in available:
        voice_id = voice["id"]
        try:
            report = await evaluate_voice(voice_id, dataset, tts, stt, settings, mos_table)
        except Exception as exc:
            print(f"[voice-qa] Falló la evaluación de la voz {voice_id}: {exc}", file=sys.stderr)
            continue
        reports.append(report)
        if report["wer"] > args.max_wer or report["numeric_accuracy"] < args.min_numeric:
            threshold_failures.append(voice_id)

    summary = {"voices": reports, "max_wer": args.max_wer, "min_numeric": args.min_numeric}
    payload = json.dumps(summary, indent=2, ensure_ascii=False)

    if args.output:
        args.output.write_text(payload, encoding="utf-8")
    else:
        print(payload)

    if threshold_failures:
        print(
            "[voice-qa] Voces fuera de umbrales: " + ", ".join(threshold_failures),
            file=sys.stderr,
        )
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
