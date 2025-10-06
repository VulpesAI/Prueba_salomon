from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import importlib.util
import pytest

pytest.importorskip("httpx")
pytest.importorskip("numpy")
pytest.importorskip("sklearn")

MODULE_PATH = Path(__file__).resolve().parents[1] / "main.py"
spec = importlib.util.spec_from_file_location("recommendation_engine_main", MODULE_PATH)
recommendation_main = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(recommendation_main)  # type: ignore[misc]

FeatureBuilder = recommendation_main.FeatureBuilder
FeatureStore = recommendation_main.FeatureStore
RecommendationModelManager = recommendation_main.RecommendationModelManager
RecommendationPipeline = recommendation_main.RecommendationPipeline
TransactionFetcher = recommendation_main.TransactionFetcher
TransactionNormalizer = recommendation_main.TransactionNormalizer


class FakeResponse:
    def __init__(self, status_code: int, payload: Dict[str, Any]) -> None:
        self.status_code = status_code
        self._payload = payload

    def json(self) -> Dict[str, Any]:
        return self._payload

    def raise_for_status(self) -> None:  # pragma: no cover - kept for interface compatibility
        if self.status_code >= 400:
            raise RuntimeError(f"status {self.status_code}")


class FakeAsyncClient:
    def __init__(self, responses: List[FakeResponse], calls: List[Dict[str, Any]]) -> None:
        self._responses = responses
        self.calls = calls

    async def __aenter__(self) -> "FakeAsyncClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None

    async def get(self, url: str, params: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None) -> FakeResponse:
        self.calls.append({"url": url, "params": params or {}, "headers": headers or {}})
        return self._responses.pop(0)


class FakeRepository:
    def __init__(self) -> None:
        self.saved: List[Any] = []

    async def bulk_upsert(self, transactions: List[Any]) -> tuple[int, int]:
        self.saved.extend(transactions)
        return len(transactions), 0

    async def fetch_all(self) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        for tx in self.saved:
            results.append(
                {
                    "id": tx.id,
                    "user_id": tx.user_id,
                    "amount": tx.amount,
                    "currency": tx.currency,
                    "date": tx.date.isoformat(),
                    "category": tx.category,
                    "subcategory": tx.subcategory,
                    "description": tx.description,
                    "merchant": tx.merchant,
                    "internal_category": tx.internal_category,
                }
            )
        return results


class FakeStateRepository:
    def __init__(self) -> None:
        self.last_synced: Optional[datetime] = None
        self._snapshot: Dict[str, datetime] = {}

    async def get_global_since(self) -> Optional[datetime]:
        return self.last_synced

    async def update_from_transactions(self, transactions: List[Any]) -> None:
        for tx in transactions:
            timestamp = tx.updated_at
            self.last_synced = max(self.last_synced, timestamp) if self.last_synced else timestamp
            self._snapshot[tx.user_id] = timestamp

    async def snapshot(self) -> Dict[str, datetime]:
        return dict(self._snapshot)


class FakeFetcher:
    def __init__(self, transactions: List[Dict[str, Any]]) -> None:
        self.transactions = transactions
        self.since_arguments: List[Optional[datetime]] = []
        self.mode = "api"

    async def fetch_transactions(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        self.since_arguments.append(since)
        return self.transactions


@pytest.mark.asyncio
async def test_pipeline_updates_state_and_features() -> None:
    now = datetime.now(timezone.utc)
    fetcher = FakeFetcher(
        [
            {
                "id": "tx-1",
                "user_id": "user-1",
                "amount": -120.5,
                "currency": "clp",
                "date": now.isoformat(),
                "updated_at": (now.replace(microsecond=0)),
                "category": "groceries",
            },
            {
                "id": "tx-2",
                "user_id": "user-1",
                "amount": 200.0,
                "currency": "clp",
                "date": now.isoformat(),
                "updated_at": (now.replace(microsecond=0)),
                "category": "income",
            },
        ]
    )
    builder = FeatureBuilder()
    store = FeatureStore()
    manager = RecommendationModelManager()
    normalizer = TransactionNormalizer()
    repository = FakeRepository()
    state_repository = FakeStateRepository()

    pipeline = RecommendationPipeline(
        fetcher=fetcher,  # type: ignore[arg-type]
        builder=builder,
        store=store,
        model_manager=manager,
        normalizer=normalizer,
        repository=repository,  # type: ignore[arg-type]
        state_repository=state_repository,  # type: ignore[arg-type]
        interval_seconds=1,
    )

    summary = await pipeline.run_once()

    assert summary["ingested_count"] == 2
    assert summary["normalized"] == 2
    assert summary["users_tracked"] == 1
    assert state_repository.last_synced is not None
    status = pipeline.status()
    assert status["last_synced_at"] is not None
    assert fetcher.since_arguments == [None]


def test_transaction_normalizer_validates_and_normalizes() -> None:
    normalizer = TransactionNormalizer()
    raw_transactions = [
        {
            "id": "tx-100",
            "user_id": "user-xyz",
            "amount": -50.75,
            "currency": "clp",
            "date": "2024-06-01T12:00:00Z",
            "updated_at": "2024-06-01T12:30:00Z",
            "category": "groceries",
            "description": "Supermercado",
        },
        {
            "id": "invalid",
            "amount": "nan",
            "currency": "usd",
        },
    ]

    normalized, skipped = normalizer.normalize_many(raw_transactions)

    assert skipped == 1
    assert len(normalized) == 1
    transaction = normalized[0]
    assert transaction.currency == "CLP"
    assert transaction.internal_category == "essential_spending"
    assert transaction.to_feature_payload()["category"] == "essential_spending"
    record = transaction.to_record()
    assert record["user_id"] == "user-xyz"


@pytest.mark.asyncio
async def test_transaction_fetcher_handles_pagination_and_since() -> None:
    responses = [
        FakeResponse(
            200,
            {
                "data": [
                    {"id": "1", "user_id": "u1", "amount": 10, "currency": "CLP", "date": "2024-01-01T00:00:00Z", "updated_at": "2024-01-01T00:01:00Z"},
                    {"id": "2", "user_id": "u1", "amount": 20, "currency": "CLP", "date": "2024-01-02T00:00:00Z", "updated_at": "2024-01-02T00:01:00Z"},
                ],
                "meta": {"page": 1, "total_pages": 2},
            },
        ),
        FakeResponse(
            200,
            {
                "data": [
                    {"id": "3", "user_id": "u1", "amount": 30, "currency": "CLP", "date": "2024-01-03T00:00:00Z", "updated_at": "2024-01-03T00:01:00Z"},
                ],
                "meta": {"page": 2, "total_pages": 2},
            },
        ),
    ]
    calls: List[Dict[str, Any]] = []
    client = FakeAsyncClient(responses, calls)
    fetcher = TransactionFetcher(
        mode="api",
        api_url="https://core.example.com/api/v1/movimientos/categorizados",
        kafka_bootstrap=None,
        kafka_topic=None,
        timeout=1.0,
        kafka_batch_size=100,
        auth_token="secret-token",
        page_limit=2,
        db_reader=None,
        http_client_factory=lambda: client,
    )

    since_value = datetime(2024, 1, 1, tzinfo=timezone.utc)
    transactions = await fetcher.fetch_transactions(since=since_value)

    assert len(transactions) == 3
    assert calls[0]["params"]["since"].startswith("2024-01-01T00:00:00")
    assert calls[0]["headers"]["Authorization"].startswith("Bearer ")
    assert calls[0]["params"]["limit"] == 2
    assert calls[1]["params"]["page"] == 2
