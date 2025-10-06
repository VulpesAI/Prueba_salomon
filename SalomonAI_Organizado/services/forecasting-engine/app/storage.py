from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import timezone
from typing import Any, Optional
from uuid import UUID

from supabase import Client

from .schemas import ForecastResponse, ForecastSaveRequest, ForecastSaveResult

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class _QueryResult:
    data: list[dict[str, Any]]
    error: Optional[Exception]


class ForecastStorage:
    """Persist and retrieve forecasting results in Supabase."""

    def __init__(self, client: Client, *, table_name: str = "forecast_results") -> None:
        self._client = client
        self._table_name = table_name

    def save_payload(self, payload: ForecastSaveRequest) -> ForecastSaveResult:
        """Insert a forecast payload into Supabase."""

        normalized = self._normalize_payload(payload)
        logger.info(
            "Persisting forecast result for user %s of type %s", normalized["user_id"], normalized["forecast_type"]
        )
        try:
            response = self._client.table(self._table_name).insert(normalized).select("*").execute()
        except Exception as exc:  # pragma: no cover - network errors from supabase client
            logger.exception("Supabase insert failed for user %s", normalized["user_id"])
            raise RuntimeError("No fue posible almacenar la proyección en Supabase") from exc

        result = self._build_result(response)
        if result.error:
            logger.error("Supabase insert returned error for user %s: %s", normalized["user_id"], result.error)
            raise RuntimeError("Supabase rechazó el almacenamiento de la proyección") from result.error

        if not result.data:
            raise RuntimeError("Supabase no devolvió la proyección almacenada")

        return ForecastSaveResult.model_validate(result.data[0])

    def save_response(self, response: ForecastResponse, *, forecast_type: str) -> ForecastSaveResult:
        try:
            user_uuid = UUID(response.user_id)
        except ValueError as exc:  # pragma: no cover - validated upstream
            raise RuntimeError("El identificador de usuario no es un UUID válido") from exc

        payload = ForecastSaveRequest(
            user_id=user_uuid,
            forecast_type=forecast_type,
            forecast_data=response.model_dump(mode="json"),
            calculated_at=response.generated_at,
            model_type=response.model_type,
            error_metrics=response.metrics,
        )
        return self.save_payload(payload)

    def get_latest(self, user_id: UUID, *, forecast_type: str) -> Optional[ForecastSaveResult]:
        logger.debug("Fetching latest forecast for user %s of type %s", user_id, forecast_type)
        try:
            response = (
                self._client.table(self._table_name)
                .select("*")
                .eq("user_id", str(user_id))
                .eq("forecast_type", forecast_type)
                .order("calculated_at", desc=True)
                .limit(1)
                .execute()
            )
        except Exception as exc:  # pragma: no cover - network errors from supabase client
            logger.exception("Supabase query failed for user %s", user_id)
            raise RuntimeError("No fue posible recuperar la proyección almacenada") from exc

        result = self._build_result(response)
        if result.error:
            logger.error("Supabase query returned error for user %s: %s", user_id, result.error)
            raise RuntimeError("Supabase rechazó la consulta de proyecciones") from result.error

        if not result.data:
            return None

        return ForecastSaveResult.model_validate(result.data[0])

    def _normalize_payload(self, payload: ForecastSaveRequest) -> dict[str, Any]:
        calculated_at = payload.calculated_at
        if calculated_at.tzinfo is None:
            logger.warning("calculated_at without timezone; assuming UTC")
            calculated_at = calculated_at.replace(tzinfo=timezone.utc)
        else:
            calculated_at = calculated_at.astimezone(timezone.utc)

        normalized = {
            "user_id": str(payload.user_id),
            "forecast_type": payload.forecast_type,
            "forecast_data": payload.forecast_data,
            "calculated_at": calculated_at.isoformat(),
        }
        if payload.model_type:
            normalized["model_type"] = payload.model_type
        if payload.error_metrics is not None:
            normalized["error_metrics"] = payload.error_metrics.model_dump(mode="json")
        return normalized

    @staticmethod
    def _build_result(response: Any) -> _QueryResult:
        data = getattr(response, "data", None)
        error = getattr(response, "error", None)
        if data is None:
            data = []
        if error is not None and not isinstance(error, Exception):
            error = RuntimeError(str(error))
        return _QueryResult(data=list(data), error=error)


def build_storage(client: Client, *, table_name: str = "forecast_results") -> ForecastStorage:
    return ForecastStorage(client, table_name=table_name)
