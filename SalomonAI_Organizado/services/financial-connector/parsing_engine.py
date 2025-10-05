"""Utilities to notify the parsing engine about newly uploaded statements."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

import httpx


class ParsingEngineError(RuntimeError):
    """Raised when the parsing engine notification fails."""


class ParsingEnginePublisher:
    """Abstraction that emits parsing events."""

    async def publish(
        self,
        *,
        statement_id: str,
        user_id: str,
        storage_path: str,
    ) -> None:  # pragma: no cover - interface
        raise NotImplementedError


@dataclass
class HttpParsingEnginePublisher(ParsingEnginePublisher):
    """Sends parsing events to an HTTP endpoint."""

    endpoint: str
    api_key: Optional[str] = None
    timeout: float = 15.0

    async def publish(
        self,
        *,
        statement_id: str,
        user_id: str,
        storage_path: str,
    ) -> None:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "statementId": statement_id,
            "userId": user_id,
            "storagePath": storage_path,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(self.endpoint, json=payload, headers=headers)

        if response.status_code >= 400:
            raise ParsingEngineError(
                f"Parsing engine notification failed with status {response.status_code}: {response.text}"
            )


@dataclass
class InMemoryParsingEnginePublisher(ParsingEnginePublisher):
    """Captures parsing events in memory. Useful for tests."""

    events: List[dict] = field(default_factory=list)

    async def publish(
        self,
        *,
        statement_id: str,
        user_id: str,
        storage_path: str,
    ) -> None:
        self.events.append(
            {
                "statementId": statement_id,
                "userId": user_id,
                "storagePath": storage_path,
            }
        )


class NullParsingEnginePublisher(ParsingEnginePublisher):
    """No-op publisher used when the parsing engine is disabled."""

    async def publish(
        self,
        *,
        statement_id: str,
        user_id: str,
        storage_path: str,
    ) -> None:
        return None


def create_parsing_engine_publisher(settings) -> ParsingEnginePublisher:
    """Factory that returns a parsing engine publisher based on configuration."""

    if settings.parsing_engine_endpoint:
        return HttpParsingEnginePublisher(
            endpoint=settings.parsing_engine_endpoint,
            api_key=settings.parsing_engine_api_key,
        )

    return NullParsingEnginePublisher()

