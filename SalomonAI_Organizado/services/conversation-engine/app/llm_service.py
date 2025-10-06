from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any, Dict, Iterable, List, Optional, Sequence

from openai import AsyncOpenAI
from qdrant_client import AsyncQdrantClient
from qdrant_client.http.models import Filter, FieldCondition, MatchValue, ScoredPoint

from .core_client import ConversationDataService
from .models import FinancialContextSnippet, FinancialSummary, LLMAnswer
from .settings import ConversationSettings

logger = logging.getLogger(__name__)


class LLMServiceError(RuntimeError):
    """Errores de negocio durante la generación de respuestas del LLM."""


def _to_serializable(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, dict):
        return {key: _to_serializable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_serializable(item) for item in value]
    return value


class ConversationalLLMService:
    """Orquestador que combina Qdrant + OpenAI para responder consultas libres."""

    def __init__(
        self,
        settings: ConversationSettings,
        data_service: Optional[ConversationDataService] = None,
    ) -> None:
        self._settings = settings
        self._data_service = data_service
        self._system_prompt = settings.llm_system_prompt.strip()
        self._temperature = max(0.0, min(settings.llm_temperature, 2.0))
        self._max_tokens = max(1, settings.llm_max_tokens)
        self._max_context_items = max(0, settings.llm_max_context_items)
        self._client: Optional[AsyncOpenAI] = None
        if settings.openai_api_key:
            self._client = AsyncOpenAI(
                api_key=settings.openai_api_key,
                base_url=settings.openai_base_url,
                timeout=settings.openai_timeout_seconds,
            )
        self._embedding_model = settings.openai_embedding_model
        self._generation_model = settings.openai_model
        self._qdrant: Optional[AsyncQdrantClient] = None
        if settings.qdrant_url:
            self._qdrant = AsyncQdrantClient(
                url=settings.qdrant_url,
                api_key=settings.qdrant_api_key,
                timeout=settings.request_timeout_seconds,
            )
        self._collection = settings.qdrant_collection
        self._score_threshold = settings.qdrant_score_threshold

    @property
    def enabled(self) -> bool:
        return self._client is not None

    async def answer_question(
        self,
        session_id: str,
        question: str,
        *,
        locale: str = "es-CL",
        metadata: Optional[Dict[str, str]] = None,
    ) -> LLMAnswer:
        if not self.enabled:
            raise LLMServiceError("El servicio LLM no está configurado correctamente.")

        summary: Optional[FinancialSummary] = None
        if self._data_service:
            try:
                summary = await self._data_service.fetch_summary(session_id)
            except Exception as exc:  # pragma: no cover - tolerancia a dependencias externas
                logger.warning("No se pudo recuperar el resumen financiero: %s", exc)

        context_snippets: List[FinancialContextSnippet] = []
        embedding: Optional[List[float]] = None
        if self._embedding_model:
            try:
                embedding = await self._create_embedding(question)
            except LLMServiceError as exc:
                logger.warning("No se pudo generar el embedding de la consulta: %s", exc)

        if embedding and self._qdrant:
            context_snippets = await self._search_context(session_id, embedding)

        messages = self._build_messages(
            question,
            summary=summary,
            context=context_snippets,
            locale=locale,
        )

        try:
            answer_text = await self._generate_answer(messages)
        except LLMServiceError as exc:
            logger.error("Fallo del LLM al generar respuesta: %s", exc)
            raise

        response_metadata: Dict[str, Any] = {
            "context_items": len(context_snippets),
            "used_summary": summary is not None,
            "locale": locale,
        }
        if metadata:
            response_metadata["request_metadata"] = metadata
        if not context_snippets and summary is None:
            response_metadata["missing_context"] = True

        return LLMAnswer(
            session_id=session_id,
            question=question,
            answer=answer_text,
            context=context_snippets,
            summary=summary,
            metadata=response_metadata,
        )

    async def _create_embedding(self, text: str) -> Optional[List[float]]:
        assert self._client is not None
        try:
            response = await self._client.embeddings.create(
                model=self._embedding_model,
                input=text,
            )
        except Exception as exc:  # pragma: no cover - dependencias externas
            raise LLMServiceError("No fue posible generar el embedding") from exc

        if not response.data:
            return None
        return list(response.data[0].embedding)

    async def _search_context(self, session_id: str, vector: Sequence[float]) -> List[FinancialContextSnippet]:
        if not self._qdrant:
            return []
        try:
            results: List[ScoredPoint] = await self._qdrant.search(
                collection_name=self._collection,
                query_vector=vector,
                limit=self._max_context_items or self._settings.qdrant_result_limit,
                with_payload=True,
                score_threshold=self._score_threshold if self._score_threshold > 0 else None,
                query_filter=self._build_filter(session_id),
            )
        except Exception as exc:  # pragma: no cover - tolerancia a Qdrant offline
            logger.warning("No se pudo consultar Qdrant: %s", exc)
            return []

        snippets: List[FinancialContextSnippet] = []
        for point in results:
            payload = point.payload or {}
            content = self._compose_payload_content(payload)
            if not content:
                continue
            title = self._extract_title(payload)
            metadata = {key: _to_serializable(value) for key, value in payload.items()}
            snippets.append(
                FinancialContextSnippet(
                    title=title,
                    content=content,
                    score=float(point.score or 0.0),
                    metadata=metadata,
                )
            )
        return snippets[: self._max_context_items or None]

    def _build_filter(self, session_id: str) -> Optional[Filter]:
        if not session_id:
            return None
        return Filter(must=[FieldCondition(key="user_id", match=MatchValue(value=session_id))])

    def _compose_payload_content(self, payload: Dict[str, Any]) -> str:
        ordered_keys = ("summary", "content", "text", "description", "note", "value")
        parts: List[str] = []
        for key in ordered_keys:
            value = payload.get(key)
            if value:
                parts.append(str(value))
        additional_details = payload.get("details")
        if additional_details and isinstance(additional_details, dict):
            for key, value in additional_details.items():
                if value:
                    parts.append(f"{key}: {value}")
        return "\n".join(dict.fromkeys(parts))  # dedupe manteniendo el orden

    def _extract_title(self, payload: Dict[str, Any]) -> Optional[str]:
        for key in ("title", "label", "category", "intent"):
            value = payload.get(key)
            if value:
                return str(value)
        return None

    def _build_messages(
        self,
        question: str,
        *,
        summary: Optional[FinancialSummary],
        context: Iterable[FinancialContextSnippet],
        locale: str,
    ) -> List[Dict[str, str]]:
        context_sections: List[str] = []
        if summary:
            context_sections.append(self._format_summary(summary))
        context_list = list(context)
        if context_list:
            context_sections.append(self._format_snippets(context_list))
        if not context_sections:
            context_sections.append(
                "No se encontró contexto financiero adicional. Avisa al usuario y ofrece pasos para obtener la información."
            )

        user_content = (
            "Contexto financiero disponible del usuario:\n"
            + "\n\n".join(context_sections)
            + "\n\n"
            + "Responde en español neutro, con tono cercano y profesional. Si faltan datos, explica la limitación y sugiere acciones.\n"
            + f"Pregunta del usuario: {question.strip()}"
        )

        messages = [
            {"role": "system", "content": self._system_prompt},
            {"role": "user", "content": user_content},
        ]
        return messages

    def _format_summary(self, summary: FinancialSummary) -> str:
        lines = [
            "Resumen financiero más reciente:",
            f"- Balance total: {self._format_currency(summary.total_balance)}",
            f"- Ingresos del mes: {self._format_currency(summary.monthly_income)}",
            f"- Gastos del mes: {self._format_currency(summary.monthly_expenses)}",
        ]
        if summary.expense_breakdown:
            lines.append("Detalle de gastos principales:")
            top_categories = sorted(summary.expense_breakdown.items(), key=lambda item: item[1], reverse=True)[:3]
            for category, amount in top_categories:
                lines.append(f"  · {category}: {self._format_currency(amount)}")
        if summary.recent_transactions:
            lines.append("Transacciones destacadas:")
            for tx in summary.recent_transactions[:3]:
                description = str(tx.get("description") or "Transacción")
                amount = self._format_currency(float(tx.get("amount", 0)))
                lines.append(f"  · {description}: {amount}")
        return "\n".join(lines)

    def _format_snippets(self, snippets: List[FinancialContextSnippet]) -> str:
        lines = ["Fragmentos relevantes de Qdrant:"]
        for idx, snippet in enumerate(snippets[: self._max_context_items or len(snippets)], start=1):
            header = snippet.title or f"Documento {idx}"
            lines.append(f"[{idx}] {header} (score {snippet.score:.2f}): {snippet.content}")
        return "\n".join(lines)

    def _format_currency(self, amount: float) -> str:
        formatted = f"{abs(amount):,.0f}".replace(",", ".")
        sign = "-" if amount < 0 else ""
        return f"{sign}${formatted} CLP"

    async def _generate_answer(self, messages: List[Dict[str, str]]) -> str:
        assert self._client is not None
        try:
            completion = await self._client.chat.completions.create(
                model=self._generation_model,
                messages=messages,
                temperature=self._temperature,
                max_tokens=self._max_tokens,
            )
        except Exception as exc:  # pragma: no cover - dependencias externas
            raise LLMServiceError("La API de OpenAI no respondió correctamente") from exc

        if not completion.choices:
            raise LLMServiceError("El modelo no generó ninguna respuesta")

        message = completion.choices[0].message
        content = message.content or ""
        return content.strip()
*** End of File
