"""Training pipeline for the SalomónAI classification engine.

This script is intended to be executed from a scheduled job (for example a
Kubernetes CronJob) or triggered manually after receiving new labelled data.
It performs the following high-level steps:

1. **Ingest**: Fetch user approved labels from Postgres (table
   ``classification_labels``) together with the latest quality snapshot.
2. **Train**: Build a scikit-learn pipeline (TF-IDF + Logistic Regression)
   using the accepted labels as supervision data.
3. **Evaluate**: Compute standard metrics (accuracy, macro f1-score and
   per-class precision/recall) to monitor model quality over time.
4. **Publish**: Persist a versioned artifact both locally and in the configured
   object storage (Amazon S3 compatible). Metadata and quality metrics are
   stored in Postgres to keep the MLOps history traceable.

Environment variables
---------------------
- ``DATABASE_URL`` or the trio ``POSTGRES_HOST``, ``POSTGRES_PORT``,
  ``POSTGRES_DB``, ``POSTGRES_USER``, ``POSTGRES_PASSWORD``
- ``CLASSIFICATION_LABELS_TABLE`` (default: ``classification_labels``)
- ``CLASSIFICATION_METRICS_TABLE`` (default: ``classification_model_metrics``)
- ``CLASSIFICATION_MIN_SAMPLES`` (default: ``25``)
- ``MODEL_REGISTRY_PATH`` (local folder, default ``./artifacts``)
- ``MODEL_STORAGE_BUCKET`` (if set, enables S3 upload)
- ``MODEL_STORAGE_PREFIX`` (default: ``classification-models/``)
- ``AWS_ACCESS_KEY_ID`` / ``AWS_SECRET_ACCESS_KEY`` / ``AWS_REGION`` when using
  S3 compatible storage.

The script is idempotent and skips training gracefully when the amount of
available labelled data is not enough.
"""

from __future__ import annotations

import json
import logging
import os
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, List, Optional, Sequence

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError as exc:  # pragma: no cover - dependency issue should be explicit
    raise RuntimeError(
        "psycopg (psycopg3) is required to run the training pipeline"
    ) from exc

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import accuracy_score, classification_report, f1_score
    from sklearn.model_selection import train_test_split
    from sklearn.pipeline import Pipeline
except ImportError as exc:  # pragma: no cover
    raise RuntimeError(
        "scikit-learn is required to run the training pipeline"
    ) from exc

try:
    import joblib
except ImportError as exc:  # pragma: no cover
    raise RuntimeError("joblib is required to persist the model artifacts") from exc

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except ImportError:  # pragma: no cover - optional dependency
    boto3 = None


LOGGER = logging.getLogger("training")
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)


@dataclass
class TrainingSample:
    """Represents a labelled transaction used for supervised training."""

    id: str
    description: str
    category: str
    previous_category: Optional[str]
    notes: Optional[str]
    movement_id: Optional[str]


@dataclass
class TrainingConfig:
    database_url: str
    labels_table: str = "classification_labels"
    metrics_table: str = "classification_model_metrics"
    min_samples: int = 25
    test_size: float = 0.2
    random_state: int = 42
    model_registry_path: Path = Path("./artifacts")
    model_storage_bucket: Optional[str] = None
    model_storage_prefix: str = "classification-models/"

    @classmethod
    def from_env(cls) -> "TrainingConfig":
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            host = os.getenv("POSTGRES_HOST", "localhost")
            port = os.getenv("POSTGRES_PORT", "5432")
            user = os.getenv("POSTGRES_USER", "postgres")
            password = os.getenv("POSTGRES_PASSWORD", "postgres")
            database = os.getenv("POSTGRES_DB", "postgres")
            db_url = f"postgresql://{user}:{password}@{host}:{port}/{database}"

        min_samples = int(os.getenv("CLASSIFICATION_MIN_SAMPLES", "25"))
        registry_path = Path(os.getenv("MODEL_REGISTRY_PATH", "./artifacts"))

        return cls(
            database_url=db_url,
            labels_table=os.getenv("CLASSIFICATION_LABELS_TABLE", "classification_labels"),
            metrics_table=os.getenv("CLASSIFICATION_METRICS_TABLE", "classification_model_metrics"),
            min_samples=min_samples,
            model_registry_path=registry_path,
            model_storage_bucket=os.getenv("MODEL_STORAGE_BUCKET"),
            model_storage_prefix=os.getenv("MODEL_STORAGE_PREFIX", "classification-models/"),
        )


