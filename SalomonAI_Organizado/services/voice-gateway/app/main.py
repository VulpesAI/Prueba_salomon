from __future__ import annotations

import asyncio
import base64
import binascii
import json
import logging
import secrets
import time
from collections import defaultdict
from contextlib import suppress
from typing import Any, Dict, Optional

from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    Request,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.concurrency import run_in_threadpool
import websockets
from websockets.exceptions import ConnectionClosedError, ConnectionClosedOK, InvalidStatusCode

from .models import (
    VoiceCatalogResponse,
    VoicePreferenceRequest,
    VoicePreferenceResponse,
    VoiceSynthesisRequest,
    VoiceSynthesisResponse,
    VoiceTranscriptionPayload,
    VoiceTranscriptionResponse,
)
from prometheus_client import Counter, Gauge, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from .providers import BaseTTSClient, STTProvider, get_stt_provider, get_tts_client
from .settings import get_settings
from .user_settings import VoicePreferenceRepository, build_voice_repository
from .voice_registry import VoiceEndpoint, voice_registry
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


voice_preferences: VoicePreferenceRepository = build_voice_repository()


async def get_clients() -> Dict[str, object]:
    return {"stt": get_stt_provider(), "tts": get_tts_client()}


def _extract_user_id_from_headers(headers: Dict[str, str]) -> Optional[str]:
    for key in ("x-user-id", "x-user", "x-supabase-uid", "x-client-user"):
        value = headers.get(key)
        if value and value.strip():
            return value.strip()
    return None


def _extract_user_id(headers: Dict[str, str], query_params: Dict[str, str]) -> Optional[str]:
    user_id = _extract_user_id_from_headers(headers)
    if user_id:
        return user_id
    for key in ("user_id", "user", "uid"):
        value = query_params.get(key)
        if value and value.strip():
            return value.strip()
    return None


async def _resolve_voice(endpoint: VoiceEndpoint, requested_voice: Optional[str], headers: Dict[str, str]) -> str:
    if requested_voice:
        resolved = voice_registry.resolve_voice(requested_voice, endpoint)
        if not resolved:
            raise HTTPException(status_code=400, detail="voice_not_supported")
        return resolved

    user_id = _extract_user_id_from_headers(headers)
    if user_id:
        preferred = await voice_preferences.get_voice(user_id)
        if preferred:
            resolved = voice_registry.resolve_voice(preferred, endpoint)
            if resolved:
                return resolved

    try:
        return voice_registry.default_voice(endpoint)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="voice_unavailable") from exc


@app.on_event("startup")
async def _refresh_voice_registry() -> None:  # pragma: no cover - evento de FastAPI
    await voice_registry.refresh_availability()


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/voice/voices", response_model=VoiceCatalogResponse)
async def list_voices() -> VoiceCatalogResponse:
    snapshot = voice_registry.availability_snapshot()
    return VoiceCatalogResponse(
        voices=snapshot,
        model_tts=settings.openai_tts_model,
        model_realtime=settings.openai_realtime_model,
    )


@app.post("/user/settings/voice", response_model=VoicePreferenceResponse)
async def set_user_voice(payload: VoicePreferenceRequest, request: Request) -> VoicePreferenceResponse:
    headers = {key.lower(): value for key, value in request.headers.items()}
    user_id = _extract_user_id_from_headers(headers)
    if not user_id:
        raise HTTPException(status_code=401, detail="missing_user_id")
    voice_id = voice_registry.resolve_voice(payload.voice, "tts")
    if not voice_id:
        raise HTTPException(status_code=400, detail="voice_not_supported")
    await voice_preferences.save_voice(user_id, voice_id)
    return VoicePreferenceResponse(voice=voice_id)


