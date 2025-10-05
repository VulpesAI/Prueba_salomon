from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV_PATH = Path(__file__).resolve().parents[3] / ".env"


class VoiceGatewaySettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_ENV_PATH, extra="allow")

    stt_provider: str = Field(default="mock", alias="VOICE_STT_PROVIDER")
    tts_provider: str = Field(default="mock", alias="VOICE_TTS_PROVIDER")
    openai_api_key: str | None = Field(default=None, alias="VOICE_OPENAI_API_KEY")
    openai_stt_model: str = Field(default="gpt-4o-mini-transcribe", alias="VOICE_OPENAI_STT_MODEL")
    openai_tts_model: str = Field(default="gpt-4o-mini-tts", alias="VOICE_OPENAI_TTS_MODEL")
    openai_tts_voice: str = Field(default="alloy", alias="VOICE_OPENAI_TTS_VOICE")
    openai_tts_format: str = Field(default="mp3", alias="VOICE_OPENAI_TTS_FORMAT")
    allowed_origins: List[str] = Field(default_factory=lambda: ["*"], alias="VOICE_GATEWAY_ALLOWED_ORIGINS")
    log_level: str = Field(default="INFO", alias="VOICE_GATEWAY_LOG_LEVEL")

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def split_origins(cls, value: List[str] | str | None) -> List[str]:
        if value is None:
            return ["*"]
        if isinstance(value, list):
            return value or ["*"]
        parts = [item.strip() for item in value.split(",") if item.strip()]
        return parts or ["*"]


@lru_cache()
def get_settings() -> VoiceGatewaySettings:
    return VoiceGatewaySettings()

