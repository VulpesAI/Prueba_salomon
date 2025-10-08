from __future__ import annotations

import asyncio
import base64
import io
import logging
import time
from abc import ABC, abstractmethod
from functools import lru_cache
from typing import Any, Dict, TypedDict

try:
    from fastapi import HTTPException
except ModuleNotFoundError:  # pragma: no cover - fallback para entornos de QA
    class HTTPException(Exception):
        """Fallback mínima para cuando FastAPI no está instalado."""

        def __init__(self, status_code: int, detail: str | None = None) -> None:
            self.status_code = status_code
            self.detail = detail
            message = detail or f"HTTPException {status_code}"
            super().__init__(message)
from openai import AsyncOpenAI, OpenAI

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


class TranscriptionResult(TypedDict, total=False):
    text: str
    language: str
    duration_sec: float
    provider: str
    raw: Dict[str, Any]


class TtsResult(TypedDict, total=False):
    audio_base64: str
    mime: str
    provider: str
    duration_ms: int


class STTProvider(ABC):
    name = "base"
    supports_streaming = False

    @abstractmethod
    def transcribe(
        self,
        audio_bytes: bytes,
        mime: str,
        language: str = "es",
        response_format: str = "text",
    ) -> TranscriptionResult:
        raise NotImplementedError

    async def transcribe_stream(self, _: bytes) -> Dict[str, Any]:
        """Placeholder streaming implementation for future realtime support."""
        return {"text": "", "final": False}


class MockSttProvider(STTProvider):
    name = "mock"

    def transcribe(
        self,
        audio_bytes: bytes,
        mime: str,
        language: str = "es",
        response_format: str = "text",
    ) -> TranscriptionResult:
        _ = (audio_bytes, mime, response_format)
        return TranscriptionResult(
            text="Transcripción simulada",
            language=language,
            duration_sec=0.0,
            provider=self.name,
        )

    async def transcribe_stream(self, _: bytes) -> Dict[str, Any]:
        await asyncio.sleep(0.05)
        return {"text": "fragmento", "final": False}


class OpenAISttProvider(STTProvider):
    name = "openai"

    def __init__(self) -> None:
        if not settings.resolved_openai_api_key:
            raise ValueError("OPENAI_API_KEY es obligatorio para usar el proveedor OpenAI")
        timeout_seconds = max(settings.openai_timeout_ms / 1000, 1)
        self._client = OpenAI(api_key=settings.resolved_openai_api_key, timeout=timeout_seconds)
        self._model = settings.openai_stt_model

    def transcribe(
        self,
        audio_bytes: bytes,
        mime: str,
        language: str = "es",
        response_format: str = "text",
    ) -> TranscriptionResult:
        started = time.perf_counter()
        response_format = (response_format or settings.openai_stt_response_format).lower()
        response_format = "verbose_json" if response_format == "verbose_json" else "text"

        file_obj = io.BytesIO(audio_bytes)
        ext = mime.split("/")[-1] if "/" in mime else "wav"
        file_obj.name = f"audio.{ext}"

        try:
            response = self._client.audio.transcriptions.create(
                model=self._model,
                file=file_obj,
                language=language,
                response_format=response_format,
                temperature=0,
            )
        except Exception as exc:  # pragma: no cover - errores del SDK
            logger.exception("Error de OpenAI STT: %s", exc)
            raise

        raw_payload: Dict[str, Any] = {}
        if response_format == "verbose_json":
            if hasattr(response, "model_dump"):
                raw_payload = response.model_dump()
            elif hasattr(response, "to_dict"):
                raw_payload = response.to_dict()  # type: ignore[attr-defined]
            elif isinstance(response, dict):
                raw_payload = response

        text = getattr(response, "text", None)
        if text is None and isinstance(response, dict):
            text = response.get("text")
        if text is None:
            text = ""

        duration = round(time.perf_counter() - started, 4)
        result = TranscriptionResult(
            text=text,
            language=language,
            duration_sec=duration,
            provider=self.name,
        )
        if raw_payload:
            result["raw"] = raw_payload
        return result


class GoogleSttProvider(STTProvider):
    name = "google"

    def transcribe(
        self,
        audio_bytes: bytes,
        mime: str,
        language: str = "es",
        response_format: str = "text",
    ) -> TranscriptionResult:  # pragma: no cover - stub
        _ = (audio_bytes, mime, language, response_format)
        raise HTTPException(status_code=503, detail="google_stt_not_configured")


class AzureSttProvider(STTProvider):
    name = "azure"

    def transcribe(
        self,
        audio_bytes: bytes,
        mime: str,
        language: str = "es",
        response_format: str = "text",
    ) -> TranscriptionResult:  # pragma: no cover - stub
        _ = (audio_bytes, mime, language, response_format)
        raise HTTPException(status_code=503, detail="azure_stt_not_configured")


class VoskSttProvider(STTProvider):
    name = "vosk"

    def transcribe(
        self,
        audio_bytes: bytes,
        mime: str,
        language: str = "es",
        response_format: str = "text",
    ) -> TranscriptionResult:  # pragma: no cover - stub
        _ = (audio_bytes, mime, language, response_format)
        raise HTTPException(status_code=503, detail="vosk_stt_not_configured")


