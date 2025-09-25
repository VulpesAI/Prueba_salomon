import logging
import os
import time
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
import uvicorn

app = FastAPI(
    title="SalomónAI - Recommendation Engine",
    description="Motor de recomendaciones financieras inteligentes",
    version="1.0.0"
)

logger = logging.getLogger("recommendation-engine")


def _parse_allowed_origins() -> List[str]:
    raw_value = (
        os.getenv("RECOMMENDATION_ENGINE_ALLOWED_ORIGINS")
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
    "recommendation_engine_requests_total",
    "Total de solicitudes HTTP gestionadas por el motor de recomendaciones.",
    ["method", "endpoint", "status"],
)
REQUEST_DURATION = Histogram(
    "recommendation_engine_request_duration_seconds",
    "Duración de las solicitudes HTTP del motor de recomendaciones.",
    ["method", "endpoint"],
)
MODEL_INFERENCE_COUNTER = Counter(
    "recommendation_engine_inference_total",
    "Inferencias ejecutadas por el motor de recomendaciones.",
    ["outcome", "category"],
)
MODEL_INFERENCE_DURATION = Histogram(
    "recommendation_engine_inference_duration_seconds",
    "Duración de las inferencias del motor de recomendaciones.",
    ["outcome"],
)
MODEL_LAST_CONFIDENCE = Gauge(
    "recommendation_engine_last_confidence",
    "Confianza de la última inferencia exitosa.",
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
    start_time = time.perf_counter()
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
        
        response = RecommendationResponse(
            recommendation=recommendation,
            confidence=confidence,
            category=transaction.category,
            reasoning=reasoning
        )

        if METRICS_ENABLED:
            duration = time.perf_counter() - start_time
            MODEL_INFERENCE_COUNTER.labels(outcome="success", category=transaction.category).inc()
            MODEL_INFERENCE_DURATION.labels(outcome="success").observe(duration)
            MODEL_LAST_CONFIDENCE.set(confidence)

        return response

    except Exception as e:
        if METRICS_ENABLED:
            duration = time.perf_counter() - start_time
            MODEL_INFERENCE_COUNTER.labels(outcome="error", category=transaction.category).inc()
            MODEL_INFERENCE_DURATION.labels(outcome="error").observe(duration)

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