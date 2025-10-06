# Observabilidad con Prometheus y Grafana

Este documento resume cómo habilitar y explotar la pila de observabilidad que acompaña
al MVP de SalomónAI. Incluye los endpoints instrumentados, métricas publicadas y
sugerencias de paneles en Grafana para los servicios críticos.

## Componentes

- **Prometheus** (`prometheus/`): realiza *scraping* cada 30 segundos y expone las
  series para Grafana y Alertmanager.
- **Grafana**: consume Prometheus como `datasource` y permite construir dashboards
  temáticos para parsing, recomendaciones y voz.
- **Exporters internos**: los servicios Python exponen `/metrics` (FastAPI) o un
  servidor HTTP embebido (parsing-engine) usando `prometheus-client`.

## Endpoints instrumentados

| Servicio | Endpoint | Puerto | Métricas clave |
| --- | --- | --- | --- |
| parsing-engine | `http://parsing-engine:9101/metrics` | 9101 | `parsing_engine_statements_processed_total`, `parsing_engine_processing_duration_seconds`, `parsing_engine_document_bytes` |
| recommendation-engine | `http://recommendation-engine:8000/metrics` | 8000 | `recommendation_engine_pipeline_runs_total`, `recommendation_engine_recommendations_served_total`, `recommendation_engine_feedback_score` |
| voice-gateway | `http://voice-gateway:8100/metrics` | 8100 | `voice_gateway_transcriptions_total`, `voice_gateway_synthesis_latency_seconds`, `voice_gateway_stream_sessions_total` |

La configuración de Prometheus (`prometheus/prometheus.yml`) ya incluye los `scrape_configs`
correspondientes para entornos locales y productivos en Docker Compose.【F:prometheus/prometheus.yml†L37-L63】

## Métricas destacadas

### Parsing engine

- `parsing_engine_statements_processed_total{status="completed"}` para tasas de éxito.
- `parsing_engine_statement_failures_total` segmentado por `reason` para priorizar bugs
  (errores de almacenamiento vs. parsing).【F:services/parsing-engine/src/consumer.py†L17-L119】
- `parsing_engine_processing_duration_seconds` y `parsing_engine_document_bytes` para
  dimensionar capacidad y detectar outliers.【F:services/parsing-engine/src/consumer.py†L21-L108】

### Recommendation engine

- `recommendation_engine_pipeline_runs_total` y `recommendation_engine_pipeline_duration_seconds`
  aseguran que el pipeline se ejecute en SLA.【F:services/recommendation-engine/main.py†L29-L158】
- `recommendation_engine_recommendations_served_total{endpoint="personalized"}`
  cuantifica recomendaciones entregadas en APIs críticas.【F:services/recommendation-engine/main.py†L237-L280】
- `recommendation_engine_feedback_score` permite construir histogramas de satisfacción
  por periodo.【F:services/recommendation-engine/main.py†L46-L89】

### Voice gateway

- `voice_gateway_transcriptions_total` y `voice_gateway_transcription_latency_seconds`
  muestran carga y latencia de los proveedores STT.【F:services/voice-gateway/app/main.py†L23-L140】
- `voice_gateway_stream_active_connections` y `voice_gateway_stream_session_duration_seconds`
  ayudan a dimensionar concurrencia en sesiones WebSocket.【F:services/voice-gateway/app/main.py†L73-L136】
- `voice_gateway_stream_errors_total` rastrea fallas por tipo de excepción.【F:services/voice-gateway/app/main.py†L109-L136】

## Paneles sugeridos en Grafana

1. **Parsing Overview**
   - Promedios y percentiles P50/P95/P99 de `parsing_engine_processing_duration_seconds`.
   - Conteo de `parsing_engine_statement_failures_total` por `reason` en un panel tipo
     *bar chart*.
   - Serie de bytes procesados (`rate(parsing_engine_document_bytes_sum[5m])`) para
     dimensionar almacenamiento.

2. **Recommendation Health**
   - `increase(recommendation_engine_pipeline_runs_total{status="success"}[1h])` con
     alertas si no hay ejecuciones.
   - `rate(recommendation_engine_recommendations_served_total[5m])` para el endpoint
     personalizado vs. transaccional.
   - Distribución de `recommendation_engine_feedback_score_bucket` para evaluar
     satisfacción.

3. **Voice Gateway Ops**
   - `rate(voice_gateway_transcriptions_total[5m])` y `histogram_quantile` sobre la
     latencia de transcripción.
   - `voice_gateway_stream_active_connections` como gauge en tiempo real.
   - Tabla de `voice_gateway_stream_errors_total` con anotaciones para incidentes.

## Alertas recomendadas

- **Parsing bloqueado**: alerta cuando `increase(parsing_engine_statements_processed_total{status="completed"}[15m]) == 0`.
- **Pipeline atrasado**: dispara si `recommendation_engine_pipeline_duration_seconds_bucket`
  muestra ejecuciones >5 minutos de forma consecutiva.
- **Voz inestable**: alerta cuando `voice_gateway_stream_errors_total` incrementa
  >10 eventos en 5 minutos o la duración promedio cae por debajo de 10 segundos.

## Integración con CI/CD

- Ejecutar pruebas de humo tras despliegues verificando que `/metrics` responde (HTTP 200).
- Exportar dashboards como *json* y versionarlos dentro de `prometheus/dashboards/`
  (carpeta sugerida) para revisiones de cambios.
- Documentar en pipelines de despliegue la recarga automática de dashboards
  (`grafana-dashboard provision`).

## Próximos pasos

- Crear *recording rules* para ratios de éxito/latencia y reducir el costo de consultas.
- Integrar Alertmanager con canales de respuesta (Slack, correo) y runbooks.
- Extender la instrumentación al `core-api` y `conversation-engine` para cierre de loop.
