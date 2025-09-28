"""Training pipeline for the SalomonAI transaction classification model."""
from __future__ import annotations

import argparse
import json
import logging
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

LOGGER = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"
DEFAULT_DATASET = DATA_DIR / "transactions_training.csv"
MODEL_PATH = MODEL_DIR / "transaction_classifier.joblib"
METRICS_PATH = MODEL_DIR / "transaction_classifier_metrics.json"
MODEL_JSON_PATH = MODEL_DIR / "transaction_classifier.json"


@dataclass
class TrainingConfig:
    dataset_path: Path
    test_size: float = 0.2
    random_state: int = 42
    max_features: int = 5000
    ngram_range: tuple[int, int] = (1, 2)
    cv_splits: int = 5


@dataclass
class TrainingArtifacts:
    model_path: Path
    metrics_path: Path
    metrics: Dict[str, float]
    report: Dict[str, Dict[str, float]]
    confusion_matrix: List[List[int]]


def load_dataset(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found at {path}")

    LOGGER.info("Loading dataset from %s", path)
    df = pd.read_csv(path)
    required_columns = {"description", "amount", "category"}
    missing = required_columns.difference(df.columns)
    if missing:
        raise ValueError(f"Dataset is missing required columns: {', '.join(sorted(missing))}")

    df["description"] = df["description"].astype(str).str.strip()
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0.0)
    df["category"] = df["category"].astype(str).str.upper().str.strip()

    empty_rows = df["description"].str.len() < 3
    if empty_rows.any():
        LOGGER.warning("Dropping %s rows with invalid descriptions", int(empty_rows.sum()))
        df = df.loc[~empty_rows].copy()

    LOGGER.info("Dataset ready with %s samples across %s categories", len(df), df["category"].nunique())
    return df


def build_pipeline(config: TrainingConfig) -> Pipeline:
    text_features = "description"
    numeric_features = ["amount"]

    preprocessing = ColumnTransformer(
        transformers=[
            (
                "text",
                TfidfVectorizer(
                    lowercase=True,
                    strip_accents="unicode",
                    analyzer="word",
                    ngram_range=config.ngram_range,
                    max_features=config.max_features,
                    stop_words="spanish",
                ),
                text_features,
            ),
            (
                "amount",
                Pipeline([
                    ("scaler", StandardScaler(with_mean=False)),
                ]),
                numeric_features,
            ),
        ]
    )

    classifier = LogisticRegression(
        multi_class="multinomial",
        solver="lbfgs",
        max_iter=1000,
        class_weight="balanced",
    )

    pipeline = Pipeline([
        ("preprocess", preprocessing),
        ("classifier", classifier),
    ])

    return pipeline


def evaluate_model(pipeline: Pipeline, df: pd.DataFrame, config: TrainingConfig) -> Dict[str, float]:
    LOGGER.info("Running %s-fold cross validation", config.cv_splits)
    skf = StratifiedKFold(n_splits=config.cv_splits, shuffle=True, random_state=config.random_state)
    scores = cross_val_score(
        pipeline,
        df[["description", "amount"]],
        df["category"],
        cv=skf,
        scoring="f1_macro",
        n_jobs=-1,
    )
    return {
        "cross_val_f1_macro_mean": float(np.mean(scores)),
        "cross_val_f1_macro_std": float(np.std(scores)),
    }


def train_model(config: TrainingConfig) -> TrainingArtifacts:
    df = load_dataset(config.dataset_path)
    pipeline = build_pipeline(config)

    LOGGER.info("Performing train/validation split with test_size=%s", config.test_size)
    X_train, X_test, y_train, y_test = train_test_split(
        df[["description", "amount"]],
        df["category"],
        test_size=config.test_size,
        stratify=df["category"],
        random_state=config.random_state,
    )

    pipeline.fit(X_train, y_train)
    LOGGER.info("Model trained on %s samples", len(X_train))

    y_pred = pipeline.predict(X_test)
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    conf_matrix = confusion_matrix(y_test, y_pred).tolist()

    cv_metrics = evaluate_model(pipeline, df, config)

    accuracy = float(report.get("accuracy", 0.0))
    macro_f1 = float(report.get("macro avg", {}).get("f1-score", 0.0))

    metrics = {
        "accuracy": accuracy,
        "macro_f1": macro_f1,
        **cv_metrics,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "labels": pipeline.classes_.tolist(),
    }

    LOGGER.info("Accuracy: %.4f | Macro F1: %.4f", accuracy, macro_f1)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    LOGGER.info("Re-fitting model on full dataset for production artifact")
    pipeline.fit(df[["description", "amount"]], df["category"])
    joblib.dump(pipeline, MODEL_PATH)

    LOGGER.info("Saving metrics to %s", METRICS_PATH)
    with METRICS_PATH.open("w", encoding="utf-8") as fh:
        json.dump({
            "metrics": metrics,
            "classification_report": report,
            "confusion_matrix": conf_matrix,
            "config": {
                "ngram_range": config.ngram_range,
                "max_features": config.max_features,
                "cv_splits": config.cv_splits,
                "test_size": config.test_size,
            },
        }, fh, ensure_ascii=False, indent=2)

    export_heuristic_model(df, metrics)

    return TrainingArtifacts(
        model_path=MODEL_PATH,
        metrics_path=METRICS_PATH,
        metrics=metrics,
        report=report,
        confusion_matrix=conf_matrix,
    )


