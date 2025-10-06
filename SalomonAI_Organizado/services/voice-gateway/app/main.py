from __future__ import annotations

import asyncio
import base64
import binascii
import json
import logging
import time
from typing import Dict, Optional

from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    Request,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.concurrency import run_in_threadpool

from .models import (
    VoiceStreamEvent,
    VoiceSynthesisRequest,
    VoiceSynthesisResponse,
    VoiceTranscriptionPayload,
    VoiceTranscriptionResponse,
)
from prometheus_client import Counter, Gauge, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from .providers import BaseTTSClient, STTProvider, get_stt_provider, get_tts_client
from .settings import get_settings
logger = logging.getLogger(__name__)
settings = get_settings()
logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))


metrics_instrumentator = Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    should_instrument_requests_inprogress=True,
)

TRANSCRIPTIONS_TOTAL = Counter(
    "voice_gateway_transcriptions_total",
    "Transcripciones realizadas por el servicio de voz",
    labelnames=("provider",),
)
TRANSCRIPTION_LATENCY = Histogram(
    "voice_gateway_transcription_latency_seconds",
    "Latencia de las solicitudes de transcripción",
    labelnames=("provider",),
    buckets=(0.1, 0.25, 0.5, 1, 2, 5, 10),
)
SYNTHESIS_TOTAL = Counter(
    "voice_gateway_synthesis_total",
    "Solicitudes de síntesis de voz atendidas",
    labelnames=("provider",),
)
SYNTHESIS_LATENCY = Histogram(
    "voice_gateway_synthesis_latency_seconds",
    "Latencia de las solicitudes de síntesis",
    labelnames=("provider",),
    buckets=(0.1, 0.25, 0.5, 1, 2, 5, 10),
)
STREAM_SESSIONS = Counter(
    "voice_gateway_stream_sessions_total",
    "Sesiones WebSocket procesadas por el gateway de voz",
    labelnames=("result",),
)
STREAM_SESSION_DURATION = Histogram(
    "voice_gateway_stream_session_duration_seconds",
    "Duración de las sesiones de streaming de voz",
    buckets=(5, 15, 30, 60, 120, 300, 600),
)
STREAM_ACTIVE = Gauge(
    "voice_gateway_stream_active_connections",
    "Número de conexiones WebSocket activas",
)
STREAM_AUDIO_CHUNKS = Counter(
    "voice_gateway_stream_audio_chunks_total",
    "Chunks de audio recibidos en sesiones de streaming",
    labelnames=("provider",),
)
STREAM_ERRORS = Counter(
    "voice_gateway_stream_errors_total",
    "Errores registrados durante sesiones de streaming",
    labelnames=("type",),
)


app = FastAPI(title="SalomonAI Voice Gateway", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

metrics_instrumentator.instrument(
    app,
    excluded_handlers=["/metrics", "/health"],
).expose(app, include_in_schema=False)


async def get_clients() -> Dict[str, object]:
    return {"stt": get_stt_provider(), "tts": get_tts_client()}


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/voice/transcriptions", response_model=VoiceTranscriptionResponse)
async def transcribe(
    request: Request,
    file: UploadFile | None = File(default=None),
    clients: Dict[str, object] = Depends(get_clients),
) -> VoiceTranscriptionResponse:
    stt: STTProvider = clients["stt"]  # type: ignore[assignment]
    provider_name = getattr(stt, "name", stt.__class__.__name__)

    language = settings.default_language
    response_format = settings.openai_stt_response_format
    mime = "audio/m4a"
    audio_bytes = b""
    audio_base64: Optional[str] = None

    if file is not None:
        audio_bytes = await file.read()
        mime = (file.content_type or mime).lower()
        form = await request.form()
        language = form.get("language", language)  # type: ignore[arg-type]
        response_format = form.get("response_format", response_format)  # type: ignore[arg-type]
        mime = (form.get("mime", mime) or mime).lower()  # type: ignore[arg-type]
        if form.get("audio_base64") and not audio_bytes:
            audio_base64 = str(form.get("audio_base64"))
    else:
        data = {}
        if request.headers.get("content-type", "").startswith("application/json"):
            try:
                data = await request.json()
            except json.JSONDecodeError as exc:  # pragma: no cover - protección
                raise HTTPException(status_code=400, detail="invalid_json_body") from exc
        if data:
            body = VoiceTranscriptionPayload.model_validate(data)
            audio_base64 = body.audio_base64
            if body.mime:
                mime = body.mime.lower()
            if body.language:
                language = body.language
            if body.response_format:
                response_format = body.response_format

    if audio_base64 and not audio_bytes:
        try:
            audio_bytes = base64.b64decode(audio_base64)
        except (ValueError, binascii.Error) as exc:
            raise HTTPException(status_code=400, detail="invalid_audio_base64") from exc

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="audio_required")

    if mime.lower() not in settings.allowed_mime_set:
        raise HTTPException(status_code=400, detail="mime_not_allowed")

    if len(audio_bytes) > settings.max_request_bytes:
        raise HTTPException(status_code=413, detail="audio_too_large")

    language = language or settings.default_language
    response_format = response_format or settings.openai_stt_response_format

    start_time = time.perf_counter()
    try:
        result = await run_in_threadpool(
            stt.transcribe,
            audio_bytes,
            mime,
            language,
            response_format,
        )
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - errores del proveedor
        logger.exception("Error al transcribir audio con %s: %s", provider_name, exc)
        raise HTTPException(status_code=502, detail="stt_failed") from exc

    duration = time.perf_counter() - start_time
    provider_label = result.get("provider", provider_name)
    result.setdefault("duration_sec", round(duration, 4))
    result.setdefault("language", language)
    result.setdefault("text", "")

    TRANSCRIPTIONS_TOTAL.labels(provider=provider_label).inc()
    TRANSCRIPTION_LATENCY.labels(provider=provider_label).observe(duration)

    response_raw = result.get("raw") or None
    logger.info(
        "Transcripción procesada",
        extra={
            "provider": provider_label,
            "mime": mime,
            "size_kb": round(len(audio_bytes) / 1024, 2),
            "language": language,
            "response_format": response_format,
        },
    )

    return VoiceTranscriptionResponse(
        text=result.get("text", ""),
        language=result.get("language", language),
        provider=provider_label,
        duration_sec=float(result.get("duration_sec", duration)),
        raw=response_raw,
    )


