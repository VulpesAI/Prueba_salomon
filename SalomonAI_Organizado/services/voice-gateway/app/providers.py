from __future__ import annotations

import asyncio
import base64
import io
import logging
from abc import ABC, abstractmethod
from functools import lru_cache
from typing import Dict

from openai import AsyncOpenAI

from .settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_SILENCE_WAV_BASE64 = (
    "UklGRkQDAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YSADAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAA=="
)


class BaseSTTClient(ABC):
    @abstractmethod
    async def transcribe(self, audio_base64: str, language: str = "es-CL") -> Dict[str, str]:
        raise NotImplementedError

    async def transcribe_stream(self, _: bytes) -> Dict[str, str]:
        return {"text": ""}


class BaseTTSClient(ABC):
    @abstractmethod
    async def synthesize(self, text: str, language: str = "es-CL", voice: str | None = None) -> Dict[str, str]:
        raise NotImplementedError


class MockSTTClient(BaseSTTClient):
    async def transcribe(self, audio_base64: str, language: str = "es-CL") -> Dict[str, str]:
        _ = audio_base64
        await asyncio.sleep(0.1)
        return {"text": "Transcripción simulada", "confidence": 0.55, "language": language}

    async def transcribe_stream(self, _: bytes) -> Dict[str, str]:
        await asyncio.sleep(0.05)
        return {"text": "fragmento", "final": False}


class MockTTSClient(BaseTTSClient):
    async def synthesize(self, text: str, language: str = "es-CL", voice: str | None = None) -> Dict[str, str]:
        _ = (text, language, voice)
        await asyncio.sleep(0.1)
        return {"audio_base64": _SILENCE_WAV_BASE64, "format": "audio/wav"}


class OpenAISTTClient(BaseSTTClient):
    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise ValueError("VOICE_OPENAI_API_KEY es obligatorio para usar el proveedor OpenAI")
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._model = settings.openai_stt_model

    async def transcribe(self, audio_base64: str, language: str = "es-CL") -> Dict[str, str]:
        try:
            audio_bytes = base64.b64decode(audio_base64)
        except (ValueError, TypeError) as exc:  # pragma: no cover - validación defensiva
            raise ValueError("Audio inválido, se esperaba base64") from exc

        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = "audio.wav"

        try:
            response = await self._client.audio.transcriptions.create(
                model=self._model,
                file=audio_file,
                language=language,
                response_format="verbose_json",
            )
        except Exception as exc:  # pragma: no cover - errores del SDK
            logger.error("Error de OpenAI STT: %s", exc)
            raise

        text = getattr(response, "text", "")
        detected_language = getattr(response, "language", language)

        confidence = 0.0
        segments = getattr(response, "segments", None)
        if isinstance(segments, list) and segments:
            confidences = [segment.get("confidence") for segment in segments if isinstance(segment, dict)]
            confidences = [float(c) for c in confidences if c is not None]
            if confidences:
                confidence = sum(confidences) / len(confidences)

        return {"text": text, "confidence": confidence, "language": detected_language}

    async def transcribe_stream(self, audio_chunk: bytes) -> Dict[str, str]:
        if not audio_chunk:
            return {"text": "", "final": False}
        try:
            raw_audio = base64.b64decode(audio_chunk, validate=False)
        except Exception:
            raw_audio = audio_chunk
        chunk_base64 = base64.b64encode(raw_audio).decode("utf-8")
        result = await self.transcribe(chunk_base64)
        result["final"] = False
        return result


class OpenAITTSClient(BaseTTSClient):
    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise ValueError("VOICE_OPENAI_API_KEY es obligatorio para usar el proveedor OpenAI")
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._model = settings.openai_tts_model

    async def synthesize(self, text: str, language: str = "es-CL", voice: str | None = None) -> Dict[str, str]:
        _ = language
        voice_id = voice or settings.openai_tts_voice
        try:
            response = await self._client.audio.speech.create(
                model=self._model,
                voice=voice_id,
                input=text,
                format=settings.openai_tts_format,
            )
            audio_bytes = await response.read()
        except Exception as exc:  # pragma: no cover - errores del SDK
            logger.error("Error de OpenAI TTS: %s", exc)
            raise

        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
        return {
            "audio_base64": audio_base64,
            "format": f"audio/{settings.openai_tts_format}",
        }


@lru_cache()
def get_stt_client() -> BaseSTTClient:
    provider = settings.stt_provider.lower()
    if provider == "mock":
        return MockSTTClient()
    if provider == "openai":
        return OpenAISTTClient()
    logger.warning("STT provider '%s' no implementado, usando Mock", provider)
    return MockSTTClient()


@lru_cache()
def get_tts_client() -> BaseTTSClient:
    provider = settings.tts_provider.lower()
    if provider == "mock":
        return MockTTSClient()
    if provider == "openai":
        return OpenAITTSClient()
    logger.warning("TTS provider '%s' no implementado, usando Mock", provider)
    return MockTTSClient()
