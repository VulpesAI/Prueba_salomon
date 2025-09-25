"""Lightweight database utilities based on SQLite-compatible SQL."""
from __future__ import annotations

import json
import os
import sqlite3
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, Generator, Iterable, List, Optional, Set, Tuple

DATABASE_URL_ENV = "DATABASE_URL"
DEFAULT_SQLITE_URL = "sqlite:///./salomon_ingestion.db"


@dataclass
class DocumentRecord:
    id: str
    user_id: str
    account_id: Optional[str]
    file_hash: str
    status: str
    metadata: Dict[str, object]


class Database:
    """Simple database wrapper that uses sqlite3 with JSON serialization."""

    def __init__(self, url: Optional[str] = None) -> None:
        self.url = url or os.environ.get(DATABASE_URL_ENV, DEFAULT_SQLITE_URL)
        self.connection = self._connect()
        self.connection.row_factory = sqlite3.Row
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        if not self.url.startswith("sqlite:///"):
            raise RuntimeError(
                "Solo se admite SQLite en este entorno de referencia. Configure DATABASE_URL con formato sqlite:///path.db"
            )
        db_path = self.url.replace("sqlite:///", "", 1)
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        return sqlite3.connect(db_path)

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
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS normalized_transactions (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                account_id TEXT,
                external_id TEXT,
                checksum TEXT NOT NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT NOT NULL,
                type TEXT NOT NULL,
                category TEXT,
                occurred_at TEXT NOT NULL,
                metadata TEXT,
                raw_data TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, checksum)
            )
            """
        )
        cursor.close()
        self.connection.commit()

    def close(self) -> None:
        self.connection.close()

    def fetch_document_by_hash(self, user_id: str, file_hash: str) -> Optional[DocumentRecord]:
        cursor = self.connection.execute(
            "SELECT * FROM ingested_documents WHERE user_id = ? AND file_hash = ?",
            (user_id, file_hash),
        )
        row = cursor.fetchone()
        cursor.close()
        if not row:
            return None
        metadata = json.loads(row["metadata"]) if row["metadata"] else {}
        return DocumentRecord(
            id=row["id"],
            user_id=row["user_id"],
            account_id=row["account_id"],
            file_hash=row["file_hash"],
            status=row["status"],
            metadata=metadata,
        )

    def create_document(
        self,
        document_id: str,
        user_id: str,
        account_id: Optional[str],
        source: str,
        original_name: str,
        file_path: str,
        file_hash: str,
        status: str,
        metadata: Dict[str, object],
    ) -> DocumentRecord:
        now = datetime.utcnow().isoformat()
        metadata_json = json.dumps(metadata)
        self.connection.execute(
            """
            INSERT INTO ingested_documents (
                id, user_id, account_id, source, original_name, file_path,
                file_hash, status, metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                document_id,
                user_id,
                account_id,
                source,
                original_name,
                file_path,
                file_hash,
                status,
                metadata_json,
                now,
                now,
            ),
        )
        self.connection.commit()
        return DocumentRecord(
            id=document_id,
            user_id=user_id,
            account_id=account_id,
            file_hash=file_hash,
            status=status,
            metadata=metadata,
        )

    def update_document(self, document_id: str, status: str, metadata: Dict[str, object]) -> None:
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

    def fetch_existing_checksums(self, user_id: str) -> Set[str]:
        cursor = self.connection.execute(
            "SELECT checksum FROM normalized_transactions WHERE user_id = ?",
            (user_id,),
        )
        checksums = {row[0] for row in cursor.fetchall()}
        cursor.close()
        return checksums

    def insert_transactions(
        self,
        document_id: str,
        user_id: str,
        account_id: Optional[str],
        transactions: Iterable[Tuple[str, Dict[str, object]]],
    ) -> int:
        now = datetime.utcnow().isoformat()
        rows: List[Tuple] = []
        for checksum, payload in transactions:
            rows.append(
                (
                    str(uuid.uuid4()),
                    document_id,
                    user_id,
                    account_id,
                    payload.get("external_id"),
                    checksum,
                    payload["description"],
                    float(payload["amount"]),
                    payload["currency"],
                    payload["type"],
                    payload.get("category"),
                    payload["occurred_at"],
                    json.dumps(payload.get("metadata", {})),
                    json.dumps(payload.get("raw_data", {})),
                    now,
                    now,
                )
            )
        if not rows:
            return 0
        self.connection.executemany(
            """
            INSERT INTO normalized_transactions (
                id, document_id, user_id, account_id, external_id, checksum,
                description, amount, currency, type, category, occurred_at,
                metadata, raw_data, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        self.connection.commit()
        return len(rows)


@contextmanager
def database_session(url: Optional[str] = None) -> Generator[Database, None, None]:
    db = Database(url)
    try:
        yield db
    finally:
        db.close()
