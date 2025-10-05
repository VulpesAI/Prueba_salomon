"""Storage backends for the financial connector service."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import httpx

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except ImportError:  # pragma: no cover - boto3 is optional for local development
    boto3 = None
    BotoCoreError = ClientError = Exception


class StorageError(RuntimeError):
    """Raised when the storage backend fails to persist a file."""


class StorageClient:
    """Abstract storage client."""

    async def store(self, *, data: bytes, destination_path: str, content_type: str) -> str:  # pragma: no cover - interface
        raise NotImplementedError


@dataclass
class LocalStorageClient(StorageClient):
    """Simple local storage backend used for development and testing."""

    base_path: Path

    def __post_init__(self) -> None:
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def store(self, *, data: bytes, destination_path: str, content_type: str) -> str:
        path = self.base_path / destination_path
        path.parent.mkdir(parents=True, exist_ok=True)

        loop = asyncio.get_event_loop()

        def _write() -> None:
            path.write_bytes(data)

        await loop.run_in_executor(None, _write)
        return str(path.relative_to(self.base_path))


@dataclass
class SupabaseStorageClient(StorageClient):
    """Uploads files to Supabase Storage using the REST interface."""

    base_url: str
    service_role_key: str
    bucket: str
    timeout: float = 30.0

    async def store(self, *, data: bytes, destination_path: str, content_type: str) -> str:
        path = destination_path.lstrip("/")
        url = f"{self.base_url.rstrip('/')}/storage/v1/object/{self.bucket}/{path}"
        headers = {
            "Authorization": f"Bearer {self.service_role_key}",
            "apikey": self.service_role_key,
            "Content-Type": content_type or "application/octet-stream",
            "x-upsert": "true",
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, content=data, headers=headers)

        if response.status_code >= 400:
            raise StorageError(
                f"Supabase upload failed with status {response.status_code}: {response.text}"
            )

        return f"{self.bucket}/{path}"


@dataclass
class S3StorageClient(StorageClient):
    """Uploads files to an S3 compatible bucket."""

    bucket: str
    region: Optional[str] = None
    endpoint_url: Optional[str] = None
    access_key_id: Optional[str] = None
    secret_access_key: Optional[str] = None

    def __post_init__(self) -> None:
        if boto3 is None:
            raise StorageError("boto3 is required to use the S3 storage backend")

        session = boto3.session.Session(
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            region_name=self.region,
        )
        self._client = session.client("s3", endpoint_url=self.endpoint_url)

    async def store(self, *, data: bytes, destination_path: str, content_type: str) -> str:
        loop = asyncio.get_event_loop()

        def _upload() -> None:
            try:
                self._client.put_object(
                    Bucket=self.bucket,
                    Key=destination_path,
                    Body=data,
                    ContentType=content_type or "application/octet-stream",
                )
            except (BotoCoreError, ClientError) as exc:  # pragma: no cover - network failure
                raise StorageError(f"Failed to upload to S3: {exc}") from exc

        await loop.run_in_executor(None, _upload)
        return destination_path


def create_storage_client(settings) -> StorageClient:
    """Factory that instantiates the appropriate storage backend."""

    backend = (settings.storage_backend or "local").lower()

    if backend == "supabase":
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise StorageError("Supabase storage selected but credentials are missing")
        return SupabaseStorageClient(
            base_url=settings.supabase_url,
            service_role_key=settings.supabase_service_role_key,
            bucket=settings.supabase_bucket,
        )

    if backend == "s3":
        if not settings.s3_bucket:
            raise StorageError("S3 storage selected but no bucket configured")
        return S3StorageClient(
            bucket=settings.s3_bucket,
            region=settings.s3_region,
            endpoint_url=settings.s3_endpoint_url,
            access_key_id=settings.s3_access_key_id,
            secret_access_key=settings.s3_secret_access_key,
        )

    # Default to local storage for development/testing
    base_path = Path(settings.local_storage_path)
    return LocalStorageClient(base_path=base_path)

