"""Kafka consumer for the parsing engine service."""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

from prometheus_client import Counter, Histogram, start_http_server

from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import KafkaError, NoBrokersAvailable

from .parser import StatementParser, StatementParsingError, build_result_payload
from .settings import get_settings
from .storage import StorageError, create_storage_client


LOGGER = logging.getLogger("parsing-engine.consumer")

STATEMENTS_PROCESSED = Counter(
    "parsing_engine_statements_processed_total",
    "Total de cartolas procesadas por el parsing-engine",
    labelnames=("status",),
)
STATEMENT_PROCESSING_DURATION = Histogram(
    "parsing_engine_processing_duration_seconds",
    "Duración del procesamiento de cartolas en el parsing-engine",
    buckets=(0.5, 1, 2, 5, 10, 30, 60, 120, 300),
)
STATEMENT_DOCUMENT_BYTES = Histogram(
    "parsing_engine_document_bytes",
    "Tamaño (en bytes) de los documentos procesados",
    buckets=(1024, 10 * 1024, 50 * 1024, 100 * 1024, 200 * 1024, 500 * 1024, 1024 * 1024, 2 * 1024 * 1024, 5 * 1024 * 1024),
)
STATEMENTS_PUBLISHED = Counter(
    "parsing_engine_statements_published_total",
    "Eventos publicados exitosamente en el tópico de salida",
)
STATEMENT_PUBLICATION_ERRORS = Counter(
    "parsing_engine_statement_publication_errors_total",
    "Fallos al publicar eventos procesados",
)
STATEMENT_FAILURES = Counter(
    "parsing_engine_statement_failures_total",
    "Total de cartolas que fallaron en el procesamiento",
    labelnames=("reason",),
)


@dataclass
class StatementMessage:
    """Representation of the incoming message produced by the Core API."""

    statement_id: str
    user_id: str
    storage_path: str

    @classmethod
    def from_dict(cls, payload: Dict[str, Any]) -> "StatementMessage":
        try:
            statement_id = str(payload["statementId"])
            user_id = str(payload["userId"])
            storage_path = str(payload["storagePath"])
        except KeyError as exc:  # pragma: no cover - defensive programming
            raise ValueError(f"Missing required field in payload: {exc.args[0]}") from exc

        if not statement_id or not user_id or not storage_path:
            raise ValueError("Invalid parsing payload: statementId, userId and storagePath are required")

        return cls(statement_id=statement_id, user_id=user_id, storage_path=storage_path)


