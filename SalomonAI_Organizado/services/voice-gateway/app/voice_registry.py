from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Literal, Optional, Tuple

import httpx

from .providers import get_tts_client
from .settings import get_settings

logger = logging.getLogger(__name__)

VoiceEndpoint = Literal["tts", "realtime"]


@dataclass(frozen=True)
class VoiceSupports:
    tts: bool
    realtime: bool

    def as_dict(self) -> Dict[str, bool]:
        return {"tts": self.tts, "realtime": self.realtime}


@dataclass(frozen=True)
class VoiceEntry:
    id: str
    label: str
    supports: VoiceSupports


@dataclass
class VoiceRuntimeStatus:
    available_tts: bool
    available_realtime: bool
    tts_latency_ms: Optional[float] = None
    realtime_latency_ms: Optional[float] = None
    failures: Dict[VoiceEndpoint, str] = field(default_factory=dict)

    def for_endpoint(self, endpoint: VoiceEndpoint) -> bool:
        return self.available_tts if endpoint == "tts" else self.available_realtime

    def update(self, endpoint: VoiceEndpoint, available: bool, latency_ms: Optional[float], error: Optional[str]) -> None:
        if endpoint == "tts":
            self.available_tts = available
            self.tts_latency_ms = latency_ms
        else:
            self.available_realtime = available
            self.realtime_latency_ms = latency_ms
        if error:
            self.failures[endpoint] = error
        elif endpoint in self.failures:
            self.failures.pop(endpoint, None)


