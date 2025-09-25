"""Shared ingestion metadata store using SQLite-compatible SQL."""
from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Dict, Generator, Optional

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./salomon_ingestion.db")


class IngestionDatabase:
    def __init__(self, url: str = DATABASE_URL) -> None:
        if not url.startswith("sqlite:///"):
            raise RuntimeError(
                "Solo se admite SQLite en este entorno de referencia. Configure DATABASE_URL con formato sqlite:///ruta.db"
            )
        db_path = url.replace("sqlite:///", "", 1)
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(db_path)
        self.connection.row_factory = sqlite3.Row
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        cursor = self.connection.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS ingested_documents (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                account_id TEXT,
                source TEXT NOT NULL,
                original_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_hash TEXT NOT NULL,
                status TEXT NOT NULL,
                metadata TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, file_hash)
            )
            """
        )
        cursor.close()
        self.connection.commit()

    def close(self) -> None:
        self.connection.close()

    def fetch_by_hash(self, user_id: str, file_hash: str):
        cursor = self.connection.execute(
            "SELECT * FROM ingested_documents WHERE user_id = ? AND file_hash = ?",
            (user_id, file_hash),
        )
        row = cursor.fetchone()
        cursor.close()
        return row

    def create_document(
        self,
        document_id: str,
        user_id: str,
        account_id: Optional[str],
        original_name: str,
        file_path: str,
        file_hash: str,
        metadata: Dict[str, object],
    ) -> None:
        now = datetime.utcnow().isoformat()
        metadata_json = json.dumps(metadata)
        self.connection.execute(
            """
            INSERT INTO ingested_documents (
                id, user_id, account_id, source, original_name, file_path,
                file_hash, status, metadata, created_at, updated_at
            ) VALUES (?, ?, ?, 'upload', ?, ?, ?, 'RECEIVED', ?, ?, ?)
            """,
            (
                document_id,
                user_id,
                account_id,
                original_name,
                file_path,
                file_hash,
                metadata_json,
                now,
                now,
            ),
        )
        self.connection.commit()

    def update_status(self, document_id: str, status: str, metadata: Dict[str, object]) -> None:
        now = datetime.utcnow().isoformat()
        metadata_json = json.dumps(metadata)
        self.connection.execute(
            """
            UPDATE ingested_documents SET status = ?, metadata = ?, updated_at = ?
            WHERE id = ?
            """,
            (status, metadata_json, now, document_id),
        )
        self.connection.commit()


@contextmanager
def session_scope(url: str = DATABASE_URL) -> Generator[IngestionDatabase, None, None]:
    db = IngestionDatabase(url)
    try:
        yield db
    finally:
        db.close()
