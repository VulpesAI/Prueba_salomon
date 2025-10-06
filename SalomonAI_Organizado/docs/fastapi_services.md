# Documentación de microservicios FastAPI y servicios auxiliares

Este documento resume los endpoints, modelos de datos, configuración y flujos internos de los servicios FastAPI que componen la plataforma SalomónAI, junto con el proceso de ingesta del *parsing-engine*. Sirve como guía de integración con `core-api`, Kafka y otros componentes.

## Conversation Engine (`services/conversation-engine`)

### Endpoints principales

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/health` | Verificación de vida simple. |
| `GET` | `/context/summary?session_id=<id>` | Recupera el resumen financiero de la sesión activo. |
| `POST` | `/intents/detect` | Detecta intents en un mensaje de chat. |
| `POST` | `/chat/stream` | Devuelve un *stream* JSONL con intent reconocido, *insights*, tokens y metadatos. |
| `POST` | `/chat` | Atajo que acepta JSON y delega en el flujo *streaming*. |

### Modelos Pydantic relevantes

- `ChatRequest`, `ChatChunk`, `ChatMessage`, `IntentCandidate`, `IntentDetectionResponse`, `IntentResolution` y `FinancialSummary` encapsulan mensajes y respuestas conversacionales.【F:services/conversation-engine/app/models.py†L9-L64】
- `ErrorResponse` captura errores globales del servicio.【F:services/conversation-engine/app/models.py†L66-L69】

### Configuración y dependencias

- Variables de entorno:
  - `CORE_API_BASE_URL`: URL base para llamar a `core-api` (por ejemplo `http://core-api:8080`).【F:services/conversation-engine/app/core_client.py†L36-L74】
  - `SPACY_MODEL`: modelo spaCy en español; si no está disponible se usa `es_core_news_md` y cae a un pipeline vacío si falta.【F:services/conversation-engine/app/nlu.py†L20-L33】
- Dependencias externas: `httpx` para invocar `core-api`, spaCy para NLU y FastAPI.

### Flujo interno de intents y *fallback*

1. El ciclo de vida (`lifespan`) carga `SpanishNLU` y `CoreAPIClient` al iniciar la app.【F:services/conversation-engine/app/main.py†L31-L41】
2. `SpanishNLU.detect_intents` aplica coincidencia por *keywords* y extrae entidades; si no hay coincidencias crea un intent `consulta_general` con confianza baja.【F:services/conversation-engine/app/nlu.py†L35-L71】
3. `/chat/stream` detecta el mejor intent, emite un evento JSONL y solicita resolución a `core-api`. Si `core-api` falla se usa `_fallback_resolution` con respuestas estáticas y un resumen financiero precargado.【F:services/conversation-engine/app/main.py†L59-L109】【F:services/conversation-engine/app/core_client.py†L76-L155】
4. Tras recibir la resolución se envían insights, tokens de la respuesta y el resumen actualizado (vía `core-api`).

### Plan de mejoras con LLM avanzado

**Objetivo.** Habilitar conversaciones abiertas que combinen intents clásicos con respuestas generadas por un LLM (OpenAI GPT-4) enriquecidas con el contexto financiero del usuario. Se prioriza preservar el flujo *streaming* actual y registrar cada interacción para auditoría.

**Componentes involucrados.**

- `conversation-engine`: orquestará la detección de intents, búsqueda semántica y la llamada al LLM.
- `core-api`: seguirá entregando resúmenes y endpoints financieros; expondrá datos adicionales para vectorización.
- **Qdrant**: almacenará embeddings de transacciones, resúmenes mensuales y notas del usuario para recuperación semántica.
- **OpenAI GPT-4**: proveedor gestionado para la generación en lenguaje natural vía API.

**Flujo propuesto.**

1. **Vectorización nocturna** (script ETL o tarea en `recommendation-engine`):
   - Obtener transacciones recientes, balances y resúmenes desde `core-api`/Supabase.
   - Generar embeddings con el modelo de `text-embedding-3-large` (o equivalente) y almacenarlos en Qdrant (`financial_context` con `user_id` como *payload*).
   - Persistir *snapshots* agregados (p. ej., gastos por categoría, metas de ahorro) como documentos sintéticos.