def export_heuristic_model(df: pd.DataFrame, metrics: Dict[str, float]) -> None:
    """Genera un modelo heurístico ligero para entornos sin dependencias pesadas."""

    LOGGER.info("Exporting heuristic JSON model to %s", MODEL_JSON_PATH)

    token_pattern = re.compile(r"[a-záéíóúñü]+", re.IGNORECASE)
    stopwords = {
        "de", "la", "el", "los", "las", "en", "para", "del", "con", "por",
        "una", "un", "al", "se", "y", "mes", "pago", "cuenta", "plan",
    }

    keyword_counters: Dict[str, Counter] = defaultdict(Counter)
    for _, row in df.iterrows():
        category = str(row["category"]).upper()
        tokens = [
            token
            for token in token_pattern.findall(str(row["description"]).lower())
            if len(token) > 2 and token not in stopwords
        ]
        keyword_counters[category].update(tokens)

    keyword_weights = {
        category: [token for token, _ in counter.most_common(12)]
        for category, counter in keyword_counters.items()
    }

    if "VARIOS" not in keyword_weights:
        keyword_weights["VARIOS"] = []

    amount_quantiles = df.groupby("category")["amount"].quantile([0.5, 0.75]).unstack(fill_value=0)
    max_amount = df["amount"].max() or 1
    amount_rules: Dict[str, Dict[str, float]] = {}

    for category in keyword_weights.keys():
        threshold = float(amount_quantiles.loc[category, 0.75]) if category in amount_quantiles.index else 0.0
        normalized = min(threshold / max_amount, 1.0)
        high_bonus = round(0.08 + normalized * 0.12, 3)
        amount_rules[category] = {
            "threshold": int(threshold),
            "high_bonus": high_bonus,
            "base_bonus": 0.05,
        }

    model_data = {
        "version": f"heuristic-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "trained_at": metrics.get("timestamp"),
        "labels": sorted(set(keyword_weights.keys())),
        "keyword_weights": keyword_weights,
        "amount_rules": amount_rules,
    }

    with MODEL_JSON_PATH.open("w", encoding="utf-8") as fh:
        json.dump(model_data, fh, ensure_ascii=False, indent=2)


def parse_args() -> TrainingConfig:
    parser = argparse.ArgumentParser(description="Train the SalomonAI transaction classification model")
    parser.add_argument(
        "--dataset",
        type=Path,
        default=DEFAULT_DATASET,
        help="Path to the training dataset in CSV format",
    )
    parser.add_argument("--test-size", type=float, default=0.2, help="Fraction of data to use for validation")
    parser.add_argument("--max-features", type=int, default=5000, help="Maximum number of TF-IDF features")
    parser.add_argument(
        "--ngram-max",
        type=int,
        default=2,
        help="Maximum n-gram size (minimum is fixed to 1)",
    )
    parser.add_argument("--cv-splits", type=int, default=5, help="Number of cross-validation splits")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")

    args = parser.parse_args()
    ngram_range = (1, max(1, args.ngram_max))

    return TrainingConfig(
        dataset_path=args.dataset,
        test_size=args.test_size,
        random_state=args.seed,
        max_features=args.max_features,
        ngram_range=ngram_range,
        cv_splits=args.cv_splits,
    )


def main() -> None:
    config = parse_args()
    artifacts = train_model(config)

    LOGGER.info("Training completed successfully")
    LOGGER.info("Model saved to %s", artifacts.model_path)
    LOGGER.info("Metrics saved to %s", artifacts.metrics_path)
    LOGGER.info(
        "Cross-val macro F1: %.4f ± %.4f",
        artifacts.metrics["cross_val_f1_macro_mean"],
        artifacts.metrics["cross_val_f1_macro_std"],
    )


if __name__ == "__main__":
    main()
