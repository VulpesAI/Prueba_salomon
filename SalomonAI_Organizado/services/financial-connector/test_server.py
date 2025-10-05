from __future__ import annotations

import io
import sys
from pathlib import Path
from typing import Any, Dict, Tuple

import pytest
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from SalomonAI_Organizado.services.financial_connector.server import (
    app,
    get_csv_parser,
    get_parsing_engine_publisher,
    get_status_repository,
    get_storage_client,
)
from SalomonAI_Organizado.services.financial_connector.parsing_engine import (
    InMemoryParsingEnginePublisher,
)
from SalomonAI_Organizado.services.financial_connector.statements import parse_csv_statement
from SalomonAI_Organizado.services.financial_connector.status import (
    InMemoryStatementStatusRepository,
)
from SalomonAI_Organizado.services.financial_connector.storage import StorageClient


class FakeStorageClient(StorageClient):
    def __init__(self) -> None:
        self.objects: Dict[str, Dict[str, Any]] = {}

    async def store(self, *, data: bytes, destination_path: str, content_type: str) -> str:
        self.objects[destination_path] = {
            "data": data,
            "content_type": content_type,
        }
        return destination_path


@pytest.fixture()
def test_context() -> Tuple[TestClient, FakeStorageClient, InMemoryStatementStatusRepository, InMemoryParsingEnginePublisher]:
    storage = FakeStorageClient()
    status_repo = InMemoryStatementStatusRepository()
    publisher = InMemoryParsingEnginePublisher()

    app.dependency_overrides[get_storage_client] = lambda: storage
    app.dependency_overrides[get_status_repository] = lambda: status_repo
    app.dependency_overrides[get_parsing_engine_publisher] = lambda: publisher
    app.dependency_overrides[get_csv_parser] = lambda: parse_csv_statement

    with TestClient(app) as client:
        yield client, storage, status_repo, publisher

    app.dependency_overrides.clear()


def test_upload_csv_returns_normalized_statement(test_context):
    client, storage, status_repo, publisher = test_context

    csv_content = "fecha,monto,descripcion\n2024-01-01,1000,Ingreso\n2024-01-02,-500,Gasto\n"
    response = client.post(
        "/import/file",
        files=[("files", ("statement.csv", csv_content.encode("utf-8"), "text/csv"))],
        params={"user_id": "user-1", "bank_name": "Banco Test"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "processed"
    assert payload["count"] == 1

    entry = payload["files"][0]
    statement_id = entry["statementId"]

    assert entry["status"] == "completed"
    assert "normalizedStatement" in entry
    assert entry["normalizedStatement"]["totals"] == {
        "balance": 500.0,
        "income": 1000.0,
        "expenses": 500.0,
    }

    assert statement_id in status_repo.events
    assert status_repo.events[statement_id][-1]["status"] == "completed"
    assert len(publisher.events) == 0
    assert storage.objects  # storage contains uploaded file


def test_upload_pdf_queues_parsing_engine(test_context):
    client, storage, status_repo, publisher = test_context

    pdf_bytes = b"%PDF-1.4 minimal"
    response = client.post(
        "/import/file",
        files=[("files", ("statement.pdf", pdf_bytes, "application/pdf"))],
        params={"user_id": "user-2"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "accepted"

    entry = payload["files"][0]
    statement_id = entry["statementId"]

    assert entry["status"] == "queued"
    assert entry["type"] == "pdf"
    assert len(publisher.events) == 1
    assert publisher.events[0]["statementId"] == statement_id
    assert statement_id in status_repo.events
    statuses = [event["status"] for event in status_repo.events[statement_id]]
    assert "queued" in statuses or "waiting_parsing" in statuses


def test_rejects_unsupported_format(test_context):
    client, storage, status_repo, publisher = test_context

    response = client.post(
        "/import/file",
        files=[("files", ("notes.txt", io.BytesIO(b"hello"), "text/plain"))],
        params={"user_id": "user-3"},
    )

    assert response.status_code == 400
    assert "Formato" in response.json()["detail"]
    assert not storage.objects
    assert status_repo.events == {}
    assert publisher.events == []
