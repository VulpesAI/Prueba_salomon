import os
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

from kafka import KafkaConsumer
from kafka.errors import NoBrokersAvailable
import pandas as pd

# --- Kafka Configuration ---
KAFKA_BROKER_URL = os.environ.get("KAFKA_BROKER_URL", "kafka:9092")
KAFKA_TOPIC = os.environ.get("KAFKA_TOPIC", "salomon.documents.new")
GROUP_ID = "parsing-engine-group"

# --- Output configuration ---
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parents[2] / "training-engine" / "data" / "ingested"
OUTPUT_DIR = Path(os.environ.get("PARSED_OUTPUT_DIR", DEFAULT_OUTPUT_DIR))
AGGREGATED_DATASET = Path(os.environ.get("PARSED_AGGREGATED_DATASET", OUTPUT_DIR / "transactions_aggregated.csv"))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

COLUMN_ALIASES: Dict[str, tuple[str, ...]] = {
    "transaction_id": ("transaction_id", "id", "transaccion_id", "id_transaccion"),
    "description": ("description", "descripcion", "detail", "concepto", "narrative"),
    "amount": ("amount", "monto", "valor", "importe"),
    "category": ("category", "categoria", "clasificacion", "tipo"),
}


def create_consumer():
    """Creates and returns a Kafka consumer, retrying on connection failure."""
    retries = 5
    while retries > 0:
        try:
            print(f"Attempting to connect to Kafka at {KAFKA_BROKER_URL}...")
            consumer = KafkaConsumer(
                KAFKA_TOPIC,
                bootstrap_servers=[KAFKA_BROKER_URL],
                auto_offset_reset='earliest',  # Start reading at the earliest message
                group_id=GROUP_ID,
                value_deserializer=lambda x: json.loads(x.decode('utf-8'))
            )
            print("Successfully connected to Kafka.")
            return consumer
        except NoBrokersAvailable:
            print(f"Could not connect to Kafka. Retrying in 5 seconds... ({retries-1} retries left)")
            retries -= 1
            time.sleep(5)
    print("Failed to connect to Kafka after several retries. Exiting.")
    return None


def _resolve_column(df: pd.DataFrame, candidates: tuple[str, ...]) -> Optional[str]:
    for candidate in candidates:
        if candidate in df.columns:
            return candidate
    return None


def _normalize_transactions(df: pd.DataFrame, user_id: str, source_file: str) -> pd.DataFrame:
    description_col = _resolve_column(df, COLUMN_ALIASES["description"])
    amount_col = _resolve_column(df, COLUMN_ALIASES["amount"])
    category_col = _resolve_column(df, COLUMN_ALIASES["category"])

    missing = [name for name, col in (("description", description_col), ("amount", amount_col), ("category", category_col)) if col is None]
    if missing:
        raise ValueError(f"El archivo no contiene las columnas obligatorias: {', '.join(missing)}")

    transaction_col = _resolve_column(df, COLUMN_ALIASES["transaction_id"])

    normalized = pd.DataFrame({
        "transaction_id": df[transaction_col] if transaction_col else pd.RangeIndex(start=0, stop=len(df), step=1),
        "user_id": user_id,
        "description": df[description_col].astype(str).str.strip(),
        "amount": df[amount_col].astype(float),
        "category": df[category_col].astype(str).str.lower().str.strip(),
        "source_file": source_file,
    })

    normalized = normalized[normalized["category"].notna() & (normalized["category"] != "")]
    normalized = normalized.reset_index(drop=True)
    normalized["ingested_at"] = datetime.utcnow().isoformat() + "Z"
    return normalized


def _persist_output(df: pd.DataFrame, original_path: str) -> Path:
    if df.empty:
        raise ValueError("El dataset procesado quedó vacío")

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    stem = Path(original_path).stem
    output_file = OUTPUT_DIR / f"{stem}_{timestamp}.csv"
    df.to_csv(output_file, index=False)

    header = not AGGREGATED_DATASET.exists()
    df.to_csv(AGGREGATED_DATASET, mode='a', header=header, index=False)
    return output_file


def process_document(payload):
    """Processes a single document message from Kafka and materialises a cleaned dataset."""
    file_path = payload.get("filePath")
    user_id = payload.get("userId")

    if not file_path or not user_id:
        print(f"Skipping message due to missing 'filePath' or 'userId': {payload}")
        return

    print(f"Processing document for user {user_id} at path: {file_path}")
    df = pd.read_csv(file_path)

    try:
        normalized = _normalize_transactions(df, user_id, file_path)
    except ValueError as exc:
        print(f"Unable to normalise document {file_path}: {exc}")
        return

    output_file = _persist_output(normalized, file_path)
    print(f"Saved cleaned dataset to {output_file} with {len(normalized)} rows")
    print(f"Aggregated dataset updated at {AGGREGATED_DATASET}")


def main():
    """Main function to run the Kafka consumer."""
    print("--- Parsing Engine Service ---")
    consumer = create_consumer()

    if not consumer:
        return

    print(f"Listening for messages on topic: '{KAFKA_TOPIC}'")
    for message in consumer:
        try:
            process_document(message.value)
        except Exception as e:
            print(f"An error occurred while processing message: {e}")


if __name__ == "__main__":
    main()
