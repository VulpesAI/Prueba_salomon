"""Training pipeline for the personalised AI engine.

This module orchestrates the initial MVP pipeline that powers the
recommendation engine. It extracts user transactional history from
PostgreSQL, engineers user level features, trains a base clustering
model and finally synchronises the resulting embeddings in Qdrant so the
recommendation service can leverage them in real time.

The implementation focuses on being production friendly while remaining
simple enough to run locally with synthetic data when infrastructure is
not available. Whenever a dependency such as PostgreSQL or Qdrant is not
reachable the pipeline logs the incident and continues using mock data –
this keeps the developer experience pleasant without sacrificing the
behaviour in staging/production environments.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

try:  # Optional dependency: Qdrant is only required in production
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qmodels
except Exception:  # pragma: no cover - we still expose the public API
    QdrantClient = None  # type: ignore
    qmodels = None  # type: ignore

try:  # Optional dependency: Psycopg is needed only when PostgreSQL exists
    import psycopg2
    from psycopg2 import sql
    from psycopg2.extras import Json, RealDictCursor, execute_values
except Exception:  # pragma: no cover - module stays importable without psycopg2
    psycopg2 = None  # type: ignore
    sql = None  # type: ignore
    Json = None  # type: ignore
    RealDictCursor = None  # type: ignore
    execute_values = None  # type: ignore


logger = logging.getLogger("training_engine")
logging.basicConfig(level=logging.INFO)


USER_PROFILE_COLLECTION = "user_financial_profiles"
USER_PROFILE_VECTOR_SIZE = 8

POSTGRES_PROFILE_TABLE = "user_financial_profiles"
POSTGRES_MODEL_TABLE = "model_training_runs"
POSTGRES_FEEDBACK_TABLE = "user_recommendation_feedback"

PROFILE_TABLE_SCHEMA = f"""
CREATE TABLE IF NOT EXISTS {POSTGRES_PROFILE_TABLE} (
    user_id TEXT PRIMARY KEY,
    feature_vector JSONB NOT NULL,
    cluster_label INTEGER NOT NULL,
    transaction_summary JSONB NOT NULL,
    goal_summary JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
"""

MODEL_TABLE_SCHEMA = f"""
CREATE TABLE IF NOT EXISTS {POSTGRES_MODEL_TABLE} (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    algorithm TEXT NOT NULL,
    hyperparameters JSONB NOT NULL,
    training_metadata JSONB NOT NULL
);
"""

FEEDBACK_TABLE_SCHEMA = f"""
CREATE TABLE IF NOT EXISTS {POSTGRES_FEEDBACK_TABLE} (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    recommendation JSONB NOT NULL,
    feedback JSONB,
    transaction_context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
"""


@dataclass
class UserFeatureRecord:
    """Container that represents the engineered features for a user."""

    user_id: str
    feature_vector: List[float]
    cluster_label: int
    transaction_summary: Dict[str, Any]
    goal_summary: Dict[str, Any]

    def to_payload(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "cluster_label": self.cluster_label,
            "transaction_summary": self.transaction_summary,
            "goal_summary": self.goal_summary,
        }


class DataExtractor:
    """Fetches raw data from PostgreSQL or generates synthetic samples."""

    def __init__(self, postgres_dsn: Optional[str]) -> None:
        self.postgres_dsn = postgres_dsn

    def fetch_transactions(self) -> pd.DataFrame:
        """Return user transactional history.

        If PostgreSQL is not available a deterministic synthetic dataset is
        produced, allowing the rest of the pipeline to execute during local
        development or CI.
        """

        if not self.postgres_dsn or psycopg2 is None:
            logger.warning("PostgreSQL DSN not provided – using synthetic transaction data")
            return self._synthetic_transactions()

        try:
            with psycopg2.connect(self.postgres_dsn) as conn:
                query = """
                    SELECT user_id, amount, category, occurred_at
                    FROM transactions
                    WHERE occurred_at >= NOW() - INTERVAL '180 days'
                """
                df = pd.read_sql_query(query, conn)
                if df.empty:
                    logger.warning("Transaction table is empty – falling back to synthetic data")
                    return self._synthetic_transactions()
                return df
        except Exception as exc:  # pragma: no cover - depends on infra
            logger.error("Failed to query transactions: %s", exc)
            return self._synthetic_transactions()

    def fetch_goals(self) -> pd.DataFrame:
        if not self.postgres_dsn or psycopg2 is None:
            logger.warning("PostgreSQL DSN not provided – using synthetic goals data")
            return self._synthetic_goals()

        try:
            with psycopg2.connect(self.postgres_dsn) as conn:
                query = """
                    SELECT user_id, goal_id, target_amount, current_progress, due_date
                    FROM financial_goals
                """
                df = pd.read_sql_query(query, conn)
                if df.empty:
                    logger.warning("Goals table is empty – falling back to synthetic data")
                    return self._synthetic_goals()
                return df
        except Exception as exc:  # pragma: no cover - depends on infra
            logger.error("Failed to query goals: %s", exc)
            return self._synthetic_goals()

    @staticmethod
    def _synthetic_transactions() -> pd.DataFrame:
        data = [
            {"user_id": "user_1", "amount": 52.4, "category": "alimentacion", "occurred_at": "2024-04-01"},
            {"user_id": "user_1", "amount": 15.9, "category": "transporte", "occurred_at": "2024-04-03"},
            {"user_id": "user_1", "amount": 180.0, "category": "vivienda", "occurred_at": "2024-03-25"},
            {"user_id": "user_2", "amount": 220.0, "category": "entretenimiento", "occurred_at": "2024-04-02"},
            {"user_id": "user_2", "amount": 34.5, "category": "alimentacion", "occurred_at": "2024-04-05"},
            {"user_id": "user_2", "amount": 650.0, "category": "educacion", "occurred_at": "2024-01-15"},
            {"user_id": "user_3", "amount": 980.0, "category": "vivienda", "occurred_at": "2024-04-01"},
            {"user_id": "user_3", "amount": 78.0, "category": "salud", "occurred_at": "2024-02-11"},
            {"user_id": "user_3", "amount": 43.0, "category": "transporte", "occurred_at": "2024-03-17"},
        ]
        return pd.DataFrame(data)

    @staticmethod
    def _synthetic_goals() -> pd.DataFrame:
        data = [
            {
                "user_id": "user_1",
                "goal_id": "goal_1",
                "target_amount": 1500.0,
                "current_progress": 400.0,
                "due_date": "2024-12-31",
            },
            {
                "user_id": "user_2",
                "goal_id": "goal_2",
                "target_amount": 3000.0,
                "current_progress": 1900.0,
                "due_date": "2024-10-30",
            },
        ]
        return pd.DataFrame(data)


class FeatureEngineer:
    """Transforms transactional history into user level features."""

    def build_user_features(
        self, transactions: pd.DataFrame, goals: pd.DataFrame
    ) -> Tuple[pd.DataFrame, List[str], Dict[str, Dict[str, Any]]]:
        logger.info("Engineering user level features")

        transactions = transactions.copy()
        transactions["occurred_at"] = pd.to_datetime(transactions["occurred_at"], errors="coerce")
        transactions.dropna(subset=["occurred_at"], inplace=True)

        user_feature_rows: List[Dict[str, Any]] = []
        user_summaries: Dict[str, Dict[str, Any]] = {}

        for user_id, group in transactions.groupby("user_id"):
            group = group.sort_values("occurred_at")
            amounts = group["amount"].astype(float)
            total_spent = float(amounts.sum())
            average_spent = float(amounts.mean()) if not amounts.empty else 0.0
            std_spent = float(amounts.std(ddof=0)) if len(amounts) > 1 else 0.0
            max_spent = float(amounts.max()) if not amounts.empty else 0.0
            num_transactions = int(len(group))

            days_since_last = (
                (datetime.now(timezone.utc) - group["occurred_at"].max()).days
                if not group.empty
                else 999
            )

            category_spend = (
                group.groupby("category")["amount"].sum().sort_values(ascending=False).to_dict()
            )
            top_categories = list(category_spend.keys())[:3]

            monthly_counts = (
                group.set_index("occurred_at")
                .resample("M")["amount"]
                .count()
                .reindex(pd.date_range(group["occurred_at"].min(), datetime.now(timezone.utc), freq="M"), fill_value=0)
            )
            activity_ratio = float(monthly_counts[monthly_counts > 0].count() / max(len(monthly_counts), 1))

            goal_rows = goals[goals["user_id"] == user_id]
            goal_summary = [
                {
                    "goal_id": row.goal_id,
                    "target_amount": float(row.target_amount) if not pd.isna(row.target_amount) else None,
                    "current_progress": float(row.current_progress) if not pd.isna(row.current_progress) else None,
                    "due_date": row.due_date.isoformat() if hasattr(row.due_date, "isoformat") else row.due_date,
                }
                for row in goal_rows.itertuples()
            ]

            user_feature_rows.append(
                {
                    "user_id": user_id,
                    "total_spent": total_spent,
                    "average_spent": average_spent,
                    "std_spent": std_spent,
                    "max_spent": max_spent,
                    "num_transactions": num_transactions,
                    "days_since_last": days_since_last,
                    "activity_ratio": activity_ratio,
                }
            )

            user_summaries[user_id] = {
                "top_categories": top_categories,
                "category_spend": category_spend,
                "monthly_activity_ratio": activity_ratio,
                "num_transactions": num_transactions,
                "total_spent": total_spent,
                "average_spent": average_spent,
                "std_spent": std_spent,
            }

            if goal_summary:
                user_summaries[user_id]["goals"] = goal_summary

        feature_df = pd.DataFrame(user_feature_rows)
        feature_columns = [
            "total_spent",
            "average_spent",
            "std_spent",
            "max_spent",
            "num_transactions",
            "days_since_last",
            "activity_ratio",
        ]
        return feature_df, feature_columns, user_summaries

    def normalise_features(
        self, feature_df: pd.DataFrame, feature_columns: Iterable[str]
    ) -> Tuple[np.ndarray, StandardScaler]:
        scaler = StandardScaler()
        matrix = scaler.fit_transform(feature_df[list(feature_columns)])
        return matrix, scaler


class BaseModelTrainer:
    """Trains a simple clustering model based on user behaviour."""

    def __init__(self, n_clusters: int = 3) -> None:
        self.n_clusters = n_clusters
        self.model: Optional[KMeans] = None

    def fit(self, matrix: np.ndarray) -> np.ndarray:
        if matrix.shape[0] < self.n_clusters:
            # If we don't have enough users we fallback to a single segment
            logger.warning(
                "Not enough users to train %s clusters, assigning fallback cluster", self.n_clusters
            )
            self.model = None
            return np.zeros(matrix.shape[0], dtype=int)

        self.model = KMeans(n_clusters=self.n_clusters, random_state=42, n_init="auto")
        clusters = self.model.fit_predict(matrix)
        logger.info("Trained KMeans model with inertia %.2f", self.model.inertia_)
        return clusters

    def export_metadata(self) -> Dict[str, Any]:
        if not self.model:
            return {
                "algorithm": "fallback_single_segment",
                "hyperparameters": {"n_clusters": 1},
            }
        return {
            "algorithm": "kmeans",
            "hyperparameters": {
                "n_clusters": self.model.n_clusters,
                "random_state": self.model.random_state,
            },
            "cluster_centers": self.model.cluster_centers_.tolist(),
            "inertia": float(self.model.inertia_),
        }


class VectorStoreSync:
    """Persists embeddings in Qdrant."""

    def __init__(
        self,
        qdrant_url: Optional[str],
        qdrant_api_key: Optional[str],
        collection_name: str = USER_PROFILE_COLLECTION,
    ) -> None:
        if QdrantClient is None or qmodels is None or not qdrant_url:
            self.client = None
        else:
            self.client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        self.collection_name = collection_name

    def ensure_collection(self, vector_size: int) -> None:
        if self.client is None:
            logger.info("Qdrant client not available, skipping collection creation")
            return

        try:
            self.client.recreate_collection(
                collection_name=self.collection_name,
                vectors_config=qmodels.VectorParams(size=vector_size, distance=qmodels.Distance.COSINE),
            )
            logger.info("Ensured Qdrant collection '%s'", self.collection_name)
        except Exception as exc:  # pragma: no cover - depends on infra
            logger.error("Failed to create Qdrant collection: %s", exc)

    def upsert_records(self, records: List[UserFeatureRecord]) -> None:
        if self.client is None:
            logger.info("Qdrant client not available, skipping vector upsert")
            return

        points = [
            qmodels.PointStruct(id=record.user_id, vector=record.feature_vector, payload=record.to_payload())
            for record in records
        ]
        try:
            self.client.upsert(collection_name=self.collection_name, points=points)
            logger.info("Upserted %d user profiles into Qdrant", len(points))
        except Exception as exc:  # pragma: no cover - depends on infra
            logger.error("Failed to upsert vectors into Qdrant: %s", exc)


class PostgresRepository:
    """Handles persistence of the aggregated profiles in PostgreSQL."""

    def __init__(self, postgres_dsn: Optional[str]) -> None:
        self.postgres_dsn = postgres_dsn

    def _connect(self):  # pragma: no cover - thin wrapper around psycopg2
        if not self.postgres_dsn or psycopg2 is None:
            return None
        return psycopg2.connect(self.postgres_dsn)

    def ensure_schema(self) -> None:
        if psycopg2 is None:
            logger.info("psycopg2 not available, skipping schema creation")
            return
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(PROFILE_TABLE_SCHEMA)
                cur.execute(MODEL_TABLE_SCHEMA)
                cur.execute(FEEDBACK_TABLE_SCHEMA)
            conn.commit()
            logger.info("Ensured PostgreSQL schemas for AI engine")

    def persist_profiles(self, records: List[UserFeatureRecord]) -> None:
        if not records or psycopg2 is None:
            return
        with self._connect() as conn:
            with conn.cursor() as cur:
                values = [
                    (
                        record.user_id,
                        Json(record.feature_vector),
                        record.cluster_label,
                        Json(record.transaction_summary),
                        Json(record.goal_summary),
                    )
                    for record in records
                ]
                query = sql.SQL(
                    """
                    INSERT INTO {table} (user_id, feature_vector, cluster_label, transaction_summary, goal_summary, updated_at)
                    VALUES %s
                    ON CONFLICT (user_id) DO UPDATE
                    SET feature_vector = EXCLUDED.feature_vector,
                        cluster_label = EXCLUDED.cluster_label,
                        transaction_summary = EXCLUDED.transaction_summary,
                        goal_summary = EXCLUDED.goal_summary,
                        updated_at = NOW()
                    """
                ).format(table=sql.Identifier(POSTGRES_PROFILE_TABLE))
                execute_values(cur, query.as_string(conn), values)
            conn.commit()
            logger.info("Persisted %d profiles into PostgreSQL", len(records))

    def persist_training_metadata(self, metadata: Dict[str, Any]) -> None:
        if psycopg2 is None:
            return
        run_id = metadata.pop("run_id", None) or os.urandom(16).hex()
        payload = {
            "run_id": run_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **metadata,
        }
        with self._connect() as conn:
            with conn.cursor() as cur:
                query = sql.SQL(
                    """
                    INSERT INTO {table} (id, algorithm, hyperparameters, training_metadata)
                    VALUES (%s, %s, %s, %s)
                    """
                ).format(table=sql.Identifier(POSTGRES_MODEL_TABLE))
                cur.execute(
                    query,
                    (
                        payload["run_id"],
                        payload.get("algorithm", "unknown"),
                        Json(payload.get("hyperparameters", {})),
                        Json(payload),
                    ),
                )
            conn.commit()
            logger.info("Stored training metadata with run_id=%s", run_id)


class TrainingPipeline:
    """High level orchestration of the initial MVP pipeline."""

    def __init__(
        self,
        extractor: DataExtractor,
        feature_engineer: FeatureEngineer,
        trainer: BaseModelTrainer,
        vector_store: VectorStoreSync,
        repository: PostgresRepository,
    ) -> None:
        self.extractor = extractor
        self.feature_engineer = feature_engineer
        self.trainer = trainer
        self.vector_store = vector_store
        self.repository = repository

    def run(self) -> List[UserFeatureRecord]:
        logger.info("Starting training pipeline")
        transactions = self.extractor.fetch_transactions()
        goals = self.extractor.fetch_goals()

        feature_df, feature_columns, summaries = self.feature_engineer.build_user_features(transactions, goals)
        matrix, scaler = self.feature_engineer.normalise_features(feature_df, feature_columns)
        logger.info("Normalised features with columns: %s", feature_columns)

        clusters = self.trainer.fit(matrix)
        preprocessing_metadata = {
            "feature_columns": list(feature_columns),
            "scaler_mean": scaler.mean_.tolist() if hasattr(scaler, "mean_") else [],
            "scaler_scale": scaler.scale_.tolist() if hasattr(scaler, "scale_") else [],
        }

        records = []
        for row, cluster, scaled_vector in zip(feature_df.itertuples(index=False), clusters, matrix):
            user_id = row.user_id  # type: ignore[attr-defined]
            transaction_summary = summaries.get(user_id, {})
            goal_summary = transaction_summary.pop("goals", [])
            records.append(
                UserFeatureRecord(
                    user_id=user_id,
                    feature_vector=scaled_vector.astype(float).tolist(),
                    cluster_label=int(cluster),
                    transaction_summary=transaction_summary,
                    goal_summary={"goals": goal_summary},
                )
            )

        self.vector_store.ensure_collection(vector_size=matrix.shape[1])
        self.vector_store.upsert_records(records)
        self.repository.ensure_schema()
        self.repository.persist_profiles(records)
        metadata = self.trainer.export_metadata()
        metadata['preprocessing'] = preprocessing_metadata
        self.repository.persist_training_metadata(metadata)

        logger.info("Training pipeline finished for %d users", len(records))
        return records

    @classmethod
    def from_env(cls) -> "TrainingPipeline":
        postgres_dsn = os.getenv("POSTGRES_DSN")
        qdrant_url = os.getenv("QDRANT_URL")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")

        extractor = DataExtractor(postgres_dsn=postgres_dsn)
        feature_engineer = FeatureEngineer()
        trainer = BaseModelTrainer(n_clusters=int(os.getenv("MODEL_N_CLUSTERS", "3")))
        vector_store = VectorStoreSync(qdrant_url=qdrant_url, qdrant_api_key=qdrant_api_key)
        repository = PostgresRepository(postgres_dsn=postgres_dsn)

        return cls(extractor, feature_engineer, trainer, vector_store, repository)


if __name__ == "__main__":
    pipeline = TrainingPipeline.from_env()
    pipeline.run()
