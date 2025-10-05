"""Statement parsing utilities shared by the financial connector service."""

from __future__ import annotations

import csv
import io
import re
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional


CSV_DATE_CANDIDATES = ("fecha", "date", "fecha transaccion")
CSV_AMOUNT_CANDIDATES = ("monto", "amount", "cargo", "abono")
CSV_DESCRIPTION_CANDIDATES = ("descripcion", "description", "detalle")
CSV_CATEGORY_CANDIDATES = ("categoria", "category")
CATEGORY_FALLBACK = "Sin categoría"


class StatementParserError(ValueError):
    """Raised when a statement cannot be parsed."""


def parse_csv_statement(buffer: bytes) -> Dict[str, Any]:
    """Parse a CSV bank statement into a normalized structure."""

    text = buffer.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    if not reader.fieldnames:
        raise StatementParserError("El CSV no contiene encabezados")

    lookup = _build_header_lookup(reader.fieldnames)

    date_header = _find_header(lookup, CSV_DATE_CANDIDATES)
    amount_header = _find_header(lookup, CSV_AMOUNT_CANDIDATES)
    description_header = _find_header(lookup, CSV_DESCRIPTION_CANDIDATES)
    category_header = _find_header(lookup, CSV_CATEGORY_CANDIDATES)

    if not (date_header and amount_header and description_header):
        raise StatementParserError(
            "El CSV no contiene las columnas necesarias (fecha, monto, descripción)"
        )

    transactions: List[Dict[str, Any]] = []

    for row in reader:
        metadata = {key: value for key, value in row.items() if value not in (None, "")}

        date = _normalize_date(row.get(date_header, ""))
        description = (row.get(description_header, "") or "").strip()
        amount_value = row.get(amount_header, "")
        category = (row.get(category_header, "") or "").strip() if category_header else ""

        amount = _parse_amount(amount_value)

        if not date or not description or amount is None:
            continue

        transaction: Dict[str, Any] = {
            "date": date,
            "description": description,
            "amount": amount,
        }

        if category:
            transaction["category"] = category

        if metadata:
            transaction["metadata"] = metadata

        transactions.append(transaction)

    if not transactions:
        raise StatementParserError("No se encontraron transacciones válidas en el CSV")

    totals = _calculate_totals(transactions)

    return {
        "transactions": transactions,
        "totals": totals,
        "incomeByCategory": _aggregate_by_category(transactions, only_positive=True),
        "expenseByCategory": _aggregate_by_category(transactions, only_positive=False),
    }


def _build_header_lookup(fieldnames: Iterable[str]) -> Dict[str, str]:
    lookup = {}
    for field in fieldnames:
        normalized = (field or "").strip().lower()
        if normalized:
            lookup[normalized] = field
    return lookup


def _find_header(lookup: Dict[str, str], candidates: Iterable[str]) -> Optional[str]:
    for candidate in candidates:
        if candidate in lookup:
            return lookup[candidate]
    return None


def _normalize_date(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None

    value = raw.strip()
    if not value:
        return None

    if re.match(r"^\d{4}-\d{2}-\d{2}$", value):
        return value

    if re.match(r"^\d{8}$", value):
        try:
            return datetime.strptime(value, "%Y%m%d").date().isoformat()
        except ValueError:
            return None

    for fmt in (
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%m/%d/%Y",
        "%d.%m.%Y",
        "%d %b %Y",
        "%d %B %Y",
    ):
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            continue

    return None


def _parse_amount(raw: Any) -> Optional[float]:
    if raw is None:
        return None

    if isinstance(raw, (int, float)):
        return round(float(raw), 2)

    value = str(raw).strip()
    if not value:
        return None

    # Remove currency symbols and spaces
    value = re.sub(r"[^0-9,.-]", "", value)
    if not value:
        return None

    decimal_separator = "."
    if "," in value and "." in value:
        decimal_separator = "," if value.rfind(",") > value.rfind(".") else "."
    elif "," in value:
        decimal_separator = ","

    if decimal_separator == ",":
        value = value.replace(".", "").replace(",", ".")
    else:
        parts = value.split(".")
        if len(parts) > 2:
            value = parts[0] + parts[1]
            if len(parts) > 2:
                value += "." + parts[-1]
        value = value.replace(",", "")

    try:
        return round(float(value), 2)
    except ValueError:
        return None


def _calculate_totals(transactions: List[Dict[str, Any]]) -> Dict[str, float]:
    balance = sum(tx["amount"] for tx in transactions)
    income = sum(tx["amount"] for tx in transactions if tx["amount"] > 0)
    expenses = sum(-tx["amount"] for tx in transactions if tx["amount"] < 0)

    return {
        "balance": round(balance, 2),
        "income": round(income, 2),
        "expenses": round(expenses, 2),
    }


def _aggregate_by_category(
    transactions: List[Dict[str, Any]],
    *,
    only_positive: bool,
) -> Dict[str, float]:
    aggregated: Dict[str, float] = defaultdict(float)

    for tx in transactions:
        amount = tx["amount"]
        category = tx.get("category") or CATEGORY_FALLBACK

        if only_positive and amount <= 0:
            continue
        if not only_positive and amount >= 0:
            continue

        aggregated[category] += amount if only_positive else -amount

    return {category: round(value, 2) for category, value in aggregated.items()}

