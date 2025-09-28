# Conversation Engine

Servicio FastAPI que gestiona el flujo conversacional de SalomonAI.

## Características

- Endpoint `/chat` y `/chat/stream` con streaming JSONL para el frontend.
- Detección de intents en español usando spaCy con reglas financieras.
- Resolución de intents contra `core-api` (o dataset fallback).
- Endpoint `/context/summary` para dashboards del frontend.
- Preparado para despliegue vía Docker.

## Desarrollo local

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

Configura `CORE_API_BASE_URL` para conectar al backend principal.
