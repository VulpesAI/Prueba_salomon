from __future__ import annotations

import asyncio
import logging
import os
from abc import ABC, abstractmethod
from typing import Dict

logger = logging.getLogger(__name__)

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


def get_stt_client() -> BaseSTTClient:
    provider = os.getenv("VOICE_STT_PROVIDER", "mock").lower()
    if provider == "mock":
        return MockSTTClient()
    logger.warning("STT provider '%s' no implementado, usando Mock", provider)
    return MockSTTClient()


def get_tts_client() -> BaseTTSClient:
    provider = os.getenv("VOICE_TTS_PROVIDER", "mock").lower()
    if provider == "mock":
        return MockTTSClient()
    logger.warning("TTS provider '%s' no implementado, usando Mock", provider)
    return MockTTSClient()