@app.get("/user/settings/voice", response_model=VoicePreferenceResponse)
async def get_user_voice(request: Request) -> VoicePreferenceResponse:
    headers = {key.lower(): value for key, value in request.headers.items()}
    user_id = _extract_user_id_from_headers(headers)
    if not user_id:
        raise HTTPException(status_code=401, detail="missing_user_id")
    preferred = await voice_preferences.get_voice(user_id)
    if preferred:
        resolved = voice_registry.resolve_voice(preferred, "tts")
        if resolved:
            return VoicePreferenceResponse(voice=resolved)
    fallback = voice_registry.default_voice("tts")
    return VoicePreferenceResponse(voice=fallback)


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
    request: Request,
    clients: Dict[str, object] = Depends(get_clients),
) -> VoiceSynthesisResponse:
    tts: BaseTTSClient = clients["tts"]
    provider_name = getattr(tts, "name", type(tts).__name__)

    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="empty_text")
    if len(text) > settings.tts_max_chars:
        raise HTTPException(status_code=400, detail="text_too_long")

    audio_format = (payload.format or settings.resolved_tts_format).lower()
    if audio_format not in {"mp3", "wav"}:
        raise HTTPException(status_code=400, detail="format_not_supported")

    headers = {key.lower(): value for key, value in request.headers.items()}
    voice = await _resolve_voice("tts", payload.voice, headers)
    language = payload.language or settings.resolved_tts_language
    speed = payload.speed if payload.speed is not None else settings.tts_default_speed
    if speed <= 0:
        raise HTTPException(status_code=400, detail="invalid_speed")

    start_time = time.perf_counter()
    try:
        result = await tts.synthesize(
            text=text,
            language=language,
            voice=voice,
            audio_format=audio_format,
            speed=speed,
        )
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - errores del proveedor
        logger.exception("Error al sintetizar audio con %s: %s", provider_name, exc)
        raise HTTPException(status_code=502, detail="tts_failed") from exc

    duration = time.perf_counter() - start_time
    provider_label = result.get("provider", provider_name)
    SYNTHESIS_TOTAL.labels(provider=provider_label).inc()
    SYNTHESIS_LATENCY.labels(provider=provider_label).observe(duration)

    audio_base64 = result.get("audio_base64", "")
    if not audio_base64:
        raise HTTPException(status_code=502, detail="invalid_tts_response")
    mime = result.get("mime", f"audio/{audio_format}")
    duration_ms = result.get("duration_ms")
    if duration_ms is None:
        duration_ms = int(duration * 1000)

    return VoiceSynthesisResponse(
        audio_base64=audio_base64,
        mime=mime,
        provider=provider_label,
        duration_ms=duration_ms,
    )


async def _connect_realtime_with_retry(url: str, headers: Dict[str, str], retries: int = 3) -> websockets.WebSocketClientProtocol:
    delay = 1.0
    last_exc: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            return await websockets.connect(
                url,
                extra_headers=headers,
                ping_interval=20,
                ping_timeout=20,
                open_timeout=15,
                max_size=4 * 1024 * 1024,
            )
        except Exception as exc:  # pragma: no cover - dependencias externas
            last_exc = exc
            if attempt >= retries:
                break
            await asyncio.sleep(delay)
            delay = min(delay * 2, 10)
    assert last_exc is not None
    raise last_exc


async def _send_session_update(
    upstream: websockets.WebSocketClientProtocol,
    *,
    voice: str,
    audio_format: str,
    language: str,
    instructions: str,
) -> None:
    payload = {
        "type": "session.update",
        "session": {
            "input_audio_format": {
                "type": "pcm16",
                "sample_rate_hz": settings.voice_stream_sample_rate,
            },
            "input_audio_transcription": {
                "model": settings.openai_realtime_transcription_model,
                "language": language or settings.default_language,
            },
            "voice": voice,
            "output_audio_format": audio_format,
            "instructions": instructions,
        },
    }
    await upstream.send(json.dumps(payload))


def _extract_text_delta(delta: Any) -> str:
    if isinstance(delta, str):
        return delta
    if isinstance(delta, dict):
        if "text" in delta and isinstance(delta["text"], str):
            return delta["text"]
        if "delta" in delta and isinstance(delta["delta"], str):
            return delta["delta"]
    return ""


def _extract_audio_delta(delta: Any) -> str:
    if isinstance(delta, str):
        return delta
    if isinstance(delta, dict):
        if "audio" in delta and isinstance(delta["audio"], str):
            return delta["audio"]
        if "data" in delta and isinstance(delta["data"], str):
            return delta["data"]
    return ""


