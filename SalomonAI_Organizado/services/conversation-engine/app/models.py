from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    intent: Optional[str] = None
    metadata: Dict[str, str] | None = None


class IntentCandidate(BaseModel):
    name: str
    confidence: float
    entities: Dict[str, str] = Field(default_factory=dict)
    description: Optional[str] = None


class ChatRequest(BaseModel):
    session_id: str
    message: str
    locale: str = "es-CL"
    metadata: Dict[str, str] | None = None
    conversation_state: Dict[str, str] | None = None


class FinancialInsight(BaseModel):
    label: str
    value: str
    context: Optional[str] = None


class IntentResolution(BaseModel):
    intent: IntentCandidate
    response_text: str
    insights: List[FinancialInsight] = Field(default_factory=list)
    data: Dict[str, object] = Field(default_factory=dict)


class FinancialSummary(BaseModel):
    total_balance: float
    monthly_income: float
    monthly_expenses: float
    expense_breakdown: Dict[str, float]
    recent_transactions: List[Dict[str, object]]
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class ErrorResponse(BaseModel):
    detail: str


class IntentDetectionResponse(BaseModel):
    session_id: str
    query: str
    intents: List[IntentCandidate]
    detected_at: datetime = Field(default_factory=datetime.utcnow)


class ChatChunk(BaseModel):
    type: str
    data: Dict[str, object] = Field(default_factory=dict)
