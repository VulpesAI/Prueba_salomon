from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Dict

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from .core_client import (
    CoreAPIClient,
    ConversationDataService,
    QdrantInsightRepository,
    SupabaseFinancialRepository,
)
from .models import (
    ChatChunk,
    ChatRequest,
    ErrorResponse,
    FinancialSummary,
    IntentDetectionResponse,
)
from .nlu import SpanishNLU
from .settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
logging.basicConfig(level=logging.INFO)


def json_event(chunk: ChatChunk) -> bytes:
    payload = {"type": chunk.type, **chunk.data}
    return (json.dumps(payload, ensure_ascii=False) + "\n").encode("utf-8")


@asynccontextmanager
def lifespan(app: FastAPI):
    nlu = SpanishNLU()
    supabase_repo = SupabaseFinancialRepository(
        base_url=settings.supabase_url,
        service_role_key=settings.supabase_service_role_key,
        timeout=settings.supabase_timeout_seconds,
    )
    qdrant_repo = QdrantInsightRepository(
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key,
        collection=settings.qdrant_collection,
        limit=settings.qdrant_result_limit,
        score_threshold=settings.qdrant_score_threshold,
        timeout=settings.request_timeout_seconds,
    )
    data_service = ConversationDataService(supabase_repo, qdrant_repo)
    core_client = CoreAPIClient(
        base_url=settings.core_api_base_url,
        timeout=settings.request_timeout_seconds,
        data_service=data_service,
    )
    app.state.nlu = nlu
    app.state.core_client = core_client
    app.state.data_service = data_service
    app.state.settings = settings
    yield


def get_services(app: FastAPI = Depends()) -> Dict[str, object]:
    return {
        "nlu": app.state.nlu,
        "core_client": app.state.core_client,
        "data_service": getattr(app.state, "data_service", None),
    }


app = FastAPI(title="SalomonAI Conversation Engine", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/context/summary", response_model=FinancialSummary)
async def get_summary(
    session_id: str,
    account_id: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    services=Depends(get_services),
) -> FinancialSummary:
    core_client: CoreAPIClient = services["core_client"]
    metadata: Dict[str, str] = {}
    if account_id:
        metadata["accountId"] = account_id
    if start_date:
        metadata["startDate"] = start_date
    if end_date:
        metadata["endDate"] = end_date
    return await core_client.fetch_financial_summary(session_id, metadata=metadata or None)


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

    resolution = await core_client.resolve_intent(
        best_intent,
        session_id=request.session_id,
        query_text=request.message,
        metadata=request.metadata,
    )

    for insight in resolution.insights:
        yield json_event(ChatChunk(type="insight", data={"insight": insight.dict()}))

    assistant_text = resolution.response_text or "No pude generar una respuesta en este momento."

    for token in assistant_text.split(" "):
        await asyncio.sleep(0.05)
        yield json_event(ChatChunk(type="token", data={"token": token + " "}))

    if resolution.data:
        yield json_event(ChatChunk(type="metadata", data={"data": resolution.data}))

    summary = await core_client.fetch_financial_summary(
        request.session_id,
        metadata=request.metadata,
    )
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
