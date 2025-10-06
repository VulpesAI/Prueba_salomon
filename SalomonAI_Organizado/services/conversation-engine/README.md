# Conversation Engine

Servicio FastAPI que gestiona el flujo conversacional de SalomonAI.

## Características

- Endpoint `/chat` y `/chat/stream` con streaming JSONL para el frontend.
- Detección de intents en español usando spaCy con reglas financieras.
- Resolución de intents contra `core-api` o directamente desde Supabase/Qdrant cuando no hay backend central.
- Endpoint `/context/summary` para dashboards del frontend.
- Endpoint `/chat/llm` que combina Qdrant + OpenAI GPT-4 para preguntas conversacionales.
- Preparado para despliegue vía Docker.

### Intents soportados en el MVP

- `consulta_balance`: preguntas sobre saldo disponible o balance consolidado.
- `gastos_categoria`: detalle de gastos agrupados por categoría o rubro.
- `plan_ahorro`: dudas sobre metas u objetivos de ahorro.
- `limite_credito`: consultas sobre cupos o límites de tarjetas y líneas de crédito.

## Desarrollo local

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

Configura `CORE_API_BASE_URL` para conectar al backend principal.
Si deseas operar sin `core-api`, define `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
y (opcionalmente) `QDRANT_URL`/`QDRANT_API_KEY` para habilitar el modo directo.

### Asistente conversacional con GPT-4

1. Define en tu `.env` las claves necesarias:

```bash
OPENAI_API_KEY=sk-...
CONVERSATION_ENGINE_OPENAI_MODEL=gpt-4o-mini
CONVERSATION_ENGINE_OPENAI_EMBEDDING_MODEL=text-embedding-3-small
QDRANT_URL=http://localhost:6333  # si lo ejecutas local
QDRANT_API_KEY= # opcional para despliegues gestionados
```

2. Inicia el servicio como se describe arriba. Luego puedes probar el nuevo endpoint:

```bash
curl -X POST http://localhost:8002/chat/llm \
  -H "Content-Type: application/json" \
  -d '{
        "session_id": "demo-user",
        "question": "¿Cómo evolucionaron mis gastos de alimentación este mes?"
      }'
```

El servicio buscará contexto financiero en Qdrant, generará el prompt y devolverá una
respuesta en lenguaje natural del modelo GPT-4, indicando si se utilizó resumen o
fragmentos del vector store.

3. También dispones de un script de ejemplo que imprime la respuesta en consola:

```bash
python -m app.demo_llm
```

El script utiliza las mismas variables de entorno que la aplicación principal.
