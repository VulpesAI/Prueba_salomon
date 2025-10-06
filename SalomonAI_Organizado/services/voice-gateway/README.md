# Voice Gateway

Servicio FastAPI que abstrae proveedores de STT/TTS para SalomonAI y expone APIs REST/WebSocket.

## Características

- Endpoint REST `/voice/transcriptions` (STT) y `/voice/speech` (TTS).
- WebSocket `/voice/stream` para transcripción en tiempo real.
- Clientes mock por defecto y soporte oficial para OpenAI Whisper (STT) y gpt-4o-mini-tts (TTS).

`/voice/transcriptions` acepta audio base64 (JSON) o archivos multipart (`audio/m4a|mp3|wav|webm|ogg`). Devuelve texto en
español, idioma detectado, proveedor utilizado y duración del procesamiento. El formato `response_format=verbose_json`
expone los segmentos originales de Whisper en la clave `raw`.

## Desarrollo local

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8100
```

Configura `VOICE_STT_PROVIDER` / `VOICE_TTS_PROVIDER` según el proveedor deseado.
- `VOICE_STT_PROVIDER` por defecto es `openai`.
- Define `OPENAI_API_KEY`, `OPENAI_STT_MODEL` (por defecto `whisper-1`) y `OPENAI_STT_RESPONSE_FORMAT` (`text` o `verbose_json`).
- El tamaño máximo se controla con `VOICE_MAX_AUDIO_SECONDS` y `VOICE_MAX_AUDIO_BYTES`.
- Para TTS vía OpenAI define `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE` y `OPENAI_TTS_FORMAT` (compatibles con las variables heredadas `VOICE_OPENAI_*`).
