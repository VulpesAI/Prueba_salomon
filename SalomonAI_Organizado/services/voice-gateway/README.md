# Voice Gateway

Servicio FastAPI que abstrae proveedores de STT/TTS para SalomonAI y expone APIs REST/WebSocket.

## Características

- Endpoint REST `/voice/transcriptions` (STT) y `/voice/speech` (TTS).
- WebSocket `/voice/stream` para transcripción en tiempo real.
- Clientes mock por defecto y soporte oficial para OpenAI Whisper (STT) y gpt-4o-mini-tts (TTS).

## Desarrollo local

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8100
```

Configura `VOICE_STT_PROVIDER` / `VOICE_TTS_PROVIDER` según el proveedor deseado.
- Para OpenAI define además `VOICE_OPENAI_API_KEY`, `VOICE_OPENAI_STT_MODEL`, `VOICE_OPENAI_TTS_MODEL`, `VOICE_OPENAI_TTS_VOICE` y `VOICE_OPENAI_TTS_FORMAT`.
