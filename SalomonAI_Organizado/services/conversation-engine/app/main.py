from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Dict

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from .core_client import CoreAPIClient
from .models import (
    ChatChunk,
    ChatRequest,
    ErrorResponse,
    FinancialSummary,
    IntentDetectionResponse,
)
from .nlu import SpanishNLU

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def json_event(chunk: ChatChunk) -> bytes:
    return (json.dumps({"type": chunk.type, **chunk.data}) + "\n").encode("utf-8")


@asynccontextmanager
def lifespan(app: FastAPI):
    nlu = SpanishNLU()
    core_client = CoreAPIClient()
    app.state.nlu = nlu
    app.state.core_client = core_client
    yield


def get_services(app: FastAPI = Depends()) -> Dict[str, object]:
    return {"nlu": app.state.nlu, "core_client": app.state.core_client}


app = FastAPI(title="SalomonAI Conversation Engine", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/context/summary", response_model=FinancialSummary)
async def get_summary(session_id: str, services=Depends(get_services)) -> FinancialSummary:
    core_client: CoreAPIClient = services["core_client"]
    return await core_client.fetch_financial_summary(session_id)


@app.post("/intents/detect", response_model=IntentDetectionResponse)
async def detect_intents(request: ChatRequest, services=Depends(get_services)) -> IntentDetectionResponse:
    nlu: SpanishNLU = services["nlu"]
    intents = nlu.detect_intents(request.message)
    return IntentDetectionResponse(session_id=request.session_id, query=request.message, intents=intents)


async def chat_event_stream(
    request: ChatRequest,
    services: Dict[str, object],
) -> AsyncGenerator[bytes, None]:
    nlu: SpanishNLU = services["nlu"]
    core_client: CoreAPIClient = services["core_client"]

    intents = nlu.detect_intents(request.message)
    best_intent = intents[0]

    yield json_event(ChatChunk(type="intent", data={"intent": best_intent.dict()}))

    resolution = await core_client.resolve_intent(best_intent, session_id=request.session_id, metadata=request.metadata)

    for insight in resolution.insights:
        yield json_event(ChatChunk(type="insight", data={"insight": insight.dict()}))

    assistant_text = resolution.response_text or "No pude generar una respuesta en este momento."

    for token in assistant_text.split(" "):
        await asyncio.sleep(0.05)
        yield json_event(ChatChunk(type="token", data={"token": token + " "}))

    if resolution.data:
        yield json_event(ChatChunk(type="metadata", data={"data": resolution.data}))

    summary = await core_client.fetch_financial_summary(request.session_id)
    yield json_event(ChatChunk(type="summary", data={"summary": summary.dict()}))

    yield json_event(ChatChunk(type="done", data={"intent": best_intent.name}))


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest, services=Depends(get_services)) -> StreamingResponse:
    generator = chat_event_stream(request, services)
    return StreamingResponse(generator, media_type="application/jsonl")


@app.post("/chat")
async def chat_handler(request: Request, services=Depends(get_services)) -> StreamingResponse:
    try:
        payload = await request.json()
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    chat_request = ChatRequest.parse_obj(payload)
    return await chat_stream(chat_request, services)  # type: ignore[arg-type]


@app.exception_handler(Exception)
async def global_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error in conversation engine: %s", exc)
    return JSONResponse(status_code=500, content=ErrorResponse(detail=str(exc)).dict())
