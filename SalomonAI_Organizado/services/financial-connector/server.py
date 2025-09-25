"""Financial connector service for ingesting financial data."""
from __future__ import annotations

import hashlib
import json
import os
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from kafka import KafkaProducer
from kafka.errors import KafkaError
from pydantic import BaseModel

from database import session_scope

app = FastAPI(
    title="SalomónAI - Financial Connector",
    description="Conector para instituciones financieras y procesamiento de datos",
    version="1.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

KAFKA_BROKER_URL = os.environ.get("KAFKA_BROKER_URL")
KAFKA_TOPIC = os.environ.get("KAFKA_TOPIC", "salomon.documents.new")
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "./data/uploads"))
SUPPORTED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".json"}

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

_producer: Optional[KafkaProducer] = None


class BankConnection(BaseModel):
    bank_name: str
    account_type: str
    user_id: str
    credentials: dict


class TransactionImport(BaseModel):
    file_type: str
    user_id: str
    bank_name: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class DocumentIngestionResponse(BaseModel):
    document_id: str
    status: str
    file_name: str
    user_id: str
    duplicate: bool = False


class KafkaStatus(BaseModel):
    status: str
    topic: Optional[str] = None
    detail: Optional[str] = None


def _get_producer() -> Optional[KafkaProducer]:
    global _producer
    if _producer is not None:
        return _producer
    if not KAFKA_BROKER_URL:
        return None
    _producer = KafkaProducer(
        bootstrap_servers=[KAFKA_BROKER_URL],
        value_serializer=lambda value: json.dumps(value).encode("utf-8"),
    )
    return _producer


def _hash_contents(contents: bytes) -> str:
    return hashlib.sha256(contents).hexdigest()


def _save_file(upload: UploadFile, contents: bytes) -> Path:
    extension = Path(upload.filename or "").suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Formato de archivo no soportado")
    file_name = f"{uuid.uuid4()}_{upload.filename}"
    destination = UPLOAD_DIR / file_name
    destination.write_bytes(contents)
    return destination


def _publish_to_kafka(message: dict) -> KafkaStatus:
    producer = _get_producer()
    if producer is None:
        return KafkaStatus(status="disabled", detail="Kafka no configurado")
    try:
        future = producer.send(KAFKA_TOPIC, message)
        future.get(timeout=10)
        return KafkaStatus(status="published", topic=KAFKA_TOPIC)
    except KafkaError as err:  # noqa: BLE001 - library specific
        return KafkaStatus(status="error", topic=KAFKA_TOPIC, detail=str(err))


@app.get("/", response_model=dict)
async def root():
    return {
        "message": "SalomónAI Financial Connector",
        "status": "active",
        "version": app.version,
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        service="financial-connector",
        version=app.version,
    )


@app.get("/banks/supported", response_model=List[str])
async def get_supported_banks():
    """Retorna la lista de bancos soportados."""

    return [
        "Santander",
        "BBVA",
        "BancoEstado",
        "Banco de Chile",
        "Itaú",
        "Scotiabank",
        "BCI",
    ]


@app.post("/connect/bank")
async def connect_bank(connection: BankConnection):
    """Establece conexión con un banco (simulado por ahora)."""

    return {
        "status": "connected",
        "bank": connection.bank_name,
        "account_type": connection.account_type,
        "message": f"Conexión establecida con {connection.bank_name}",
    }


@app.post("/import/file", response_model=DocumentIngestionResponse)
async def import_transactions_file(
    file: UploadFile = File(...),
    user_id: str = "default",
    bank_name: str = "unknown",
    account_id: Optional[str] = None,
):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="El archivo está vacío")

    file_hash = _hash_contents(contents)
    file_path = _save_file(file, contents)
    document_id = str(uuid.uuid4())
    metadata = {"bank_name": bank_name}

    with session_scope() as db:
        existing = db.fetch_by_hash(user_id, file_hash)
        if existing:
            return DocumentIngestionResponse(
                document_id=existing["id"],
                status=existing["status"],
                file_name=file.filename,
                user_id=user_id,
                duplicate=True,
            )

        db.create_document(
            document_id,
            user_id,
            account_id,
            file.filename or file_path.name,
            str(file_path.resolve()),
            file_hash,
            metadata,
        )

    payload = {
        "document_id": document_id,
        "user_id": user_id,
        "account_id": account_id,
        "file_path": str(file_path.resolve()),
        "file_type": Path(file.filename or "").suffix.lower(),
        "original_name": file.filename,
        "file_hash": file_hash,
        "source": "upload",
        "metadata": metadata,
    }

    kafka_status = _publish_to_kafka(payload)

    new_status = "QUEUED" if kafka_status.status == "published" else "RECEIVED"
    with session_scope() as db:
        stored_metadata = {**metadata, "kafka": kafka_status.model_dump()}
        db.update_status(
            document_id,
            "ERROR" if kafka_status.status == "error" else new_status,
            stored_metadata,
        )

    if kafka_status.status == "error":
        raise HTTPException(
            status_code=502,
            detail=f"No se pudo enviar el documento a Kafka: {kafka_status.detail}",
        )

    return DocumentIngestionResponse(
        document_id=document_id,
        status=new_status,
        file_name=file.filename,
        user_id=user_id,
        duplicate=False,
    )


@app.get("/transactions/formats", response_model=List[str])
async def get_supported_formats():
    """Retorna los formatos de archivo soportados."""

    return sorted(SUPPORTED_EXTENSIONS)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    import uvicorn

    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info",
    )