@app.websocket("/voice/stream")
async def voice_stream(websocket: WebSocket, language: Optional[str] = "es-CL"):
    await websocket.accept()
    session_start = time.perf_counter()
    session_result = "completed"
    STREAM_ACTIVE.inc()
    session_id = secrets.token_hex(8)
    provider_label = "openai_realtime"
    realtime_api_key = settings.resolved_realtime_api_key
    if not realtime_api_key:
        STREAM_ERRORS.labels(type="configuration").inc()
        await websocket.send_json({
            "type": "error",
            "code": "missing_api_key",
            "detail": "OPENAI_REALTIME_API_KEY no está configurada",
        })
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        STREAM_ACTIVE.dec()
        STREAM_SESSIONS.labels(result="error").inc()
        STREAM_SESSION_DURATION.observe(time.perf_counter() - session_start)
        return

    headers = {key.lower(): value for key, value in websocket.headers.items()}
    query_params = {key: value for key, value in websocket.query_params.items()}
    user_id = _extract_user_id(headers, query_params)
    preferred_voice: Optional[str] = None
    if user_id:
        preferred_raw = await voice_preferences.get_voice(user_id)
        if preferred_raw:
            preferred_voice = voice_registry.resolve_voice(preferred_raw, "realtime")

    try:
        current_voice = preferred_voice or voice_registry.default_voice("realtime")
    except RuntimeError:
        current_voice = (settings.openai_realtime_voice or "alloy").strip() or "alloy"
    current_audio_format = (
        (settings.openai_realtime_audio_format or "mp3").strip().lower() or "mp3"
    )
    current_language = (
        (language or settings.resolved_tts_language or settings.default_language).strip()
        or settings.default_language
    )
    default_instructions = settings.openai_realtime_instructions.strip() or (
        "Eres SalomónAI, coach financiero; responde de forma concisa, empática y en español de Chile."
    )
    instructions = default_instructions
    upstream: websockets.WebSocketClientProtocol | None = None

    try:
        headers = {
            "Authorization": f"Bearer {realtime_api_key}",
            "OpenAI-Beta": "realtime=v1",
        }
        try:
            upstream = await _connect_realtime_with_retry(
                settings.resolved_realtime_url, headers
            )
        except (InvalidStatusCode, ConnectionClosedError, TimeoutError, OSError) as exc:
            session_result = "error"
            STREAM_ERRORS.labels(type=exc.__class__.__name__).inc()
            logger.exception("[%s] No se pudo conectar con OpenAI Realtime: %s", session_id, exc)
            await websocket.send_json({
                "type": "error",
                "code": "upstream_unavailable",
                "detail": "No se pudo conectar con el proveedor de voz",
            })
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
            return

        await _send_session_update(
            upstream,
            voice=current_voice,
            audio_format=current_audio_format,
            language=current_language,
            instructions=instructions,
        )

        await websocket.send_json({"type": "status", "status": "ready"})

        response_buffers: Dict[str, str] = defaultdict(str)

        async def client_to_upstream() -> None:
            nonlocal current_voice, current_audio_format, current_language, session_result, instructions
            try:
                while True:
                    if (
                        settings.voice_stream_max_seconds > 0
                        and time.perf_counter() - session_start
                        > settings.voice_stream_max_seconds
                    ):
                        session_result = "timeout"
                        await websocket.send_json({
                            "type": "error",
                            "code": "session_timeout",
                            "detail": "La sesión de voz superó el máximo permitido",
                        })
                        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                        return

                    message = await websocket.receive()
                    if message.get("type") == "websocket.disconnect":
                        raise WebSocketDisconnect

                    if message.get("text") is not None:
                        text_data = message["text"]
                        if not text_data:
                            continue
                        try:
                            data = json.loads(text_data)
                        except json.JSONDecodeError:
                            await websocket.send_json({
                                "type": "error",
                                "code": "invalid_json",
                                "detail": "Formato JSON inválido",
                            })
                            continue

                        event_type = data.get("type")
                        if event_type == "config":
                            invalid_voice = False
                            if "voice" in data and isinstance(data["voice"], str):
                                requested_voice = data["voice"].strip()
                                if requested_voice:
                                    resolved_voice = voice_registry.resolve_voice(requested_voice, "realtime")
                                    if not resolved_voice:
                                        await websocket.send_json(
                                            {
                                                "type": "error",
                                                "code": "voice_not_supported",
                                                "detail": f"La voz {requested_voice} no está disponible en tiempo real",
                                            }
                                        )
                                        invalid_voice = True
                                    else:
                                        current_voice = resolved_voice
                            if invalid_voice:
                                continue
                            if "audio_format" in data and isinstance(data["audio_format"], str):
                                current_audio_format = data["audio_format"].strip().lower() or current_audio_format
                            if "lang" in data and isinstance(data["lang"], str):
                                current_language = data["lang"].strip() or current_language
                            if "instructions" in data and isinstance(data["instructions"], str):
                                new_instructions = data["instructions"].strip()
                                instructions = new_instructions or default_instructions
                            await _send_session_update(
                                upstream,
                                voice=current_voice,
                                audio_format=current_audio_format,
                                language=current_language,
                                instructions=instructions,
                            )
                            await websocket.send_json({
                                "type": "status",
                                "status": "updated",
                                "voice": current_voice,
                                "format": current_audio_format,
                                "lang": current_language,
                                "instructions": instructions,
                            })
                        elif event_type == "audio_chunk":
                            audio_base64 = data.get("audio_base64")
                            if not audio_base64:
                                await websocket.send_json({
                                    "type": "error",
                                    "code": "empty_chunk",
                                    "detail": "Chunk de audio vacío",
                                })
                                continue
                            try:
                                audio_bytes = base64.b64decode(audio_base64)
                            except (ValueError, binascii.Error):
                                await websocket.send_json({
                                    "type": "error",
                                    "code": "invalid_audio",
                                    "detail": "Audio base64 inválido",
                                })
                                continue
                            if len(audio_bytes) > settings.max_request_bytes:
                                await websocket.send_json({
                                    "type": "error",
                                    "code": "chunk_too_large",
                                    "detail": "Chunk de audio excede el máximo permitido",
                                })
                                continue
                            STREAM_AUDIO_CHUNKS.labels(provider=provider_label).inc()
                            await upstream.send(
                                json.dumps(
                                    {
                                        "type": "input_audio_buffer.append",
                                        "audio": audio_base64,
                                    }
                                )
                            )
                        elif event_type == "commit":
                            await upstream.send(json.dumps({"type": "input_audio_buffer.commit"}))
                            await upstream.send(json.dumps({"type": "response.create"}))
                        elif event_type == "text":
                            text_payload = str(data.get("text", "")).strip()
                            if not text_payload:
                                await websocket.send_json({
                                    "type": "error",
                                    "code": "empty_text",
                                    "detail": "Texto vacío",
                                })
                                continue
                            await upstream.send(
                                json.dumps(
                                    {
                                        "type": "conversation.item.create",
                                        "item": {
                                            "type": "message",
                                            "role": "user",
                                            "content": [
                                                {
                                                    "type": "input_text",
                                                    "text": text_payload,
                                                }
                                            ],
                                        },
                                    }
                                )
                            )
                            await upstream.send(json.dumps({"type": "response.create"}))
                        else:
                            await websocket.send_json({
                                "type": "error",
                                "code": "unknown_event",
                                "detail": f"Tipo de evento no soportado: {event_type}",
                            })
                    elif message.get("bytes") is not None:
                        audio_bytes = message["bytes"]
                        if not audio_bytes:
                            continue
                        if len(audio_bytes) > settings.max_request_bytes:
                            await websocket.send_json(
                                {
                                    "type": "error",
                                    "code": "chunk_too_large",
                                    "detail": "Chunk de audio excede el máximo permitido",
                                }
                            )
                            continue
                        audio_base64 = base64.b64encode(audio_bytes).decode("ascii")
                        STREAM_AUDIO_CHUNKS.labels(provider=provider_label).inc()
                        await upstream.send(
                            json.dumps(
                                {
                                    "type": "input_audio_buffer.append",
                                    "audio": audio_base64,
                                }
                            )
                        )
                    else:
                        await websocket.send_json({
                            "type": "error",
                            "code": "unsupported_message",
                            "detail": "Tipo de mensaje no soportado",
                        })
            except WebSocketDisconnect:
                raise
            except Exception as exc:  # pragma: no cover - protección frente a fallos inesperados
                session_result = "error"
                STREAM_ERRORS.labels(type=exc.__class__.__name__).inc()
                logger.exception("[%s] Error procesando mensaje del cliente: %s", session_id, exc)
                await websocket.send_json({
                    "type": "error",
                    "code": "client_processing_error",
                    "detail": "Error procesando el mensaje del cliente",
                })
                raise

        async def upstream_to_client() -> None:
            nonlocal session_result
            try:
                async for raw in upstream:
                    try:
                        event = json.loads(raw)
                    except json.JSONDecodeError:  # pragma: no cover - datos corruptos
                        logger.warning("[%s] Evento inválido de OpenAI: %s", session_id, raw)
                        continue

                    event_type = event.get("type") or ""

                    if event_type == "response.delta":
                        response = event.get("response", {}) or {}
                        response_id = response.get("id", "default")
                        text_piece = _extract_text_delta(event.get("delta"))
                        if text_piece:
                            response_buffers[response_id] += text_piece
                            await websocket.send_json(
                                {
                                    "type": "partial_transcript",
                                    "text": response_buffers[response_id],
                                    "final": False,
                                }
                            )
                    elif event_type in {"response.audio.delta", "response.output_audio.delta"}:
                        chunk = _extract_audio_delta(event.get("delta"))
                        if chunk:
                            await websocket.send_json(
                                {
                                    "type": "tts_chunk",
                                    "audio_base64": chunk,
                                    "format": current_audio_format,
                                }
                            )
                    elif "transcription" in event_type and event_type.endswith("delta"):
                        text_piece = _extract_text_delta(event.get("delta"))
                        if text_piece:
                            await websocket.send_json(
                                {
                                    "type": "partial_transcript",
                                    "text": text_piece,
                                    "final": False,
                                }
                            )
                    elif "transcription" in event_type and event_type.endswith("completed"):
                        transcription = event.get("transcription") or {}
                        text_final = transcription.get("text") or response_buffers.get(
                            event.get("response", {}).get("id", "default"), ""
                        )
                        if text_final:
                            await websocket.send_json(
                                {
                                    "type": "partial_transcript",
                                    "text": text_final,
                                    "final": True,
                                }
                            )
                    elif event_type == "response.completed":
                        response = event.get("response", {}) or {}
                        response_id = response.get("id", "default")
                        final_text = response_buffers.pop(response_id, "")
                        if not final_text:
                            final_text = response.get("output_text") or ""
                        await websocket.send_json(
                            {
                                "type": "message",
                                "text": final_text,
                                "final": True,
                            }
                        )
                    elif event_type == "error":
                        STREAM_ERRORS.labels(type="upstream").inc()
                        await websocket.send_json(
                            {
                                "type": "error",
                                "code": "upstream_error",
                                "detail": event.get("error") or event,
                            }
                        )
                    elif event_type in {"session.updated", "input_audio_buffer.speech_started", "input_audio_buffer.speech_stopped"}:
                        logger.debug("[%s] Evento informativo de OpenAI: %s", session_id, event_type)
                    else:
                        logger.debug("[%s] Evento no manejado de OpenAI: %s", session_id, event_type)
            except (ConnectionClosedError, ConnectionClosedOK):
                session_result = "error"
                logger.info("[%s] Conexión con OpenAI cerrada", session_id)
                await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
            except Exception as exc:  # pragma: no cover - fallos externos
                STREAM_ERRORS.labels(type=exc.__class__.__name__).inc()
                logger.exception("[%s] Error recibiendo datos de OpenAI: %s", session_id, exc)
                await websocket.send_json(
                    {
                        "type": "error",
                        "code": "upstream_failure",
                        "detail": "Error al recibir datos del proveedor",
                    }
                )
                raise

        tasks = [
            asyncio.create_task(client_to_upstream()),
            asyncio.create_task(upstream_to_client()),
        ]

        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_EXCEPTION)
        for task in pending:
            task.cancel()
        with suppress(asyncio.CancelledError):
            await asyncio.gather(*pending, return_exceptions=True)
        for task in done:
            task.result()

    except WebSocketDisconnect:
        session_result = "disconnected"
        logger.info("[%s] Cliente WebSocket desconectado", session_id)
    except Exception as exc:  # pragma: no cover - logging de emergencia
        session_result = "error"
        STREAM_ERRORS.labels(type=exc.__class__.__name__).inc()
        logger.exception("[%s] Error en flujo de voz: %s", session_id, exc)
        with suppress(Exception):
            await websocket.send_json({
                "type": "error",
                "code": "unexpected",
                "detail": str(exc),
            })
    finally:
        if upstream is not None and not upstream.closed:
            with suppress(Exception):
                await upstream.close()
        with suppress(Exception):
            await websocket.close()
        STREAM_ACTIVE.dec()
        STREAM_SESSIONS.labels(result=session_result).inc()
        STREAM_SESSION_DURATION.observe(time.perf_counter() - session_start)


@app.exception_handler(Exception)
async def global_exception_handler(_, exc: Exception):
    logger.exception("Error inesperado en voice-gateway: %s", exc)
    return JSONResponse(status_code=500, content={"detail": str(exc)})
