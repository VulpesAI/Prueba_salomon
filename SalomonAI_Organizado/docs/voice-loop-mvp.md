# SalomónAI - Voice Loop MVP

Este documento describe el flujo punta a punta del MVP de conversación por voz utilizando exclusivamente servicios de OpenAI.

## Visión general

1. El frontend captura audio con `MediaRecorder` y lo convierte a Base64.
2. El audio se envía a `POST /voice/transcriptions`, que usa Whisper en OpenAI para obtener texto.
3. El texto transcrito se envía a `POST /conversation/chat`, respaldado por GPT-4o-mini.
4. La respuesta generada se envía a `POST /voice/speech`, que usa `gpt-4o-mini-tts` para obtener audio.
5. El frontend reproduce el audio resultante y muestra el texto del asistente.

Todos los servicios usan OpenAI como proveedor por defecto y tiempo de espera de 60 segundos, con degradación controlada cuando una etapa falla.

## Endpoints involucrados

### 1. `POST /voice/transcriptions`

- **Body**: `{ "audio_base64": string, "mime": "audio/m4a", "language": "es" }`
- **Respuesta**: `{ "text": string, "language": "es", "provider": "openai", "duration_sec": number }`
- **Implementación**: `services/voice-gateway/app/main.py` delega en `OpenAISttProvider` (`providers.py`).
- **Errores**: Devuelve `400` cuando falta audio y `502` si OpenAI falla.

### 2. `POST /conversation/chat`

- **Body**:
  ```json
  {
    "user_id": "uuid",
    "messages": [
      {"role": "system", "content": "..."},
      {"role": "user", "content": "..."}
    ],
    "model": "gpt-4o-mini",
    "temperature": 0.2
  }
  ```
- **Respuesta**: `{ "reply": string, "usage": { "prompt_tokens": number, "completion_tokens": number, "total_tokens": number } }`
- **Implementación**: `services/conversation-engine/app/main.py` utiliza `AsyncOpenAI.responses.create` y registra hashes en los logs para evitar PII.
- **Errores**: `400` si no hay mensajes, `503` si falta la clave de OpenAI y `502` ante fallas del proveedor.

### 3. `POST /voice/speech`

- **Body**: `{ "text": string, "voice": "alloy", "format": "mp3", "language": "es-CL" }`
- **Respuesta**: `{ "audio_base64": string, "mime": "audio/mp3", "provider": "openai" }`
- **Implementación**: `voice-gateway` usa `OpenAITTSClient` por defecto (`gpt-4o-mini-tts`).
- **Errores**: `400` para texto vacío o formatos no soportados y `502` cuando OpenAI falla.

## Frontend (`Next.js 15` / `React 19`)

### Utilidad `voiceTurn`

Archivo: `frontend/utils/voiceLoop.ts`.

- Convierte el `Blob` de audio en Base64 (`blobToBase64`).
- Solicita STT → Chat → TTS usando `fetch` con `AbortController` y `timeout` configurable (60s por defecto).
- Reintenta la llamada de chat una vez antes de propagar el error.
- Devuelve texto de usuario y asistente, `Blob` del audio TTS (o `null` si falló) y métricas de latencia (`sttMs`, `chatMs`, `ttsMs`, `totalMs`).
- Exponen `VoiceLoopError` (con códigos `stt_failed`, `chat_failed`, `tts_failed`, `empty_transcript`, etc.) para que la UI pueda reaccionar.
- Incluye `synthesizeSpeech` para reintentar solo la etapa TTS.

### Componente `VoiceButton`

Archivo: `frontend/components/VoiceButton.tsx`.

- Gestiona la captura de audio con `MediaRecorder` y controla los estados `idle` → `recording` → `processing`.
- Llama a `voiceTurn` al terminar la grabación y reproduce el audio sintetizado (creando un `Blob` y asignándolo a un elemento `<audio>`).
- Muestra el texto del asistente, errores amigables y métricas de latencia.
- Si el TTS falla devuelve el texto en pantalla y permite reintentar el audio con `synthesizeSpeech`.

## Variables de entorno relevantes

Configura en `.env` del proyecto raíz:

```bash
# Conversación (OpenAI)
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_CHAT_TEMPERATURE=0.2
OPENAI_TIMEOUT_MS=60000

# STT
VOICE_STT_PROVIDER=openai
VOICE_STT_LANGUAGE=es

# TTS
VOICE_TTS_PROVIDER=openai
VOICE_TTS_DEFAULT_VOICE=alloy
VOICE_TTS_DEFAULT_FORMAT=mp3
VOICE_TTS_DEFAULT_LANG=es-CL
```

## Manejo de errores y observabilidad

- **STT**: si falla se lanza `VoiceLoopError('stt_failed')` y la UI muestra “No se entendió el audio, intenta nuevamente”.
- **Chat**: se reintenta automáticamente una vez; si persiste, se lanza `VoiceLoopError('chat_failed')`.
- **TTS**: captura la excepción, devuelve el texto del asistente y marca `ttsError` para habilitar “Reintentar audio”.
- **Latencias**: el frontend registra tiempos por etapa y total; la UI los muestra y pueden enviarse a la telemetría interna.
- **Logs backend**: se registran únicamente hashes de usuario y mensajes para evitar PII.

Con esta configuración se obtiene una experiencia conversacional en voz operativa, con degradación controlada y contratos de API estables.
