import logging
import os
import time
from typing import List, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, Gauge, generate_latest
import uvicorn

app = FastAPI(
    title="SalomónAI - Financial Connector",
    description="Conector para instituciones financieras y procesamiento de datos",
    version="1.0.0"
)

logger = logging.getLogger("financial-connector")


def _parse_allowed_origins() -> List[str]:
    raw_value = (
        os.getenv("FINANCIAL_CONNECTOR_ALLOWED_ORIGINS")
        or os.getenv("ALLOWED_ORIGINS")
        or os.getenv("CORS_ORIGIN")
        or "http://localhost:3001"
    )

    origins = [origin.strip() for origin in raw_value.split(",") if origin.strip() and origin.strip() != "*"]

    if not origins:
        origins = ["http://localhost:3001"]

    if "*" in raw_value:
        logger.warning("Origen CORS comodín detectado. Se usará la lista permitida explícita: %s", origins)

    return origins


allowed_origins = _parse_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)


METRICS_ENABLED = (os.getenv("METRICS_ENABLED", "true").strip().lower() not in {"0", "false", "off", "no"})

REQUEST_COUNTER = Counter(
    "financial_connector_requests_total",
    "Total de solicitudes HTTP gestionadas por el conector financiero.",
    ["method", "endpoint", "status"],
)
REQUEST_DURATION = Histogram(
    "financial_connector_request_duration_seconds",
    "Duración de las solicitudes HTTP del conector financiero.",
    ["method", "endpoint"],
)
BANK_CONNECTION_COUNTER = Counter(
    "financial_connector_bank_connections_total",
    "Conexiones solicitadas hacia instituciones financieras.",
    ["bank"],
)
FILE_IMPORT_COUNTER = Counter(
    "financial_connector_file_import_total",
    "Archivos procesados por el conector financiero.",
    ["file_type"],
)
ACTIVE_UPLOADS = Gauge(
    "financial_connector_active_uploads",
    "Número de cargas de archivos en curso.",
)


@app.middleware("http")
async def metrics_middleware(request, call_next):
    if not METRICS_ENABLED or request.url.path == "/metrics":
        return await call_next(request)

    start_time = time.perf_counter()
    try:
        response = await call_next(request)
        status_code = response.status_code
    except Exception as exc:
        status_code = getattr(exc, "status_code", 500)
        duration = time.perf_counter() - start_time
        endpoint = request.url.path
        REQUEST_DURATION.labels(request.method, endpoint).observe(duration)
        REQUEST_COUNTER.labels(request.method, endpoint, str(status_code)).inc()
        raise

    duration = time.perf_counter() - start_time
    endpoint = request.url.path
    REQUEST_DURATION.labels(request.method, endpoint).observe(duration)
    REQUEST_COUNTER.labels(request.method, endpoint, str(status_code)).inc()

    return response


@app.get("/metrics")
async def metrics():
    if not METRICS_ENABLED:
        return Response(content="# Metrics disabled\n", media_type="text/plain")

    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

# --- Modelos de datos ---
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

# --- Endpoints ---
@app.get("/", response_model=dict)
async def root():
    return {
        "message": "SalomónAI Financial Connector",
        "status": "active",
        "version": "1.0.0"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        service="financial-connector",
        version="1.0.0"
    )

@app.get("/banks/supported", response_model=List[str])
async def get_supported_banks():
    """
    Retorna la lista de bancos soportados
    """
    return [
        "Santander",
        "BBVA",
        "BancoEstado",
        "Banco de Chile",
        "Itaú",
        "Scotiabank",
        "BCI"
    ]

@app.post("/connect/bank")
async def connect_bank(connection: BankConnection):
    """
    Establece conexión con un banco (simulado por ahora)
    """
    try:
        if METRICS_ENABLED:
            BANK_CONNECTION_COUNTER.labels(connection.bank_name).inc()
        # Simulación de conexión bancaria
        return {
            "status": "connected",
            "bank": connection.bank_name,
            "account_type": connection.account_type,
            "message": f"Conexión establecida con {connection.bank_name}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error conectando con banco: {str(e)}")

@app.post("/import/file")
async def import_transactions_file(
    file: UploadFile = File(...),
    user_id: str = "default",
    bank_name: str = "unknown"
):
    """
    Importa transacciones desde un archivo CSV/Excel
    """
    try:
        if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="Formato de archivo no soportado")

        # Simular procesamiento del archivo
        if METRICS_ENABLED:
            ACTIVE_UPLOADS.inc()
        try:
            file_size = len(await file.read())
        finally:
            if METRICS_ENABLED:
                ACTIVE_UPLOADS.dec()

        if METRICS_ENABLED:
            FILE_IMPORT_COUNTER.labels(file.filename.split('.')[-1].lower()).inc()

        return {
            "status": "processed",
            "filename": file.filename,
            "file_size": file_size,
            "user_id": user_id,
            "bank_name": bank_name,
            "transactions_found": 25,  # Simulado
            "message": "Archivo procesado exitosamente"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando archivo: {str(e)}")

@app.get("/transactions/formats", response_model=List[str])
async def get_supported_formats():
    """
    Retorna los formatos de archivo soportados
    """
    return [".csv", ".xlsx", ".xls", ".pdf"]

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "server:app", 
        host="0.0.0.0", 
        port=port, 
        reload=True,
        log_level="info"
    )