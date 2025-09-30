from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import json

app = FastAPI(
    title="SalomónAI - Financial Connector",
    description="Conector para instituciones financieras y procesamiento de datos",
    version="1.0.0"
)

from .settings import get_settings

settings = get_settings()

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
        file_size = len(await file.read())
        
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
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
        log_level="info"
    )