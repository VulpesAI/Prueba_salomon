#!/usr/bin/env bash
set -euo pipefail

# create-statements-topics.sh
# Utility script to create the statements.in/statements.out Kafka topics locally or
# against a managed cluster. It reads configuration from environment variables so it
# can be used directly in CI/CD pipelines.

: "${KAFKA_BROKERS:=localhost:9092}"
: "${KAFKA_STATEMENTS_IN_TOPIC:=statements.in}"
: "${KAFKA_STATEMENTS_OUT_TOPIC:=statements.out}"
: "${KAFKA_TOPIC_PARTITIONS:=1}"
: "${KAFKA_TOPIC_REPLICATION_FACTOR:=1}"
: "${KAFKA_TOPICS_CLI:=kafka-topics}"

COMMAND_CONFIG=()
CONFIG_FILE=""

if [[ -n "${KAFKA_SASL_USERNAME:-}" && -n "${KAFKA_SASL_PASSWORD:-}" ]]; then
  if [[ "${KAFKA_TOPICS_CLI}" != "kafka-topics" ]]; then
    cat <<'MSG'
⚠️  SASL credentials detected but the Kafka CLI runs inside a container.
    Mount a configuration file manually or execute the script with KAFKA_TOPICS_CLI=kafka-topics
    so the temporary client config can be created on the host machine.
MSG
    exit 1
  fi

  CONFIG_FILE="$(mktemp)"
  cat <<CONFIG >"${CONFIG_FILE}"
sasl.mechanism=${KAFKA_SASL_MECHANISM:-PLAIN}
security.protocol=${KAFKA_SECURITY_PROTOCOL:-SASL_SSL}
sasl.jaas.config=org.apache.kafka.common.security.plain.PlainLoginModule required \
  username="${KAFKA_SASL_USERNAME}" password="${KAFKA_SASL_PASSWORD}";
CONFIG
  COMMAND_CONFIG=(--command-config "${CONFIG_FILE}")
fi

read -r -a KAFKA_TOPICS_COMMAND <<<"${KAFKA_TOPICS_CLI}"

create_topic() {
  local topic_name="$1"

  echo "➡️  Creating topic '${topic_name}' (partitions=${KAFKA_TOPIC_PARTITIONS}, replication=${KAFKA_TOPIC_REPLICATION_FACTOR})"
  "${KAFKA_TOPICS_COMMAND[@]}" \
    --bootstrap-server "${KAFKA_BROKERS}" \
    --create \
    --if-not-exists \
    --topic "${topic_name}" \
    --partitions "${KAFKA_TOPIC_PARTITIONS}" \
    --replication-factor "${KAFKA_TOPIC_REPLICATION_FACTOR}" \
    "${COMMAND_CONFIG[@]}"
}

create_topic "${KAFKA_STATEMENTS_IN_TOPIC}"
create_topic "${KAFKA_STATEMENTS_OUT_TOPIC}"

echo "✅ Topics ready"

if [[ -n "${CONFIG_FILE}" ]]; then
  rm -f "${CONFIG_FILE}"
fi
