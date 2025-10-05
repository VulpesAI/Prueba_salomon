"""Storage helpers for retrieving statement files."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import httpx


class StorageError(RuntimeError):
    """Raised when a document cannot be retrieved from storage."""


@dataclass
class RetrievedDocument:
    """Container with the binary contents of a statement."""

    path: str
    filename: str
    content_type: Optional[str]
    content: bytes


class StorageClient:
    """Abstract base class for storage implementations."""

    def fetch(self, path: str) -> RetrievedDocument:  # pragma: no cover - interface
        raise NotImplementedError


class LocalStorageClient(StorageClient):
    """Reads statements directly from the local filesystem."""

    def __init__(self, base_directory: Optional[Path] = None) -> None:
        self.base_directory = base_directory

    def fetch(self, path: str) -> RetrievedDocument:
        candidate = Path(path)
        if not candidate.is_absolute() and self.base_directory:
            candidate = (self.base_directory / path).resolve()

        if not candidate.exists() or not candidate.is_file():
            raise StorageError(f"Local document not found: {candidate}")

        content = candidate.read_bytes()
        return RetrievedDocument(
            path=str(candidate),
            filename=candidate.name,
            content_type=None,
            content=content,
        )


class SupabaseStorageClient(StorageClient):
    """Downloads statements from Supabase Storage using the REST interface."""

    def __init__(self, *, base_url: str, service_role_key: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.service_role_key = service_role_key

    def fetch(self, path: str) -> RetrievedDocument:
        bucket, object_path = self._split_path(path)
        url = f"{self.base_url}/storage/v1/object/{bucket}/{object_path}"

        headers = {
            "Authorization": f"Bearer {self.service_role_key}",
            "apikey": self.service_role_key,
        }

        with httpx.Client(timeout=60.0) as client:
            response = client.get(url, headers=headers)

        if response.status_code >= 400:
            raise StorageError(
                f"Supabase returned status {response.status_code} when fetching {bucket}/{object_path}: {response.text}"
            )

        filename = object_path.rsplit("/", 1)[-1]

        return RetrievedDocument(
            path=f"{bucket}/{object_path}",
            filename=filename,
            content_type=response.headers.get("content-type"),
            content=response.content,
        )

    @staticmethod
    def _split_path(path: str) -> tuple[str, str]:
        normalized = path.lstrip("/")
        parts = normalized.split("/", 1)
        if len(parts) == 1:
            raise StorageError("Supabase storage path must include bucket and object key")
        return parts[0], parts[1]


def create_storage_client(
    *,
    supabase_url: Optional[str],
    supabase_service_role_key: Optional[str],
    base_directory: Optional[str] = None,
) -> StorageClient:
    """Create an appropriate storage client based on the available credentials."""

    if supabase_url and supabase_service_role_key:
        return SupabaseStorageClient(base_url=supabase_url, service_role_key=supabase_service_role_key)

    resolved = Path(base_directory or os.getcwd())
    return LocalStorageClient(base_directory=resolved)

