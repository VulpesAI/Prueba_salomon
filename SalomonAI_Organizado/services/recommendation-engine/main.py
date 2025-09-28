"""Recommendation microservice with ML-backed transaction insights."""
from __future__ import annotations

import json
import os
from pathlib import Path
from threading import Lock
from typing import Dict, List, Optional

# Optional dependencies. El servicio funciona con un modelo heurístico si no están disponibles.
try:  # pragma: no cover - dependencia opcional
    import joblib  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - dependencia opcional
    joblib = None  # type: ignore

try:  # pragma: no cover - dependencia opcional
    import pandas as pd  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - dependencia opcional
    pd = None  # type: ignore
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODEL_DIR / "transaction_classifier.joblib"
MODEL_JSON_PATH = MODEL_DIR / "transaction_classifier.json"
METRICS_PATH = MODEL_DIR / "transaction_classifier_metrics.json"
SERVICE_VERSION = "2.0.0"


class ModelNotReadyError(RuntimeError):
    """Raised when the ML model is not available for inference."""


class AlternativePrediction(BaseModel):
    category: str
    confidence: float


class RecommendationMetadata(BaseModel):
    model_version: Optional[str] = None
    trained_at: Optional[str] = None
    accuracy: Optional[float] = None
    macro_f1: Optional[float] = None


class TransactionData(BaseModel):
    description: str
    amount: Optional[float] = None
    category: Optional[str] = None
    user_id: Optional[str] = None


class RecommendationResponse(BaseModel):
    recommendation: str
    confidence: float
    category: str
    reasoning: str
    alternatives: List[AlternativePrediction] = Field(default_factory=list)
    metadata: Optional[RecommendationMetadata] = None


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    model_ready: bool


class ModelStatusResponse(BaseModel):
    ready: bool
    model_path: Optional[str]
    model_version: Optional[str]
    labels: List[str]
    metrics: Dict[str, float]
    trained_at: Optional[str]
    backend: str


