"""Data models for the parsing pipeline."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Optional

TransactionType = str


@dataclass
class NormalizedTransactionModel:
    """Representation of a normalized transaction."""

    document_id: str
    user_id: str
    account_id: Optional[str]
    external_id: Optional[str]
    description: str
    amount: Decimal
    currency: str = "CLP"
    type: TransactionType = "EXPENSE"
    category: Optional[str] = None
    occurred_at: datetime = field(default_factory=datetime.utcnow)
    metadata: dict = field(default_factory=dict)
    raw_data: dict = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.amount = Decimal(str(self.amount))
        self.currency = str(self.currency or "CLP").upper()
        if not self.type:
            self.type = "INCOME" if self.amount >= 0 else "EXPENSE"
        if not isinstance(self.metadata, dict):
            self.metadata = dict(self.metadata)
        if not isinstance(self.raw_data, dict):
            self.raw_data = dict(self.raw_data)


@dataclass
class DocumentIngestionPayload:
    """Message published by the financial connector."""

    document_id: str
    user_id: str
    account_id: Optional[str] = None
    file_path: str = ""
    file_type: Optional[str] = None
    original_name: Optional[str] = None
    file_hash: Optional[str] = None
    source: str = "upload"
    metadata: dict = field(default_factory=dict)
