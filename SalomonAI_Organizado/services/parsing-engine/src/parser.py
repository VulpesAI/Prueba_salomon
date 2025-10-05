"""Document parsing utilities for the parsing engine."""

from __future__ import annotations

import hashlib
import io
import logging
import re
import tempfile
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, List, Optional

import pandas as pd
from pdfminer.high_level import extract_text as extract_pdf_text
from PIL import Image

try:  # pragma: no cover - optional dependency when OCR is disabled
    import pytesseract
except Exception:  # pragma: no cover - fallback when pytesseract is unavailable
    pytesseract = None  # type: ignore

try:  # pragma: no cover - statement_parser is optional
    from statement_parser.banks import Wallet as StatementWallet
except Exception:  # pragma: no cover - package may be unavailable
    StatementWallet = None  # type: ignore


LOGGER = logging.getLogger("parsing-engine.parser")


class StatementParsingError(RuntimeError):
    """Raised when a document cannot be parsed into structured data."""


@dataclass
class ParsedStatement:
    """Normalized representation of a parsed statement."""

    transactions: List[dict]
    summary: dict


CSV_DATE_CANDIDATES = ("fecha", "date", "fecha transaccion", "transaction date")
CSV_AMOUNT_CANDIDATES = ("monto", "amount", "cargo", "abono", "importe", "valor")
CSV_DESCRIPTION_CANDIDATES = ("descripcion", "description", "detalle", "concepto")
CSV_CATEGORY_CANDIDATES = ("categoria", "category", "segmento")

LINE_TRANSACTION_PATTERN = re.compile(
    r"^(?P<date>\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(?P<description>.+?)\s+(?P<amount>[+-]?[\d.,]+)\s*$"
)


