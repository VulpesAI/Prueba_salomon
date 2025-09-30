import asyncio
import json
import logging
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

import httpx
import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from sklearn.cluster import KMeans

from .settings import get_settings

settings = get_settings()
logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
logger = logging.getLogger("recommendation-engine")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def parse_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None


@dataclass
class UserFeatures:
    user_id: str
    total_income: float
    total_expenses: float
    net_cash_flow: float
    average_transaction: float
    discretionary_ratio: float
    essential_ratio: float
    top_category: Optional[str]
    category_totals: Dict[str, float]
    transaction_count: int
    last_transaction_at: Optional[datetime]
    updated_at: datetime


@dataclass
class RecommendationRecord:
    id: str
    user_id: str
    title: str
    description: str
    score: float
    category: str
    explanation: str
    generated_at: datetime
    cluster: Optional[int] = None


@dataclass
class FeedbackEntry:
    recommendation_id: str
    user_id: str
    score: float
    comment: Optional[str]
    created_at: datetime


class FeatureBuilder:
    """Transforma transacciones en features agregadas por usuario."""

    discretionary_categories = {
        "entretenimiento",
        "restaurante",
        "restaurantes",
        "viajes",
        "shopping",
        "ocio",
        "suscripciones",
        "moda",
        "regalos",
    }

    def build(self, transactions: List[Dict[str, Any]]) -> List[UserFeatures]:
        grouped: Dict[str, Dict[str, Any]] = defaultdict(
            lambda: {
                "income": 0.0,
                "expenses": 0.0,
                "count": 0,
                "discretionary": 0.0,
                "essential": 0.0,
                "category_totals": defaultdict(float),
                "last_transaction_at": None,
            }
        )

        for tx in transactions:
            user_id = tx.get("user_id") or tx.get("userId")
            if not user_id:
                continue

            try:
                amount = float(tx.get("amount", 0))
            except (TypeError, ValueError):
                logger.debug("Transacción inválida, se omite: %s", tx)
                continue

            raw_category = (tx.get("category") or tx.get("subcategory") or "otros").lower()
            category = raw_category.replace(" ", "_")
            timestamp = parse_datetime(tx.get("timestamp") or tx.get("transaction_date") or tx.get("transactionDate"))

            stats = grouped[user_id]
            stats["count"] += 1

            if amount >= 0:
                stats["income"] += amount
            else:
                expense = abs(amount)
                stats["expenses"] += expense
                stats["category_totals"][category] += expense
                if category in self.discretionary_categories:
                    stats["discretionary"] += expense
                else:
                    stats["essential"] += expense

            if timestamp:
                previous = stats["last_transaction_at"]
                stats["last_transaction_at"] = max(timestamp, previous) if previous else timestamp

        now = utcnow()
        features: List[UserFeatures] = []
        for user_id, stats in grouped.items():
            total_expenses = stats["expenses"]
            total_income = stats["income"]
            count = max(stats["count"], 1)
            average_transaction = (total_income + total_expenses) / count
            discretionary_ratio = stats["discretionary"] / total_expenses if total_expenses > 0 else 0.0
            essential_ratio = stats["essential"] / total_expenses if total_expenses > 0 else 0.0
            category_totals = dict(sorted(stats["category_totals"].items(), key=lambda item: item[1], reverse=True))
            top_category = next(iter(category_totals.keys()), None)

            features.append(
                UserFeatures(
                    user_id=user_id,
                    total_income=round(total_income, 2),
                    total_expenses=round(total_expenses, 2),
                    net_cash_flow=round(total_income - total_expenses, 2),
                    average_transaction=round(average_transaction, 2),
                    discretionary_ratio=round(discretionary_ratio, 4),
                    essential_ratio=round(essential_ratio, 4),
                    top_category=top_category,
                    category_totals=category_totals,
                    transaction_count=stats["count"],
                    last_transaction_at=stats["last_transaction_at"],
                    updated_at=now,
                )
            )

        return features


class FeatureStore:
    def __init__(self) -> None:
        self._features: Dict[str, UserFeatures] = {}
        self._lock = asyncio.Lock()

    async def bulk_upsert(self, features: List[UserFeatures]) -> None:
        async with self._lock:
            for feature in features:
                self._features[feature.user_id] = feature

    async def get(self, user_id: str) -> Optional[UserFeatures]:
        async with self._lock:
            return self._features.get(user_id)

    async def get_all(self) -> List[UserFeatures]:
        async with self._lock:
            return list(self._features.values())

    async def snapshot(self) -> Dict[str, UserFeatures]:
        async with self._lock:
            return dict(self._features)


