from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Dict

from .core_client import ConversationDataService, QdrantInsightRepository, SupabaseFinancialRepository
from .llm_service import ConversationalLLMService, LLMServiceError
from .settings import get_settings

logger = logging.getLogger(__name__)


async def _run_demo() -> None:
    settings = get_settings()

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

    llm_service = ConversationalLLMService(settings=settings, data_service=data_service)
    if not llm_service.enabled:
        logger.error("OPENAI_API_KEY no está configurado. No se puede ejecutar la demo.")
        return

    try:
        answer = await llm_service.answer_question(
            session_id="demo-user",
            question="¿Qué recomendaciones tienes para mejorar mis finanzas este mes?",
        )
    except LLMServiceError as exc:
        logger.error("Ocurrió un error generando la respuesta del LLM: %s", exc)
        return

    print("Respuesta:\n", answer.answer, "\n", sep="")
    print("Contexto utilizado:")
    for idx, snippet in enumerate(answer.context, start=1):
        metadata: Dict[str, Any] = snippet.metadata or {}
        print(f"  {idx}. {snippet.title or 'Fragmento sin título'} (score {snippet.score:.2f})")
        print(f"     Contenido: {snippet.content}")
        if metadata:
            print(f"     Metadata: {json.dumps(metadata, ensure_ascii=False)[:200]}...")
    if answer.summary:
        print("\nResumen financiero incluido en el prompt:")
        print(json.dumps(answer.summary.dict(), ensure_ascii=False, indent=2))
    print("\nMetadata de la respuesta:")
    print(json.dumps(answer.metadata, ensure_ascii=False, indent=2))


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_run_demo())


if __name__ == "__main__":
    main()