class LabelRepository:
    """Encapsulates all data access operations against Postgres."""

    ACCEPTED_STATUSES: Sequence[str] = ("PENDING", "QUEUED", "APPROVED", "USED")

    def __init__(self, config: TrainingConfig):
        self.config = config

    def _connection(self) -> psycopg.Connection:
        return psycopg.connect(self.config.database_url, row_factory=dict_row)

    def fetch_training_samples(self) -> List[TrainingSample]:
        query = f"""
            SELECT id, description, final_category, previous_category, notes, movement_id
            FROM {self.config.labels_table}
            WHERE status = ANY(%s)
        """
        with self._connection() as conn, conn.cursor() as cur:
            cur.execute(query, (list(self.ACCEPTED_STATUSES),))
            rows = cur.fetchall()

        samples = [
            TrainingSample(
                id=row["id"],
                description=row["description"],
                category=row["final_category"],
                previous_category=row.get("previous_category"),
                notes=row.get("notes"),
                movement_id=row.get("movement_id"),
            )
            for row in rows
            if row["description"] and row["final_category"]
        ]

        LOGGER.info("Fetched %s labelled samples from database", len(samples))
        return samples

    def mark_samples_as_used(self, sample_ids: Iterable[str], model_version: str) -> None:
        ids = list(sample_ids)
        if not ids:
            return

        query = f"""
            UPDATE {self.config.labels_table}
            SET status = 'USED',
                accepted_at = COALESCE(accepted_at, NOW()),
                metadata = COALESCE(metadata, '{{}}')::jsonb || %s::jsonb
            WHERE id = ANY(%s)
        """
        metadata = json.dumps({
            "lastModelVersion": model_version,
            "updatedAt": datetime.utcnow().isoformat(),
        })
        with self._connection() as conn, conn.cursor() as cur:
            cur.execute(query, (metadata, ids))
            conn.commit()
        LOGGER.info("Marked %s samples as used by model %s", len(ids), model_version)

    def register_metrics(self, metrics: dict, model_version: str, artifact_uri: str) -> None:
        ddl = f"""
            CREATE TABLE IF NOT EXISTS {self.config.metrics_table} (
                id UUID PRIMARY KEY,
                model_version VARCHAR(64) NOT NULL,
                accuracy DOUBLE PRECISION,
                macro_f1 DOUBLE PRECISION,
                artifact_uri TEXT NOT NULL,
                metrics JSONB NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """
        insert = f"""
            INSERT INTO {self.config.metrics_table}
                (id, model_version, accuracy, macro_f1, artifact_uri, metrics)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        with self._connection() as conn, conn.cursor() as cur:
            cur.execute(ddl)
            cur.execute(
                insert,
                (
                    uuid.uuid4(),
                    model_version,
                    metrics.get("accuracy"),
                    metrics.get("macro_f1"),
                    artifact_uri,
                    json.dumps(metrics),
                ),
            )
            conn.commit()
        LOGGER.info("Persisted metrics snapshot for model %s", model_version)


class ArtifactPublisher:
    """Handles persistence of model artifacts in local storage and S3."""

    def __init__(self, config: TrainingConfig):
        self.config = config
        self.config.model_registry_path.mkdir(parents=True, exist_ok=True)

        if self.config.model_storage_bucket and boto3:
            self.s3_client = boto3.client("s3")
        else:
            self.s3_client = None

    def publish(self, model_pipeline: Pipeline, metadata: dict) -> str:
        version = metadata["model_version"]
        artifact_name = f"classifier-{version}.joblib"
        local_path = self.config.model_registry_path / artifact_name
        joblib.dump(model_pipeline, local_path)

        metadata_path = self.config.model_registry_path / f"classifier-{version}.json"
        metadata_path.write_text(json.dumps(metadata, indent=2, sort_keys=True))

        LOGGER.info("Saved model artifact locally at %s", local_path)

        if self.s3_client and self.config.model_storage_bucket:
            object_key = f"{self.config.model_storage_prefix.rstrip('/')}/{artifact_name}"
            try:
                with local_path.open("rb") as model_file:
                    self.s3_client.upload_fileobj(
                        model_file,
                        self.config.model_storage_bucket,
                        object_key,
                        ExtraArgs={"Metadata": {"model-version": version}},
                    )
                self.s3_client.put_object(
                    Bucket=self.config.model_storage_bucket,
                    Key=f"{self.config.model_storage_prefix.rstrip('/')}/classifier-{version}.json",
                    Body=json.dumps(metadata).encode("utf-8"),
                    ContentType="application/json",
                )
                LOGGER.info(
                    "Uploaded artifacts to s3://%s/%s",
                    self.config.model_storage_bucket,
                    object_key,
                )
                return f"s3://{self.config.model_storage_bucket}/{object_key}"
            except (BotoCoreError, ClientError) as exc:
                LOGGER.error("Failed to upload model artifact to S3: %s", exc, exc_info=True)
                raise

        return str(local_path.resolve())


def train_classifier(samples: Sequence[TrainingSample]) -> tuple[Pipeline, dict]:
    descriptions = [sample.description for sample in samples]
    labels = [sample.category for sample in samples]

    X_train, X_test, y_train, y_test = train_test_split(
        descriptions,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels if len(set(labels)) > 1 else None,
    )

    pipeline = Pipeline(
        steps=[
            ("tfidf", TfidfVectorizer(max_features=5000, ngram_range=(1, 2))),
            ("clf", LogisticRegression(max_iter=1000)),
        ]
    )

    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    macro_f1 = f1_score(y_test, y_pred, average="macro")
    report = classification_report(y_test, y_pred, output_dict=True)

    metrics = {
        "accuracy": float(accuracy),
        "macro_f1": float(macro_f1),
        "classes": sorted(set(labels)),
        "classification_report": report,
        "trained_at": datetime.utcnow().isoformat(),
    }
    LOGGER.info("Model trained - accuracy %.4f | macro F1 %.4f", accuracy, macro_f1)

    return pipeline, metrics


def ensure_enough_samples(samples: Sequence[TrainingSample], minimum: int) -> None:
    if len(samples) < minimum:
        LOGGER.warning(
            "Not enough labelled samples to train a model (have %s, need %s).",
            len(samples),
            minimum,
        )
        sys.exit(0)

    categories = {sample.category for sample in samples}
    if len(categories) < 2:
        LOGGER.warning(
            "At least two distinct categories are required for training (found %s).",
            len(categories),
        )
        sys.exit(0)


def main() -> None:
    config = TrainingConfig.from_env()
    LOGGER.info("Starting training pipeline using database %s", config.database_url)

    repository = LabelRepository(config)
    samples = repository.fetch_training_samples()
    ensure_enough_samples(samples, config.min_samples)

    model_pipeline, metrics = train_classifier(samples)

    model_version = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    metadata = {
        "model_version": model_version,
        "metrics": metrics,
        "sample_count": len(samples),
        "source": "classification_labels",
    }

    publisher = ArtifactPublisher(config)
    artifact_uri = publisher.publish(model_pipeline, metadata)

    repository.register_metrics(metrics, model_version, artifact_uri)
    repository.mark_samples_as_used((sample.id for sample in samples), model_version)

    LOGGER.info("Training pipeline finished successfully | artifact=%s", artifact_uri)


if __name__ == "__main__":
    main()
