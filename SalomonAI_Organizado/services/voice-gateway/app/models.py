from __future__ import annotations

from datetime import datetime
from typing import Dict, Optional

from pydantic import BaseModel, Field


class VoiceTranscriptionRequest(BaseModel):
    audio_base64: str
    language: str = "es-CL"
    session_id: Optional[str] = None
    metadata: Dict[str, str] = Field(default_factory=dict)


class VoiceTranscriptionResponse(BaseModel):
    transcript: str
    confidence: float = 0.0
    language: str = "es-CL"
    provider: str = "mock"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class VoiceSynthesisRequest(BaseModel):
    text: str
    voice: str = "es-CL-Standard-A"
    language: str = "es-CL"
    session_id: Optional[str] = None


class VoiceSynthesisResponse(BaseModel):
    audio_base64: str
    format: str = "audio/wav"
    provider: str = "mock"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class VoiceStreamEvent(BaseModel):
    event: str
    payload: Dict[str, str] = Field(default_factory=dict)