2. **Atención en línea** (`/chat/stream`):
   - Detectar intent; si la confianza es baja o el intent admite enriquecimiento, ejecutar búsqueda semántica en Qdrant (`vector + filtros por user_id/fecha`).
   - Construir *prompt* con: instrucciones de tono, resumen financiero reciente (`core-api`), top-k resultados de Qdrant y el mensaje del usuario.
   - Invocar GPT-4 con `response_format=json_schema` para controlar la estructura (`tokens`, `insights`, `actions`).
   - Emitir los tokens mediante SSE manteniendo compatibilidad con el frontend.
3. **Post-procesamiento y trazabilidad**:
   - Registrar en Supabase/Qdrant la interacción y el contexto usado.
   - Enviar métricas (latencia, coste estimado por tokens) a Prometheus.

**Cambios técnicos prioritarios.**

| Área | Acción | Dependencias |
| --- | --- | --- |
| Configuración | Añadir variables `OPENAI_API_KEY`, `OPENAI_BASE_URL` (opcional), `LLM_MODEL_ID`, `QDRANT_FINANCIAL_COLLECTION`, `LLM_MAX_TOKENS`. | `secrets.enc.json`, `docker-compose.yml`. |
| SDK OpenAI | Crear cliente asíncrono en `services/conversation-engine/app/llm_client.py` con *retry/backoff* y soporte de *streaming*. | Librería `openai>=1.0`. |
| Recuperación | Implementar `FinancialContextRetriever` reutilizando `qdrant-client` (ya usado en `core-api`) para búsquedas filtradas por `user_id`. | Acceso a Qdrant y embeddings actualizados. |
| Orquestación | Extender `/chat/stream` para combinar intents + respuesta LLM (`resolve_llm_response`). Mantener *fallback* actual cuando la API falle o supere tiempo límite. | Tests E2E, control de latencia. |
| Observabilidad | Incorporar métricas (`LLM_LATENCY`, `RETRIEVAL_SIZE`) y logs estructurados con IDs de sesión. | Stack Prometheus + Loki. |

**Consideraciones de seguridad y costes.**

- Limitar la información enviada al LLM: no incluir datos sensibles (CLABE, tarjetas completas). Usar máscaras y reglas de *redaction* previas.
- Gestionar *rate limits* mediante colas o *circuit breakers* (p. ej., redis + ventana móvil por usuario).
- Calcular y exponer el coste mensual estimado usando métricas de tokens; definir alertas cuando se supere el presupuesto.
- Mantener *fallback* local con respuestas estáticas para intents críticos si GPT-4 está indisponible.

**Cronograma sugerido.**

1. *Semana 1*: definir esquema de Qdrant (`financial_context`), preparar embeddings históricos y validar rendimiento de búsquedas.
2. *Semana 2*: implementar cliente GPT-4 + flujo de recuperación en `conversation-engine`; cubrir pruebas unitarias.
3. *Semana 3*: ejecutar pruebas end-to-end con frontend, medir latencia y costos, endurecer seguridad (masking, auditoría).
4. *Semana 4*: despliegue gradual en *staging*, activar monitoreo y retroalimentación de usuarios pilotos.

### Interacciones con `core-api` y otros componentes

- Invoca `POST /api/ai/intents/resolve` y `GET /api/ai/summary/{sessionId}` en `core-api` usando `CORE_API_BASE_URL`.
- Produce eventos JSONL que suelen ser consumidos por el frontend vía SSE.
- No publica en colas; depende de `core-api` para orquestar datos financieros.

### Ejemplos de uso

```bash
curl http://localhost:8000/health

curl -X POST http://localhost:8000/intents/detect \
  -H 'Content-Type: application/json' \
  -d '{"session_id":"sess-123","message":"¿Cuál es mi saldo?"}'

# Stream de chat (JSONL)
curl -N -X POST http://localhost:8000/chat/stream \
  -H 'Content-Type: application/json' \
  -d '{
        "session_id": "sess-123",
        "message": "Necesito saber mis gastos en alimentación",
        "metadata": {"channel": "web"}
      }'
```

Respuesta esperada (`/chat/stream`):

```jsonl
{"type":"intent","intent":{...}}
{"type":"insight","insight":{...}}
{"type":"token","token":"Durante "}
...
{"type":"summary","summary":{...}}
{"type":"done","intent":"gastos_categoria"}
```

### Despliegue y monitorización

