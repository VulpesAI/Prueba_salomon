# Voice Gateway

Servicio FastAPI que abstrae proveedores de STT/TTS para SalomonAI y expone APIs REST/WebSocket.

## Características

- Endpoint REST `/voice/transcriptions` (STT) y `/voice/speech` (TTS).
- WebSocket `/voice/stream` para transcripción en tiempo real.
- Clientes mock por defecto, con estructura para integrar Google Cloud o Azure.

## Desarrollo local

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8100
```

Configura `VOICE_STT_PROVIDER` / `VOICE_TTS_PROVIDER` según el proveedor deseado.