class RecommendationStore:
    def __init__(self, history_limit: int = 50) -> None:
        self._latest: Dict[str, List[RecommendationRecord]] = {}
        self._history: Dict[str, List[RecommendationRecord]] = {}
        self._feedback: Dict[str, List[FeedbackEntry]] = {}
        self._history_limit = history_limit
        self._lock = asyncio.Lock()

    async def save(self, user_id: str, recommendations: List[RecommendationRecord]) -> None:
        async with self._lock:
            self._latest[user_id] = recommendations
            history = self._history.setdefault(user_id, [])
            history.extend(recommendations)
            if len(history) > self._history_limit:
                self._history[user_id] = history[-self._history_limit :]

    async def get_latest(self, user_id: str) -> List[RecommendationRecord]:
        async with self._lock:
            return list(self._latest.get(user_id, []))

    async def get_history(self, user_id: str) -> List[RecommendationRecord]:
        async with self._lock:
            return list(self._history.get(user_id, []))

    async def add_feedback(self, feedback: FeedbackEntry) -> None:
        async with self._lock:
            self._feedback.setdefault(feedback.user_id, []).append(feedback)

    async def get_feedback(self, user_id: str) -> List[FeedbackEntry]:
        async with self._lock:
            return list(self._feedback.get(user_id, []))