- Ejecutable con `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- Métricas: revisar logs (nivel INFO). Se recomienda exponer `/health` a Prometheus/Alertmanager.
- Requiere conectividad a spaCy y `core-api` antes de aceptar tráfico.

---

## Forecasting Engine (`services/forecasting-engine`)

### Endpoints principales

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/health` | Chequeo básico. |
| `GET` | `/forecasts/{user_id}` | Genera proyecciones de flujo de caja; acepta `horizon` y `model` como *query params*. |

### Modelos Pydantic

- `ForecastResponse` incluye metadatos del usuario, modelo usado, horizonte, puntos de pronóstico y métricas históricas.【F:services/forecasting-engine/app/models.py†L12-L27】
- `ForecastPoint` representa un día proyectado.【F:services/forecasting-engine/app/models.py†L8-L11】
- `ErrorResponse` devuelve errores de indisponibilidad.【F:services/forecasting-engine/app/models.py†L30-L32】

### Configuración y dependencias

- Variables `FORECASTING_*` gestionadas por `Settings` (`database_url`, `default_model`, `default_horizon_days`, `minimum_history_days`).【F:services/forecasting-engine/app/config.py†L8-L34】
- Conexión a Postgres mediante SQLAlchemy (`create_db_engine`).【F:services/forecasting-engine/app/database.py†L11-L24】
- Librerías: `statsmodels` (ARIMA), `prophet` (opcional, detectado dinámicamente), `pandas`, `numpy`.

### Lógica ARIMA/Prophet

1. `_load_history` agrega movimientos financieros diarios desde `financial_movements` en la base de datos del *core*.【F:services/forecasting-engine/app/forecasting.py†L31-L54】
2. Si no hay historial se usa `_fallback_projection` (promedio móvil + tendencia).【F:services/forecasting-engine/app/forecasting.py†L56-L72】
3. Según la preferencia:
   - `prophet`: entrena `Prophet` con estacionalidades diarias y semanales.【F:services/forecasting-engine/app/forecasting.py†L80-L92】
   - `arima`: ajusta un `ARIMA(1,1,1)` y pronostica `horizon` pasos.【F:services/forecasting-engine/app/forecasting.py†L74-L78】
   - `auto`: intenta Prophet si está disponible y hay historia suficiente (`minimum_history_days`), de lo contrario usa ARIMA; en caso de fallo se vuelve al *fallback* heurístico.【F:services/forecasting-engine/app/forecasting.py†L98-L134】
4. Construye una respuesta con puntos diarios desde la última fecha histórica.【F:services/forecasting-engine/app/forecasting.py†L136-L157】

### Interacciones

- Requiere acceso a la base de datos compartida (Postgres) utilizada por `core-api`.
- No llama a `core-api` directamente; expone su API para que `core-api` o frontend consuman proyecciones.

### Ejemplo de uso

```bash
curl "http://localhost:8001/forecasts/user-123?horizon=45&model=auto"
```

Respuesta simplificada:

```json
{
  "user_id": "user-123",
  "model_type": "prophet",
  "horizon_days": 45,
  "forecasts": [
    {"date": "2024-07-01", "amount": 125000.5},
    ...
  ],
  "metadata": {"history_start": "2023-09-10", ...}
}
```

### Despliegue y monitorización

- Ejecutar con `uvicorn app.main:app --port 8001`.
- Supervisar logs de advertencia que indican *fallback* a heurísticas.
- Integrar `/health` en comprobaciones liveness/readiness y vigilar consumo de CPU/memoria por Prophet.

---

## Recommendation Engine (`services/recommendation-engine`)

