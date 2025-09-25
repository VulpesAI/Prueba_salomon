from __future__ import annotations

import csv
import json
import uuid
from pathlib import Path

import sys

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'src'
sys.path.insert(0, str(SRC))

from database import Database
from pipeline import SchemaValidationError, process_document


def _create_database(tmp_path: Path) -> Database:
    db_url = f"sqlite:///{tmp_path / 'ingestion.db'}"
    return Database(db_url)


def _write_csv(tmp_path: Path) -> Path:
    path = tmp_path / "transactions.csv"
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["date", "description", "amount", "currency", "transaction_id"],
        )
        writer.writeheader()
        writer.writerow(
            {
                "date": "2024-01-01",
                "description": "Salary",
                "amount": "1000",
                "currency": "CLP",
                "transaction_id": "tx-1",
            }
        )
        writer.writerow(
            {
                "date": "2024-01-02",
                "description": "Groceries",
                "amount": "-120.5",
                "currency": "CLP",
                "transaction_id": "tx-2",
            }
        )
        writer.writerow(
            {
                "date": "2024-01-02",
                "description": "Groceries",
                "amount": "-120.5",
                "currency": "CLP",
                "transaction_id": "tx-2",
            }
        )
    return path


def _write_json(tmp_path: Path) -> Path:
    path = tmp_path / "transactions.json"
    data = [
        {"date": "2024-02-01", "description": "Coffee", "amount": -3.5},
        {"date": "2024-02-02", "description": "Refund", "amount": 15, "type": "INCOME"},
    ]
    path.write_text(json.dumps(data))
    return path


def _payload(document_id: str, user_id: str, file_path: Path, file_hash: str = "hash") -> dict:
    return {
        "document_id": document_id,
        "user_id": user_id,
        "file_path": str(file_path),
        "file_hash": file_hash,
        "account_id": "account-1",
        "original_name": file_path.name,
        "metadata": {"currency": "CLP"},
    }


def test_process_csv_deduplicates_inside_file(tmp_path):
    file_path = _write_csv(tmp_path)
    payload = _payload(str(uuid.uuid4()), "user-1", file_path)
    db = _create_database(tmp_path)
    result = process_document(db, payload)

    assert result["rows_total"] == 3
    assert result["duplicates_in_file"] == 1
    assert result["duplicates_in_db"] == 0
    assert result["inserted"] == 2
    db.close()


def test_process_csv_detects_existing_duplicates(tmp_path):
    file_path = _write_csv(tmp_path)
    document_id = str(uuid.uuid4())
    payload = _payload(document_id, "user-1", file_path, file_hash="same")
    db = _create_database(tmp_path)

    first = process_document(db, payload)
    assert first["inserted"] == 2

    second = process_document(db, payload)
    assert second["duplicates_in_db"] >= 2
    assert second["inserted"] == 0
    db.close()


def test_process_json_supported_format(tmp_path):
    file_path = _write_json(tmp_path)
    payload = _payload(str(uuid.uuid4()), "user-2", file_path)
    db = _create_database(tmp_path)

    result = process_document(db, payload)

    assert result["rows_total"] == 2
    assert result["inserted"] == 2
    db.close()


def test_invalid_schema_raises(tmp_path):
    path = tmp_path / "invalid.csv"
    path.write_text("foo,bar\n1,2\n")
    payload = _payload(str(uuid.uuid4()), "user-3", path)
    db = _create_database(tmp_path)

    try:
        process_document(db, payload)
    except SchemaValidationError:
        pass
    else:
        raise AssertionError("Expected SchemaValidationError")
    finally:
        db.close()
