from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Optional

import httpx

from .settings import get_settings

logger = logging.getLogger(__name__)


class VoicePreferenceRepository:
    async def get_voice(self, user_id: str) -> Optional[str]:  # pragma: no cover - interface
        raise NotImplementedError

    async def save_voice(self, user_id: str, voice_id: str) -> None:  # pragma: no cover - interface
        raise NotImplementedError


class InMemoryVoicePreferenceRepository(VoicePreferenceRepository):
    def __init__(self) -> None:
        self._storage: Dict[str, str] = {}
        self._lock = asyncio.Lock()

    async def get_voice(self, user_id: str) -> Optional[str]:
        async with self._lock:
            return self._storage.get(user_id)

    async def save_voice(self, user_id: str, voice_id: str) -> None:
        async with self._lock:
            self._storage[user_id] = voice_id


class SupabaseVoicePreferenceRepository(VoicePreferenceRepository):
    def __init__(self) -> None:
        self._settings = get_settings()
        if not self._settings.supabase_url or not self._settings.supabase_service_key:
            raise ValueError("Supabase no está configurado para preferencias de voz")
        self._base_url = self._settings.supabase_url.rstrip("/")
        self._table = self._settings.supabase_voice_table
        self._headers = {
            "apikey": self._settings.supabase_service_key,
            "Authorization": f"Bearer {self._settings.supabase_service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation,resolution=merge-duplicates",
        }

    @property
    def _table_url(self) -> str:
        return f"{self._base_url}/rest/v1/{self._table}"

    async def get_voice(self, user_id: str) -> Optional[str]:
        params = {
            "user_id": f"eq.{user_id}",
            "select": "voice_id",
            "limit": 1,
        }
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(self._table_url, headers=self._headers, params=params)
            if response.status_code == 404:
                return None
            if response.status_code >= 400:
                logger.warning(
                    "Supabase devolvió estado %s al consultar voz preferida: %s",
                    response.status_code,
                    response.text,
                )
                return None
            data = response.json()
            if isinstance(data, list) and data:
                entry = data[0]
                voice_id = entry.get("voice_id")
                if isinstance(voice_id, str) and voice_id.strip():
                    return voice_id.strip()
        except Exception as exc:  # pragma: no cover - dependencias externas
            logger.warning("Error consultando voz preferida en Supabase: %s", exc)
        return None

    async def save_voice(self, user_id: str, voice_id: str) -> None:
        payload = {
            "user_id": user_id,
            "voice_id": voice_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.post(self._table_url, headers=self._headers, json=payload)
            if response.status_code >= 400:
                logger.warning(
                    "Supabase rechazó la actualización de voz (%s): %s",
                    response.status_code,
                    response.text,
                )
        except Exception as exc:  # pragma: no cover - dependencias externas
            logger.warning("No se pudo guardar la preferencia de voz en Supabase: %s", exc)


def build_voice_repository() -> VoicePreferenceRepository:
    settings = get_settings()
    if settings.supabase_url and settings.supabase_service_key:
        try:
            return SupabaseVoicePreferenceRepository()
        except Exception as exc:  # pragma: no cover - dependencias externas
            logger.warning("Fallo al inicializar SupabaseVoicePreferenceRepository: %s", exc)
    logger.info("Usando repositorio en memoria para preferencias de voz")
    return InMemoryVoicePreferenceRepository()