class RecommendationModelManager:
    def __init__(self, n_clusters: int = 4) -> None:
        self.n_clusters = n_clusters
        self.model: Optional[KMeans] = None
        self.user_labels: Dict[str, int] = {}
        self.cluster_profiles: Dict[int, Dict[str, float]] = {}
        self.last_trained_at: Optional[datetime] = None

    def train(self, features: List[UserFeatures]) -> None:
        if not features:
            self.model = None
            self.user_labels = {}
            self.cluster_profiles = {}
            self.last_trained_at = None
            return

        matrix = np.array(
            [
                [
                    feature.total_income,
                    feature.total_expenses,
                    feature.discretionary_ratio,
                    feature.average_transaction,
                    feature.net_cash_flow,
                ]
                for feature in features
            ],
            dtype=float,
        )

        if matrix.shape[0] == 1:
            self.model = None
            self.user_labels = {features[0].user_id: 0}
            self.cluster_profiles = {
                0: {
                    "avg_income": features[0].total_income,
                    "avg_expenses": features[0].total_expenses,
                    "avg_discretionary_ratio": features[0].discretionary_ratio,
                    "avg_cash_flow": features[0].net_cash_flow,
                }
            }
            self.last_trained_at = utcnow()
            return

        cluster_count = min(self.n_clusters, matrix.shape[0])
        model = KMeans(n_clusters=cluster_count, n_init="auto", random_state=42)
        labels = model.fit_predict(matrix)

        self.model = model
        self.user_labels = {feature.user_id: int(label) for feature, label in zip(features, labels)}
        self.cluster_profiles = self._build_cluster_profiles(features, labels)
        self.last_trained_at = utcnow()

    def _build_cluster_profiles(self, features: List[UserFeatures], labels: np.ndarray) -> Dict[int, Dict[str, float]]:
        clusters: Dict[int, Dict[str, Any]] = defaultdict(lambda: {
            "income": [],
            "expenses": [],
            "discretionary": [],
            "cash_flow": [],
        })

        for feature, label in zip(features, labels):
            cluster = clusters[int(label)]
            cluster["income"].append(feature.total_income)
            cluster["expenses"].append(feature.total_expenses)
            cluster["discretionary"].append(feature.discretionary_ratio)
            cluster["cash_flow"].append(feature.net_cash_flow)

        profiles: Dict[int, Dict[str, float]] = {}
        for label, stats in clusters.items():
            profiles[label] = {
                "avg_income": float(np.mean(stats["income"]) if stats["income"] else 0.0),
                "avg_expenses": float(np.mean(stats["expenses"]) if stats["expenses"] else 0.0),
                "avg_discretionary_ratio": float(np.mean(stats["discretionary"]) if stats["discretionary"] else 0.0),
                "avg_cash_flow": float(np.mean(stats["cash_flow"]) if stats["cash_flow"] else 0.0),
            }
        return profiles

    def get_cluster(self, user_id: str) -> Optional[int]:
        return self.user_labels.get(user_id)

    def generate_recommendations(self, features: UserFeatures) -> List[RecommendationRecord]:
        recommendations: List[RecommendationRecord] = []
        cluster = self.get_cluster(features.user_id)
        generated_at = utcnow()

        if features.total_expenses > features.total_income:
            over_budget = features.total_expenses - features.total_income
            expense_ratio = features.total_expenses / (features.total_income + 1e-6)
            recommendations.append(
                RecommendationRecord(
                    id=str(uuid4()),
                    user_id=features.user_id,
                    title="Controla tus gastos este mes",
                    description="Tus gastos superan a tus ingresos. Define un presupuesto semanal y congela compras innecesarias.",
                    score=min(1.0, round(expense_ratio, 2)),
                    category="control-de-gastos",
                    explanation=f"Estás gastando {expense_ratio:.2f} veces tus ingresos mensuales, con un exceso de {over_budget:,.0f}.",
                    generated_at=generated_at,
                    cluster=cluster,
                )
            )

        if features.discretionary_ratio > 0.3 and features.total_expenses > 0:
            recommendations.append(
                RecommendationRecord(
                    id=str(uuid4()),
                    user_id=features.user_id,
                    title="Reduce gastos discrecionales",
                    description="Establece límites para entretenimiento y servicios no esenciales por las próximas 4 semanas.",
                    score=min(1.0, round(features.discretionary_ratio / 0.3, 2)),
                    category="gasto-discrecional",
                    explanation=f"El {features.discretionary_ratio * 100:.1f}% de tus gastos son discrecionales.",
                    generated_at=generated_at,
                    cluster=cluster,
                )
            )

        if features.top_category and features.total_expenses > 0:
            top_value = features.category_totals.get(features.top_category, 0.0)
            share = top_value / features.total_expenses if features.total_expenses else 0.0
            if share > 0.25:
                recommendations.append(
                    RecommendationRecord(
                        id=str(uuid4()),
                        user_id=features.user_id,
                        title=f"Optimiza tus gastos en {features.top_category}",
                        description="Negocia precios o busca alternativas más económicas en tu categoría de mayor gasto.",
                        score=min(1.0, round(share / 0.25, 2)),
                        category="categoria-prioritaria",
                        explanation=f"La categoría {features.top_category} representa el {share * 100:.1f}% de tus gastos.",
                        generated_at=generated_at,
                        cluster=cluster,
                    )
                )

        if features.net_cash_flow > 0 and features.total_income > 0:
            savings_rate = features.net_cash_flow / (features.total_income + 1e-6)
            recommendations.append(
                RecommendationRecord(
                    id=str(uuid4()),
                    user_id=features.user_id,
                    title="Destina el excedente a tus metas",
                    description="Automatiza transferencias a ahorros o inversiones para consolidar tu superávit mensual.",
                    score=min(1.0, round(max(savings_rate, 0.15), 2)),
                    category="ahorro-inversion",
                    explanation=f"Tu flujo neto positivo es de {features.net_cash_flow:,.0f}, equivalente al {savings_rate * 100:.1f}% de tus ingresos.",
                    generated_at=generated_at,
                    cluster=cluster,
                )
            )
        elif features.net_cash_flow < 0:
            deficit = abs(features.net_cash_flow)
            recommendations.append(
                RecommendationRecord(
                    id=str(uuid4()),
                    user_id=features.user_id,
                    title="Ajusta tu flujo de caja",
                    description="Reduce gastos fijos y pospone compras grandes para recuperar flujo positivo.",
                    score=min(1.0, round(deficit / (features.total_income + 1e-6), 2) + 0.2),
                    category="flujo-caja",
                    explanation=f"Tu flujo neto es negativo en {deficit:,.0f} este período.",
                    generated_at=generated_at,
                    cluster=cluster,
                )
            )

        if cluster is not None:
            profile = self.cluster_profiles.get(cluster)
            if profile and features.net_cash_flow < profile.get("avg_cash_flow", 0):
                delta = profile.get("avg_cash_flow", 0) - features.net_cash_flow
                recommendations.append(
                    RecommendationRecord(
                        id=str(uuid4()),
                        user_id=features.user_id,
                        title="Aprende de tu grupo financiero",
                        description="Compara tus hábitos con usuarios similares y replica estrategias de ahorro efectivas.",
                        score=min(1.0, round(delta / (abs(profile.get("avg_cash_flow", 1)) + 1e-6), 2) + 0.1),
                        category="benchmarking",
                        explanation="Tu flujo neto está por debajo del promedio de tu clúster de comportamiento.",
                        generated_at=generated_at,
                        cluster=cluster,
                    )
                )

        if not recommendations:
            recommendations.append(
                RecommendationRecord(
                    id=str(uuid4()),
                    user_id=features.user_id,
                    title="Sigue consolidando tus finanzas",
                    description="Mantén tus hábitos, revisa tus metas y reserva un porcentaje fijo de tus ingresos.",
                    score=0.35,
                    category="buenas-practicas",
                    explanation="No se detectaron desviaciones relevantes en tu comportamiento reciente.",
                    generated_at=generated_at,
                    cluster=cluster,
                )
            )

        recommendations.sort(key=lambda rec: rec.score, reverse=True)
        return recommendations


