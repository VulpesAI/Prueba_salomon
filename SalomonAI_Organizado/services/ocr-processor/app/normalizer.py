from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, List, Optional

DATE_PATTERNS = (
    r"(?P<date>\d{4}[/-]\d{2}[/-]\d{2})",
    r"(?P<date>\d{2}[/-]\d{2}[/-]\d{2,4})",
)

AMOUNT_PATTERN = re.compile(r"(?P<sign>-)?(?P<amount>\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})")


@dataclass
class NormalizedTransaction:
    description: str
    amount: float
    currency: str
    date: Optional[str] = None

def parse_amount_value(amount: str) -> Optional[float]:
    normalized = amount

    if '.' in normalized and ',' in normalized:
        if normalized.rfind('.') > normalized.rfind(','):
            normalized = normalized.replace(',', '')
        else:
            normalized = normalized.replace('.', '')
            normalized = normalized.replace(',', '.')
    elif ',' in normalized:
        normalized = normalized.replace('.', '')
        normalized = normalized.replace(',', '.')
    else:
        normalized = normalized.replace(',', '')

    try:
        return float(normalized)
    except ValueError:  # pragma: no cover - defensive
        return None


def parse_amount(raw: str) -> Optional[float]:
    best_value: Optional[float] = None

    for match in AMOUNT_PATTERN.finditer(raw):
        amount = match.group("amount")
        value = parse_amount_value(amount)
        if value is None:
            continue

        if match.group("sign"):
            value *= -1

        if best_value is None or abs(value) >= abs(best_value):
            best_value = value

    if best_value is None:
        return None

    return round(best_value, 2)


def extract_date(raw: str) -> Optional[str]:
    for pattern in DATE_PATTERNS:
        match = re.search(pattern, raw)
        if match:
            raw_date = match.group("date")
            for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%d-%m-%y"):
                try:
                    parsed = datetime.strptime(raw_date, fmt)
                    return parsed.date().isoformat()
                except ValueError:
                    continue
    return None


def normalize_lines(lines: Iterable[str], currency: str = "MXN") -> List[NormalizedTransaction]:
    transactions: List[NormalizedTransaction] = []
    for line in lines:
        amount = parse_amount(line)
        if amount is None:
            continue
        date = extract_date(line)
        description = re.sub(r"\s+", " ", line).strip()
        transactions.append(
            NormalizedTransaction(
                description=description,
                amount=amount,
                currency=currency,
                date=date,
            )
        )
    return transactions
