from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os

app = FastAPI(
    title="SalomónAI - Recommendation Engine",
    description="Motor de recomendaciones financieras inteligentes",
    version="1.0.0"
)

# CORS middleware para permitir conexiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios exactos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Modelos de datos ---
class TransactionData(BaseModel):
    amount: float
    category: str
    description: str
    user_id: str

class RecommendationResponse(BaseModel):
    recommendation: str
    confidence: float
    category: str
    reasoning: str

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str

# --- Endpoints ---
@app.get("/", response_model=dict)
async def root():
    return {
        "message": "SalomónAI Recommendation Engine",
        "status": "active",
        "version": "1.0.0"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        service="recommendation-engine",
        version="1.0.0"
    )

@app.post("/recommendations", response_model=RecommendationResponse)
async def generate_recommendation(transaction: TransactionData):
    """
    Genera recomendaciones basadas en datos de transacciones
    """
    try:
        # Lógica básica de recomendaciones (expandir más tarde)
        if transaction.amount > 1000:
            recommendation = "Considera revisar este gasto alto. ¿Es realmente necesario?"
            confidence = 0.8
            reasoning = "Transacción de alto monto detectada"
        elif transaction.category.lower() in ["entretenimiento", "restaurante"]:
            recommendation = "Podrías ahorrar cocinando en casa o buscando alternativas más económicas"
            confidence = 0.7
            reasoning = "Categoría de gasto discrecional identificada"
        else:
            recommendation = "Transacción normal. Continúa con tus buenos hábitos financieros"
            confidence = 0.6
            reasoning = "Patrón de gasto estándar"
        
        return RecommendationResponse(
            recommendation=recommendation,
            confidence=confidence,
            category=transaction.category,
            reasoning=reasoning
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando recomendación: {str(e)}")

@app.get("/recommendations/categories", response_model=List[str])
async def get_supported_categories():
    """
    Retorna las categorías soportadas por el motor de recomendaciones
    """
    return [
        "alimentacion",
        "transporte", 
        "entretenimiento",
        "salud",
        "educacion",
        "vivienda",
        "servicios",
        "otros"
    ]

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=port, 
        reload=True,
        log_level="info"
    )