### Endpoints principales

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/` | Banner con estado general. |
| `GET` | `/health` | Estado del motor y del pipeline. |
| `POST` | `/pipeline/run` | Ejecuta el pipeline ETL sin esperar al cron interno. |
| `GET` | `/pipeline/status` | Devuelve últimos metadatos del pipeline. |
| `GET` | `/features/{user_id}` | Resumen de *features* agregadas para el usuario. |
| `GET` | `/recommendations/personalized/{user_id}` | Genera recomendaciones personalizadas (opción `refresh`). |
| `GET` | `/recommendations/personalized/{user_id}/history` | Historial de recomendaciones persistidas en memoria. |
| `GET` | `/recommendations/personalized/{user_id}/feedback` | Feedback recibido por usuario. |
| `POST` | `/recommendations/feedback` | Registra feedback sobre una recomendación. |
| `POST` | `/recommendations` | Endpoint legado para recomendación rápida basada en una transacción. |

### Modelos Pydantic

- `TransactionData`, `RecommendationItem`, `PersonalizedRecommendationsResponse`, `FeedbackRequest`, `FeedbackResponse` y `PipelineStatusResponse` modelan entradas y salidas JSON (alias `camelCase` para compatibilidad).【F:services/recommendation-engine/main.py†L510-L667】
- El servicio usa `dataclasses` (`UserFeatures`, `RecommendationRecord`, `FeedbackEntry`) para estados internos de pipeline y almacenamiento.【F:services/recommendation-engine/main.py†L24-L123】

### Configuración y dependencias

- Variables:
  - `PIPELINE_MODE` (`api` o `kafka`).
  - `FINANCIAL_MOVEMENTS_API_URL`: URL en `core-api` para movimientos categorizados.【F:services/recommendation-engine/main.py†L614-L631】
  - `KAFKA_BOOTSTRAP_SERVERS`, `KAFKA_TRANSACTIONS_TOPIC` (por defecto `financial.movements.categorized`).
  - `PIPELINE_REFRESH_SECONDS`, `PIPELINE_CLUSTER_COUNT`, `PIPELINE_API_TIMEOUT`, `PIPELINE_KAFKA_BATCH`.
- Dependencias externas: `httpx` (API core), `aiokafka` (opcional), `scikit-learn` (`KMeans`), `numpy`, `asyncio`.

### Pipeline y clustering

1. `RecommendationPipeline` programa `run_once` periódicamente (intervalo configurable).【F:services/recommendation-engine/main.py†L468-L548】
2. `TransactionFetcher` obtiene transacciones vía API de `core-api` o Kafka (`financial.movements.categorized`).【F:services/recommendation-engine/main.py†L352-L437】
3. `FeatureBuilder` agrega métricas por usuario (ingresos, gastos, ratios, categoría principal).【F:services/recommendation-engine/main.py†L58-L119】
4. `RecommendationModelManager` entrena `KMeans` (cuando hay suficientes usuarios) y genera recomendaciones basadas en reglas y perfiles de clúster.【F:services/recommendation-engine/main.py†L210-L343】
5. `RecommendationStore` mantiene historial y feedback en memoria.【F:services/recommendation-engine/main.py†L144-L207】

### Interacciones

- Consume movimientos de `core-api`:
  - HTTP: `GET /api/v1/categorized` (por defecto `http://financial-movements:8002/...`).
  - Kafka: tópico `financial.movements.categorized` (si `PIPELINE_MODE=kafka`).
- No escribe directamente en `core-api`, pero suele ser invocado por este para enriquecer respuestas.
- Expone recomendaciones para el frontend y el *conversation-engine*.

### Ejemplos de uso

```bash
# Ejecutar pipeline bajo demanda
auth="Authorization: Bearer <token>"  # si aplica
a curl -X POST http://localhost:8002/pipeline/run -H "$auth"

# Obtener recomendaciones personalizadas
curl "http://localhost:8002/recommendations/personalized/user-123?refresh=true"

# Enviar feedback
timestamp=$(date -Iseconds)
curl -X POST http://localhost:8002/recommendations/feedback \
  -H 'Content-Type: application/json' \
  -d '{
        "recommendationId": "4e58...",
        "userId": "user-123",
        "score": 0.9,
        "comment": "Muy útil"
      }'
```

### Despliegue y monitorización

- Arranca automáticamente el *pipeline* en `startup` y lo detiene en `shutdown` de FastAPI.【F:services/recommendation-engine/main.py†L633-L647】
- Vigilar `/pipeline/status` y logs (INFO/ERROR) para métricas de ejecución.
- En modo Kafka, monitorear retrasos en el tópico `financial.movements.categorized`.

---

## Voice Gateway (`services/voice-gateway`)