class StatementParser:
    """Parses CSV/Excel/PDF/Image statements into a normalized payload."""

    def __init__(self, *, default_currency: str = "CLP", ocr_languages: str = "spa+eng") -> None:
        self.default_currency = default_currency
        self.ocr_languages = ocr_languages

    def parse(self, filename: str, content: bytes, *, content_type: Optional[str] = None) -> ParsedStatement:
        suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

        if suffix in {"csv"}:
            return self._parse_csv(content)

        if suffix in {"xls", "xlsx"}:
            return self._parse_excel(content)

        if suffix in {"pdf"}:
            return self._parse_pdf(content)

        if suffix in {"png", "jpg", "jpeg", "tif", "tiff", "bmp"}:
            return self._parse_image(content)

        if content_type:
            normalized = content_type.lower()
            if "csv" in normalized:
                return self._parse_csv(content)
            if "excel" in normalized or "spreadsheet" in normalized:
                return self._parse_excel(content)
            if "pdf" in normalized:
                return self._parse_pdf(content)
            if "image" in normalized:
                return self._parse_image(content)

        raise StatementParsingError(f"Unsupported file format for statement: {filename}")

    def _parse_csv(self, content: bytes) -> ParsedStatement:
        parsed = self._try_statement_parser(content, suffix="csv")
        if parsed:
            return parsed

        text = content.decode("utf-8-sig", errors="ignore")
        try:
            rows = list(pd.read_csv(io.StringIO(text)).to_dict(orient="records"))
        except Exception as exc:  # pragma: no cover - delegated to pandas
            raise StatementParsingError(f"No se pudo leer el CSV: {exc}") from exc
        return self._parse_tabular(rows)

    def _parse_excel(self, content: bytes) -> ParsedStatement:
        buffer = io.BytesIO(content)
        parsed = self._try_statement_parser(content, suffix="xlsx")
        if parsed:
            return parsed

        try:
            df = pd.read_excel(buffer)
        except Exception as exc:  # pragma: no cover - delegated to pandas
            raise StatementParsingError(f"No se pudo leer el archivo de Excel: {exc}") from exc
        rows = df.to_dict(orient="records")
        return self._parse_tabular(rows)

    def _parse_pdf(self, content: bytes) -> ParsedStatement:
        try:
            text = extract_pdf_text(io.BytesIO(content))
        except Exception as exc:  # pragma: no cover - delegated to pdfminer
            raise StatementParsingError(f"No se pudo procesar el PDF: {exc}") from exc
        if not text:
            raise StatementParsingError("El PDF no contiene texto legible")
        return self._parse_text_lines(text.splitlines())

    def _parse_image(self, content: bytes) -> ParsedStatement:
        if pytesseract is None:
            raise StatementParsingError("OCR no disponible: pytesseract no está instalado")

        try:
            image = Image.open(io.BytesIO(content))
        except Exception as exc:  # pragma: no cover - delegated to Pillow
            raise StatementParsingError(f"No se pudo abrir la imagen: {exc}") from exc

        try:
            text = pytesseract.image_to_string(image, lang=self.ocr_languages)
        except Exception as exc:  # pragma: no cover - delegated to pytesseract
            raise StatementParsingError(f"Error ejecutando OCR: {exc}") from exc
        if not text.strip():
            raise StatementParsingError("La imagen no contiene texto legible")
        return self._parse_text_lines(text.splitlines())

    def _parse_tabular(self, rows: List[dict]) -> ParsedStatement:
        if not rows:
            raise StatementParsingError("El archivo no contiene registros")

        headers = [str(header or "").strip() for header in rows[0].keys()]
        lookup = self._build_header_lookup(headers)

        date_header = self._find_header(lookup, CSV_DATE_CANDIDATES)
        amount_header = self._find_header(lookup, CSV_AMOUNT_CANDIDATES)
        description_header = self._find_header(lookup, CSV_DESCRIPTION_CANDIDATES)
        category_header = self._find_header(lookup, CSV_CATEGORY_CANDIDATES)

        if not (date_header and amount_header and description_header):
            raise StatementParsingError(
                "El archivo no contiene las columnas necesarias (fecha, monto, descripción)"
            )

        transactions: List[dict] = []
        for row in rows:
            metadata = {key: value for key, value in row.items() if value not in (None, "")}

            date = self._normalize_date(row.get(date_header))
            description = (str(row.get(description_header, "")) or "").strip()
            amount_value = row.get(amount_header)
            category = (str(row.get(category_header, "")) or "").strip() if category_header else ""

            amount = self._parse_amount(amount_value)

            if not date or not description or amount is None:
                continue

            transaction: dict = {
                "postedAt": date,
                "description": description,
                "rawDescription": description,
                "normalizedDescription": description,
                "amount": amount,
                "currency": self.default_currency,
            }

            if category:
                transaction["category"] = category

            metadata = {k: v for k, v in metadata.items() if k not in {date_header, amount_header, description_header}}
            if metadata:
                transaction["metadata"] = metadata

            transactions.append(transaction)

        if not transactions:
            raise StatementParsingError("No se encontraron transacciones válidas en el archivo")

        return ParsedStatement(transactions=transactions, summary=self._build_summary(transactions))

    def _parse_text_lines(self, lines: Iterable[str]) -> ParsedStatement:
        transactions: List[dict] = []
        for line in lines:
            match = LINE_TRANSACTION_PATTERN.match(line.strip())
            if not match:
                continue

            date = self._normalize_date(match.group("date"))
            amount = self._parse_amount(match.group("amount"))
            description = match.group("description").strip()

            if not date or amount is None or not description:
                continue

            transactions.append(
                {
                    "postedAt": date,
                    "description": description,
                    "rawDescription": description,
                    "normalizedDescription": description,
                    "amount": amount,
                    "currency": self.default_currency,
                }
            )

        if not transactions:
            raise StatementParsingError(
                "No fue posible extraer transacciones usando OCR. Revise el formato del documento."
            )

        return ParsedStatement(transactions=transactions, summary=self._build_summary(transactions))

    @staticmethod
    def _build_header_lookup(fieldnames: Iterable[str]) -> dict:
        lookup = {}
        for field in fieldnames:
            normalized = (field or "").strip().lower()
            if normalized:
                lookup[normalized] = field
        return lookup

    @staticmethod
    def _find_header(lookup: dict, candidates: Iterable[str]) -> Optional[str]:
        for candidate in candidates:
            if candidate in lookup:
                return lookup[candidate]
        return None

    @staticmethod
    def _normalize_date(raw: Optional[str]) -> Optional[str]:
        if raw is None:
            return None

        value = str(raw).strip()
        if not value:
            return None

        if re.match(r"^\d{4}-\d{2}-\d{2}$", value):
            return value

        if re.match(r"^\d{8}$", value):
            try:
                return datetime.strptime(value, "%Y%m%d").date().isoformat()
            except ValueError:  # pragma: no cover - defensive
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

    @staticmethod
    def _parse_amount(raw: object) -> Optional[float]:
        if raw is None:
            return None

        if isinstance(raw, (int, float)):
            return round(float(raw), 2)

        value = str(raw).strip()
        if not value:
            return None

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
                value = parts[0] + "".join(parts[1:-1]) + "." + parts[-1]
            value = value.replace(",", "")

        try:
            return round(float(value), 2)
        except ValueError:
            return None

    @staticmethod
    def _build_summary(transactions: List[dict]) -> dict:
        amounts = [tx["amount"] for tx in transactions]
        dates = [tx["postedAt"] for tx in transactions if tx.get("postedAt")]

        total_credit = sum(amount for amount in amounts if amount > 0)
        total_debit = sum(-amount for amount in amounts if amount < 0)

        summary = {
            "totalCredit": round(total_credit, 2) if amounts else 0.0,
            "totalDebit": round(total_debit, 2) if amounts else 0.0,
            "transactionCount": len(transactions),
            "openingBalance": None,
            "closingBalance": None,
            "periodStart": min(dates) if dates else None,
            "periodEnd": max(dates) if dates else None,
            "statementDate": None,
        }

        return summary

    def _try_statement_parser(self, content: bytes, *, suffix: str) -> Optional[ParsedStatement]:
        if StatementWallet is None:
            return None

        try:
            with tempfile.NamedTemporaryFile(suffix=f".{suffix}", delete=True) as temp_file:
                temp_file.write(content)
                temp_file.flush()

                wallet = StatementWallet()
                dataframe = wallet.getDataFrame(temp_file.name)
        except Exception as exc:  # pragma: no cover - statement_parser failure
            LOGGER.debug("statement_parser no pudo procesar el archivo: %s", exc)
            return None

        transactions: List[dict] = []
        for _, row in dataframe.iterrows():
            created = row.get("created_date")
            if isinstance(created, pd.Timestamp):
                created_dt = created.to_pydatetime()
            elif isinstance(created, datetime):
                created_dt = created
            else:
                created_dt = None

            posted_at = created_dt.date().isoformat() if created_dt else None
            amount = row.get("amount")
            remarks = str(row.get("remarks") or "").strip()

            if posted_at is None:
                posted_at = self._normalize_date(str(created) if created is not None else None)

            if posted_at and remarks and amount is not None:
                transactions.append(
                    {
                        "postedAt": posted_at,
                        "description": remarks,
                        "rawDescription": remarks,
                        "normalizedDescription": remarks,
                        "amount": float(amount),
                        "currency": self.default_currency,
                    }
                )

        if not transactions:
            return None

        return ParsedStatement(transactions=transactions, summary=self._build_summary(transactions))


def build_result_payload(
    *,
    statement_id: str,
    user_id: str,
    parsed: ParsedStatement | None,
    status: str,
    error: Optional[str],
    checksum: str,
) -> dict:
    """Compose the message that will be emitted to Kafka."""

    payload = {
        "event": "parsed_statement",
        "statementId": statement_id,
        "userId": user_id,
        "status": status,
        "processedAt": datetime.utcnow().isoformat() + "Z",
        "checksum": checksum,
    }

    if error:
        payload["error"] = error

    if parsed and status == "completed":
        payload["summary"] = {**parsed.summary, "checksum": checksum}
        payload["transactions"] = [
            {
                **transaction,
                "id": transaction.get("id") or _generate_transaction_id(statement_id, index),
                "externalId": transaction.get("externalId") or _generate_transaction_id(statement_id, index),
            }
            for index, transaction in enumerate(parsed.transactions)
        ]

    return payload


def _generate_transaction_id(statement_id: str, index: int) -> str:
    seed = f"{statement_id}-{index}".encode("utf-8")
    digest = hashlib.sha1(seed).hexdigest()
    return digest[:32]

