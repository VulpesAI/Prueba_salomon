from __future__ import annotations

import asyncio
import json
import logging
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
from .providers import BaseSTTClient, BaseTTSClient, get_stt_client, get_tts_client
from .settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))


app = FastAPI(title="SalomonAI Voice Gateway", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    result = await stt.transcribe(payload.audio_base64, language=payload.language)
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
    result = await tts.synthesize(payload.text, language=payload.language, voice=payload.voice)
    return VoiceSynthesisResponse(
        audio_base64=result.get("audio_base64", ""),
        format=result.get("format", "audio/wav"),
        provider=type(tts).__name__,
    )


@app.websocket("/voice/stream")
async def voice_stream(websocket: WebSocket, language: Optional[str] = "es-CL"):
    await websocket.accept()
    stt = get_stt_client()
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
                await websocket.send_json({"type": "transcript", **result})
            elif data.event == "stop":
                await websocket.send_json({"type": "status", "status": "stopped"})
                break
            else:
                await websocket.send_json({"type": "error", "message": f"Evento desconocido: {data.event}"})
    except WebSocketDisconnect:
        logger.info("Cliente WebSocket desconectado")
    except Exception as exc:  # pragma: no cover - logging de emergencia
        logger.exception("Error en flujo de voz: %s", exc)
        await websocket.send_json({"type": "error", "message": str(exc)})
    finally:
        try:
            await websocket.close()
        except RuntimeError:
            pass


@app.exception_handler(Exception)
async def global_exception_handler(_, exc: Exception):
    logger.exception("Error inesperado en voice-gateway: %s", exc)
    return JSONResponse(status_code=500, content={"detail": str(exc)})
