#!/usr/bin/env bash
set -euo pipefail
BS=${KAFKA_BROKER:-"kafka:9092"}
create() { kafka-topics --bootstrap-server "$BS" --create --if-not-exists --topic "$1" --replication-factor 1 --partitions 3; }
for T in \
  statements.uploaded statements.out \
  transactions.parsed analytics.updated forecast.created recs.updated \
  dlq.statements.uploaded dlq.transactions.parsed dlq.analytics.updated dlq.forecast.created dlq.recs.updated
do create "$T"; done
kafka-topics --bootstrap-server "$BS" --list