class ParsingEngine:
    """Main orchestrator that consumes, parses and emits statement events."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.parser = StatementParser(
            default_currency=self.settings.default_currency,
            ocr_languages=self.settings.ocr_languages,
        )
        self.storage_client = create_storage_client(
            supabase_url=self.settings.supabase_url,
            supabase_service_role_key=self.settings.supabase_service_role_key,
        )

        self.consumer: KafkaConsumer | None = None
        self.producer: KafkaProducer | None = None
        self._metrics_started = False

    def _ensure_metrics_server(self) -> None:
        if self._metrics_started:
            return

        start_http_server(self.settings.metrics_port, addr=self.settings.metrics_host)
        LOGGER.info(
            "Exponiendo métricas Prometheus en %s:%s", self.settings.metrics_host, self.settings.metrics_port
        )
        self._metrics_started = True

    def create_consumer(self) -> KafkaConsumer | None:
        retries = self.settings.connection_retries
        brokers = self.settings.kafka_brokers

        while retries > 0:
            try:
                LOGGER.info("Connecting to Kafka brokers %s", brokers)
                consumer = KafkaConsumer(
                    self.settings.statements_in_topic,
                    bootstrap_servers=brokers,
                    auto_offset_reset="earliest",
                    group_id=self.settings.consumer_group_id,
                    value_deserializer=lambda x: json.loads(x.decode("utf-8")),
                )
                LOGGER.info("Kafka consumer connected.")
                return consumer
            except NoBrokersAvailable:
                retries -= 1
                LOGGER.warning(
                    "Kafka brokers not available. Retrying in %s seconds (%s retries left)",
                    self.settings.retry_delay_seconds,
                    retries,
                )
                time.sleep(self.settings.retry_delay_seconds)

        LOGGER.error("Failed to connect to Kafka after several retries. Exiting.")
        return None

    def create_producer(self) -> KafkaProducer | None:
        brokers = self.settings.kafka_brokers
        try:
            producer = KafkaProducer(
                bootstrap_servers=brokers,
                value_serializer=lambda value: json.dumps(value).encode("utf-8"),
            )
            return producer
        except NoBrokersAvailable:
            LOGGER.error("Unable to connect to Kafka brokers for producer: %s", brokers)
            return None

    def run(self) -> None:
        self._ensure_metrics_server()
        self.consumer = self.create_consumer()
        if not self.consumer:
            return

        self.producer = self.create_producer()
        if not self.producer:
            LOGGER.error("Producer not available. Stopping consumer loop.")
            return

        LOGGER.info("Listening for messages on topic '%s'", self.settings.statements_in_topic)

        for message in self.consumer:
            payload = message.value
            try:
                statement_message = StatementMessage.from_dict(payload)
            except ValueError as exc:
                LOGGER.error("Invalid message received: %s", exc)
                continue

            LOGGER.info(
                "Processing statement %s for user %s from %s",
                statement_message.statement_id,
                statement_message.user_id,
                statement_message.storage_path,
            )

            result_payload = self._process_message(statement_message)

            try:
                self.producer.send(self.settings.statements_out_topic, result_payload).get(timeout=30)
                LOGGER.info(
                    "Published parsed statement %s to topic %s",
                    statement_message.statement_id,
                    self.settings.statements_out_topic,
                )
                STATEMENTS_PUBLISHED.inc()
            except KafkaError as error:
                LOGGER.error("Failed to publish parsed statement %s: %s", statement_message.statement_id, error)
                STATEMENT_PUBLICATION_ERRORS.inc()

    def _process_message(self, message: StatementMessage) -> Dict[str, Any]:
        error: Optional[str] = None
        parsed = None
        reason = ""
        start_time = time.perf_counter()

        try:
            storage_path = self._resolve_storage_path(message.storage_path)
            document = self.storage_client.fetch(storage_path)
            checksum = self._calculate_checksum(document.content)
            parsed = self.parser.parse(
                document.filename,
                document.content,
                content_type=document.content_type,
            )
            status = "completed"
            STATEMENT_DOCUMENT_BYTES.observe(len(document.content))
        except (StorageError, StatementParsingError) as exc:
            checksum = ""
            status = "failed"
            error = str(exc)
            reason = exc.__class__.__name__
            LOGGER.error(
                "Failed to process statement %s from %s: %s",
                message.statement_id,
                storage_path,
                error,
            )
        except Exception as exc:  # pragma: no cover - defensive logging
            checksum = ""
            status = "failed"
            error = f"Unexpected error: {exc}"
            reason = exc.__class__.__name__
            LOGGER.exception(
                "Unexpected error while processing statement %s",
                message.statement_id,
            )

        if not checksum:
            checksum = self._fallback_checksum(message)

        duration = time.perf_counter() - start_time
        STATEMENT_PROCESSING_DURATION.observe(duration)
        STATEMENTS_PROCESSED.labels(status=status).inc()
        if status == "failed" and reason:
            STATEMENT_FAILURES.labels(reason=reason).inc()

        return build_result_payload(
            statement_id=message.statement_id,
            user_id=message.user_id,
            parsed=parsed,
            status=status,
            error=error,
            checksum=checksum,
        )

    @staticmethod
    def _calculate_checksum(content: bytes) -> str:
        import hashlib

        return hashlib.sha256(content).hexdigest()

    @staticmethod
    def _fallback_checksum(message: StatementMessage) -> str:
        import hashlib

        seed = f"{message.statement_id}:{message.storage_path}".encode("utf-8")
        return hashlib.sha256(seed).hexdigest()

    def _resolve_storage_path(self, storage_path: str) -> str:
        normalized = storage_path.lstrip("/")
        if "/" not in normalized:
            return f"{self.settings.statements_bucket}/{normalized}"
        return normalized


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    engine = ParsingEngine()
    engine.run()


if __name__ == "__main__":
    main()

