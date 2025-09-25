"""Core parsing pipeline for ingesting financial documents."""
from __future__ import annotations

import csv
import hashlib
import importlib.util
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable, List, Tuple

from database import Database
from models import DocumentIngestionPayload, NormalizedTransactionModel

SUPPORTED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".json"}
_OPENPYXL_SPEC = importlib.util.find_spec("openpyxl")
if _OPENPYXL_SPEC is not None:
    _openpyxl_module = importlib.util.module_from_spec(_OPENPYXL_SPEC)
    assert _OPENPYXL_SPEC.loader is not None
    _OPENPYXL_SPEC.loader.exec_module(_openpyxl_module)  # type: ignore[arg-type]
    load_workbook = _openpyxl_module.load_workbook
else:
    load_workbook = None


class SchemaValidationError(ValueError):
    """Raised when the incoming file does not comply with the contract."""


def _is_empty(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and not value.strip():
        return True
    return False


def _read_csv(file_path: Path) -> List[dict]:
    with file_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        return [dict(row) for row in reader]


def _read_json(file_path: Path) -> List[dict]:
    with file_path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if isinstance(data, dict):
        # common wrapper key
        data = data.get("transactions") or data.get("items") or []
    if not isinstance(data, list):
        raise SchemaValidationError("El archivo JSON debe contener una lista de transacciones")
    return [dict(item) for item in data]


def _read_excel(file_path: Path) -> List[dict]:
    if load_workbook is None:
        raise SchemaValidationError(
            "Procesamiento de Excel requiere la dependencia opcional 'openpyxl'"
        )
    workbook = load_workbook.load_workbook(filename=str(file_path), read_only=True)
    sheet = workbook.active
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(cell).strip() if cell is not None else "" for cell in rows[0]]
    records = []
    for row in rows[1:]:
        record = {}
        for header, value in zip(headers, row):
            if header:
                record[header] = value
        records.append(record)
    return records


def _read_rows(file_path: Path) -> List[dict]:
    extension = file_path.suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise SchemaValidationError(f"Formato de archivo no soportado: {extension}")
    if extension == ".csv":
        return _read_csv(file_path)
    if extension in {".xlsx", ".xls"}:
        return _read_excel(file_path)
    return _read_json(file_path)


def _validate_columns(rows: List[dict]) -> None:
    if not rows:
        raise SchemaValidationError("El archivo no contiene datos")
    lower_columns = {str(col).lower() for col in rows[0].keys()}
    required = {"date", "description", "amount"}
    missing = required - lower_columns
    if missing:
        raise SchemaValidationError(
            f"El archivo no contiene las columnas requeridas: {', '.join(sorted(missing))}"
        )


def _extract_value(row: dict, key: str, default=None):
    for candidate in (key, key.upper(), key.lower()):
        if candidate in row and not _is_empty(row[candidate]):
            return row[candidate]
    return default


def _parse_date(value) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, (int, float)):
        # Excel serial numbers support limited: treat as days from 1899-12-30
        base = datetime(1899, 12, 30)
        return base + timedelta(days=float(value))
    if isinstance(value, str):
        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(value.strip(), fmt)
            except ValueError:
                continue
        try:
            return datetime.fromisoformat(value)
        except ValueError as exc:  # noqa: PERF203 - keep informative error
            raise SchemaValidationError(f"Formato de fecha no soportado: {value}") from exc
    raise SchemaValidationError(f"Tipo de fecha no soportado: {type(value)}")


def _infer_transaction_type(amount) -> str:
    try:
        value = float(amount)
    except Exception as exc:  # noqa: BLE001 - fallback to expense
        raise SchemaValidationError("Monto inválido en la transacción") from exc
    return "INCOME" if value >= 0 else "EXPENSE"


