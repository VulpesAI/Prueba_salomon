from __future__ import annotations

import logging
from datetime import datetime
from collections import defaultdict
from decimal import Decimal
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

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

_INTENT_ALIASES: Dict[str, Set[str]] = {
    "saldo_actual": {"saldo_actual", "consulta_balance", "balance.current"},
    "gasto_mes": {"gasto_mes", "gastos_categoria", "spending.current_month"},
    "proyeccion_flujo": {"proyeccion_flujo", "forecast.cashflow"},
    "plan_ahorro": {"plan_ahorro"},
    "limite_credito": {"limite_credito"},
}


def normalize_intent_name(name: str) -> str:
    for canonical, aliases in _INTENT_ALIASES.items():
        if name in aliases:
            return canonical
    return name


def _currency_code(currency: Optional[str]) -> str:
    if not currency:
        return "CLP"
    return str(currency).upper()


def _format_currency(amount: float, currency: Optional[str] = None) -> str:
    code = _currency_code(currency)
    formatted = f"{abs(amount):,.0f}".replace(",", ".")
    sign = "-" if amount < 0 else ""
    if code == "CLP":
        return f"{sign}${formatted} {code}"
    return f"{sign}{code} ${formatted}"


def _parse_datetime(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            cleaned = value.replace("Z", "+00:00")
            return datetime.fromisoformat(cleaned)
        except ValueError:
            return None
    return None


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
        self,
        method: str,
        resource: str,
        params: Optional[Dict[str, str]] = None,
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

    async def _post(self, resource: str, payload: Dict[str, Any]) -> None:
        if not self.enabled:
            return
        url = f"{self.base_url}/rest/v1/{resource.lstrip('/')}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    url,
                    headers={**self._headers(), "Prefer": "return=minimal"},
                    json=payload,
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("Error escribiendo en Supabase (%s): %s", resource, exc)

    async def log_conversation_event(self, entry: Dict[str, Any]) -> None:
        if not entry:
            return
        payload = {key: value for key, value in entry.items() if value is not None}
        if not payload:
            return
        await self._post("conversation_logs", payload)

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

    @staticmethod
    def _serialize(value: Any) -> Any:
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, list):
            return [ConversationDataService._serialize(item) for item in value]
        if isinstance(value, dict):
            return {key: ConversationDataService._serialize(val) for key, val in value.items()}
        if hasattr(value, "dict"):
            return ConversationDataService._serialize(value.dict())
        return value

    async def _log_event(self, session_id: str, event_type: str, **fields: Any) -> None:
        if not self._supabase or not self._supabase.enabled:
            return
        payload: Dict[str, Any] = {"session_id": session_id, "event_type": event_type}
        for key, value in fields.items():
            if value is None:
                continue
            if key == "metadata" and isinstance(value, dict):
                serialized = self._serialize(value)
                if serialized:
                    payload[key] = serialized
            else:
                payload[key] = value
        await self._supabase.log_conversation_event(payload)

    async def log_intent_detection(
        self,
        session_id: str,
        *,
        query: str,
        detected: IntentCandidate,
        intents: List[IntentCandidate],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        await self._log_event(
            session_id,
            "intent_detected",
            user_query=query,
            detected_intent=normalize_intent_name(detected.name),
            intent_confidence=detected.confidence,
            metadata={
                "query": query,
                "requestMetadata": metadata or {},
                "intents": [intent.dict() for intent in intents],
            },
        )

    async def log_intent_resolution(
        self,
        session_id: str,
        *,
        query: str,
        resolution: IntentResolution,
        response_text: str,
        summary: Optional[FinancialSummary],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        event_metadata: Dict[str, Any] = {
            "resolution": resolution.dict(),
            "requestMetadata": metadata or {},
        }
        if summary:
            event_metadata["summary"] = summary.dict()
        await self._log_event(
            session_id,
            "response_sent",
            user_query=query,
            detected_intent=normalize_intent_name(resolution.intent.name),
            intent_confidence=resolution.intent.confidence,
            response_text=response_text,
            metadata=event_metadata,
        )

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
        canonical_intent = normalize_intent_name(intent.name)
        summary = await self.fetch_summary(session_id)
        qdrant_payloads: List[Dict[str, Any]] = []
        if self._qdrant and self._qdrant.enabled:
            qdrant_payloads = await self._qdrant.fetch_related(
                session_id,
                canonical_intent,
                query_text=query_text,
            )

        insights: List[FinancialInsight] = []
        data: Dict[str, Any] = {"metadata": metadata or {}, "intent": canonical_intent}

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
        canonical_intent = normalize_intent_name(intent.name)

        if canonical_intent == "saldo_actual":
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
        elif canonical_intent == "gasto_mes":
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
        elif canonical_intent == "plan_ahorro":
            suggested_saving = max(0.0, surplus * 0.3)
            insights.append(
                FinancialInsight(
                    label="Ahorro sugerido",
                    value=f"${suggested_saving:,.0f} CLP",
                    context="Corresponde al 30% del excedente mensual estimado.",
                )
            )
        elif canonical_intent == "limite_credito":
            insights.append(
                FinancialInsight(
                    label="Excedente mensual estimado",
                    value=f"${surplus:,.0f} CLP",
                    context="Te da una referencia de capacidad de pago frente a tus productos de crédito.",
                )
            )
            insights.append(
                FinancialInsight(
                    label="Gasto mensual registrado",
                    value=f"${summary.monthly_expenses:,.0f} CLP",
                    context="Corresponde al total de gastos del último período consolidado.",
                )
            )
        elif canonical_intent == "proyeccion_flujo":
            insights.append(
                FinancialInsight(
                    label="Excedente mensual histórico",
                    value=f"${surplus:,.0f} CLP",
                    context="Se utiliza como base para proyectar el flujo de caja futuro.",
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
        canonical_intent = normalize_intent_name(intent.name)

        if canonical_intent == "saldo_actual" and summary:
            fragments.append(
                "Tu balance disponible es de ${:,.0f} CLP. En el último ciclo registraste ${:,.0f} de ingresos y ${:,.0f} de gastos.".format(
                    summary.total_balance, summary.monthly_income, summary.monthly_expenses
                )
            )
        elif canonical_intent == "gasto_mes" and summary and summary.expense_breakdown:
            category, amount = max(summary.expense_breakdown.items(), key=lambda item: item[1])
            fragments.append(
                "En tu cartola más reciente, {} concentra ${:,.0f} CLP del gasto total.".format(category, amount)
            )
        elif canonical_intent == "plan_ahorro" and summary:
            suggested = max(0.0, surplus * 0.3)
            fragments.append(
                "Considera destinar ${:,.0f} CLP (30% de tu excedente) a ahorro periódico.".format(suggested)
            )
        elif canonical_intent == "limite_credito" and summary:
            fragments.append(
                "Según tus movimientos, mantienes un excedente mensual aproximado de ${:,.0f} CLP. Úsalo como referencia para controlar el cupo de tus tarjetas y líneas de crédito.".format(
                    surplus
                )
            )
        elif canonical_intent == "proyeccion_flujo" and summary:
            fragments.append(
                "Tu flujo histórico deja un excedente aproximado de ${:,.0f} CLP, útil como base para proyectar los próximos movimientos.".format(
                    surplus
                )
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

    def _build_parameters(
        self,
        metadata: Optional[Dict[str, Any]],
        entities: Dict[str, Any],
    ) -> Dict[str, Any]:
        params: Dict[str, Any] = {}

        def merge(source: Optional[Dict[str, Any]]) -> None:
            if not source:
                return
            for key, value in source.items():
                if value is None:
                    continue
                key_str = str(key).strip()
                if not key_str:
                    continue
                if isinstance(value, (str, int, float, bool)):
                    params[key_str] = value
                else:
                    params[key_str] = str(value)

        merge(metadata)
        merge(entities)
        return params

    def _build_core_resolution(
        self,
        intent: IntentCandidate,
        canonical_intent: str,
        payload: Dict[str, Any],
    ) -> Tuple[str, List[FinancialInsight]]:
        if canonical_intent == "saldo_actual":
            return self._build_balance_resolution(payload)
        if canonical_intent == "gasto_mes":
            return self._build_spending_resolution(payload)
        if canonical_intent == "proyeccion_flujo":
            return self._build_forecast_resolution(payload)

        message = payload.get("message")
        if isinstance(message, str) and message.strip():
            return message, []
        return (
            "Estoy analizando tu información financiera registrada para entregarte una recomendación contextualizada.",
            [],
        )

    def _build_balance_resolution(self, payload: Dict[str, Any]) -> Tuple[str, List[FinancialInsight]]:
        saldo = payload.get("saldoActual") if isinstance(payload.get("saldoActual"), dict) else {}
        currency = saldo.get("currency") or payload.get("currency")
        total = _to_float(saldo.get("total"))
        accounts = saldo.get("accounts") if isinstance(saldo.get("accounts"), list) else []
        categoria = (
            payload.get("categoriaPrincipal")
            if isinstance(payload.get("categoriaPrincipal"), dict)
            else None
        )

        fragments: List[str] = []
        insights: List[FinancialInsight] = []

        if total:
            fragments.append(f"Tu saldo consolidado es de {_format_currency(total, currency)}.")
            insights.append(
                FinancialInsight(label="Saldo consolidado", value=_format_currency(total, currency))
            )

        account_insights = 0
        for account in accounts:
            balance = _to_float(account.get("balance"))
            if balance == 0:
                continue
            name = str(
                account.get("name")
                or account.get("institution")
                or account.get("accountId")
                or "Cuenta"
            )
            account_currency = account.get("currency") or currency
            insights.append(
                FinancialInsight(
                    label=f"Saldo en {name}",
                    value=_format_currency(balance, account_currency),
                    context=account.get("institution") or None,
                )
            )
            account_insights += 1
            if account_insights >= 3:
                break

        if categoria:
            category_name = str(
                categoria.get("category") or categoria.get("name") or "Categoría principal"
            )
            amount = _to_float(categoria.get("total"))
            if amount:
                fragments.append(
                    f"El mayor gasto reciente es en {category_name} con {_format_currency(amount, currency)}."
                )
                percentage = _to_float(categoria.get("percentage"))
                context = (
                    f"Equivale al {percentage:.1f}% del gasto del período."
                    if percentage
                    else None
                )
                insights.append(
                    FinancialInsight(
                        label="Categoría principal",
                        value=f"{category_name}: {_format_currency(amount, currency)}",
                        context=context,
                    )
                )

        if not fragments:
            fragments.append(
                "Estoy analizando tu saldo consolidado con la información más reciente registrada."
            )

        return " ".join(fragments), insights

    def _build_spending_resolution(self, payload: Dict[str, Any]) -> Tuple[str, List[FinancialInsight]]:
        currency = payload.get("currency")
        gastos = _to_float(payload.get("gastos"))
        ingresos = _to_float(payload.get("ingresos"))
        neto = _to_float(payload.get("neto"))
        categories = (
            payload.get("categorias")
            if isinstance(payload.get("categorias"), list)
            else []
        )

        fragments: List[str] = []
        insights: List[FinancialInsight] = []

        if gastos:
            fragments.append(
                f"En el período analizado has gastado {_format_currency(gastos, currency)}."
            )
            insights.append(
                FinancialInsight(
                    label="Gasto del período",
                    value=_format_currency(gastos, currency),
                )
            )

        sorted_categories: List[Tuple[str, float, Dict[str, Any]]] = []
        for item in categories:
            if not isinstance(item, dict):
                continue
            name = str(item.get("category") or item.get("name") or "Sin categoría")
            amount = _to_float(item.get("total"))
            sorted_categories.append((name, amount, item))

        sorted_categories.sort(key=lambda entry: entry[1], reverse=True)

        if sorted_categories:
            top_name, top_amount, _ = sorted_categories[0]
            if top_amount:
                fragments.append(
                    f"La categoría con mayor gasto es {top_name} con {_format_currency(top_amount, currency)}."
                )

        for name, amount, item in sorted_categories[:3]:
            if amount <= 0:
                continue
            percentage = _to_float(item.get("percentage"))
            context = (
                f"{percentage:.1f}% del gasto del período."
                if percentage
                else None
            )
            insights.append(
                FinancialInsight(
                    label=f"Gasto en {name}",
                    value=_format_currency(amount, currency),
                    context=context,
                )
            )

        if ingresos:
            insights.append(
                FinancialInsight(
                    label="Ingresos del período",
                    value=_format_currency(ingresos, currency),
                )
            )

        if neto:
            fragments.append(
                f"El flujo neto acumulado es {_format_currency(neto, currency)}."
            )
            insights.append(
                FinancialInsight(
                    label="Flujo neto",
                    value=_format_currency(neto, currency),
                )
            )

        if not fragments:
            fragments.append("No se registran gastos en el período consultado.")

        return " ".join(fragments), insights

    def _build_forecast_resolution(self, payload: Dict[str, Any]) -> Tuple[str, List[FinancialInsight]]:
        horizon = payload.get("horizonDays")
        model = payload.get("modelType")
        points_payload = payload.get("points") if isinstance(payload.get("points"), list) else []

        points: List[Tuple[datetime, float]] = []
        for entry in points_payload:
            if not isinstance(entry, dict):
                continue
            date = _parse_datetime(entry.get("date"))
            amount = _to_float(entry.get("amount"))
            if date:
                points.append((date, amount))

        points.sort(key=lambda item: item[0])

        fragments: List[str] = []
        insights: List[FinancialInsight] = []

        if horizon:
            insights.append(
                FinancialInsight(
                    label="Horizonte de proyección",
                    value=f"{int(horizon)} días",
                )
            )

        if model:
            insights.append(
                FinancialInsight(
                    label="Modelo utilizado",
                    value=str(model),
                    context=str(payload.get("source") or "forecasting-engine"),
                )
            )

        if points:
            start_date, start_amount = points[0]
            end_date, end_amount = points[-1]
            fragments.append(
                "La proyección estima un flujo de {} hacia el {}.".format(
                    _format_currency(end_amount), end_date.strftime("%d-%m-%Y")
                )
            )
            delta = end_amount - start_amount
            if delta:
                tendencia = "un incremento" if delta >= 0 else "una disminución"
                fragments.append(
                    f"Esto representa {tendencia} de {_format_currency(abs(delta))} respecto al inicio del período."
                )
            insights.append(
                FinancialInsight(
                    label="Flujo proyectado al cierre",
                    value=_format_currency(end_amount),
                    context=f"Proyección al {end_date.strftime('%d-%m-%Y')}",
                )
            )
        else:
            fragments.append(
                "No fue posible calcular la proyección con los datos actuales, se utilizará la tendencia histórica."
            )

        return " ".join(fragments), insights
    async def resolve_intent(
        self,
        intent: IntentCandidate,
        session_id: str,
        query_text: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> IntentResolution:
        canonical_intent = normalize_intent_name(intent.name)
        parameters = self._build_parameters(metadata, intent.entities)
        payload: Dict[str, Any] = {
            "intent": canonical_intent,
            "userId": session_id,
            "sessionId": session_id,
        }
        if parameters:
            payload["parameters"] = parameters
        data = await self._request("POST", "/api/ai/intents/resolve", json=payload)

        if data:
            status = data.get("status")
            payload_data = data.get("data")
            if status == "resolved" and isinstance(payload_data, dict):
                response_text, insights = self._build_core_resolution(intent, canonical_intent, payload_data)
                return IntentResolution(
                    intent=intent,
                    response_text=response_text,
                    insights=insights,
                    data=payload_data,
                )

            message = data.get("message") or data.get("response")
            if message:
                return IntentResolution(
                    intent=intent,
                    response_text=str(message),
                    insights=[],
                    data=payload_data if isinstance(payload_data, dict) else {},
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

    async def fetch_financial_summary(
        self,
        session_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> FinancialSummary:
        params: Dict[str, Any] = {"userId": session_id}
        if metadata:
            account_id = metadata.get("accountId") or metadata.get("account_id")
            if account_id:
                params["accountId"] = account_id
            start_date = metadata.get("startDate") or metadata.get("start_date")
            end_date = metadata.get("endDate") or metadata.get("end_date")
            if start_date:
                params["startDate"] = start_date
            if end_date:
                params["endDate"] = end_date

        data = await self._request("GET", f"/api/ai/summary/{session_id}", params=params)
        if data:
            summary = self._build_summary_from_core(data)
            if summary:
                return summary

        if self._data_service:
            summary = await self._data_service.fetch_summary(session_id)
            if summary:
                return summary

        return _FALLBACK_SUMMARY

    def _build_summary_from_core(self, payload: Dict[str, Any]) -> Optional[FinancialSummary]:
        saldo = payload.get("saldoActual") if isinstance(payload.get("saldoActual"), dict) else {}
        total_balance = _to_float(saldo.get("total"))
        monthly_income = _to_float(payload.get("ingresos"))
        monthly_expenses = _to_float(payload.get("gastos"))

        breakdown: Dict[str, float] = {}

        gastos_periodo = (
            payload.get("gastosDelPeriodo")
            if isinstance(payload.get("gastosDelPeriodo"), dict)
            else None
        )
        if gastos_periodo and isinstance(gastos_periodo.get("categories"), list):
            for entry in gastos_periodo["categories"]:
                if not isinstance(entry, dict):
                    continue
                name = str(entry.get("category") or entry.get("name") or "Sin categoría")
                amount = _to_float(entry.get("total"))
                if amount:
                    breakdown[name] = amount

        categoria_principal = (
            payload.get("categoriaPrincipal")
            if isinstance(payload.get("categoriaPrincipal"), dict)
            else None
        )
        if categoria_principal:
            name = str(
                categoria_principal.get("category")
                or categoria_principal.get("name")
                or "Categoría principal"
            )
            amount = _to_float(categoria_principal.get("total"))
            if amount and name not in breakdown:
                breakdown[name] = amount

        generated_at = _parse_datetime(payload.get("generatedAt")) or datetime.utcnow()

        return FinancialSummary(
            total_balance=total_balance,
            monthly_income=monthly_income,
            monthly_expenses=monthly_expenses,
            expense_breakdown=breakdown,
            recent_transactions=[],
            generated_at=generated_at,
        )

    def _fallback_resolution(self, intent: IntentCandidate) -> IntentResolution:
        logger.debug("Using fallback resolution for intent: %s", intent.name)
        summary = _FALLBACK_SUMMARY
        canonical_intent = normalize_intent_name(intent.name)
        top_category: Tuple[str, float] | None = None
        if summary.expense_breakdown:
            top_category = max(summary.expense_breakdown.items(), key=lambda item: item[1])

        response_map = {
            "saldo_actual": (
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
            "gasto_mes": (
                "Durante este mes, {} representa el {:.0f}% de tus gastos totales.".format(
                    top_category[0] if top_category else "alimentación",
                    (top_category[1] / summary.monthly_expenses * 100) if (top_category and summary.monthly_expenses) else 28,
                ),
                [
                    FinancialInsight(
                        label=f"Gasto en {top_category[0]}" if top_category else "Gasto principal",
                        value=f"${(top_category[1] if top_category else summary.monthly_expenses * 0.28):,.0f} CLP",
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
            "limite_credito": (
                "Considera que tu excedente mensual es de ${:,.0f} CLP; úsalo como referencia para no sobrepasar el límite de tus productos de crédito.".format(
                    summary.monthly_income - summary.monthly_expenses
                ),
                [
                    FinancialInsight(
                        label="Excedente mensual",
                        value=f"${summary.monthly_income - summary.monthly_expenses:,.0f} CLP",
                    ),
                    FinancialInsight(
                        label="Balance en cuentas",
                        value=f"${summary.total_balance:,.0f} CLP",
                        context="Saldo consolidado en tus cuentas registradas.",
                    ),
                ],
            ),
            "proyeccion_flujo": (
                "Tu flujo histórico deja un excedente aproximado de ${:,.0f} CLP. Utiliza este dato como referencia mientras generamos una proyección actualizada.".format(
                    summary.monthly_income - summary.monthly_expenses
                ),
                [
                    FinancialInsight(
                        label="Excedente mensual",
                        value=f"${summary.monthly_income - summary.monthly_expenses:,.0f} CLP",
                    ),
                ],
            ),
        }

        response_text, insights = response_map.get(
            canonical_intent,
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