class TransactionFetcher:
    def __init__(
        self,
        mode: str,
        api_url: Optional[str],
        kafka_bootstrap: Optional[str],
        kafka_topic: Optional[str],
        timeout: float = 15.0,
        kafka_batch_size: int = 500,
    ) -> None:
        self.mode = mode
        self.api_url = api_url
        self.kafka_bootstrap = kafka_bootstrap
        self.kafka_topic = kafka_topic
        self.timeout = timeout
        self.kafka_batch_size = kafka_batch_size

    async def fetch_transactions(self) -> List[Dict[str, Any]]:
        if self.mode == "kafka":
            return await self._consume_from_kafka()
        return await self._fetch_from_api()

    async def _fetch_from_api(self) -> List[Dict[str, Any]]:
        if not self.api_url:
            logger.warning("FINANCIAL_MOVEMENTS_API_URL no configurado; se retorna lista vacía")
            return []

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.api_url)
                response.raise_for_status()
                payload = response.json()
        except httpx.HTTPError as error:
            logger.error("Error al consultar API de movimientos: %s", error)
            return []

        transactions: List[Dict[str, Any]]
        if isinstance(payload, list):
            transactions = payload
        elif isinstance(payload, dict):
            data = payload.get("data") or payload.get("transactions") or []
            if isinstance(data, list):
                transactions = data
            else:
                transactions = []
        else:
            transactions = []

        if not transactions:
            logger.info("API de movimientos respondió sin datos")
        return transactions

    async def _consume_from_kafka(self) -> List[Dict[str, Any]]:
        try:
            from aiokafka import AIOKafkaConsumer  # type: ignore
        except ImportError:
            logger.error("aiokafka no está instalado; cambia PIPELINE_MODE=api para usar HTTP")
            return []

        if not self.kafka_bootstrap or not self.kafka_topic:
            logger.error("Configuración de Kafka incompleta; se omite consumo")
            return []

        consumer = AIOKafkaConsumer(
            self.kafka_topic,
            bootstrap_servers=self.kafka_bootstrap,
            auto_offset_reset="latest",
            enable_auto_commit=False,
            value_deserializer=lambda value: json.loads(value.decode("utf-8")),
        )

        await consumer.start()
        try:
            result: List[Dict[str, Any]] = []
            message_map = await consumer.getmany(timeout_ms=2000, max_records=self.kafka_batch_size)
            for _, records in message_map.items():
                for record in records:
                    payload = record.value
                    if isinstance(payload, dict):
                        result.append(payload)
            await consumer.commit()
            if result:
                logger.info("Consumidas %s transacciones desde Kafka", len(result))
            return result
        finally:
            await consumer.stop()


class RecommendationPipeline:
    def __init__(
        self,
        fetcher: TransactionFetcher,
        builder: FeatureBuilder,
        store: FeatureStore,
        model_manager: RecommendationModelManager,
        interval_seconds: int = 300,
    ) -> None:
        self.fetcher = fetcher
        self.builder = builder
        self.store = store
        self.model_manager = model_manager
        self.interval_seconds = interval_seconds
        self._task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()
        self._last_run: Optional[datetime] = None
        self._last_summary: Optional[Dict[str, Any]] = None

    async def start(self) -> None:
        if self._task is None:
            self._task = asyncio.create_task(self._schedule_loop())

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def run_once(self) -> Dict[str, Any]:
        async with self._lock:
            transactions = await self.fetcher.fetch_transactions()
            features = self.builder.build(transactions)
            await self.store.bulk_upsert(features)
            all_features = await self.store.get_all()
            self.model_manager.train(all_features)
            summary = {
                "transactions": len(transactions),
                "features_updated": len(features),
                "users_tracked": len(all_features),
            }
            self._last_run = utcnow()
            self._last_summary = summary
            logger.info("Pipeline ejecutado: %s", summary)
            return summary

    async def _schedule_loop(self) -> None:
        logger.info("Iniciando loop del pipeline con intervalo %ss", self.interval_seconds)
        try:
            while True:
                try:
                    await self.run_once()
                except Exception as error:  # pylint: disable=broad-except
                    logger.exception("Error en pipeline de recomendaciones: %s", error)
                await asyncio.sleep(self.interval_seconds)
        except asyncio.CancelledError:
            logger.info("Loop del pipeline detenido")
            raise

    def status(self) -> Dict[str, Any]:
        return {
            "mode": self.fetcher.mode,
            "interval_seconds": self.interval_seconds,
            "last_run": self._last_run.isoformat() if self._last_run else None,
            "last_summary": self._last_summary,
            "trained_at": self.model_manager.last_trained_at.isoformat() if self.model_manager.last_trained_at else None,
        }


