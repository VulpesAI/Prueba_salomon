"""Feedback and metrics management for the recommendation engine."""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import DefaultDict, Dict, List, Optional


class FeedbackAction(str, Enum):
    """Supported actions a user can take after receiving a recommendation."""

    ACCEPTED = "accepted"
    DISMISSED = "dismissed"
    SAVED_FOR_LATER = "saved_for_later"


@dataclass
class FeedbackEvent:
    """Stores the action taken by a user over a recommendation."""

    user_id: str
    recommendation: str
    action: FeedbackAction
    amount: float
    category: str
    created_at: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))
    metadata: Optional[Dict[str, str]] = None


@dataclass
class RecommendationMetrics:
    """Aggregated metrics that help measure the success of the engine."""

    total_recommendations: int = 0
    total_feedback_events: int = 0
    accepted_recommendations: int = 0
    dismissed_recommendations: int = 0
    saved_for_later: int = 0
    estimated_savings: float = 0.0

    def register_recommendation(self) -> None:
        self.total_recommendations += 1

    def register_feedback(self, event: FeedbackEvent) -> None:
        self.total_feedback_events += 1

        if event.action is FeedbackAction.ACCEPTED:
            self.accepted_recommendations += 1
            # Simple heuristic: assume a 12% savings on high value recommendations.
            self.estimated_savings += max(event.amount * 0.12, 0)
        elif event.action is FeedbackAction.DISMISSED:
            self.dismissed_recommendations += 1
        elif event.action is FeedbackAction.SAVED_FOR_LATER:
            self.saved_for_later += 1

    @property
    def engagement_rate(self) -> float:
        if not self.total_recommendations:
            return 0.0
        return self.total_feedback_events / self.total_recommendations

    @property
    def acceptance_rate(self) -> float:
        if not self.total_recommendations:
            return 0.0
        return self.accepted_recommendations / self.total_recommendations


class FeedbackLoop:
    """Maintains the feedback events and metrics in-memory."""

    def __init__(self) -> None:
        self._metrics = RecommendationMetrics()
        self._events: DefaultDict[str, List[FeedbackEvent]] = defaultdict(list)

    def register_recommendation(self, user_id: str) -> None:
        self._metrics.register_recommendation()
        self._events.setdefault(user_id, [])

    def register_feedback(
        self,
        user_id: str,
        recommendation: str,
        action: FeedbackAction,
        amount: float,
        category: str,
        metadata: Optional[Dict[str, str]] = None,
    ) -> FeedbackEvent:
        event = FeedbackEvent(
            user_id=user_id,
            recommendation=recommendation,
            action=action,
            amount=amount,
            category=category,
            metadata=metadata,
        )
        self._events[user_id].append(event)
        self._metrics.register_feedback(event)
        return event

    def get_metrics_snapshot(self) -> Dict[str, float]:
        """Return current metrics for reporting purposes."""

        return {
            "total_recommendations": float(self._metrics.total_recommendations),
            "total_feedback_events": float(self._metrics.total_feedback_events),
            "accepted_recommendations": float(self._metrics.accepted_recommendations),
            "dismissed_recommendations": float(self._metrics.dismissed_recommendations),
            "saved_for_later": float(self._metrics.saved_for_later),
            "engagement_rate": self._metrics.engagement_rate,
            "acceptance_rate": self._metrics.acceptance_rate,
            "estimated_savings": self._metrics.estimated_savings,
        }

    def get_user_history(self, user_id: str) -> List[FeedbackEvent]:
        return list(self._events.get(user_id, []))