class VoiceRegistry:
    """Mantiene el catálogo de voces de OpenAI y su disponibilidad."""

    def __init__(self) -> None:
        self._settings = get_settings()
        self._voices = self._load_registry()
        self._status: Dict[str, VoiceRuntimeStatus] = {
            voice.id: VoiceRuntimeStatus(
                available_tts=voice.supports.tts,
                available_realtime=voice.supports.realtime,
            )
            for voice in self._voices
        }
        self._lock = asyncio.Lock()

    def _load_registry(self) -> List[VoiceEntry]:
        registry_path = Path(__file__).resolve().parents[3] / "config" / "openai_voice_registry.json"
        if not registry_path.exists():
            raise RuntimeError(f"No se encontró el registro de voces en {registry_path}")
        with registry_path.open("r", encoding="utf-8") as fp:
            data = json.load(fp)
        voices: List[VoiceEntry] = []
        for item in data:
            supports = item.get("supports", {})
            voices.append(
                VoiceEntry(
                    id=item["id"],
                    label=item.get("label", item["id"].title()),
                    supports=VoiceSupports(
                        tts=bool(supports.get("tts", False)),
                        realtime=bool(supports.get("realtime", False)),
                    ),
                )
            )
        return voices

    def all_voices(self) -> List[VoiceEntry]:
        return list(self._voices)

    def resolve_voice(self, voice_id: Optional[str], endpoint: VoiceEndpoint) -> Optional[str]:
        if not voice_id:
            return None
        voice_id = voice_id.strip().lower()
        if not voice_id:
            return None
        for voice in self._voices:
            if voice.id == voice_id and voice.supports.as_dict().get(endpoint):
                status = self._status.get(voice_id)
                if status is None or status.for_endpoint(endpoint):
                    return voice_id
                break
        return None

    def default_voice(self, endpoint: VoiceEndpoint) -> str:
        default_candidate = self._settings.resolved_tts_voice if endpoint == "tts" else self._settings.openai_realtime_voice
        resolved = self.resolve_voice(default_candidate, endpoint)
        if resolved:
            return resolved
        for voice in self._voices:
            if voice.supports.as_dict().get(endpoint):
                status = self._status.get(voice.id)
                if status is None or status.for_endpoint(endpoint):
                    return voice.id
        raise RuntimeError("No hay voces disponibles para el endpoint solicitado")

    def availability_snapshot(self) -> List[Dict[str, object]]:
        snapshot: List[Dict[str, object]] = []
        for voice in self._voices:
            status = self._status.get(voice.id)
            supports = voice.supports.as_dict()
            supports["tts"] = supports["tts"] and (status.available_tts if status else True)
            supports["realtime"] = supports["realtime"] and (status.available_realtime if status else True)
            snapshot.append(
                {
                    "id": voice.id,
                    "label": voice.label,
                    "supports": supports,
                    "latency_ms": {
                        "tts": status.tts_latency_ms if status else None,
                        "realtime": status.realtime_latency_ms if status else None,
                    },
                    "failures": status.failures.copy() if status else {},
                }
            )
        return snapshot

    async def refresh_availability(self) -> None:
        async with self._lock:
            await self._refresh_tts()
            await self._refresh_realtime()

    async def _refresh_tts(self) -> None:
        provider = self._settings.tts_provider.lower()
        if provider != "openai":
            logger.info("No se ejecuta smoke test TTS porque el proveedor configurado es %s", provider)
            return
        try:
            tts_client = get_tts_client()
        except Exception as exc:  # pragma: no cover - configuración inválida
            logger.warning("No se pudo inicializar el cliente TTS para smoke tests: %s", exc)
            return

        async def run_test(voice: VoiceEntry) -> Tuple[str, bool, Optional[float], Optional[str]]:
            if not voice.supports.tts:
                return voice.id, False, None, "voice_not_supported"
            start = time.perf_counter()
            try:
                result = await tts_client.synthesize(
                    text="Hola", language=self._settings.resolved_tts_language, voice=voice.id, audio_format="mp3", speed=1.0
                )
                _ = result.get("audio_base64") if isinstance(result, dict) else None
            except Exception as exc:  # pragma: no cover - dependencias externas
                logger.warning("Smoke test TTS falló para %s: %s", voice.id, exc)
                return voice.id, False, None, exc.__class__.__name__
            latency = (time.perf_counter() - start) * 1000
            return voice.id, True, latency, None

        tasks = [run_test(voice) for voice in self._voices if voice.supports.tts]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for voice, result in zip([v for v in self._voices if v.supports.tts], results):
            if isinstance(result, Exception):
                logger.warning("Smoke test TTS produjo excepción para %s: %s", voice.id, result)
                status = self._status.setdefault(voice.id, VoiceRuntimeStatus(True, True))
                status.update("tts", False, None, result.__class__.__name__)
                continue
            voice_id, ok, latency, error = result
            status = self._status.setdefault(voice_id, VoiceRuntimeStatus(True, True))
            status.update("tts", ok, latency, error)

    async def _refresh_realtime(self) -> None:
        if not self._settings.enable_openai_realtime:
            logger.info("No se ejecuta smoke test Realtime porque está deshabilitado")
            return
        api_key = self._settings.resolved_realtime_api_key
        if not api_key:
            logger.warning("Smoke test Realtime omitido: falta OPENAI_REALTIME_API_KEY")
            return
        url = "https://api.openai.com/v1/realtime/sessions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "OpenAI-Beta": "realtime=v1",
        }

        async def run_test(voice: VoiceEntry) -> Tuple[str, bool, Optional[float], Optional[str]]:
            if not voice.supports.realtime:
                return voice.id, False, None, "voice_not_supported"
            payload = {
                "model": self._settings.openai_realtime_model,
                "voice": voice.id,
                "input_audio_format": "pcm16",
                "output_audio_format": self._settings.openai_realtime_audio_format,
            }
            start = time.perf_counter()
            try:
                async with httpx.AsyncClient(timeout=5) as client:
                    response = await client.post(url, headers=headers, json=payload)
                if response.status_code >= 400:
                    logger.warning(
                        "Smoke test Realtime falló para %s con estado %s: %s",
                        voice.id,
                        response.status_code,
                        response.text,
                    )
                    return voice.id, False, None, f"http_{response.status_code}"
            except Exception as exc:  # pragma: no cover - dependencias externas
                logger.warning("Smoke test Realtime produjo error para %s: %s", voice.id, exc)
                return voice.id, False, None, exc.__class__.__name__
            latency = (time.perf_counter() - start) * 1000
            return voice.id, True, latency, None

        tasks = [run_test(voice) for voice in self._voices if voice.supports.realtime]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for voice, result in zip([v for v in self._voices if v.supports.realtime], results):
            if isinstance(result, Exception):
                logger.warning("Smoke test Realtime lanzó excepción para %s: %s", voice.id, result)
                status = self._status.setdefault(voice.id, VoiceRuntimeStatus(True, True))
                status.update("realtime", False, None, result.__class__.__name__)
                continue
            voice_id, ok, latency, error = result
            status = self._status.setdefault(voice_id, VoiceRuntimeStatus(True, True))
            status.update("realtime", ok, latency, error)


voice_registry = VoiceRegistry()