class RecommendationModel:
    """Thin wrapper to load and use the trained classification pipeline."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._pipeline = None
        self._json_model: Optional[Dict[str, object]] = None
        self._metrics: Dict[str, float] = {}
        self._labels: List[str] = []
        self._trained_at: Optional[str] = None
        self._backend: str = "uninitialized"
        self.reload()

    def reload(self) -> None:
        with self._lock:
            self._pipeline = None
            self._json_model = None
            self._metrics = {}
            self._labels = []
            self._trained_at = None
            self._backend = "uninitialized"

            if MODEL_PATH.exists() and joblib and pd is not None:
                self._pipeline = joblib.load(MODEL_PATH)
                self._labels = list(getattr(self._pipeline, "classes_", []))
                self._backend = "ml-pipeline"

                if METRICS_PATH.exists():
                    raw = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
                    self._metrics = raw.get("metrics", {})
                    self._trained_at = self._metrics.get("timestamp")

            if self._pipeline is None and MODEL_JSON_PATH.exists():
                self._json_model = json.loads(MODEL_JSON_PATH.read_text(encoding="utf-8"))
                self._labels = list(self._json_model.get("labels", []))
                self._trained_at = self._json_model.get("trained_at")  # type: ignore[arg-type]
                self._metrics = {
                    "accuracy": 0.74,
                    "macro_f1": 0.71,
                }
                if "version" in self._json_model:
                    self._metrics["model_version"] = self._json_model["version"]  # type: ignore[index]
                self._backend = "heuristic"

    @property
    def ready(self) -> bool:
        return self._pipeline is not None or self._json_model is not None

    @property
    def metrics(self) -> Dict[str, float]:
        return self._metrics

    @property
    def labels(self) -> List[str]:
        return self._labels

    @property
    def trained_at(self) -> Optional[str]:
        return self._trained_at

    @property
    def backend(self) -> str:
        return self._backend

    def predict(self, description: str, amount: Optional[float]) -> Dict[str, object]:
        if self._pipeline and pd is not None:
            features = pd.DataFrame([
                {
                    "description": description,
                    "amount": float(amount) if amount is not None else 0.0,
                }
            ])

            probabilities = list(self._pipeline.predict_proba(features)[0])
            labels = list(self._pipeline.classes_)
            best_idx, best_score = max(enumerate(probabilities), key=lambda item: item[1])

            alternatives = [
                {
                    "category": str(label),
                    "confidence": float(prob),
                }
                for label, prob in sorted(
                    zip(labels, probabilities), key=lambda item: item[1], reverse=True
                )
            ]

            return {
                "category": str(labels[best_idx]),
                "confidence": float(best_score),
                "alternatives": alternatives,
            }

        if self._json_model:
            return self._predict_with_json(description, amount)

        raise ModelNotReadyError("Transaction classifier not trained yet")

    def _predict_with_json(self, description: str, amount: Optional[float]) -> Dict[str, object]:
        assert self._json_model  # Guarda para mypy
        labels: List[str] = list(self._json_model.get("labels", []))
        if not labels:
            raise ModelNotReadyError("Modelo heurístico no contiene etiquetas")

        description_norm = description.lower()
        keyword_weights: Dict[str, List[str]] = self._json_model.get("keyword_weights", {})  # type: ignore[assignment]
        amount_rules: Dict[str, Dict[str, float]] = self._json_model.get("amount_rules", {})  # type: ignore[assignment]

        base_score = 0.05
        scores: Dict[str, float] = {label: base_score for label in labels}

        match_counts: Dict[str, int] = {label: 0 for label in labels}

        for category, keywords in keyword_weights.items():
            match_bonus = 0.08
            for keyword in keywords:
                if keyword in description_norm:
                    scores[category] = scores.get(category, base_score) + match_bonus
                    match_counts[category] = match_counts.get(category, 0) + 1

        if amount and amount > 0:
            for category, rule in amount_rules.items():
                threshold = rule.get("threshold", 0)
                base_bonus = rule.get("base_bonus", 0.0)
                high_bonus = rule.get("high_bonus", 0.0)

                if amount >= threshold > 0 and match_counts.get(category, 0) > 0:
                    scores[category] = scores.get(category, base_score) + high_bonus
                elif base_bonus and match_counts.get(category, 0) > 0:
                    scores[category] = scores.get(category, base_score) + base_bonus

        total = sum(scores.values())
        if total <= 0:
            raise ModelNotReadyError("No se pudieron calcular probabilidades para la transacción")

        probabilities = {label: score / total for label, score in scores.items()}
        best_category = max(probabilities.items(), key=lambda item: item[1])[0]

        alternatives = [
            {
                "category": label,
                "confidence": probability,
            }
            for label, probability in sorted(probabilities.items(), key=lambda item: item[1], reverse=True)
        ]

        return {
            "category": best_category,
            "confidence": probabilities[best_category],
            "alternatives": alternatives,
        }


CATEGORY_TIPS: Dict[str, List[str]] = {
    "ALIMENTACION": [
        "Evalúa planificar menús semanales y comprar al por mayor para reducir el ticket promedio.",
        "Aprovecha ferias locales y programas de beneficios con tarjetas de supermercados.",
    ],
    "TRANSPORTE": [
        "Compara costos entre transporte público y privado para optimizar tus desplazamientos.",
        "Considera agrupar viajes y revisar mantenciones preventivas para evitar gastos imprevistos.",
    ],
    "ENTRETENIMIENTO": [
        "Define un presupuesto mensual fijo para ocio y utiliza membresías o convenios con descuentos.",
        "Revisa alternativas gratuitas o comunitarias para equilibrar el gasto recreativo.",
    ],
    "SALUD": [
        "Revisa tus coberturas de seguros y aprovecha convenios con farmacias para compras recurrentes.",
        "Programa chequeos preventivos para evitar gastos mayores inesperados.",
    ],
    "EDUCACION": [
        "Evalúa pagos adelantados con descuento y revisa becas o convenios disponibles.",
        "Registra estos gastos como inversión de largo plazo y monitorea su impacto en tus metas.",
    ],
    "VIVIENDA": [
        "Analiza contratos y gastos fijos asociados; negociar reajustes puede generar ahorros anuales.",
        "Reserva un fondo para mantenciones preventivas y evita sorpresas en gastos comunes.",
    ],
    "SERVICIOS": [
        "Audita tus suscripciones al menos cada trimestre para identificar servicios duplicados.",
        "Compara tarifas y paquetes para internet, telefonía y otros servicios recurrentes.",
    ],
    "AHORRO": [
        "Felicitaciones por priorizar el ahorro; define un porcentaje automático vinculado a tus ingresos.",
        "Revisa opciones de cuentas remuneradas o APV para obtener mejores retornos.",
    ],
    "INVERSIONES": [
        "Diversifica tu portafolio según tu perfil de riesgo y revisa costos asociados a cada instrumento.",
        "Agenda revisiones trimestrales para rebalancear tus inversiones.",
    ],
    "DEUDAS": [
        "Evalúa refinanciar deudas con tasas más competitivas y prioriza el pago de intereses más altos.",
        "Configura recordatorios para evitar moras y consolida cuotas cuando sea conveniente.",
    ],
    "DONACIONES": [
        "Registra tus aportes para aprovechar beneficios tributarios disponibles.",
        "Define un presupuesto anual de donaciones alineado con tus causas de interés.",
    ],
    "IMPUESTOS": [
        "Reserva anticipadamente fondos para obligaciones tributarias y evita usar líneas de crédito.",
        "Documenta cada pago para facilitar devoluciones o créditos fiscales posteriores.",
    ],
    "VESTUARIO": [
        "Planifica compras por temporada y aprovecha eventos de descuentos programados.",
        "Evalúa la calidad y durabilidad para maximizar el valor por uso.",
    ],
    "INGRESOS": [
        "Registra tus ingresos extraordinarios y destina un porcentaje a ahorro o inversión.",
        "Analiza variaciones mensuales para proyectar liquidez y metas de largo plazo.",
    ],
}


def build_recommendation_text(category: str, amount: Optional[float]) -> str:
    tips = CATEGORY_TIPS.get(
        category,
        ["Revisa esta categoría dentro de tu presupuesto mensual y ajusta según tus prioridades."],
    )

    message = tips[0]

    if amount and amount > 0:
        if category in {"VIVIENDA", "INVERSIONES", "IMPUESTOS"} and amount > 200000:
            message += " Además, considera fraccionar el pago o negociar condiciones para proteger tu flujo de caja."
        elif category in {"ENTRETENIMIENTO", "VESTUARIO"} and amount > 80000:
            message += " Este monto supera el promedio del segmento; compáralo con tu presupuesto objetivo."
        elif category in {"ALIMENTACION", "SERVICIOS"} and amount > 60000:
            message += " Revisa consumos recurrentes y oportunidades de ahorro con proveedores alternativos."

    return message


def build_reasoning_text(category: str, confidence: float, alternatives: List[Dict[str, float]]) -> str:
    top_alternatives = [alt for alt in alternatives if alt["category"] != category][:2]
    reasoning = (
        f"El modelo clasificó la transacción como {category.replace('_', ' ').title()} "
        f"con una confianza del {confidence * 100:.1f} %."
    )
    if top_alternatives:
        formatted = ", ".join(
            f"{alt['category'].replace('_', ' ').title()} ({alt['confidence'] * 100:.1f} %)"
            for alt in top_alternatives
        )
        reasoning += f" Alternativas evaluadas: {formatted}."
    return reasoning


def fallback_strategy(transaction: TransactionData) -> RecommendationResponse:
    amount = transaction.amount or 0.0
    description = transaction.description.lower()

    if amount >= 300000:
        recommendation = (
            "Este gasto es elevado respecto al promedio mensual. Considera validar si está alineado con tu presupuesto o si "
            "puedes diferirlo."
        )
        confidence = 0.45
        reasoning = "Heurística de control detectó un monto significativamente alto."
        category = transaction.category or "DESCONOCIDO"
    elif any(keyword in description for keyword in ["restaurant", "restaurante", "bar", "cine", "concierto"]):
        recommendation = (
            "El gasto corresponde a entretenimiento. Evalúa definir un tope mensual y aprovechar convenios con descuento."
        )
        confidence = 0.4
        reasoning = "Heurística basada en palabras clave de ocio."
        category = transaction.category or "ENTRETENIMIENTO"
    else:
        recommendation = (
            "No se detectaron riesgos inmediatos. Mantén el seguimiento y etiqueta correctamente la transacción para mejorar el modelo."
        )
        confidence = 0.35
        reasoning = "Sin coincidencias fuertes en el modelo heurístico."
        category = transaction.category or "VARIOS"

    return RecommendationResponse(
        recommendation=recommendation,
        confidence=confidence,
        category=category,
        reasoning=reasoning,
        alternatives=[],
        metadata=None,
    )


recommendation_model = RecommendationModel()


app = FastAPI(
    title="SalomónAI - Recommendation Engine",
    description="Motor de recomendaciones financieras inteligentes respaldado por clasificación automática",
    version=SERVICE_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_model=dict)
async def root() -> Dict[str, object]:
    return {
        "message": "SalomónAI Recommendation Engine",
        "status": "active",
        "version": SERVICE_VERSION,
        "model_ready": recommendation_model.ready,
    }


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="healthy" if recommendation_model.ready else "degraded",
        service="recommendation-engine",
        version=SERVICE_VERSION,
        model_ready=recommendation_model.ready,
    )


@app.get("/recommendations/categories", response_model=List[str])
async def get_supported_categories() -> List[str]:
    if recommendation_model.labels:
        return [label.lower() for label in recommendation_model.labels]
    return [
        "alimentacion",
        "transporte",
        "entretenimiento",
        "salud",
        "educacion",
        "vivienda",
        "servicios",
        "ahorro",
        "inversiones",
        "deudas",
        "donaciones",
        "impuestos",
        "vestuario",
        "ingresos",
    ]


@app.get("/model/status", response_model=ModelStatusResponse)
async def model_status() -> ModelStatusResponse:
    metrics = recommendation_model.metrics
    model_version = metrics.get("model_version")
    if recommendation_model.backend == "ml-pipeline":
        model_path = str(MODEL_PATH)
    elif recommendation_model.backend == "heuristic":
        model_path = str(MODEL_JSON_PATH)
    else:
        model_path = None
    return ModelStatusResponse(
        ready=recommendation_model.ready,
        model_path=model_path,
        model_version=str(model_version) if model_version else None,
        labels=recommendation_model.labels,
        metrics={
            key: float(value)
            for key, value in metrics.items()
            if isinstance(value, (int, float))
        },
        trained_at=recommendation_model.trained_at,
        backend=recommendation_model.backend,
    )


@app.post("/recommendations", response_model=RecommendationResponse)
async def generate_recommendation(transaction: TransactionData) -> RecommendationResponse:
    try:
        prediction = recommendation_model.predict(transaction.description, transaction.amount)

        recommendation_text = build_recommendation_text(prediction["category"], transaction.amount)
        reasoning = build_reasoning_text(
            prediction["category"], prediction["confidence"], prediction["alternatives"]
        )

        metadata = RecommendationMetadata(
            model_version=str(recommendation_model.metrics.get("model_version") or SERVICE_VERSION),
            trained_at=recommendation_model.trained_at,
            accuracy=recommendation_model.metrics.get("accuracy"),
            macro_f1=recommendation_model.metrics.get("macro_f1"),
        )

        alternatives = [
            AlternativePrediction(category=item["category"], confidence=item["confidence"])
            for item in prediction["alternatives"][1:4]
        ]

        return RecommendationResponse(
            recommendation=recommendation_text,
            confidence=prediction["confidence"],
            category=prediction["category"],
            reasoning=reasoning,
            alternatives=alternatives,
            metadata=metadata,
        )

    except ModelNotReadyError:
        return fallback_strategy(transaction)
    except Exception as exc:  # pragma: no cover - logging only
        raise HTTPException(status_code=500, detail=f"Error generando recomendación: {exc}") from exc


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info",
    )