@app.post("/voice/speech", response_model=VoiceSynthesisResponse)
async def synthesize(
    payload: VoiceSynthesisRequest,
    clients: Dict[str, object] = Depends(get_clients),
) -> VoiceSynthesisResponse:
    tts: BaseTTSClient = clients["tts"]
    provider_name = type(tts).__name__
    start_time = time.perf_counter()
    result = await tts.synthesize(payload.text, language=payload.language, voice=payload.voice)
    duration = time.perf_counter() - start_time
    SYNTHESIS_TOTAL.labels(provider=provider_name).inc()
    SYNTHESIS_LATENCY.labels(provider=provider_name).observe(duration)
    return VoiceSynthesisResponse(
        audio_base64=result.get("audio_base64", ""),
        format=result.get("format", "audio/wav"),
        provider=type(tts).__name__,
    )


@app.websocket("/voice/stream")
async def voice_stream(websocket: WebSocket, language: Optional[str] = "es-CL"):
    await websocket.accept()
    stt = get_stt_provider()
    provider_name = getattr(stt, "name", type(stt).__name__)
    session_start = time.perf_counter()
    session_result = "completed"
    STREAM_ACTIVE.inc()
    try:
        await websocket.send_json({"type": "status", "status": "ready"})
        while True:
            message = await websocket.receive_text()
            data = VoiceStreamEvent.parse_obj(json.loads(message))
            if data.event == "start":
                await websocket.send_json({"type": "status", "status": "listening"})
                if not getattr(stt, "supports_streaming", False):
                    await websocket.send_json({
                        "type": "transcript",
                        "text": "Inicia tu mensaje cuando quieras",
                        "final": False,
                    })
            elif data.event == "audio-chunk":
                chunk = data.payload.get("chunk", "")
                result = await stt.transcribe_stream(chunk.encode())
                STREAM_AUDIO_CHUNKS.labels(provider=provider_name).inc()
                await websocket.send_json({"type": "transcript", **result})
            elif data.event == "stop":
                await websocket.send_json({"type": "status", "status": "stopped"})
                break
            else:
                await websocket.send_json({"type": "error", "message": f"Evento desconocido: {data.event}"})
    except WebSocketDisconnect:
        session_result = "disconnected"
        logger.info("Cliente WebSocket desconectado")
    except Exception as exc:  # pragma: no cover - logging de emergencia
        session_result = "error"
        STREAM_ERRORS.labels(type=exc.__class__.__name__).inc()
        logger.exception("Error en flujo de voz: %s", exc)
        await websocket.send_json({"type": "error", "message": str(exc)})
    finally:
        try:
            await websocket.close()
        except RuntimeError:
            pass
        STREAM_ACTIVE.dec()
        STREAM_SESSIONS.labels(result=session_result).inc()
        STREAM_SESSION_DURATION.observe(time.perf_counter() - session_start)


@app.exception_handler(Exception)
async def global_exception_handler(_, exc: Exception):
    logger.exception("Error inesperado en voice-gateway: %s", exc)
    return JSONResponse(status_code=500, content={"detail": str(exc)})
