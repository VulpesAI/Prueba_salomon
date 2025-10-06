from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class VoiceTranscriptionPayload(BaseModel):
    audio_base64: Optional[str] = None
    mime: Optional[str] = None
    language: Optional[str] = None
    response_format: Optional[str] = None


class VoiceTranscriptionResponse(BaseModel):
    text: str
    language: str = "es"
    provider: str = "mock"
    duration_sec: float = 0.0
    raw: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class VoiceSynthesisRequest(BaseModel):
    text: str
    voice: Optional[str] = None
    format: Optional[str] = None
    language: Optional[str] = None
    speed: Optional[float] = None
    session_id: Optional[str] = None


class VoiceSynthesisResponse(BaseModel):
    audio_base64: str
    mime: str = "audio/wav"
    provider: str = "mock"
    duration_ms: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class VoiceStreamEvent(BaseModel):
    event: str
    payload: Dict[str, str] = Field(default_factory=dict)
