import importlib.util
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Dict, List, Sequence

import pytest

pytest.importorskip("numpy")
pytest.importorskip("sklearn")

MODULE_PATH = Path(__file__).resolve().parents[1] / "main.py"
spec = importlib.util.spec_from_file_location("recommendation_engine_main", MODULE_PATH)
recommendation_main = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(recommendation_main)  # type: ignore[misc]

QdrantEmbeddingSynchronizer = recommendation_main.QdrantEmbeddingSynchronizer
UserFeatures = recommendation_main.UserFeatures
compute_user_hash = recommendation_main.compute_user_hash
build_user_profile_text = recommendation_main.build_user_profile_text
qm = recommendation_main.qm


class FakeEmbeddingGenerator:
    def __init__(self, dimension: int = 3) -> None:
        self.dimension = dimension
        self.calls: List[Sequence[str]] = []

    async def generate(self, texts: Sequence[str]) -> List[List[float]]:
        self.calls.append(list(texts))
        vectors: List[List[float]] = []
        for index, text in enumerate(texts):
            seed = float(sum(ord(ch) for ch in text) % 97)
            base = seed + index
            vectors.append([base + step for step in range(self.dimension)])
        return vectors


class FakeCollectionsResponse:
    def __init__(self, names: Sequence[str]) -> None:
        self.collections = [SimpleNamespace(name=name) for name in names]


class FakeQdrantClient:
    def __init__(self) -> None:
        self._collections: List[str] = []
        self.points: Dict[str, qm.PointStruct] = {}

    async def get_collections(self) -> FakeCollectionsResponse:
        return FakeCollectionsResponse(self._collections)

    async def recreate_collection(self, collection_name: str, **_: Any) -> None:
        if collection_name not in self._collections:
            self._collections.append(collection_name)

    async def upsert(self, collection_name: str, points: Sequence[qm.PointStruct], wait: bool = False) -> None:  # noqa: ARG002
        for point in points:
            self.points[str(point.id)] = point

    async def retrieve(self, collection_name: str, ids: Sequence[str], with_vectors: bool = True) -> List[SimpleNamespace]:  # noqa: ARG002,B950
        records: List[SimpleNamespace] = []
        for pid in ids:
            point = self.points.get(str(pid))
            if point is not None:
                records.append(SimpleNamespace(id=pid, vector=point.vector, payload=point.payload))
        return records

    async def search(
        self,
        collection_name: str,
        query_vector: Sequence[float],
        limit: int = 10,
        with_payload: bool = True,
    ) -> List[SimpleNamespace]:  # noqa: ARG002
        results: List[SimpleNamespace] = []
        for pid, point in self.points.items():
            score = float(sum(a * b for a, b in zip(query_vector, point.vector)))
            results.append(SimpleNamespace(id=pid, payload=point.payload if with_payload else {}, score=score))
        results.sort(key=lambda item: item.score, reverse=True)
        return results[:limit]

    async def close(self) -> None:
        return None


def test_compute_user_hash_is_stable() -> None:
    reference = compute_user_hash("user-123")
    assert reference == compute_user_hash("user-123")
    assert reference != compute_user_hash("user-456")
    assert len(reference) == 64
    int(reference, 16)  # no ValueError


def test_build_user_profile_text_is_canonical() -> None:
    features = {
        "window": "90d",
        "income_total": 1000000,
        "expense_total": 850000,
        "net_cashflow": 150000,
        "savings_rate": 0.15,
        "top_category": "restaurantes",
        "category_shares": {"restaurantes": 0.3, "supermercado": 0.2},
        "category_totals": {"restaurantes": 255000, "supermercado": 170000},
        "recurring_flags": {"arriendo": True, "luz": True},
        "volatility_expense": 0.25,
        "merchant_diversity": 8,
        "transaction_count": 42,
        "discretionary_ratio": 0.4,
        "essential_ratio": 0.6,
        "average_transaction": 54000,
        "last_transaction_at": "2024-05-10T10:00:00+00:00",
    }
    text = build_user_profile_text("abc123", features)
    expected = "\n".join(
        [
            "Perfil financiero usuario abc123:",
            "window=90d",
            "ingresos_mensuales=1000000",
            "gastos_mensuales=850000",
            "neto=150000",
            "tasa_ahorro=0.15",
            "top_category=restaurantes",
            'shares={"restaurantes": 0.3, "supermercado": 0.2}',
            'totales={"restaurantes": 255000, "supermercado": 170000}',
            'recurrencias={"arriendo": true, "luz": true}',
            "volatilidad_gasto=0.25",
            "discrecional=0.4",
            "esencial=0.6",
            "promedio_transaccion=54000",
            "merchant_diversity=8",
            "transaction_count=42",
            "ultimo_movimiento=2024-05-10T10:00:00+00:00",
        ]
    )
    assert text == expected


@pytest.mark.asyncio
async def test_sync_user_profiles_and_similarity() -> None:
    fake_client = FakeQdrantClient()
    generator = FakeEmbeddingGenerator(dimension=3)
    synchronizer = QdrantEmbeddingSynchronizer(
        client=fake_client,
        generator=generator,
        user_collection="user_finance_profiles",
        item_collection="reco_items",
        vector_size=3,
        model="text-embedding-3-small",
        version="vtest",
    )
    now = datetime.now(timezone.utc)
    feature_one = UserFeatures(
        user_id="user-1",
        total_income=1000000,
        total_expenses=850000,
        net_cash_flow=150000,
        average_transaction=45000,
        discretionary_ratio=0.4,
        essential_ratio=0.6,
        savings_rate=0.15,
        top_category="restaurantes",
        category_totals={"restaurantes": 255000},
        category_shares={"restaurantes": 0.3},
        merchant_diversity=10,
        recurring_flags={"arriendo": True},
        volatility_expense=0.25,
        transaction_count=42,
        last_transaction_at=now,
        updated_at=now,
    )
    feature_two = UserFeatures(
        user_id="user-2",
        total_income=980000,
        total_expenses=900000,
        net_cash_flow=80000,
        average_transaction=38000,
        discretionary_ratio=0.35,
        essential_ratio=0.65,
        savings_rate=0.12,
        top_category="supermercado",
        category_totals={"supermercado": 280000},
        category_shares={"supermercado": 0.28},
        merchant_diversity=7,
        recurring_flags={"luz": True},
        volatility_expense=0.3,
        transaction_count=38,
        last_transaction_at=now,
        updated_at=now,
    )

    result = await synchronizer.sync_user_profiles({feature_one.user_id: feature_one})
    assert result["status"] == "ok"
    assert result["synced"] == 1
    stored_hashes = list(fake_client.points.keys())
    assert compute_user_hash("user-1") in stored_hashes

    await synchronizer.sync_user_profiles({
        feature_one.user_id: feature_one,
        feature_two.user_id: feature_two,
    })
    neighbors = await synchronizer.find_similar_users("user-1", top_k=1)
    assert neighbors
    assert neighbors[0]["user_id_hash"] == compute_user_hash("user-2")