### Endpoints principales

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/health` | Estado básico del servicio. |
| `POST` | `/voice/transcriptions` | Transcripción de audio base64 (STT). |
| `POST` | `/voice/speech` | Síntesis de texto a audio (TTS). |
| `WS` | `/voice/stream` | Canal WebSocket para streaming de voz (envío de eventos JSON). |

### Modelos Pydantic

- `VoiceTranscriptionRequest/Response`, `VoiceSynthesisRequest/Response` y `VoiceStreamEvent` estructuran las operaciones de voz.【F:services/voice-gateway/app/models.py†L9-L39】

### Configuración y dependencias

- Variables: `VOICE_STT_PROVIDER`, `VOICE_TTS_PROVIDER` (actualmente solo `mock`).【F:services/voice-gateway/app/providers.py†L63-L78】
- Dependencias: `fastapi`, `WebSocket`, clientes STT/TTS implementados en `providers` (pueden reemplazarse por proveedores reales; se usan *mocks* con audio silencioso).【F:services/voice-gateway/app/providers.py†L1-L78】

### Flujo WebSocket/REST

- REST:
  - `/voice/transcriptions` invoca `BaseSTTClient.transcribe` y devuelve texto, confianza y proveedor.【F:services/voice-gateway/app/main.py†L33-L47】
  - `/voice/speech` invoca `BaseTTSClient.synthesize` y retorna audio codificado.【F:services/voice-gateway/app/main.py†L49-L61】
- WebSocket (`/voice/stream`):
  1. Acepta la conexión, responde estado `ready`.
  2. Maneja eventos `start`, `audio-chunk` y `stop`. Cada `audio-chunk` se envía al cliente STT en forma incremental (`transcribe_stream`).【F:services/voice-gateway/app/main.py†L63-L101】
  3. Emite transcripciones parciales o finales y finaliza al recibir `stop` o desconexión.【F:services/voice-gateway/app/main.py†L63-L104】

### Interacciones

- Actualmente no invoca `core-api` directamente; se espera que clientes consuman la transcripción y luego llamen a `conversation-engine`/`core-api`.
- Puede integrarse con proveedores externos de STT/TTS reemplazando `MockSTTClient`/`MockTTSClient`.

### Ejemplos de uso

```bash
curl -X POST http://localhost:8003/voice/transcriptions \
  -H 'Content-Type: application/json' \
  -d '{"audio_base64":"...","language":"es-CL"}'

curl -X POST http://localhost:8003/voice/speech \
  -H 'Content-Type: application/json' \
  -d '{"text":"Hola, ¿cómo estás?","voice":"es-CL-Standard-A"}'

# WebSocket (ejemplo con wscat)
wscat -c "ws://localhost:8003/voice/stream?language=es-CL"
> {"event":"start"}
> {"event":"audio-chunk","payload":{"chunk":"...base64..."}}
> {"event":"stop"}
```

### Despliegue y monitorización

- `uvicorn app.main:app --port 8003`.
- Monitorizar logs para errores STT/TTS y métricas de uso WebSocket.
- Incorporar health check al balanceador de voz.

---

## Parsing Engine (`services/parsing-engine`)

Aunque no expone FastAPI, forma parte del *backend* de ingesta documental.

- Ejecuta un `KafkaConsumer` que escucha `salomon.documents.new` (configurable vía `KAFKA_TOPIC`) y lee desde el *broker* `KAFKA_BROKER_URL` (por defecto `kafka:9092`).【F:services/parsing-engine/src/consumer.py†L1-L48】
- Reintenta la conexión al *broker* hasta cinco veces antes de abortar.【F:services/parsing-engine/src/consumer.py†L14-L30】
- Cada mensaje debe contener `filePath` y `userId`; procesa archivos CSV con `pandas` como muestra (extensible a otros formatos).【F:services/parsing-engine/src/consumer.py†L32-L47】
- Para desplegarlo, ejecutar `python src/consumer.py` en un contenedor con acceso a Kafka y al sistema de archivos compartido.
- Monitorización básica mediante logs impresos; se recomienda enviar métricas a Prometheus en futuras iteraciones.

---

## Pautas generales de despliegue y monitorización

1. **Orquestación**: los contenedores se definen en `docker-compose.yml`; asegúrate de proveer las variables mencionadas para cada servicio.
2. **Observabilidad**: exponer los endpoints `/health` en todos los servicios FastAPI y centralizar logs (por ejemplo, en ELK). Para servicios de streaming (chat/voice) es clave monitorear latencia.
3. **Seguridad**: agregar autenticación (tokens) en endpoints sensibles antes de exponerlos a producción.
4. **Integración con `core-api`**: revisar que `core-api` tenga permisos para invocar `/forecasts/*`, `/recommendations/*` y `/chat/*` según los flujos definidos.

