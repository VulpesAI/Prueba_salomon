from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List, Set

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV_PATH = Path(__file__).resolve().parents[3] / ".env"


class VoiceGatewaySettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_ENV_PATH, extra="allow")

    stt_provider: str = Field(default="openai", alias="VOICE_STT_PROVIDER")
    default_language: str = Field(default="es", alias="VOICE_STT_LANGUAGE")
    allowed_mime: List[str] = Field(
        default_factory=lambda: [
            "audio/m4a",
            "audio/mp3",
            "audio/wav",
            "audio/webm",
            "audio/ogg",
        ],
        alias="VOICE_ALLOWED_MIME",
    )
    max_audio_seconds: int = Field(default=120, alias="VOICE_MAX_AUDIO_SECONDS")
    max_audio_bytes: int | None = Field(default=None, alias="VOICE_MAX_AUDIO_BYTES")
    tts_provider: str = Field(default="openai", alias="VOICE_TTS_PROVIDER")
    tts_default_voice_env: str | None = Field(default=None, alias="VOICE_TTS_DEFAULT_VOICE")
    tts_default_format_env: str | None = Field(default=None, alias="VOICE_TTS_DEFAULT_FORMAT")
    tts_default_language_env: str | None = Field(default=None, alias="VOICE_TTS_DEFAULT_LANG")
    tts_default_speed: float = Field(default=1.0, alias="VOICE_TTS_SPEED")
    tts_max_chars: int = Field(default=1000, alias="VOICE_TTS_MAX_CHARS")
    openai_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("OPENAI_API_KEY", "VOICE_OPENAI_API_KEY"),
    )
    openai_stt_model: str = Field(
        default="whisper-1",
        validation_alias=AliasChoices("OPENAI_STT_MODEL", "VOICE_OPENAI_STT_MODEL"),
    )
    openai_stt_response_format: str = Field(
        default="text",
        validation_alias=AliasChoices("OPENAI_STT_RESPONSE_FORMAT", "VOICE_OPENAI_STT_RESPONSE_FORMAT"),
    )
    openai_timeout_ms: int = Field(default=60000, alias="OPENAI_TIMEOUT_MS")
    enable_openai_realtime: bool = Field(default=False, alias="ENABLE_OPENAI_REALTIME")
    openai_realtime_model: str = Field(
        default="gpt-4o-realtime-preview",
        alias="OPENAI_REALTIME_MODEL",
    )
    openai_realtime_url: str | None = Field(default=None, alias="OPENAI_REALTIME_URL")
    openai_realtime_api_key: str | None = Field(default=None, alias="OPENAI_REALTIME_API_KEY")
    openai_realtime_voice: str = Field(default="alloy", alias="OPENAI_REALTIME_VOICE")
    openai_realtime_audio_format: str = Field(default="mp3", alias="OPENAI_REALTIME_AUDIO_FMT")
    openai_realtime_transcription_model: str = Field(
        default="gpt-4o-mini-transcribe",
        alias="OPENAI_TRANSCRIBE_MODEL",
    )
    voice_stream_sample_rate: int = Field(default=16000, alias="VOICE_STREAM_SAMPLE_RATE")
    voice_stream_max_seconds: int = Field(default=60, alias="VOICE_STREAM_MAX_SECS")
    openai_realtime_instructions: str = Field(
        default=(
            "Eres SalomónAI, coach financiero; responde de forma concisa, empática "
            "y en español de Chile. Prioriza recomendaciones claras y accionables."
        ),
        alias="OPENAI_REALTIME_SYSTEM_PROMPT",
    )
    openai_tts_model: str = Field(
        default="gpt-4o-mini-tts",
        validation_alias=AliasChoices("VOICE_OPENAI_TTS_MODEL", "OPENAI_TTS_MODEL"),
    )
    openai_tts_voice: str = Field(
        default="alloy",
        validation_alias=AliasChoices("VOICE_OPENAI_TTS_VOICE", "OPENAI_TTS_VOICE"),
    )
    openai_tts_format: str = Field(
        default="mp3",
        validation_alias=AliasChoices("VOICE_OPENAI_TTS_FORMAT", "OPENAI_TTS_FORMAT"),
    )
    supabase_url: str | None = Field(default=None, alias="SUPABASE_URL")
    supabase_service_key: str | None = Field(default=None, alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_voice_table: str = Field(default="user_settings", alias="SUPABASE_VOICE_TABLE")
    supabase_schema: str = Field(default="public", alias="SUPABASE_SCHEMA")
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

    @field_validator("allowed_mime", mode="before")
    @classmethod
    def split_mime(cls, value: List[str] | str | None) -> List[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        return [item.strip() for item in value.split(",") if item.strip()]

    @field_validator("tts_default_speed")
    @classmethod
    def validate_speed(cls, value: float) -> float:
        return value if value > 0 else 1.0

    @property
    def allowed_mime_set(self) -> Set[str]:
        return {item.lower() for item in self.allowed_mime}

    @property
    def resolved_openai_api_key(self) -> str | None:
        return self.openai_api_key

    @property
    def max_request_bytes(self) -> int:
        if self.max_audio_bytes:
            return self.max_audio_bytes
        # Aproximación conservadora (~256kbps)
        return int(self.max_audio_seconds * 32_000)

    @property
    def resolved_tts_voice(self) -> str:
        return (self.tts_default_voice_env or self.openai_tts_voice or "alloy").strip()

    @property
    def resolved_tts_format(self) -> str:
        return (self.tts_default_format_env or self.openai_tts_format or "mp3").strip() or "mp3"

    @property
    def resolved_tts_language(self) -> str:
        return (self.tts_default_language_env or "es-CL").strip() or "es-CL"

    @property
    def resolved_realtime_api_key(self) -> str | None:
        return self.openai_realtime_api_key or self.resolved_openai_api_key

    @property
    def resolved_realtime_url(self) -> str:
        if self.openai_realtime_url:
            return self.openai_realtime_url
        model = self.openai_realtime_model
        base = "wss://api.openai.com/v1/realtime"
        return f"{base}?model={model}"


@lru_cache()
def get_settings() -> VoiceGatewaySettings:
    return VoiceGatewaySettings()

