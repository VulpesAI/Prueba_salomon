"""Helpers to track processing status of uploaded statements."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

import httpx


class StatementStatusError(RuntimeError):
    """Raised when updating the processing status fails."""


class StatementStatusRepository:
    """Abstract repository used to persist processing progress."""

    async def update_status(
        self,
        statement_id: str,
        status: str,
        *,
        progress: Optional[int] = None,
        error: Optional[str] = None,
    ) -> None:  # pragma: no cover - interface
        raise NotImplementedError


@dataclass
class InMemoryStatementStatusRepository(StatementStatusRepository):
    """In-memory repository used for tests."""

    events: Dict[str, List[Dict[str, Optional[object]]]] = field(default_factory=dict)

    async def update_status(
        self,
        statement_id: str,
        status: str,
        *,
        progress: Optional[int] = None,
        error: Optional[str] = None,
    ) -> None:
        self.events.setdefault(statement_id, []).append(
            {
                "status": status,
                "progress": progress,
                "error": error,
            }
        )


@dataclass
class SupabaseStatementStatusRepository(StatementStatusRepository):
    """Updates the processing status using Supabase REST endpoints."""

    base_url: str
    service_role_key: str
    table: str = "statements"
    timeout: float = 30.0

    async def update_status(
        self,
        statement_id: str,
        status: str,
        *,
        progress: Optional[int] = None,
        error: Optional[str] = None,
    ) -> None:
        payload: Dict[str, Optional[object]] = {
            "processing_status": status,
            "processing_progress": progress,
            "processing_error": error,
        }

        url = f"{self.base_url.rstrip('/')}/rest/v1/{self.table}?id=eq.{statement_id}"
        headers = {
            "Authorization": f"Bearer {self.service_role_key}",
            "apikey": self.service_role_key,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.patch(url, json=payload, headers=headers)

        if response.status_code >= 400:
            raise StatementStatusError(
                f"Supabase status update failed with status {response.status_code}: {response.text}"
            )


@dataclass
class CoreAPIStatementStatusRepository(StatementStatusRepository):
    """Updates the processing status through the Core API REST endpoints."""

    base_url: str
    token: Optional[str] = None
    timeout: float = 30.0

    async def update_status(
        self,
        statement_id: str,
        status: str,
        *,
        progress: Optional[int] = None,
        error: Optional[str] = None,
    ) -> None:
        url = f"{self.base_url.rstrip('/')}/statements/{statement_id}/processing-status"
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        payload = {
            "status": status,
            "progress": progress,
            "error": error,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, json=payload, headers=headers)

        if response.status_code >= 400:
            raise StatementStatusError(
                f"Core API status update failed with status {response.status_code}: {response.text}"
            )


def create_status_repository(settings) -> StatementStatusRepository:
    """Factory that selects a status persistence strategy."""

    backend = (settings.status_backend or "auto").lower()

    if backend in {"supabase", "auto"} and settings.supabase_url and settings.supabase_service_role_key:
        return SupabaseStatementStatusRepository(
            base_url=settings.supabase_url,
            service_role_key=settings.supabase_service_role_key,
        )

    if backend in {"core_api", "auto"} and settings.core_api_base_url:
        return CoreAPIStatementStatusRepository(
            base_url=settings.core_api_base_url,
            token=settings.core_api_token,
        )

    return InMemoryStatementStatusRepository()

