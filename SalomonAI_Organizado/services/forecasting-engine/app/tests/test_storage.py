from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any, List
from uuid import uuid4

from app.models import ForecastSaveRequest
from app.storage import ForecastStorage


@dataclass
class _FakeTableState:
    rows: List[dict[str, Any]]


class _FakeInsert:
    def __init__(self, state: _FakeTableState, record: dict[str, Any]) -> None:
        self._state = state
        self._record = record

    def select(self, _columns: str) -> "_FakeInsert":
        return self

    def execute(self) -> SimpleNamespace:
        record = dict(self._record)
        if "id" not in record:
            record["id"] = str(uuid4())
        if "created_at" not in record:
            record["created_at"] = datetime.now(timezone.utc).isoformat()
        self._state.rows.append(record)
        return SimpleNamespace(data=[record], error=None)


class _FakeQuery:
    def __init__(self, state: _FakeTableState) -> None:
        self._state = state
        self._filters: list[tuple[str, str]] = []
        self._order_column: str | None = None
        self._order_desc: bool = False
        self._limit: int | None = None

    def eq(self, column: str, value: Any) -> "_FakeQuery":
        self._filters.append((column, str(value)))
        return self

    def order(self, column: str, *, desc: bool = False) -> "_FakeQuery":
        self._order_column = column
        self._order_desc = desc
        return self

    def limit(self, value: int) -> "_FakeQuery":
        self._limit = value
        return self

    def execute(self) -> SimpleNamespace:
        rows = list(self._state.rows)
        for column, value in self._filters:
            rows = [row for row in rows if str(row.get(column)) == value]

        if self._order_column:
            rows.sort(key=lambda row: row.get(self._order_column), reverse=self._order_desc)

        if self._limit is not None:
            rows = rows[: self._limit]

        return SimpleNamespace(data=rows, error=None)


class _FakeTable:
    def __init__(self) -> None:
        self._state = _FakeTableState(rows=[])

    def insert(self, record: dict[str, Any]) -> _FakeInsert:
        return _FakeInsert(self._state, record)

    def select(self, _columns: str) -> _FakeQuery:
        return _FakeQuery(self._state)


class _FakeSupabaseClient:
    def __init__(self) -> None:
        self.table_instance = _FakeTable()

    def table(self, name: str) -> Any:
        if name != "forecast_results":  # pragma: no cover - defensive branch
            raise ValueError(name)
        return self.table_instance


def test_save_and_retrieve_latest_forecast() -> None:
    client = _FakeSupabaseClient()
    storage = ForecastStorage(client)

    user_id = uuid4()
    payload = ForecastSaveRequest(
        user_id=user_id,
        forecast_type="cashflow_projection",
        forecast_data={"model_type": "auto", "forecasts": []},
        calculated_at=datetime(2024, 1, 1, 12, tzinfo=timezone.utc),
    )

    saved = storage.save_payload(payload)

    latest = storage.get_latest(user_id, forecast_type="cashflow_projection")
    assert latest is not None
    assert latest.id == saved.id
    assert latest.user_id == user_id
    assert latest.forecast_type == "cashflow_projection"
    assert latest.calculated_at.tzinfo is not None
    assert latest.forecast_data["model_type"] == "auto"


def test_get_latest_returns_none_when_no_records() -> None:
    client = _FakeSupabaseClient()
    storage = ForecastStorage(client)

    result = storage.get_latest(uuid4(), forecast_type="cashflow_projection")
    assert result is None