class TransactionData(BaseModel):
    amount: float
    category: str
    description: str
    user_id: str = Field(..., alias="userId")


class RecommendationItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    description: str
    score: float
    category: str
    explanation: str
    generated_at: datetime = Field(..., alias="generatedAt")
    cluster: Optional[int] = None


class UserFeatureSummary(BaseModel):
    total_income: float
    total_expenses: float
    net_cash_flow: float
    average_transaction: float
    discretionary_ratio: float
    essential_ratio: float
    top_category: Optional[str]
    transaction_count: int
    last_transaction_at: Optional[datetime]


class PersonalizedRecommendationsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(..., alias="userId")
    generated_at: datetime = Field(..., alias="generatedAt")
    recommendations: List[RecommendationItem]
    feature_summary: UserFeatureSummary = Field(..., alias="featureSummary")


class FeedbackRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    recommendation_id: str = Field(..., alias="recommendationId")
    user_id: Optional[str] = Field(None, alias="userId")
    score: float = Field(..., ge=0.0, le=1.0)
    comment: Optional[str] = Field(None, max_length=500)


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: str
    submitted_at: datetime = Field(..., alias="submittedAt")


class PipelineStatusResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    mode: str
    interval_seconds: int = Field(..., alias="intervalSeconds")
    last_run: Optional[str] = Field(None, alias="lastRun")
    last_summary: Optional[Dict[str, Any]] = Field(None, alias="lastSummary")
    trained_at: Optional[str] = Field(None, alias="trainedAt")


app = FastAPI(
    title="SalomónAI - Recommendation Engine",
    description="Motor de recomendaciones financieras inteligentes",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


pipeline_mode = settings.pipeline_mode.lower()
financial_movements_url = settings.financial_movements_api_url
kafka_bootstrap = settings.kafka_bootstrap_servers
kafka_topic = settings.kafka_transactions_topic
pipeline_interval = settings.pipeline_refresh_seconds

feature_builder = FeatureBuilder()
feature_store = FeatureStore()
recommendation_store = RecommendationStore()
model_manager = RecommendationModelManager(n_clusters=settings.pipeline_cluster_count)
transaction_fetcher = TransactionFetcher(
    mode=pipeline_mode,
    api_url=financial_movements_url,
    kafka_bootstrap=kafka_bootstrap,
    kafka_topic=kafka_topic,
    timeout=settings.pipeline_api_timeout,
    kafka_batch_size=settings.pipeline_kafka_batch,
)
recommendation_pipeline = RecommendationPipeline(
    fetcher=transaction_fetcher,
    builder=feature_builder,
    store=feature_store,
    model_manager=model_manager,
    interval_seconds=pipeline_interval,
)


@app.on_event("startup")
async def startup_event() -> None:
    logger.info("Iniciando servicio Recommendation Engine")
    await recommendation_pipeline.start()


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await recommendation_pipeline.stop()


@app.get("/", response_model=Dict[str, Any])
async def root() -> Dict[str, Any]:
    return {
        "message": "SalomónAI Recommendation Engine",
        "status": "active",
        "version": "2.0.0",
    }


@app.get("/health", response_model=Dict[str, Any])
async def health_check() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "recommendation-engine",
        "version": "2.0.0",
        "pipeline": recommendation_pipeline.status(),
    }


@app.post("/pipeline/run", response_model=PipelineStatusResponse)
async def trigger_pipeline_run() -> PipelineStatusResponse:
    summary = await recommendation_pipeline.run_once()
    status = recommendation_pipeline.status()
    status["last_summary"] = summary
    return PipelineStatusResponse(**status)


