"""Kafka consumer entry point for the parsing engine."""
import json
import os
import time
from typing import Optional

from kafka import KafkaConsumer
from kafka.errors import NoBrokersAvailable

from database import Database, database_session
from pipeline import SchemaValidationError, process_document

# --- Kafka Configuration ---
KAFKA_BROKER_URL = os.environ.get("KAFKA_BROKER_URL", "kafka:9092")
KAFKA_TOPIC = os.environ.get("KAFKA_TOPIC", "salomon.documents.new")
GROUP_ID = "parsing-engine-group"


def create_consumer() -> Optional[KafkaConsumer]:
    """Creates and returns a Kafka consumer, retrying on connection failure."""

    retries = 5
    while retries > 0:
        try:
            print(f"Attempting to connect to Kafka at {KAFKA_BROKER_URL}...")
            consumer = KafkaConsumer(
                KAFKA_TOPIC,
                bootstrap_servers=[KAFKA_BROKER_URL],
                auto_offset_reset="earliest",
                group_id=GROUP_ID,
                value_deserializer=lambda x: json.loads(x.decode("utf-8")),
            )
            print("Successfully connected to Kafka.")
            return consumer
        except NoBrokersAvailable:
            retries -= 1
            print(
                f"Could not connect to Kafka. Retrying in 5 seconds... ({retries} retries left)"
            )
            time.sleep(5)
    print("Failed to connect to Kafka after several retries. Exiting.")
    return None


def process_message(db: Database, message: dict) -> dict:
    """Process a message using the parsing pipeline."""

    return process_document(db, message)


def main():
    """Main function to run the Kafka consumer."""

    print("--- Parsing Engine Service ---")
    consumer = create_consumer()

    if not consumer:
        return

    print(f"Listening for messages on topic: '{KAFKA_TOPIC}'")
    for message in consumer:
        try:
            with database_session() as db:
                result = process_message(db, message.value)
            print(f"Processed document {result['document_id']}: {json.dumps(result)}")
        except FileNotFoundError as err:
            print(f"File not found: {err}")
        except SchemaValidationError as err:
            print(f"Schema validation error: {err}")
        except Exception as err:  # noqa: BLE001
            print(f"An error occurred while processing message: {err}")


if __name__ == "__main__":
    main()
