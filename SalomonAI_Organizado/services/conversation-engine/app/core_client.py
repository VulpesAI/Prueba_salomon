from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import httpx

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


class CoreAPIClient:
    """Minimal async client to communicate with the NestJS core-api service."""

    def __init__(self, base_url: Optional[str] = None, timeout: float | None = None) -> None:
        self.base_url = base_url or settings.core_api_base_url
        self.timeout = timeout or settings.request_timeout_seconds

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

        return self._fallback_resolution(intent)

    async def fetch_financial_summary(self, session_id: str) -> FinancialSummary:
        data = await self._request("GET", f"/api/ai/summary/{session_id}")
        if data:
            return FinancialSummary.parse_obj(data)
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
                        context="Incluye cuentas corrientes y ahorros"
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
