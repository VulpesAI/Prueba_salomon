"""Document parsing utilities for the parsing engine."""

from __future__ import annotations

import csv
import hashlib
import io
import logging
import re
import tempfile
import unicodedata
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional
from xml.etree import ElementTree

from typing import TYPE_CHECKING

try:  # pragma: no cover - pandas is an optional dependency
    import pandas as _pandas  # type: ignore
except Exception:  # pragma: no cover - fallback when pandas is unavailable
    _pandas = None  # type: ignore

if TYPE_CHECKING:  # pragma: no cover - typing helper
    import pandas as pd  # type: ignore
else:  # pragma: no cover - expose optional dependency at runtime
    pd = _pandas  # type: ignore
try:  # pragma: no cover - pdfminer is optional for PDF extraction
    from pdfminer.high_level import extract_text as extract_pdf_text
except Exception:  # pragma: no cover - fallback when pdfminer is unavailable
    extract_pdf_text = None  # type: ignore

try:  # pragma: no cover - Pillow is optional for OCR support
    from PIL import Image
except Exception:  # pragma: no cover - fallback when Pillow is unavailable
    Image = None  # type: ignore

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

CATEGORY_KEYWORDS: Dict[str, tuple[str, ...]] = {
    "Alimentación": (
        "supermercado",
        "restaurant",
        "restaurante",
        "comida",
        "delivery",
        "cocina",
        "mercado",
        "lider",
        "jumbo",
        "tottus",
        "unimarc",
    ),
    "Transporte": (
        "uber",
        "cabify",
        "metro",
        "bip",
        "transporte",
        "bus",
        "micro",
        "taxi",
        "shell",
        "copec",
        "petrobras",
        "bencina",
        "gasolina",
        "peaje",
    ),
    "Vivienda": (
        "arriendo",
        "renta",
        "hipoteca",
        "inmobiliaria",
        "condominio",
        "dividendo",
        "luz",
        "electricidad",
        "agua",
        "gas",
        "aseo",
        "contribuciones",
    ),
    "Servicios": (
        "netflix",
        "spotify",
        "plan",
        "telecom",
        "telefon",
        "internet",
        "movistar",
        "entel",
        "claro",
        "vtr",
        "servicio",
    ),
    "Salud": (
        "farmacia",
        "salud",
        "clinica",
        "consulta",
        "doctor",
        "dentista",
        "isapre",
        "fonasa",
    ),
    "Educación": (
        "colegio",
        "universidad",
        "matricula",
        "curso",
        "educacion",
        "instituto",
    ),
    "Entretenimiento": (
        "cine",
        "teatro",
        "evento",
        "concierto",
        "juego",
        "gaming",
        "suscrip",
    ),
    "Finanzas": (
        "seguro",
        "prima",
        "comision",
        "banco",
        "interes",
        "cuota",
        "tarjeta",
    ),
    "Compras": (
        "tienda",
        "almacen",
        "retail",
        "falabella",
        "paris",
        "ripley",
        "compra",
        "shopping",
    ),
}

