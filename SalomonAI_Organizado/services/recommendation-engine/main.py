import logging
import os
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from feedback import FeedbackAction, FeedbackLoop
from personalization import PersonalizationEngine

logging.basicConfig(level=logging.INFO)
LOGGER = logging.getLogger(__name__)

app = FastAPI(
    title="SalomónAI - Recommendation Engine",
    description="Motor de recomendaciones financieras inteligentes",
    version="1.1.0",
)

# CORS middleware para permitir conexiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios exactos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

feedback_loop = FeedbackLoop()
personalization_engine = PersonalizationEngine()


# --- Modelos de datos ---
class TransactionData(BaseModel):
    amount: float = Field(..., ge=0)
    category: str
    description: str
    user_id: str


class RecommendationResponse(BaseModel):
    recommendation: str
    confidence: float
    category: str
    reasoning: str
    personalized_insights: Optional[List[str]] = None


class MetricsResponse(BaseModel):
    total_recommendations: float
    total_feedback_events: float
    accepted_recommendations: float
    dismissed_recommendations: float
    saved_for_later: float
    engagement_rate: float
    acceptance_rate: float
    estimated_savings: float


class FeedbackRequest(BaseModel):
    user_id: str
    recommendation: str
    action: FeedbackAction
    amount: float = Field(..., ge=0)
    category: str
    metadata: Optional[Dict[str, str]] = None


class FeedbackResponse(BaseModel):
    status: str
    action: FeedbackAction
    insights: List[str]


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
        "version": app.version,
        "personalization_enabled": personalization_engine.is_available,
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        service="recommendation-engine",
        version=app.version,
    )


@app.post("/recommendations", response_model=RecommendationResponse)
async def generate_recommendation(transaction: TransactionData):
    """Genera recomendaciones basadas en datos de transacciones con personalización."""

    try:
        feedback_loop.register_recommendation(transaction.user_id)

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

        similar_users = personalization_engine.find_similar_users(
            amount=transaction.amount,
            category=transaction.category,
            description=transaction.description,
        )
        insights = personalization_engine.summarize_similar_users(
            similar_users, exclude_user=transaction.user_id
        )

        personalization_engine.upsert_user_embedding(
            user_id=transaction.user_id,
            amount=transaction.amount,
            category=transaction.category,
            description=transaction.description,
            metadata={
                "latest_recommendation": recommendation,
                "confidence": f"{confidence:.2f}",
            },
        )

        return RecommendationResponse(
            recommendation=recommendation,
            confidence=confidence,
            category=transaction.category,
            reasoning=reasoning,
            personalized_insights=insights or None,
        )

    except Exception as exc:
        LOGGER.exception("Error generando recomendación")
        raise HTTPException(status_code=500, detail=f"Error generando recomendación: {exc}")


@app.post("/recommendations/feedback", response_model=FeedbackResponse)
async def receive_feedback(payload: FeedbackRequest):
    """Registra acciones del usuario para alimentar el loop de realimentación."""

    try:
        event = feedback_loop.register_feedback(
            user_id=payload.user_id,
            recommendation=payload.recommendation,
            action=payload.action,
            amount=payload.amount,
            category=payload.category,
            metadata=payload.metadata,
        )

        personalization_engine.upsert_user_embedding(
            user_id=payload.user_id,
            amount=payload.amount,
            category=payload.category,
            description=payload.recommendation,
            metadata={
                "feedback_action": event.action.value,
                "loop": "user-feedback",
                **(payload.metadata or {}),
            },
        )

        similar_users = personalization_engine.find_similar_users(
            amount=payload.amount,
            category=payload.category,
            description=payload.recommendation,
        )
        insights = personalization_engine.summarize_similar_users(
            similar_users, exclude_user=payload.user_id
        )

        return FeedbackResponse(status="recorded", action=payload.action, insights=insights)
    except Exception as exc:
        LOGGER.exception("No se pudo registrar el feedback")
        raise HTTPException(status_code=500, detail=f"No se pudo registrar el feedback: {exc}")


@app.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    """Devuelve un snapshot de las métricas claves de éxito."""

    metrics = feedback_loop.get_metrics_snapshot()
    return MetricsResponse(**metrics)


@app.get("/users/{user_id}/feedback", response_model=List[Dict[str, str]])
async def get_user_feedback(user_id: str):
    """Permite auditar las acciones previas de un usuario."""

    history = feedback_loop.get_user_history(user_id)
    response: List[Dict[str, str]] = []
    for event in history:
        response.append(
            {
                "action": event.action.value,
                "category": event.category,
                "amount": f"{event.amount:.2f}",
                "created_at": event.created_at.isoformat(),
                "recommendation": event.recommendation,
            }
        )
    return response


@app.get("/recommendations/categories", response_model=List[str])
async def get_supported_categories():
    """Retorna las categorías soportadas por el motor de recomendaciones."""

    return [
        "alimentacion",
        "transporte",
        "entretenimiento",
        "salud",
        "educacion",
        "vivienda",
        "servicios",
        "otros",
    ]


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info",
    )
