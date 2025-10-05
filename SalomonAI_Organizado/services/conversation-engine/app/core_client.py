from __future__ import annotations

import logging
from collections import defaultdict
from decimal import Decimal
from typing import Any, Dict, Iterable, List, Optional

import httpx
from qdrant_client import AsyncQdrantClient
from qdrant_client.http.models import FieldCondition, Filter, MatchValue

from .models import FinancialInsight, FinancialSummary, IntentCandidate, IntentResolution
from .settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


_FALLBACK_SUMMARY = FinancialSummary(
    total_balance=2_500_000,
    monthly_income=1_800_000,
    monthly_expenses=1_200_000,
    expense_breakdown={
        "Vivienda": 420_000,
        "Alimentación": 340_000,
        "Transporte": 180_000,
        "Entretenimiento": 120_000,
    },
    recent_transactions=[
        {"description": "Supermercado Lider", "amount": -85_000, "category": "Alimentación"},
        {"description": "Sueldo", "amount": 1_800_000, "category": "Ingresos"},
        {"description": "Netflix", "amount": -9_990, "category": "Entretenimiento"},
        {"description": "Farmacia Ahumada", "amount": -45_000, "category": "Salud"},
    ],
)


def _to_float(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return 0.0
        try:
            return float(Decimal(value))
        except Exception:  # pragma: no cover - valores inesperados
            return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return 0.0


class SupabaseFinancialRepository:
    def __init__(self, base_url: Optional[str], service_role_key: Optional[str], timeout: float) -> None:
        self.base_url = base_url.rstrip("/") if base_url else None
        self.service_role_key = service_role_key
        self.timeout = timeout

    @property
    def enabled(self) -> bool:
        return bool(self.base_url and self.service_role_key)

    def _headers(self) -> Dict[str, str]:
        if not self.service_role_key:
            return {}
        token = self.service_role_key
        return {
            "apikey": token,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def _request(
        self, method: str, resource: str, params: Optional[Dict[str, str]] = None
    ) -> Optional[List[Dict[str, Any]]]:
        if not self.enabled:
            return None
        url = f"{self.base_url}/rest/v1/{resource.lstrip('/')}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.request(method, url, params=params, headers=self._headers())
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as exc:
            logger.warning("Error consultando Supabase (%s %s): %s", method, resource, exc)
            return None

    async def fetch_latest_statement(self, user_id: str) -> Optional[Dict[str, Any]]:
        params = {
            "select": "id,closing_balance,opening_balance,total_credit,total_debit,statement_date",
            "user_id": f"eq.{user_id}",
            "order": "statement_date.desc.nullslast",
            "limit": "1",
        }
        results = await self._request("GET", "statements", params=params)
        if results:
            return results[0]
        return None

    async def fetch_transactions(self, statement_id: str, limit: int = 500) -> List[Dict[str, Any]]:
        params = {
            "select": "description,raw_description,normalized_description,amount,category,posted_at,created_at",
            "statement_id": f"eq.{statement_id}",
            "order": "posted_at.desc.nullslast",
            "limit": str(limit),
        }
        results = await self._request("GET", "transactions", params=params)
        return results or []


class QdrantInsightRepository:
    def __init__(
        self,
        url: Optional[str],
        api_key: Optional[str],
        collection: str,
        limit: int,
        score_threshold: float,
        timeout: float,
    ) -> None:
        self.collection = collection
        self.limit = max(1, limit)
        self.score_threshold = max(0.0, score_threshold)
        self._client: Optional[AsyncQdrantClient] = None
        if url:
            self._client = AsyncQdrantClient(url=url, api_key=api_key, timeout=timeout)

    @property
    def enabled(self) -> bool:
        return self._client is not None

    async def fetch_related(
        self, session_id: str, intent: str, query_text: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        if not self._client:
            return []

        must_filters = []
        if session_id:
            must_filters.append(FieldCondition(key="user_id", match=MatchValue(value=session_id)))
        if intent:
            must_filters.append(FieldCondition(key="intent", match=MatchValue(value=intent)))

        payloads: List[Dict[str, Any]] = []
        try:
            points, _ = await self._client.scroll(
                collection_name=self.collection,
                scroll_filter=Filter(must=must_filters) if must_filters else None,
                limit=self.limit,
                with_vectors=False,
                with_payload=True,
            )
        except Exception as exc:  # pragma: no cover - protección ante despliegues sin Qdrant
            logger.warning("No se pudo consultar Qdrant: %s", exc)
            return []

        for point in points:
            payload = point.payload or {}
            score = payload.get("score")
            try:
                numeric_score = float(score) if score is not None else 0.0
            except (TypeError, ValueError):
                numeric_score = 0.0
            if numeric_score < self.score_threshold:
                continue
            if query_text:
                haystack = " ".join(
                    str(payload.get(key, "")) for key in ("summary", "content", "value", "text", "description")
                ).lower()
                if query_text.lower() not in haystack:
                    continue
            payloads.append(payload)
        return payloads


class ConversationDataService:
    def __init__(
        self,
        supabase_repo: Optional[SupabaseFinancialRepository],
        qdrant_repo: Optional[QdrantInsightRepository],
    ) -> None:
        self._supabase = supabase_repo
        self._qdrant = qdrant_repo

    async def fetch_summary(self, session_id: str) -> Optional[FinancialSummary]:
        if not self._supabase or not self._supabase.enabled:
            return None
        statement = await self._supabase.fetch_latest_statement(session_id)
        if not statement:
            return None
        transactions = await self._supabase.fetch_transactions(statement["id"])
        return self._compose_summary(statement, transactions)

    async def resolve_intent(
        self,
        intent: IntentCandidate,
        session_id: str,
        query_text: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[IntentResolution]:
        summary = await self.fetch_summary(session_id)
        qdrant_payloads: List[Dict[str, Any]] = []
        if self._qdrant and self._qdrant.enabled:
            qdrant_payloads = await self._qdrant.fetch_related(session_id, intent.name, query_text=query_text)

        insights: List[FinancialInsight] = []
        data: Dict[str, Any] = {"metadata": metadata or {}}

        if summary:
            data["summary"] = summary.dict()
            insights.extend(self._summary_insights(intent, summary))

        if qdrant_payloads:
            data["knowledge_base"] = qdrant_payloads
            insights.extend(self._qdrant_insights(qdrant_payloads))

        if not insights and not summary:
            return None

        response_text = self._compose_response(intent, summary, qdrant_payloads)
        return IntentResolution(intent=intent, response_text=response_text, insights=insights, data=data)

    def _compose_summary(
        self, statement: Dict[str, Any], transactions: List[Dict[str, Any]]
    ) -> FinancialSummary:
        closing_balance = _to_float(statement.get("closing_balance"))
        if not closing_balance:
            opening = _to_float(statement.get("opening_balance"))
            closing_balance = opening + _to_float(statement.get("total_credit")) - _to_float(
                statement.get("total_debit")
            )

        monthly_income = _to_float(statement.get("total_credit"))
        monthly_expenses = _to_float(statement.get("total_debit"))

        expense_breakdown: Dict[str, float] = defaultdict(float)
        income_amount = 0.0
        expense_amount = 0.0
        for tx in transactions:
            amount = _to_float(tx.get("amount"))
            category = str(tx.get("category") or "Sin categoría")
            if amount >= 0:
                income_amount += amount
            else:
                expense_amount += abs(amount)
                expense_breakdown[category] += abs(amount)

        if monthly_income == 0.0:
            monthly_income = income_amount
        if monthly_expenses == 0.0:
            monthly_expenses = expense_amount

        ordered_transactions = sorted(
            transactions,
            key=lambda tx: (tx.get("posted_at") or tx.get("created_at") or ""),
            reverse=True,
        )
        recent_transactions: List[Dict[str, Any]] = []
        for tx in ordered_transactions[:10]:
            recent_transactions.append(
                {
                    "description": tx.get("description")
                    or tx.get("normalized_description")
                    or tx.get("raw_description")
                    or "",
                    "amount": _to_float(tx.get("amount")),
                    "category": str(tx.get("category") or "Sin categoría"),
                    "posted_at": tx.get("posted_at"),
                }
            )

        return FinancialSummary(
            total_balance=closing_balance,
            monthly_income=monthly_income,
            monthly_expenses=monthly_expenses,
            expense_breakdown=dict(expense_breakdown),
            recent_transactions=recent_transactions,
        )

    def _summary_insights(self, intent: IntentCandidate, summary: FinancialSummary) -> List[FinancialInsight]:
        insights: List[FinancialInsight] = []
        surplus = summary.monthly_income - summary.monthly_expenses

        if intent.name == "consulta_balance":
            insights.append(
                FinancialInsight(
                    label="Balance total",
                    value=f"${summary.total_balance:,.0f} CLP",
                    context="Incluye cuentas corrientes y ahorros registrados en Supabase.",
                )
            )
            insights.append(
                FinancialInsight(
                    label="Excedente mensual",
                    value=f"${surplus:,.0f} CLP",
                    context="Ingresos menos gastos registrados en el último estado disponible.",
                )
            )
        elif intent.name == "gastos_categoria":
            if summary.expense_breakdown:
                top_categories = sorted(
                    summary.expense_breakdown.items(), key=lambda item: item[1], reverse=True
                )[:3]
                for category, amount in top_categories:
                    insights.append(
                        FinancialInsight(
                            label=f"Gasto en {category}",
                            value=f"${amount:,.0f} CLP",
                        )
                    )
        elif intent.name == "plan_ahorro":
            suggested_saving = max(0.0, surplus * 0.3)
            insights.append(
                FinancialInsight(
                    label="Ahorro sugerido",
                    value=f"${suggested_saving:,.0f} CLP",
                    context="Corresponde al 30% del excedente mensual estimado.",
                )
            )
        else:
            insights.append(
                FinancialInsight(
                    label="Resumen disponible",
                    value=f"Balance ${summary.total_balance:,.0f} CLP, ingresos ${summary.monthly_income:,.0f} CLP",
                )
            )
        return insights

    def _qdrant_insights(self, payloads: Iterable[Dict[str, Any]]) -> List[FinancialInsight]:
        insights: List[FinancialInsight] = []
        for payload in payloads:
            label = str(payload.get("title") or payload.get("label") or payload.get("tag") or "Insight relacionado")
            value = (
                payload.get("summary")
                or payload.get("value")
                or payload.get("content")
                or payload.get("text")
                or ""
            )
            if not value:
                continue
            insights.append(
                FinancialInsight(
                    label=label,
                    value=str(value),
                    context=payload.get("context") or payload.get("description"),
                )
            )
        return insights

    def _compose_response(
        self,
        intent: IntentCandidate,
        summary: Optional[FinancialSummary],
        payloads: List[Dict[str, Any]],
    ) -> str:
        fragments: List[str] = []
        surplus = 0.0
        if summary:
            surplus = summary.monthly_income - summary.monthly_expenses

        if intent.name == "consulta_balance" and summary:
            fragments.append(
                "Tu balance disponible es de ${:,.0f} CLP. En el último ciclo registraste ${:,.0f} de ingresos y ${:,.0f} de gastos.".format(
                    summary.total_balance, summary.monthly_income, summary.monthly_expenses
                )
            )
        elif intent.name == "gastos_categoria" and summary and summary.expense_breakdown:
            category, amount = max(summary.expense_breakdown.items(), key=lambda item: item[1])
            fragments.append(
                "En tu cartola más reciente, {} concentra ${:,.0f} CLP del gasto total.".format(category, amount)
            )
        elif intent.name == "plan_ahorro" and summary:
            suggested = max(0.0, surplus * 0.3)
            fragments.append(
                "Considera destinar ${:,.0f} CLP (30% de tu excedente) a ahorro periódico.".format(suggested)
            )
        elif summary:
            fragments.append(
                "El último resumen disponible muestra un balance de ${:,.0f} CLP y un excedente de ${:,.0f} CLP.".format(
                    summary.total_balance, surplus
                )
            )

        if payloads:
            highlight = payloads[0].get("summary") or payloads[0].get("value") or payloads[0].get("content")
            if highlight:
                fragments.append(f"Información relacionada: {highlight}")

        if not fragments:
            fragments.append(
                "Estoy analizando tu información financiera registrada para entregarte una recomendación contextualizada."
            )

        return " ".join(fragments)


class CoreAPIClient:
    """Async client que consulta core-api y aplica fallbacks con Supabase/Qdrant."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: float | None = None,
        data_service: Optional[ConversationDataService] = None,
    ) -> None:
        self.base_url = base_url or settings.core_api_base_url
        self.timeout = timeout or settings.request_timeout_seconds
        self._data_service = data_service

    async def _request(self, method: str, path: str, **kwargs: Any) -> Optional[Dict[str, Any]]:
        if not self.base_url:
            logger.debug("CORE_API_BASE_URL not configured, returning None for %s", path)
            return None

        url = f"{self.base_url.rstrip('/')}/{path.lstrip('/')}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.request(method, url, **kwargs)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as exc:
            logger.warning("Error communicating with core-api: %s", exc)
            return None

    async def resolve_intent(
        self,
        intent: IntentCandidate,
        session_id: str,
        query_text: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> IntentResolution:
        payload = {
            "intent": intent.name,
            "confidence": intent.confidence,
            "entities": intent.entities,
            "sessionId": session_id,
            "metadata": metadata or {},
        }
        data = await self._request("POST", "/api/ai/intents/resolve", json=payload)

        if data:
            response_text = data.get("response") or data.get("message") or ""
            insight_items = [
                FinancialInsight(
                    label=item.get("label", ""),
                    value=str(item.get("value", "")),
                    context=item.get("context"),
                )
                for item in data.get("insights", [])
            ]
            return IntentResolution(
                intent=intent,
                response_text=response_text,
                insights=insight_items,
                data=data.get("data", {}),
            )

        if self._data_service:
            resolution = await self._data_service.resolve_intent(
                intent,
                session_id,
                query_text=query_text,
                metadata=metadata,
            )
            if resolution:
                return resolution

        return self._fallback_resolution(intent)

    async def fetch_financial_summary(self, session_id: str) -> FinancialSummary:
        data = await self._request("GET", f"/api/ai/summary/{session_id}")
        if data:
            return FinancialSummary.parse_obj(data)

        if self._data_service:
            summary = await self._data_service.fetch_summary(session_id)
            if summary:
                return summary

        return _FALLBACK_SUMMARY

    def _fallback_resolution(self, intent: IntentCandidate) -> IntentResolution:
        logger.debug("Using fallback resolution for intent: %s", intent.name)
        summary = _FALLBACK_SUMMARY
        response_map = {
            "consulta_balance": (
                "Tu balance actual es de ${:,.0f} CLP. Dispones de un excedente mensual de ${:,.0f}.".format(
                    summary.total_balance, summary.monthly_income - summary.monthly_expenses
                ),
                [
                    FinancialInsight(
                        label="Balance total",
                        value=f"${summary.total_balance:,.0f} CLP",
                        context="Incluye cuentas corrientes y ahorros",
                    ),
                    FinancialInsight(
                        label="Excedente mensual",
                        value=f"${summary.monthly_income - summary.monthly_expenses:,.0f} CLP",
                    ),
                ],
            ),
            "gastos_categoria": (
                "Durante este mes, alimentación representa el 28% de tus gastos totales.",
                [
                    FinancialInsight(
                        label="Gasto en alimentación",
                        value=f"${summary.expense_breakdown['Alimentación']:,.0f} CLP",
                    ),
                ],
            ),
            "plan_ahorro": (
                "Puedes ahorrar $200.000 mensuales destinando el 33% de tu excedente.",
                [
                    FinancialInsight(
                        label="Excedente disponible",
                        value=f"${summary.monthly_income - summary.monthly_expenses:,.0f} CLP",
                    ),
                ],
            ),
        }

        response_text, insights = response_map.get(
            intent.name,
            (
                "Estoy analizando tus finanzas para ofrecerte una recomendación personalizada.",
                [
                    FinancialInsight(
                        label="Seguimiento",
                        value="Esta es una respuesta generada localmente mientras conectamos con core-api.",
                    )
                ],
            ),
        )
        return IntentResolution(intent=intent, response_text=response_text, insights=insights)
