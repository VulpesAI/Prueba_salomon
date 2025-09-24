"""Training pipeline for the SalomónAI recommendation model.

This script ingests labeled transaction data, performs lightweight feature
engineering and fits a text-based classifier that can be consumed by the
recommendation-engine service.  It is intentionally simple so it can run on a
laptop while still providing an end-to-end machine-learning workflow for demos.
"""
from __future__ import annotations

import argparse
import json
import logging
import math
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer


logger = logging.getLogger("training-engine")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

DEFAULT_INPUT = Path(__file__).parent / "sample_data" / "transactions_sample.csv"
DEFAULT_OUTPUT_DIR = Path(__file__).parent / "artifacts"
DEFAULT_MODEL_NAME = "recommendation_model.joblib"
DEFAULT_REPORT_NAME = "training_report.json"


@dataclass
class TrainingReport:
    """Metadata persisted alongside the trained model."""

    model_path: str
    dataset_path: str
    created_at: str
    samples: int
    features_description: str
    accuracy: float
    f1_macro: float
    precision_macro: float
    recall_macro: float
    classes: List[str]


def read_dataset(path: Path) -> pd.DataFrame:
    if path.is_dir():
        frames = [pd.read_csv(file) for file in sorted(path.glob("*.csv"))]
        if not frames:
            raise FileNotFoundError(f"No CSV files found in directory {path}")
        return pd.concat(frames, ignore_index=True)

    if not path.exists():
        raise FileNotFoundError(f"Dataset not found at {path}")

    return pd.read_csv(path)


def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """Validate and clean the incoming dataframe."""
    required = {"description", "amount", "category"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Dataset is missing required columns: {', '.join(sorted(missing))}")

    cleaned = df.copy()
    cleaned["description"] = cleaned["description"].fillna("desconocido").astype(str)
    cleaned["amount"] = cleaned["amount"].astype(float)
    cleaned["category"] = cleaned["category"].str.lower().str.strip()

    # Drop rows without category labels after normalization
    cleaned = cleaned[cleaned["category"].notna() & (cleaned["category"] != "")]
    cleaned = cleaned.reset_index(drop=True)

    if cleaned.empty:
        raise ValueError("Dataset is empty after cleaning")

    return cleaned


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    engineered = df.copy()
    bins = [-math.inf, 10000, 50000, 150000, math.inf]
    labels = ["monto_bajo", "monto_medio", "monto_alto", "monto_extraordinario"]
    engineered["amount_bucket"] = pd.cut(df["amount"].abs(), bins=bins, labels=labels, include_lowest=True)
    engineered["model_text"] = (
        engineered["description"].str.lower().str.replace(r"\s+", " ", regex=True)
        + " "
        + engineered["amount_bucket"].astype(str)
    )
    return engineered


def build_pipeline() -> Pipeline:
    vectorizer = TfidfVectorizer(max_features=4000, ngram_range=(1, 2))
    classifier = LogisticRegression(max_iter=1000, multi_class="multinomial")
    return Pipeline([
        ("vectorizer", vectorizer),
        ("classifier", classifier),
    ])


def train_model(data: pd.DataFrame) -> tuple[Pipeline, TrainingReport]:
    X = data["model_text"]
    y = data["category"]

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_val)

    accuracy = accuracy_score(y_val, predictions)
    f1 = f1_score(y_val, predictions, average="macro")
    precision = precision_score(y_val, predictions, average="macro")
    recall = recall_score(y_val, predictions, average="macro")

    logger.info("Validation accuracy: %.3f", accuracy)
    logger.info("Validation F1 (macro): %.3f", f1)

    report = TrainingReport(
        model_path="",
        dataset_path="",
        created_at=datetime.utcnow().isoformat() + "Z",
        samples=len(data),
        features_description="TF-IDF over transaction description enriched with amount buckets",
        accuracy=float(accuracy),
        f1_macro=float(f1),
        precision_macro=float(precision),
        recall_macro=float(recall),
        classes=sorted(pipeline.classes_.tolist()),
    )

    return pipeline, report


def persist_artifacts(pipeline: Pipeline, report: TrainingReport, output_dir: Path, model_name: str, report_name: str, dataset_path: Path) -> TrainingReport:
    output_dir.mkdir(parents=True, exist_ok=True)
    model_path = output_dir / model_name
    joblib.dump(pipeline, model_path)

    finalized_report = report
    finalized_report.model_path = str(model_path)
    finalized_report.dataset_path = str(dataset_path)

    report_path = output_dir / report_name
    with report_path.open("w", encoding="utf-8") as fp:
        json.dump(asdict(finalized_report), fp, indent=2, ensure_ascii=False)

    logger.info("Model persisted to %s", model_path)
    logger.info("Report saved to %s", report_path)
    return finalized_report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the SalomónAI recommendation model")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="CSV file or directory with labeled transactions")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR, help="Directory where the model artifacts will be stored")
    parser.add_argument("--model-name", type=str, default=DEFAULT_MODEL_NAME, help="Filename for the persisted model")
    parser.add_argument("--report-name", type=str, default=DEFAULT_REPORT_NAME, help="Filename for the training metrics report")
    return parser.parse_args()


def main(args: Optional[argparse.Namespace] = None) -> TrainingReport:
    cli_args = args or parse_args()

    dataset = read_dataset(cli_args.input)
    cleaned = clean_dataset(dataset)
    engineered = engineer_features(cleaned)

    pipeline, report = train_model(engineered)
    final_report = persist_artifacts(
        pipeline,
        report,
        cli_args.output_dir,
        cli_args.model_name,
        cli_args.report_name,
        cli_args.input.resolve(),
    )

    return final_report


if __name__ == "__main__":
    main()
