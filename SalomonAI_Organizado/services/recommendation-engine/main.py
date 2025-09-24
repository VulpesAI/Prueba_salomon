import json
import os
from pathlib import Path
from typing import Dict, List, Optional

import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn


def _get_allowed_origins() -> List[str]:
    """Resolve allowed origins for CORS based on environment configuration."""
    raw_origins = os.getenv("RECOMMENDATION_ENGINE_ALLOWED_ORIGINS") or os.getenv("CORS_ORIGIN")
    if raw_origins:
        origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
        if origins:
            return origins

    return [
        "http://localhost:3000",
        "http://localhost:3001",
    ]


CATEGORY_RECOMMENDATIONS: Dict[str, str] = {
    "alimentacion": "Revisa tus compras de alimentación y busca oportunidades de compra en volumen o promociones recurrentes.",
    "vivienda": "Evalúa si puedes renegociar arriendo o gastos comunes para reducir el peso fijo mensual.",
    "servicios": "Considera unificar servicios o ajustar planes (internet, luz, agua) según tu uso real.",
    "transporte": "Agrupa viajes y compara alternativas de transporte compartido para optimizar costos.",
    "salud": "Planifica un fondo mensual para salud y compara precios de medicamentos en farmacias con convenios.",
    "educacion": "Define un presupuesto de formación y prioriza cursos que aporten retorno directo a tus objetivos.",
    "entretenimiento": "Define un tope mensual de ocio y busca opciones gratuitas o promociones.",
    "vestuario": "Planifica compras estacionales y aprovecha liquidaciones para reducir el gasto en vestuario.",
    "ingresos": "Destina una parte del ingreso reciente a ahorro o inversión automática.",
    "ahorro": "Felicitaciones por tu aporte: considera automatizarlo y revisar metas de corto y largo plazo.",
    "ocio": "Mantén el equilibrio: fija un presupuesto para ocio y revisa sus beneficios para tu bienestar.",
}

AMOUNT_BUCKETS = [
    (-float("inf"), 10000, "monto_bajo"),
    (10000, 50000, "monto_medio"),
    (50000, 150000, "monto_alto"),
    (150000, float("inf"), "monto_extraordinario"),
]

MODEL_DIR = Path(__file__).resolve().parent / "artifacts"
DEFAULT_MODEL_PATH = Path(os.getenv("RECOMMENDATION_MODEL_PATH", MODEL_DIR / "recommendation_model.joblib"))
DEFAULT_REPORT_PATH = Path(os.getenv("RECOMMENDATION_MODEL_REPORT", MODEL_DIR / "training_report.json"))


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
    source: str


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    model_ready: bool
    model_version: Optional[str]
    categories: List[str]


class RecommendationEngine:
    """Wrapper that loads a persisted model and generates predictions."""

    def __init__(self, model_path: Path = DEFAULT_MODEL_PATH, report_path: Path = DEFAULT_REPORT_PATH) -> None:
        self.model_path = model_path
        self.report_path = report_path
        self.pipeline = None
        self.metadata: Dict[str, str] = {}
        self._load_artifacts()

    def _load_artifacts(self) -> None:
        if self.model_path.exists():
            try:
                loaded = joblib.load(self.model_path)
                # Support both raw pipeline or dict with metadata
                if isinstance(loaded, dict):
                    self.pipeline = loaded.get("pipeline")
                    self.metadata = loaded.get("metadata", {})
                else:
                    self.pipeline = loaded
            except Exception as exc:  # pragma: no cover - defensive
                print(f"Failed to load recommendation model: {exc}")
                self.pipeline = None

        if self.report_path.exists():
            try:
                self.metadata.update(json.loads(self.report_path.read_text(encoding="utf-8")))
            except Exception:
                # ignore report parsing errors to keep the engine running
                pass

    @staticmethod
    def _bucketize_amount(amount: float) -> str:
        absolute = abs(amount)
        for lower, upper, label in AMOUNT_BUCKETS:
            if lower < absolute <= upper:
                return label
        return AMOUNT_BUCKETS[-1][2]

    def _build_feature_text(self, description: str, amount: float) -> str:
        cleaned = " ".join(description.lower().split())
        bucket = self._bucketize_amount(amount)
        return f"{cleaned} {bucket}"

    def predict(self, transaction: TransactionData) -> Optional[RecommendationResponse]:
        if not self.pipeline:
            return None

        feature_text = self._build_feature_text(transaction.description, transaction.amount)
        probabilities = self.pipeline.predict_proba([feature_text])[0]
        best_index = int(probabilities.argmax())
        category = str(self.pipeline.classes_[best_index])
        confidence = float(probabilities[best_index])

        base_message = CATEGORY_RECOMMENDATIONS.get(
            category,
            "Revisa este movimiento y evalúa si se ajusta a tus objetivos financieros.",
        )

        reasoning = self.metadata.get(
            "features_description",
            "Clasificación automática basada en texto y monto",
        )

        return RecommendationResponse(
            recommendation=base_message,
            confidence=confidence,
            category=category,
            reasoning=reasoning,
            source="model",
        )


engine = RecommendationEngine()

app = FastAPI(
    title="SalomónAI - Recommendation Engine",
    description="Motor de recomendaciones financieras inteligentes",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _heuristic_recommendation(transaction: TransactionData) -> RecommendationResponse:
    if transaction.amount > 1000:
        recommendation = "Considera revisar este gasto alto. ¿Es realmente necesario?"
        confidence = 0.55
        reasoning = "Heurística de control por monto elevado"
    elif transaction.category.lower() in ["entretenimiento", "restaurante"]:
        recommendation = "Podrías ahorrar cocinando en casa o buscando alternativas más económicas"
        confidence = 0.5
        reasoning = "Heurística por categoría discrecional"
    else:
        recommendation = "Transacción normal. Continúa con tus buenos hábitos financieros"
        confidence = 0.4
        reasoning = "Heurística genérica"

    return RecommendationResponse(
        recommendation=recommendation,
        confidence=confidence,
        category=transaction.category,
        reasoning=reasoning,
        source="heuristic",
    )


@app.get("/", response_model=dict)
async def root():
    return {
        "message": "SalomónAI Recommendation Engine",
        "status": "active",
        "version": "1.1.0",
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        service="recommendation-engine",
        version="1.1.0",
        model_ready=engine.pipeline is not None,
        model_version=str(engine.metadata.get("created_at")) if engine.metadata else None,
        categories=sorted(CATEGORY_RECOMMENDATIONS.keys()),
    )


@app.post("/recommendations", response_model=RecommendationResponse)
async def generate_recommendation(transaction: TransactionData):
    try:
        model_result = engine.predict(transaction)
        if model_result:
            return model_result
        return _heuristic_recommendation(transaction)
    except Exception as e:  # pragma: no cover - FastAPI converts to HTTP errors
        raise HTTPException(status_code=500, detail=f"Error generando recomendación: {str(e)}")


@app.get("/recommendations/categories", response_model=List[str])
async def get_supported_categories():
    return sorted(CATEGORY_RECOMMENDATIONS.keys())


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
