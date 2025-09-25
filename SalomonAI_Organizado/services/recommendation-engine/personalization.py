"""Personalization helpers built around Qdrant for similarity search."""
from __future__ import annotations

import hashlib
import logging
import math
import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence

import numpy as np

try:  # pragma: no cover - Optional dependency during local testing
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as rest
except Exception:  # pragma: no cover - allow running without qdrant installed
    QdrantClient = None  # type: ignore
    rest = None  # type: ignore


LOGGER = logging.getLogger(__name__)
DEFAULT_COLLECTION = os.getenv("QDRANT_COLLECTION", "user_behaviours")
VECTOR_SIZE = 8


@dataclass
class SimilarUser:
    """Represents a similar user returned by Qdrant."""

    user_id: str
    score: float
    metadata: Dict[str, str]


class PersonalizationEngine:
    """Encapsulates Qdrant interactions for storing user embeddings."""

    def __init__(self) -> None:
        host = os.getenv("QDRANT_HOST", "localhost")
        port = int(os.getenv("QDRANT_PORT", "6333"))
        api_key = os.getenv("QDRANT_API_KEY")
        self._client: Optional[QdrantClient] = None

        if QdrantClient is None:
            LOGGER.warning("Qdrant client not available; running without vector search")
            return

        try:
            self._client = QdrantClient(host=host, port=port, api_key=api_key)
            self._ensure_collection()
        except Exception as exc:  # pragma: no cover - connectivity issues
            LOGGER.warning("Could not connect to Qdrant: %s", exc)
            self._client = None

    def _ensure_collection(self) -> None:
        if self._client is None:
            return

        assert rest is not None  # for mypy
        try:
            collections = self._client.get_collections()
            if DEFAULT_COLLECTION in {col.name for col in collections.collections}:
                return
        except Exception:
            LOGGER.debug("Collection lookup failed; attempting to recreate", exc_info=True)

        self._client.recreate_collection(
            collection_name=DEFAULT_COLLECTION,
            vectors_config=rest.VectorParams(size=VECTOR_SIZE, distance=rest.Distance.COSINE),
        )

    @property
    def is_available(self) -> bool:
        return self._client is not None

    def build_embedding(self, amount: float, category: str, description: str) -> List[float]:
        """Create a deterministic embedding from transaction attributes."""

        amount_log = math.log1p(abs(amount))
        amount_norm = min(amount / 5000.0, 1.0)
        discretionary = 1.0 if category.lower() in {"entretenimiento", "restaurante", "viajes"} else 0.0
        category_hash = int(hashlib.sha256(category.encode("utf-8")).hexdigest(), 16) % 10_000
        description_hash = int(hashlib.sha256(description.encode("utf-8")).hexdigest(), 16) % 10_000

        vector = np.array(
            [
                amount_norm,
                amount_log / 10.0,
                discretionary,
                float(category_hash) / 10_000.0,
                float(description_hash) / 10_000.0,
                math.sin(amount_log),
                math.cos(amount_log),
                1.0,
            ],
            dtype=np.float32,
        )
        return vector.tolist()

    def upsert_user_embedding(
        self,
        user_id: str,
        amount: float,
        category: str,
        description: str,
        metadata: Optional[Dict[str, str]] = None,
    ) -> None:
        """Persist or update the user embedding in Qdrant."""

        if self._client is None:
            return

        assert rest is not None  # for mypy
        vector = self.build_embedding(amount=amount, category=category, description=description)
        payload = {"user_id": user_id, "category": category, "description": description}
        if metadata:
            payload.update(metadata)

        try:
            self._client.upsert(
                collection_name=DEFAULT_COLLECTION,
                points=[
                    rest.PointStruct(
                        id=f"{user_id}:{hashlib.md5(description.encode()).hexdigest()}",
                        vector=vector,
                        payload=payload,
                    )
                ],
            )
        except Exception:
            LOGGER.warning("Failed to upsert embedding for user %s", user_id, exc_info=True)

    def find_similar_users(
        self, amount: float, category: str, description: str, limit: int = 5
    ) -> List[SimilarUser]:
        if self._client is None:
            return []

        assert rest is not None  # for mypy
        vector = self.build_embedding(amount=amount, category=category, description=description)
        try:
            results = self._client.search(
                collection_name=DEFAULT_COLLECTION,
                query_vector=vector,
                limit=limit,
                with_payload=True,
            )
        except Exception:  # pragma: no cover - network failures
            LOGGER.warning("Vector similarity search failed", exc_info=True)
            return []

        similar_users: List[SimilarUser] = []
        for point in results:
            payload = point.payload or {}
            user_identifier = str(payload.get("user_id", "unknown"))
            metadata = {key: str(value) for key, value in payload.items()}
            similar_users.append(
                SimilarUser(
                    user_id=user_identifier,
                    score=float(point.score or 0.0),
                    metadata=metadata,
                )
            )
        return similar_users

    def summarize_similar_users(
        self, similar_users: Sequence[SimilarUser], exclude_user: Optional[str] = None
    ) -> List[str]:
        """Return human readable insights from similar users."""

        insights: List[str] = []
        for user in similar_users:
            if exclude_user and user.user_id == exclude_user:
                continue
            category = user.metadata.get("category", "otros")
            insight = (
                f"Usuarios similares como {user.user_id} han optimizado sus gastos en {category}"
                f" (score {user.score:.2f})."
            )
            insights.append(insight)
        return insights
