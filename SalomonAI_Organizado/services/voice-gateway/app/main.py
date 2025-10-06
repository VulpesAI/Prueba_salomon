from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Dict, Optional

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .models import (
    VoiceStreamEvent,
    VoiceSynthesisRequest,
    VoiceSynthesisResponse,
    VoiceTranscriptionRequest,
    VoiceTranscriptionResponse,
)
from prometheus_client import Counter, Gauge, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from .providers import BaseSTTClient, BaseTTSClient, get_stt_client, get_tts_client
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
    return {"stt": get_stt_client(), "tts": get_tts_client()}


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/voice/transcriptions", response_model=VoiceTranscriptionResponse)
async def transcribe(
    payload: VoiceTranscriptionRequest,
    clients: Dict[str, object] = Depends(get_clients),
) -> VoiceTranscriptionResponse:
    stt: BaseSTTClient = clients["stt"]
    provider_name = type(stt).__name__
    start_time = time.perf_counter()
    result = await stt.transcribe(payload.audio_base64, language=payload.language)
    duration = time.perf_counter() - start_time
    TRANSCRIPTIONS_TOTAL.labels(provider=provider_name).inc()
    TRANSCRIPTION_LATENCY.labels(provider=provider_name).observe(duration)
    return VoiceTranscriptionResponse(
        transcript=result.get("text", ""),
        confidence=float(result.get("confidence", 0.0)),
        language=result.get("language", payload.language),
        provider=type(stt).__name__,
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
    stt = get_stt_client()
    provider_name = type(stt).__name__
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
                if isinstance(stt, BaseSTTClient):
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
