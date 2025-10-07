# Voice Gateway

Servicio FastAPI que abstrae proveedores de STT/TTS para SalomonAI y expone APIs REST/WebSocket.

## Características

- Endpoint REST `/voice/transcriptions` (STT) y `/voice/speech` (TTS).
- WebSocket `/voice/stream` para transcripción y respuesta en tiempo real usando OpenAI Realtime como proveedor predeterminado.
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
- Controla los valores por defecto del endpoint `/voice/speech` con `VOICE_TTS_DEFAULT_VOICE`, `VOICE_TTS_DEFAULT_FORMAT`, `VOICE_TTS_DEFAULT_LANG`, `VOICE_TTS_SPEED` y `VOICE_TTS_MAX_CHARS`.
- `VOICE_TTS_PROVIDER` soporta `openai` (predeterminado), con stubs disponibles para `aws`, `gcp` y `azure` que devuelven `503` hasta configurar credenciales reales.

### Streaming WebSocket `/voice/stream`

- Requiere `OPENAI_REALTIME_API_KEY` (o `OPENAI_API_KEY`) y `OPENAI_REALTIME_MODEL`.
- Ajusta `OPENAI_REALTIME_VOICE`, `OPENAI_REALTIME_AUDIO_FMT`, `OPENAI_TRANSCRIBE_MODEL`, `VOICE_STREAM_SAMPLE_RATE` y `VOICE_STREAM_MAX_SECS` según tus necesidades.
- Personaliza el prompt del sistema con `OPENAI_REALTIME_SYSTEM_PROMPT` si es necesario.
- Mensajes del cliente soportados:
  - `{ "type": "config", "voice": "alloy", "lang": "es-CL", "audio_format": "mp3" }` para actualizar la sesión.
  - `{ "type": "audio_chunk", "audio_base64": "..." }` o audio binario PCM16/16kHz.
  - `{ "type": "commit" }` para indicar fin de enunciado y solicitar respuesta.
  - `{ "type": "text", "text": "Resúmeme mis gastos del mes." }` para prompts sin audio.
- Eventos enviados al cliente:
  - `partial_transcript` con texto parcial y bandera `final` cuando se completa.
  - `tts_chunk` con audio base64 (formato según configuración).
  - `message` con la respuesta final (`final: true`).
  - `error` ante problemas de validación o del proveedor.
