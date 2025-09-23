import os
import json
import time
from kafka import KafkaConsumer
from kafka.errors import NoBrokersAvailable
import pandas as pd

# --- Kafka Configuration ---
KAFKA_BROKER_URL = os.environ.get("KAFKA_BROKER_URL", "kafka:9092")
KAFKA_TOPIC = os.environ.get("KAFKA_TOPIC", "salomon.documents.new")
GROUP_ID = "parsing-engine-group"

def create_consumer():
    """Creates and returns a Kafka consumer, retrying on connection failure."""
    retries = 5
    while retries > 0:
        try:
            print(f"Attempting to connect to Kafka at {KAFKA_BROKER_URL}...")
            consumer = KafkaConsumer(
                KAFKA_TOPIC,
                bootstrap_servers=[KAFKA_BROKER_URL],
                auto_offset_reset='earliest', # Start reading at the earliest message
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

def process_document(payload):
    """Processes a single document message from Kafka."""
    file_path = payload.get("filePath")
    user_id = payload.get("userId")

    if not file_path or not user_id:
        print(f"Skipping message due to missing 'filePath' or 'userId': {payload}")
        return

    print(f"Processing document for user {user_id} at path: {file_path}")

    # Aquí es donde la magia ocurre: leer el archivo
    df = pd.read_csv(file_path) # Asumimos que es un CSV por ahora
    print("--- Document Content ---")
    print(df.head()) # Imprime las primeras 5 filas
    print("------------------------")

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