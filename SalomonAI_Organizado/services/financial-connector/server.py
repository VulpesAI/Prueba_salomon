import re
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional
from uuid import uuid4

import uvicorn
from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .parsing_engine import ParsingEnginePublisher, create_parsing_engine_publisher
from .settings import get_settings
from .statements import StatementParserError, parse_csv_statement
from .status import (
    StatementStatusError,
    StatementStatusRepository,
    create_status_repository,
)
from .storage import StorageClient, StorageError, create_storage_client

CSV_MIME_TYPES = {
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
}

IMAGE_TYPES = {"jpeg", "png", "gif", "bmp", "tiff", "webp"}

CsvParser = Callable[[bytes], Dict[str, Any]]


app = FastAPI(
    title="SalomónAI - Financial Connector",
    description="Conector para instituciones financieras y procesamiento de datos",
    version="1.0.0",
)

settings = get_settings()


# Dependency instances -----------------------------------------------------
storage_client = create_storage_client(settings)
status_repository = create_status_repository(settings)
parsing_publisher = create_parsing_engine_publisher(settings)


def get_storage_client() -> StorageClient:
    return storage_client


def get_status_repository() -> StatementStatusRepository:
    return status_repository


def get_parsing_engine_publisher() -> ParsingEnginePublisher:
    return parsing_publisher


def get_csv_parser() -> CsvParser:
    return parse_csv_statement


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Modelos de datos ---
class BankConnection(BaseModel):
    bank_name: str
    account_type: str
    user_id: str
    credentials: dict


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


# --- Endpoints ---
@app.get("/", response_model=dict)
async def root():
    return {
        "message": "SalomónAI Financial Connector",
        "status": "active",
        "version": "1.0.0",
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        service="financial-connector",
        version="1.0.0",
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
    """Establece conexión con un banco (simulado)."""
    try:
        return {
            "status": "connected",
            "bank": connection.bank_name,
            "account_type": connection.account_type,
            "message": f"Conexión establecida con {connection.bank_name}",
        }
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=f"Error conectando con banco: {exc}") from exc


@app.post("/import/file")
async def import_transactions_file(
    files: List[UploadFile] = File(...),
    user_id: str = Query("default"),
    bank_name: str = Query("unknown"),
    storage: StorageClient = Depends(get_storage_client),
    status_repo: StatementStatusRepository = Depends(get_status_repository),
    parser: CsvParser = Depends(get_csv_parser),
    publisher: ParsingEnginePublisher = Depends(get_parsing_engine_publisher),
):
    """Importa múltiples archivos de cartolas y los envía a procesamiento."""

    if not files:
        raise HTTPException(status_code=400, detail="Se debe adjuntar al menos un archivo")

    results = []

    for upload in files:
        result = await _process_upload(
            upload,
            user_id=user_id,
            bank_name=bank_name,
            storage=storage,
            status_repo=status_repo,
            parser=parser,
            publisher=publisher,
        )
        results.append(result)

    overall_status = "processed" if all(r["status"] == "completed" for r in results) else "accepted"

    return {
        "status": overall_status,
        "files": results,
        "count": len(results),
    }


@app.get("/transactions/formats", response_model=List[str])
async def get_supported_formats():
    """Retorna los formatos de archivo soportados."""
    return [".csv", ".pdf", ".png", ".jpg", ".jpeg"]