def _build_normalized_transactions(
    payload: DocumentIngestionPayload, rows: List[dict]
) -> List[NormalizedTransactionModel]:
    normalized: List[NormalizedTransactionModel] = []
    for row in rows:
        description = _extract_value(row, "description", "")
        amount = _extract_value(row, "amount", 0)
        date_value = _extract_value(row, "date")
        if _is_empty(description) or date_value is None:
            continue
        transaction_id = _extract_value(row, "transaction_id") or _extract_value(
            row, "external_id"
        )
        currency = _extract_value(row, "currency", payload.metadata.get("currency")) or "CLP"
        category = _extract_value(row, "category")
        txn_type = _extract_value(row, "type") or _infer_transaction_type(amount)

        normalized.append(
            NormalizedTransactionModel(
                document_id=payload.document_id,
                user_id=payload.user_id,
                account_id=payload.account_id,
                external_id=str(transaction_id) if transaction_id else None,
                description=str(description),
                amount=amount,
                currency=str(currency).upper(),
                type=txn_type,
                category=str(category) if category else None,
                occurred_at=_parse_date(date_value),
                metadata={"source": payload.source, **payload.metadata},
                raw_data={k: v for k, v in row.items() if not _is_empty(v)},
            )
        )
    return normalized


def _checksum(transaction: NormalizedTransactionModel) -> str:
    payload = "|".join(
        [
            transaction.user_id,
            transaction.account_id or "",
            transaction.external_id or "",
            transaction.occurred_at.isoformat(),
            str(transaction.amount),
            transaction.currency,
            transaction.description.lower(),
        ]
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _remove_duplicate_models(
    transactions: Iterable[NormalizedTransactionModel],
) -> Tuple[List[NormalizedTransactionModel], int]:
    seen = set()
    unique: List[NormalizedTransactionModel] = []
    duplicates = 0
    for txn in transactions:
        checksum = _checksum(txn)
        if checksum in seen:
            duplicates += 1
            continue
        txn.metadata.setdefault("checksum", checksum)
        seen.add(checksum)
        unique.append(txn)
    return unique, duplicates


def persist_transactions(db: Database, payload: DocumentIngestionPayload, rows: List[dict]):
    _validate_columns(rows)
    document = db.fetch_document_by_hash(payload.user_id, payload.file_hash or "")
    if document is None:
        document = db.create_document(
            payload.document_id,
            payload.user_id,
            payload.account_id,
            payload.source,
            payload.original_name or Path(payload.file_path).name,
            payload.file_path,
            payload.file_hash or "",
            "QUEUED",
            payload.metadata,
        )
    normalized_models = _build_normalized_transactions(payload, rows)
    normalized_models, duplicate_rows = _remove_duplicate_models(normalized_models)

    existing_checksums = db.fetch_existing_checksums(payload.user_id)
    to_persist: List[Tuple[str, dict]] = []
    skipped = 0

    for model in normalized_models:
        checksum = model.metadata.get("checksum") or _checksum(model)
        if checksum in existing_checksums:
            skipped += 1
            continue
        record = {
            "external_id": model.external_id,
            "description": model.description,
            "amount": float(model.amount),
            "currency": model.currency,
            "type": model.type,
            "category": model.category,
            "occurred_at": model.occurred_at.isoformat(),
            "metadata": model.metadata,
            "raw_data": model.raw_data,
        }
        to_persist.append((checksum, record))
        existing_checksums.add(checksum)

    inserted = db.insert_transactions(
        document.id,
        payload.user_id,
        payload.account_id,
        to_persist,
    )

    summary = {
        "document_id": document.id,
        "rows_total": len(rows),
        "rows_normalized": len(normalized_models),
        "duplicates_in_file": duplicate_rows,
        "duplicates_in_db": skipped,
        "inserted": inserted,
    }
    metadata = {**document.metadata, "summary": summary}
    db.update_document(document.id, "PROCESSED", metadata)
    return summary


def process_document(db: Database, payload_dict: dict) -> dict:
    payload = DocumentIngestionPayload(**payload_dict)
    file_path = Path(payload.file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"No se encontró el archivo a procesar: {file_path}")

    rows = _read_rows(file_path)
    return persist_transactions(db, payload, rows)