@app.get("/pipeline/status", response_model=PipelineStatusResponse)
async def get_pipeline_status() -> PipelineStatusResponse:
    return PipelineStatusResponse(**recommendation_pipeline.status())


@app.get("/features/{user_id}", response_model=UserFeatureSummary)
async def get_user_features(user_id: str) -> UserFeatureSummary:
    features = await feature_store.get(user_id)
    if not features:
        raise HTTPException(status_code=404, detail="No se encontraron features para el usuario")
    return UserFeatureSummary(
        total_income=features.total_income,
        total_expenses=features.total_expenses,
        net_cash_flow=features.net_cash_flow,
        average_transaction=features.average_transaction,
        discretionary_ratio=features.discretionary_ratio,
        essential_ratio=features.essential_ratio,
        top_category=features.top_category,
        transaction_count=features.transaction_count,
        last_transaction_at=features.last_transaction_at,
    )


@app.get("/recommendations/personalized/{user_id}", response_model=PersonalizedRecommendationsResponse)
async def get_personalized_recommendations(
    user_id: str,
    refresh: bool = Query(False, description="Forzar actualización del pipeline antes de responder"),
) -> PersonalizedRecommendationsResponse:
    if refresh:
        await recommendation_pipeline.run_once()

    features = await feature_store.get(user_id)
    if not features:
        logger.info("No se encontraron features para usuario %s, ejecutando pipeline de respaldo", user_id)
        await recommendation_pipeline.run_once()
        features = await feature_store.get(user_id)
        if not features:
            raise HTTPException(status_code=404, detail="No hay transacciones suficientes para generar recomendaciones")

    recommendations = model_manager.generate_recommendations(features)
    await recommendation_store.save(user_id, recommendations)

    response = PersonalizedRecommendationsResponse(
        userId=user_id,
        generatedAt=utcnow(),
        recommendations=[RecommendationItem(**asdict(rec)) for rec in recommendations],
        featureSummary=UserFeatureSummary(
            total_income=features.total_income,
            total_expenses=features.total_expenses,
            net_cash_flow=features.net_cash_flow,
            average_transaction=features.average_transaction,
            discretionary_ratio=features.discretionary_ratio,
            essential_ratio=features.essential_ratio,
            top_category=features.top_category,
            transaction_count=features.transaction_count,
            last_transaction_at=features.last_transaction_at,
        ),
    )
    return response


@app.get("/recommendations/personalized/{user_id}/history", response_model=List[RecommendationItem])
async def get_recommendation_history(user_id: str) -> List[RecommendationItem]:
    history = await recommendation_store.get_history(user_id)
    if not history:
        raise HTTPException(status_code=404, detail="No hay historial de recomendaciones disponible")
    return [RecommendationItem(**asdict(rec)) for rec in history]


@app.get("/recommendations/personalized/{user_id}/feedback", response_model=List[Dict[str, Any]])
async def get_recommendation_feedback(user_id: str) -> List[Dict[str, Any]]:
    feedback_entries = await recommendation_store.get_feedback(user_id)
    if not feedback_entries:
        return []
    return [
        {
            "recommendationId": entry.recommendation_id,
            "score": entry.score,
            "comment": entry.comment,
            "createdAt": entry.created_at,
        }
        for entry in feedback_entries
    ]


@app.post("/recommendations/feedback", response_model=FeedbackResponse)
async def submit_feedback(feedback: FeedbackRequest) -> FeedbackResponse:
    entry = FeedbackEntry(
        recommendation_id=feedback.recommendation_id,
        user_id=feedback.user_id or "anonymous",
        score=feedback.score,
        comment=feedback.comment,
        created_at=utcnow(),
    )
    await recommendation_store.add_feedback(entry)
    return FeedbackResponse(status="received", submittedAt=entry.created_at)


@app.post("/recommendations", response_model=RecommendationItem)
async def generate_recommendation(transaction: TransactionData) -> RecommendationItem:
    """Compatibilidad con versiones anteriores para una recomendación rápida basada en una transacción."""
    features = feature_builder.build(
        [
            {
                "user_id": transaction.user_id,
                "amount": transaction.amount,
                "category": transaction.category,
                "description": transaction.description,
            }
        ]
    )
    if not features:
        raise HTTPException(status_code=400, detail="Transacción inválida")

    recommendation = model_manager.generate_recommendations(features[0])[0]
    await recommendation_store.save(transaction.user_id, [recommendation])
    return RecommendationItem(**asdict(recommendation))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
        log_level="info",
    )