async def _process_upload(
    upload: UploadFile,
    *,
    user_id: str,
    bank_name: str,
    storage: StorageClient,
    status_repo: StatementStatusRepository,
    parser: CsvParser,
    publisher: ParsingEnginePublisher,
) -> Dict[str, Any]:
    if not upload.filename:
        raise HTTPException(status_code=400, detail="El archivo debe tener un nombre")

    data = await upload.read()
    if not data:
        raise HTTPException(status_code=400, detail="El archivo está vacío")

    file_type = _detect_file_type(upload, data)

    statement_id = str(uuid4())
    safe_filename = _sanitize_filename(upload.filename)
    safe_user = _sanitize_segment(user_id)
    storage_path = f"{safe_user}/{statement_id}/{safe_filename}"

    await _require_status_update(status_repo, statement_id, "created", progress=0)

    try:
        stored_path = await storage.store(
            data=data,
            destination_path=storage_path,
            content_type=upload.content_type or "application/octet-stream",
        )
    except StorageError as exc:
        await _attempt_status_update(status_repo, statement_id, "failed", error=str(exc))
        raise HTTPException(status_code=502, detail=f"No se pudo guardar el archivo: {exc}") from exc

    await _attempt_status_update(status_repo, statement_id, "uploaded", progress=5)

    result: Dict[str, Any] = {
        "statementId": statement_id,
        "filename": upload.filename,
        "storagePath": stored_path,
        "userId": user_id,
        "bank": bank_name,
        "type": file_type,
    }

    if file_type == "csv":
        try:
            await _attempt_status_update(status_repo, statement_id, "processing", progress=50)
            normalized = parser(data)
            await _attempt_status_update(status_repo, statement_id, "completed", progress=100)
        except StatementParserError as exc:
            await _attempt_status_update(status_repo, statement_id, "failed", error=str(exc))
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except Exception as exc:  # pragma: no cover - unexpected parser errors
            await _attempt_status_update(status_repo, statement_id, "failed", error=str(exc))
            raise HTTPException(status_code=500, detail=f"Error procesando CSV: {exc}") from exc

        result["status"] = "completed"
        result["normalizedStatement"] = normalized
        return result

    # PDF o imágenes: delegar al motor de parsing
    try:
        await _attempt_status_update(status_repo, statement_id, "queued", progress=10)
        await publisher.publish(
            statement_id=statement_id,
            user_id=user_id,
            storage_path=stored_path,
        )
        await _attempt_status_update(status_repo, statement_id, "waiting_parsing", progress=10)
    except Exception as exc:
        await _attempt_status_update(status_repo, statement_id, "failed", error=str(exc))
        raise HTTPException(status_code=502, detail=f"No se pudo encolar el archivo: {exc}") from exc

    result["status"] = "queued"
    result["message"] = "Archivo enviado al motor de parsing"
    return result


def _detect_file_type(upload: UploadFile, data: bytes) -> str:
    filename = upload.filename or ""
    extension = Path(filename).suffix.lower()
    content_type = (upload.content_type or "").lower()

    if extension == ".csv" or content_type in CSV_MIME_TYPES:
        return "csv"

    if extension == ".pdf" or content_type == "application/pdf" or data.startswith(b"%PDF"):
        return "pdf"

    if extension in {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tif", ".tiff", ".webp"}:
        image_type = _detect_image_type(data)
        if image_type and image_type not in IMAGE_TYPES:
            raise HTTPException(status_code=400, detail="Formato de imagen no soportado")
        return "image"

    image_type = _detect_image_type(data)
    if image_type in IMAGE_TYPES:
        return "image"

    if content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Formato de imagen no soportado")

    raise HTTPException(status_code=400, detail=f"Formato de archivo no soportado: {filename}")


def _sanitize_segment(value: str) -> str:
    sanitized = re.sub(r"[^A-Za-z0-9_-]", "_", value or "")
    return sanitized or "user"


def _sanitize_filename(filename: str) -> str:
    name = Path(filename).name
    sanitized = re.sub(r"[^A-Za-z0-9._-]", "_", name)
    return sanitized or "statement.dat"


def _detect_image_type(data: bytes) -> Optional[str]:
    if len(data) < 4:
        return None

    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
        return "gif"
    if data.startswith(b"BM"):
        return "bmp"
    if data.startswith(b"II*\x00") or data.startswith(b"MM\x00*"):
        return "tiff"
    if data.startswith(b"RIFF") and len(data) >= 12 and data[8:12] == b"WEBP":
        return "webp"
    return None


async def _require_status_update(
    repository: StatementStatusRepository,
    statement_id: str,
    status: str,
    *,
    progress: Optional[int] = None,
    error: Optional[str] = None,
) -> None:
    try:
        await repository.update_status(
            statement_id,
            status,
            progress=progress,
            error=error,
        )
    except StatementStatusError as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo actualizar el estado: {exc}") from exc


async def _attempt_status_update(
    repository: StatementStatusRepository,
    statement_id: str,
    status: str,
    *,
    progress: Optional[int] = None,
    error: Optional[str] = None,
) -> None:
    try:
        await repository.update_status(
            statement_id,
            status,
            progress=progress,
            error=error,
        )
    except StatementStatusError:
        # Best effort update: status errors should not block the main flow.
        pass


if __name__ == "__main__":  # pragma: no cover - manual execution helper
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
        log_level="info",
    )
