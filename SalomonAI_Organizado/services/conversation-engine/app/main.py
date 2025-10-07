from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
import hashlib
import time
from typing import AsyncGenerator, Dict, List

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from openai import AsyncOpenAI

from .core_client import (
    CoreAPIClient,
    ConversationDataService,
    QdrantInsightRepository,
    SupabaseFinancialRepository,
)
from .llm_service import ConversationalLLMService, LLMServiceError
from .models import (
    ChatChunk,
    ConversationChatRequest,
    ConversationChatResponse,
    ConversationMessage,
    ChatRequest,
    ErrorResponse,
    FinancialSummary,
    IntentDetectionResponse,
    LLMAnswer,
    LLMQuestionRequest,
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
    llm_service = ConversationalLLMService(settings=settings, data_service=data_service)
    openai_client: AsyncOpenAI | None = None
    if settings.openai_api_key:
        openai_client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            timeout=settings.openai_timeout_seconds,
        )
    app.state.nlu = nlu
    app.state.core_client = core_client
    app.state.data_service = data_service
    app.state.llm_service = llm_service
    app.state.settings = settings
    app.state.openai_client = openai_client
    try:
        yield
    finally:
        if openai_client:
            await openai_client.close()


def get_services(app: FastAPI = Depends()) -> Dict[str, object]:
    return {
        "nlu": app.state.nlu,
        "core_client": app.state.core_client,
        "data_service": getattr(app.state, "data_service", None),
        "llm_service": getattr(app.state, "llm_service", None),
        "openai_client": getattr(app.state, "openai_client", None),
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


@app.post("/chat/llm", response_model=LLMAnswer)
async def chat_with_llm(request: LLMQuestionRequest, services=Depends(get_services)) -> LLMAnswer:
    llm_service: ConversationalLLMService | None = services.get("llm_service")  # type: ignore[assignment]
    if not llm_service or not llm_service.enabled:
        raise HTTPException(status_code=503, detail="El servicio conversacional avanzado no está disponible.")
    try:
        return await llm_service.answer_question(
            session_id=request.session_id,
            question=request.question,
            locale=request.locale,
            metadata=request.metadata,
        )
    except LLMServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


async def chat_event_stream(
    request: ChatRequest,
    services: Dict[str, object],
) -> AsyncGenerator[bytes, None]:
    nlu: SpanishNLU = services["nlu"]
    core_client: CoreAPIClient = services["core_client"]
    data_service: ConversationDataService | None = services.get("data_service")  # type: ignore[assignment]

    intents = nlu.detect_intents(request.message)
    best_intent = intents[0]

    if data_service:
        await data_service.log_intent_detection(
            request.session_id,
            query=request.message,
            detected=best_intent,
            intents=intents,
            metadata=request.metadata,
        )

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

    if data_service:
        await data_service.log_intent_resolution(
            request.session_id,
            query=request.message,
            resolution=resolution,
            response_text=assistant_text,
            summary=summary,
            metadata=request.metadata,
        )

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


def _hash_text(value: str) -> str:
    return hashlib.sha256(str(value).encode("utf-8")).hexdigest()


def _prepare_messages(messages: List[ConversationMessage]) -> List[Dict[str, str]]:
    prepared: List[Dict[str, str]] = []
    for message in messages:
        content = (message.content or "").strip()
        if not content:
            continue
        prepared.append({"role": message.role, "content": content})
    return prepared


@app.post("/conversation/chat", response_model=ConversationChatResponse)
async def conversation_chat(
    payload: ConversationChatRequest,
    services=Depends(get_services),
) -> ConversationChatResponse:
    openai_client: AsyncOpenAI | None = services.get("openai_client")  # type: ignore[assignment]
    if openai_client is None:
        raise HTTPException(status_code=503, detail="openai_not_configured")

    messages = _prepare_messages(payload.messages)
    if not messages:
        raise HTTPException(status_code=400, detail="messages_required")

    model = (payload.model or settings.openai_model or "gpt-4o-mini").strip() or "gpt-4o-mini"
    temperature = payload.temperature
    if temperature is None:
        temperature = settings.llm_temperature
    temperature = max(0.0, min(float(temperature), 2.0))

    started = time.perf_counter()
    try:
        response = await openai_client.responses.create(
            model=model,
            input=messages,
            temperature=temperature,
        )
    except Exception as exc:  # pragma: no cover - dependencias externas
        logger.error("Fallo al invocar OpenAI Responses: %s", exc)
        raise HTTPException(status_code=502, detail="chat_provider_error") from exc

    reply_text = getattr(response, "output_text", "") or ""
    if not reply_text.strip():
        # Intento de recuperación manual del texto
        for item in getattr(response, "output", []) or []:
            for segment in getattr(item, "content", []) or []:
                reply_text = getattr(segment, "text", "") or ""
                if reply_text.strip():
                    break
            if reply_text.strip():
                break
    reply_text = reply_text.strip()
    if not reply_text:
        raise HTTPException(status_code=502, detail="empty_reply")

    usage_payload: Dict[str, int] = {}
    usage = getattr(response, "usage", None)
    if usage:
        prompt_tokens = int(getattr(usage, "prompt_tokens", 0) or 0)
        completion_tokens = int(getattr(usage, "completion_tokens", 0) or 0)
        total_tokens = int(getattr(usage, "total_tokens", prompt_tokens + completion_tokens) or 0)
        usage_payload = {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
        }

    duration_ms = int((time.perf_counter() - started) * 1000)
    user_hash = _hash_text(payload.user_id) if payload.user_id else None
    message_hashes = [_hash_text(item["content"]) for item in messages]
    logger.info(
        "Conversación procesada con OpenAI",
        extra={
            "user_hash": user_hash,
            "message_hashes": message_hashes,
            "model": model,
            "temperature": temperature,
            "duration_ms": duration_ms,
        },
    )

    return ConversationChatResponse(reply=reply_text, usage=usage_payload)


@app.exception_handler(Exception)
async def global_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error in conversation engine: %s", exc)
    return JSONResponse(status_code=500, content=ErrorResponse(detail=str(exc)).dict())
