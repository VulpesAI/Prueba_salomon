from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


class _DictMixin:
    """Mixin sencillo para ofrecer compatibilidad con la interfaz de Pydantic."""

    def dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ChatMessage(_DictMixin):
    role: str
    content: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    intent: Optional[str] = None
    metadata: Dict[str, str] | None = None


@dataclass
class IntentCandidate(_DictMixin):
    name: str
    confidence: float
    entities: Dict[str, str] = field(default_factory=dict)
    description: Optional[str] = None


@dataclass
class ChatRequest(_DictMixin):
    session_id: str
    message: str
    locale: str = "es-CL"
    metadata: Dict[str, str] | None = None
    conversation_state: Dict[str, str] | None = None


@dataclass
class FinancialInsight(_DictMixin):
    label: str
    value: str
    context: Optional[str] = None


@dataclass
class IntentResolution(_DictMixin):
    intent: IntentCandidate
    response_text: str
    insights: List[FinancialInsight] = field(default_factory=list)
    data: Dict[str, object] = field(default_factory=dict)


@dataclass
class FinancialSummary(_DictMixin):
    total_balance: float
    monthly_income: float
    monthly_expenses: float
    expense_breakdown: Dict[str, float]
    recent_transactions: List[Dict[str, object]]
    generated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class ErrorResponse(_DictMixin):
    detail: str


@dataclass
class IntentDetectionResponse(_DictMixin):
    session_id: str
    query: str
    intents: List[IntentCandidate]
    detected_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class ChatChunk(_DictMixin):
    type: str
    data: Dict[str, object] = field(default_factory=dict)