class CoquiSttProvider(STTProvider):
    name = "coqui"

    def transcribe(
        self,
        audio_bytes: bytes,
        mime: str,
        language: str = "es",
        response_format: str = "text",
    ) -> TranscriptionResult:  # pragma: no cover - stub
        _ = (audio_bytes, mime, language, response_format)
        raise HTTPException(status_code=503, detail="coqui_stt_not_configured")


class BaseTTSClient(ABC):
    name = "base"

    @abstractmethod
    async def synthesize(
        self,
        text: str,
        *,
        language: str,
        voice: str,
        audio_format: str,
        speed: float,
    ) -> TtsResult:
        raise NotImplementedError


class MockTTSClient(BaseTTSClient):
    name = "mock"

    async def synthesize(
        self,
        text: str,
        *,
        language: str,
        voice: str,
        audio_format: str,
        speed: float,
    ) -> TtsResult:
        _ = (text, language, voice, audio_format, speed)
        await asyncio.sleep(0.1)
        return TtsResult(
            audio_base64=_SILENCE_WAV_BASE64,
            mime="audio/wav",
            provider=self.name,
            duration_ms=100,
        )


class OpenAITTSClient(BaseTTSClient):
    name = "openai"

    def __init__(self) -> None:
        if not settings.resolved_openai_api_key:
            raise ValueError("OPENAI_API_KEY es obligatorio para usar el proveedor OpenAI")
        self._client = AsyncOpenAI(api_key=settings.resolved_openai_api_key)
        self._model = settings.openai_tts_model
        self._default_voice = settings.openai_tts_voice
        self._default_format = settings.openai_tts_format

    async def synthesize(
        self,
        text: str,
        *,
        language: str,
        voice: str,
        audio_format: str,
        speed: float,
    ) -> TtsResult:
        _ = language
        started = time.perf_counter()
        fmt = audio_format or self._default_format
        voice_id = voice or self._default_voice
        request_kwargs: Dict[str, Any] = {
            "model": self._model,
            "voice": voice_id,
            "input": text,
            "format": fmt,
        }
        if speed and abs(speed - 1.0) > 1e-3:
            request_kwargs["voice_settings"] = {"speaking_rate": speed}

        try:
            response = await self._client.audio.speech.create(**request_kwargs)
        except Exception as exc:  # pragma: no cover - errores del SDK
            logger.error("Error de OpenAI TTS: %s", exc)
            raise

        try:
            if hasattr(response, "read"):
                read_result = response.read()
                audio_bytes = (
                    await read_result if asyncio.iscoroutine(read_result) else read_result
                )
            elif isinstance(response, (bytes, bytearray)):
                audio_bytes = bytes(response)
            elif hasattr(response, "content"):
                audio_bytes = response.content  # type: ignore[attr-defined]
            else:
                audio_bytes = bytes(response)
        except Exception as exc:  # pragma: no cover - manejo defensivo
            logger.error("No se pudo leer la respuesta de audio de OpenAI: %s", exc)
            raise

        duration_ms = int((time.perf_counter() - started) * 1000)
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
        return TtsResult(
            audio_base64=audio_base64,
            mime=f"audio/{fmt}",
            provider=self.name,
            duration_ms=duration_ms,
        )


class AwsPollyTTSClient(BaseTTSClient):
    name = "aws"

    async def synthesize(
        self,
        text: str,
        *,
        language: str,
        voice: str,
        audio_format: str,
        speed: float,
    ) -> TtsResult:  # pragma: no cover - stub
        _ = (text, language, voice, audio_format, speed)
        raise HTTPException(status_code=503, detail="aws_tts_not_configured")


class GoogleTTSClient(BaseTTSClient):
    name = "gcp"

    async def synthesize(
        self,
        text: str,
        *,
        language: str,
        voice: str,
        audio_format: str,
        speed: float,
    ) -> TtsResult:  # pragma: no cover - stub
        _ = (text, language, voice, audio_format, speed)
        raise HTTPException(status_code=503, detail="google_tts_not_configured")


class AzureTTSClient(BaseTTSClient):
    name = "azure"

    async def synthesize(
        self,
        text: str,
        *,
        language: str,
        voice: str,
        audio_format: str,
        speed: float,
    ) -> TtsResult:  # pragma: no cover - stub
        _ = (text, language, voice, audio_format, speed)
        raise HTTPException(status_code=503, detail="azure_tts_not_configured")


@lru_cache()
def get_stt_provider() -> STTProvider:
    provider = settings.stt_provider.lower()
    if provider == "openai":
        return OpenAISttProvider()
    if provider == "google":
        return GoogleSttProvider()
    if provider == "azure":
        return AzureSttProvider()
    if provider == "vosk":
        return VoskSttProvider()
    if provider == "coqui":
        return CoquiSttProvider()
    if provider != "mock":
        logger.warning("STT provider '%s' no implementado, usando Mock", provider)
    return MockSttProvider()


@lru_cache()
def get_tts_client() -> BaseTTSClient:
    provider = settings.tts_provider.lower()
    if provider == "mock":
        return MockTTSClient()
    if provider == "openai":
        return OpenAITTSClient()
    if provider == "aws":
        return AwsPollyTTSClient()
    if provider in {"google", "gcp"}:
        return GoogleTTSClient()
    if provider == "azure":
        return AzureTTSClient()
    logger.warning("TTS provider '%s' no implementado, usando Mock", provider)
    return MockTTSClient()