DEFAULT_EXPENSE_CATEGORY = "Otros gastos"
DEFAULT_INCOME_CATEGORY = "Ingresos"

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
        if pd is not None:
            try:
                dataframe = self._read_csv_with_fallbacks(io.StringIO(text))
            except Exception as exc:  # pragma: no cover - delegated to pandas
                raise StatementParsingError(f"No se pudo leer el CSV: {exc}") from exc
            rows = self._dataframe_to_rows(dataframe)
        else:
            rows = self._read_csv_without_pandas(text)
        return self._parse_tabular(rows)

    def _parse_excel(self, content: bytes) -> ParsedStatement:
        buffer = io.BytesIO(content)
        parsed = self._try_statement_parser(content, suffix="xlsx")
        if parsed:
            return parsed

        if pd is not None:
            try:
                dataframe = pd.read_excel(buffer)
            except Exception as exc:  # pragma: no cover - delegated to pandas
                raise StatementParsingError(f"No se pudo leer el archivo de Excel: {exc}") from exc
            rows = self._dataframe_to_rows(dataframe)
        else:
            try:
                rows = self._read_xlsx_basic(buffer.getvalue())
            except Exception as exc:
                raise StatementParsingError(f"No se pudo leer el archivo de Excel: {exc}") from exc
        return self._parse_tabular(rows)

    def _parse_pdf(self, content: bytes) -> ParsedStatement:
        if extract_pdf_text is None:
            raise StatementParsingError("Procesamiento de PDF no disponible: pdfminer no está instalado")

        try:
            text = extract_pdf_text(io.BytesIO(content))
        except Exception as exc:  # pragma: no cover - delegated to pdfminer
            raise StatementParsingError(f"No se pudo procesar el PDF: {exc}") from exc
        if not text:
            raise StatementParsingError("El PDF no contiene texto legible")
        return self._parse_text_lines(text.splitlines())

    def _parse_image(self, content: bytes) -> ParsedStatement:
        if pytesseract is None or Image is None:
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
            predicted_category = self._categorize(description, amount)

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

            final_category = category or predicted_category
            if final_category:
                transaction["category"] = final_category
            if category and predicted_category and category.lower() != predicted_category.lower():
                transaction["predictedCategory"] = predicted_category

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
            predicted_category = self._categorize(description, amount)

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
                    "category": predicted_category,
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

        if re.match(r"^\d{4}-\d{2}-\d{2}T", value):
            try:
                return datetime.fromisoformat(value).date().isoformat()
            except ValueError:
                return None

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
            "%d/%m/%y",
            "%d-%m-%y",
            "%m/%d/%y",
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
    def _normalize_text(value: str) -> str:
        normalized = unicodedata.normalize("NFD", value or "")
        sanitized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
        return sanitized.lower()

    def _categorize(self, description: str, amount: Optional[float]) -> str:
        if not description:
            return DEFAULT_INCOME_CATEGORY if amount and amount > 0 else DEFAULT_EXPENSE_CATEGORY

        normalized = self._normalize_text(description)

        for category, keywords in CATEGORY_KEYWORDS.items():
            for keyword in keywords:
                if keyword in normalized:
                    return category

        if amount is not None and amount > 0:
            return DEFAULT_INCOME_CATEGORY

        if amount is not None and amount < 0:
            return DEFAULT_EXPENSE_CATEGORY

        return DEFAULT_EXPENSE_CATEGORY

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

    @staticmethod
    def _dataframe_to_rows(dataframe: "pd.DataFrame") -> List[dict]:
        if pd is None:  # pragma: no cover - defensive guard
            raise StatementParsingError("Procesamiento tabular requiere pandas")

        cleaned = dataframe.dropna(how="all")
        cleaned = cleaned.where(pd.notnull(cleaned), None)
        return cleaned.to_dict(orient="records")

    @staticmethod
    def _read_csv_with_fallbacks(buffer: io.StringIO) -> "pd.DataFrame":
        if pd is None:  # pragma: no cover - defensive guard
            raise StatementParsingError("Lectura de CSV con pandas no disponible")

        attempts = (
            {"sep": None, "engine": "python"},
            {"sep": ";"},
            {"sep": ","},
        )
        last_error: Exception | None = None

        for options in attempts:
            buffer.seek(0)
            try:
                dataframe = pd.read_csv(buffer, **options)
            except Exception as exc:  # pragma: no cover - delegated to pandas
                last_error = exc
                continue

            if not dataframe.empty and any(col for col in dataframe.columns if not str(col).startswith("Unnamed")):
                return dataframe

        buffer.seek(0)
        if last_error:
            raise last_error
        return pd.read_csv(buffer)

    @staticmethod
    def _read_csv_without_pandas(text: str) -> List[dict]:
        sample = text[:1024]
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        except csv.Error:
            dialect = csv.get_dialect("excel")

        buffer = io.StringIO(text)
        reader = csv.reader(buffer, dialect)
        try:
            headers = next(reader)
        except StopIteration:
            return []

        normalized_headers = [str(header or "").strip() for header in headers]
        rows: List[dict] = []
        for raw_row in reader:
            row_data: Dict[str, Any] = {}
            for index, header in enumerate(normalized_headers):
                if not header:
                    continue
                value = raw_row[index] if index < len(raw_row) else None
                if isinstance(value, str):
                    value = value.strip()
                row_data[header] = value
            if any(value not in (None, "") for value in row_data.values()):
                rows.append(row_data)

        return rows

    def _read_xlsx_basic(self, payload: bytes) -> List[dict]:
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            sheet_name = self._find_first_sheet_name(archive)
            if not sheet_name:
                raise StatementParsingError("El archivo de Excel no contiene hojas")

            sheet_xml = archive.read(sheet_name)
            shared_strings = self._load_shared_strings(archive)

        namespace = {"ss": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
        root = ElementTree.fromstring(sheet_xml)
        rows: List[dict] = []
        headers: List[str] = []

        for row in root.findall("ss:sheetData/ss:row", namespace):
            cells = {}
            for cell in row.findall("ss:c", namespace):
                ref = cell.attrib.get("r", "")
                column_index = self._column_reference_to_index(ref)
                value = self._parse_xlsx_cell(cell, shared_strings, namespace)
                cells[column_index] = value

            if not cells:
                continue

            max_index = max(cells)
            row_values = [cells.get(index) for index in range(max_index + 1)]

            if not headers:
                headers = [str(value or "").strip() for value in row_values]
                continue

            row_dict: Dict[str, Any] = {}
            for index, header in enumerate(headers):
                if not header:
                    continue
                row_dict[header] = row_values[index] if index < len(row_values) else None

            if any(value not in (None, "") for value in row_dict.values()):
                rows.append(row_dict)

        return rows

    @staticmethod
    def _find_first_sheet_name(archive: zipfile.ZipFile) -> Optional[str]:
        candidates = sorted(
            (name for name in archive.namelist() if name.startswith("xl/worksheets/") and name.endswith(".xml"))
        )
        return candidates[0] if candidates else None

    @staticmethod
    def _load_shared_strings(archive: zipfile.ZipFile) -> List[str]:
        try:
            raw = archive.read("xl/sharedStrings.xml")
        except KeyError:
            return []

        namespace = {"ss": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
        root = ElementTree.fromstring(raw)
        values: List[str] = []
        for item in root.findall("ss:si", namespace):
            text_parts = [element.text or "" for element in item.findall(".//ss:t", namespace)]
            values.append("".join(text_parts))
        return values

    @staticmethod
    def _column_reference_to_index(reference: str) -> int:
        letters = "".join(char for char in reference if char.isalpha()).upper()
        index = 0
        for char in letters:
            index = index * 26 + (ord(char) - ord("A") + 1)
        return index - 1

    @staticmethod
    def _parse_xlsx_cell(cell: ElementTree.Element, shared_strings: List[str], namespace: dict) -> Any:
        cell_type = cell.attrib.get("t")
        value_element = cell.find("ss:v", namespace)

        if cell_type == "s" and value_element is not None:
            try:
                return shared_strings[int(value_element.text or "0")]
            except (ValueError, IndexError):
                return None

        if cell_type == "b" and value_element is not None:
            return value_element.text == "1"

        if cell_type == "inlineStr":
            text_element = cell.find("ss:is/ss:t", namespace)
            return text_element.text if text_element is not None else None

        if value_element is None:
            return None

        raw = value_element.text
        if raw is None:
            return None

        try:
            if "." in raw or "e" in raw.lower():
                return float(raw)
            return int(raw)
        except ValueError:
            return raw

    def _try_statement_parser(self, content: bytes, *, suffix: str) -> Optional[ParsedStatement]:
        if StatementWallet is None or pd is None:
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
            if pd is not None and isinstance(created, pd.Timestamp):
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
        "processedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "checksum": checksum,
        "summary": {},
        "transactions": [],
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

