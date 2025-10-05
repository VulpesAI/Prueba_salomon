# Configuración de Voice Gateway

Esta guía resume los pasos para habilitar reconocimiento y síntesis de voz en el servicio `voice-gateway`.

## 1. Requisitos previos

1. Clona el repositorio y copia `.env.example` a `.env` en la raíz del proyecto.
2. Crea (o reusa) un proyecto con acceso a proveedores de voz compatibles. Actualmente se soporta **OpenAI** para STT/TTS y el proveedor `mock` para entornos sin credenciales.
3. Asegúrate de tener Docker o un entorno virtual de Python 3.11+ si ejecutarás el servicio manualmente.

## 2. Variables de entorno

Las credenciales se leen desde `.env`:

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `VOICE_STT_PROVIDER` | Sí | Proveedor para transcripción (`mock` u `openai`). |
| `VOICE_TTS_PROVIDER` | Sí | Proveedor para síntesis (`mock` u `openai`). |
| `VOICE_OPENAI_API_KEY` | Sí (cuando `openai`) | API key con permisos para `audio.transcriptions` y `audio.speech`. |
| `VOICE_OPENAI_STT_MODEL` | No | Modelo de transcripción (por defecto `gpt-4o-mini-transcribe`). |
| `VOICE_OPENAI_TTS_MODEL` | No | Modelo de síntesis (por defecto `gpt-4o-mini-tts`). |
| `VOICE_OPENAI_TTS_VOICE` | No | Voz de salida para TTS (por defecto `alloy`). |
| `VOICE_OPENAI_TTS_FORMAT` | No | Formato del audio generado (`mp3`, `wav`, etc.). |
| `VOICE_GATEWAY_ALLOWED_ORIGINS` | No | Orígenes permitidos para CORS; usa `*` en desarrollo. |
| `VOICE_GATEWAY_LOG_LEVEL` | No | Nivel de log (`INFO`, `DEBUG`, etc.). |

Guarda el archivo `.env` actualizado y expórtalo al entorno antes de arrancar el servicio (`source .env`).

## 3. Permisos en OpenAI

1. Crea una API key desde [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Verifica que la organización tenga habilitado el acceso a los endpoints de **Audio Transcriptions** y **Audio Speech**.
3. Limita la API key a las redes/IPs requeridas desde el panel de **API Keys** si tu política de seguridad lo exige.

## 4. Arranque del servicio

### Docker Compose

```bash
docker compose up --build voice-gateway
```

### Ejecución local

```bash
cd services/voice-gateway
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8100
```

## 5. Verificación rápida

1. Haz un `curl` al endpoint de salud:
   ```bash
   curl http://localhost:8100/health
   ```
2. Envía un fragmento de audio base64:
   ```bash
   curl -X POST http://localhost:8100/voice/transcriptions \
     -H "Content-Type: application/json" \
     -d '{"audio_base64": "<base64>", "language": "es-CL"}'
   ```
3. Solicita síntesis de texto:
   ```bash
   curl -X POST http://localhost:8100/voice/speech \
     -H "Content-Type: application/json" \
     -d '{"text": "Hola mundo", "language": "es-CL"}'
   ```

Si la API responde con `provider: "OpenAITTSClient"` o `OpenAISTTClient`, la integración quedó correcta.

## 6. Notas de seguridad

- Mantén `VOICE_OPENAI_API_KEY` fuera del control de versiones (`.env`, inyectores de secretos o gestores como AWS Secrets Manager).
- Para producción recomendamos restringir el modelo a los aprobados por tu organización y monitorear el consumo desde el dashboard de OpenAI.
- Los logs **no** almacenan el audio ni los textos sintetizados; solo se registran errores.
