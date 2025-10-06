import io
import sys
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

ROOT_DIR = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

import hashlib

from parser import ParsedStatement, StatementParser, build_result_payload


def _build_excel_bytes(rows: list[dict]) -> bytes:
    if not rows:
        raise ValueError("Se requiere al menos una fila para construir el archivo de Excel")

    headers = list(rows[0].keys())

    def _column_letter(index: int) -> str:
        letters = ""
        index += 1
        while index:
            index, remainder = divmod(index - 1, 26)
            letters = chr(65 + remainder) + letters
        return letters

    def _serialize_cell(column: int, row_number: int, value: object, *, force_string: bool = False) -> str:
        coordinate = f"{_column_letter(column)}{row_number}"
        if value is None:
            return f'<c r="{coordinate}"/>'

        if isinstance(value, (int, float)) and not force_string:
            return f'<c r="{coordinate}"><v>{value}</v></c>'

        escaped = escape(str(value))
        return f'<c r="{coordinate}" t="inlineStr"><is><t>{escaped}</t></is></c>'

    rows_xml = []

    header_cells = [
        _serialize_cell(index, 1, header, force_string=True)
        for index, header in enumerate(headers)
    ]
    rows_xml.append(f"<row r=\"1\">{''.join(header_cells)}</row>")

    for row_index, row in enumerate(rows, start=2):
        cells = [
            _serialize_cell(col_index, row_index, row.get(header))
            for col_index, header in enumerate(headers)
        ]
        rows_xml.append(f"<row r=\"{row_index}\">{''.join(cells)}</row>")

    sheet_xml = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        "<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">"
        "<sheetData>"
        + "".join(rows_xml)
        + "</sheetData></worksheet>"
    )

    workbook_xml = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        "<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" "
        "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">"
        "<sheets><sheet name=\"Sheet1\" sheetId=\"1\" r:id=\"rId1\"/></sheets>"
        "</workbook>"
    )

    workbook_rels = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
        "<Relationship Id=\"rId1\" Target=\"worksheets/sheet1.xml\" "
        "Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\"/>"
        "</Relationships>"
    )

    rels_xml = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
        "<Relationship Id=\"rId1\" Target=\"xl/workbook.xml\" "
        "Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\"/>"
        "<Relationship Id=\"rId2\" Target=\"docProps/core.xml\" "
        "Type=\"http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties\"/>"
        "<Relationship Id=\"rId3\" Target=\"docProps/app.xml\" "
        "Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties\"/>"
        "</Relationships>"
    )

    content_types_xml = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">"
        "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>"
        "<Default Extension=\"xml\" ContentType=\"application/xml\"/>"
        "<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>"
        "<Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>"
        "<Override PartName=\"/docProps/core.xml\" ContentType=\"application/vnd.openxmlformats-package.core-properties+xml\"/>"
        "<Override PartName=\"/docProps/app.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.extended-properties+xml\"/>"
        "</Types>"
    )

    core_props_xml = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        "<cp:coreProperties xmlns:cp=\"http://schemas.openxmlformats.org/package/2006/metadata/core-properties\" "
        "xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:dcterms=\"http://purl.org/dc/terms/\" "
        "xmlns:dcmitype=\"http://purl.org/dc/dcmitype/\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">"
        "<dc:title>Statement</dc:title>"
        "<dc:creator>Salomon Parser</dc:creator>"
        "<cp:lastModifiedBy>Salomon Parser</cp:lastModifiedBy>"
        "<dcterms:created xsi:type=\"dcterms:W3CDTF\">2024-01-01T00:00:00Z</dcterms:created>"
        "<dcterms:modified xsi:type=\"dcterms:W3CDTF\">2024-01-01T00:00:00Z</dcterms:modified>"
        "</cp:coreProperties>"
    )

    app_props_xml = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        "<Properties xmlns=\"http://schemas.openxmlformats.org/officeDocument/2006/extended-properties\" "
        "xmlns:vt=\"http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes\">"
        "<Application>Python</Application>"
        "</Properties>"
    )

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types_xml)
        archive.writestr("_rels/.rels", rels_xml)
        archive.writestr("docProps/core.xml", core_props_xml)
        archive.writestr("docProps/app.xml", app_props_xml)
        archive.writestr("xl/workbook.xml", workbook_xml)
        archive.writestr("xl/_rels/workbook.xml.rels", workbook_rels)
        archive.writestr("xl/worksheets/sheet1.xml", sheet_xml)

    buffer.seek(0)
    return buffer.read()


def test_parse_csv_with_semicolon_delimiter():
    parser = StatementParser()
    csv_content = """Fecha;Detalle;Monto\n01/01/2024;Compra supermercado;-20.300,50\n02/01/2024;Pago nómina;1500000"""

    parsed = parser.parse("statement.csv", csv_content.encode("utf-8"))

    assert isinstance(parsed, ParsedStatement)
    assert len(parsed.transactions) == 2
    assert parsed.transactions[0]["amount"] == -20300.5
    assert parsed.transactions[0]["postedAt"] == "2024-01-01"
    assert parsed.summary["transactionCount"] == 2


def test_parse_excel_generates_transactions():
    parser = StatementParser()
    excel_rows = [
        {"Fecha": "2024-02-10", "Detalle": "Pago servicios", "Monto": -50250.23},
        {"Fecha": "2024-02-12", "Detalle": "Depósito", "Monto": 800000},
    ]
    content = _build_excel_bytes(excel_rows)

    parsed = parser.parse("statement.xlsx", content)

    assert isinstance(parsed, ParsedStatement)
    amounts = [tx["amount"] for tx in parsed.transactions]
    assert amounts == [-50250.23, 800000.0]
    assert parsed.transactions[0]["description"] == "Pago servicios"
    assert parsed.transactions[1]["postedAt"] == "2024-02-12"


def test_build_result_payload_formats_normalized_message():
    parsed = ParsedStatement(
        transactions=[
            {
                "postedAt": "2024-01-15",
                "description": "Compra supermercado",
                "rawDescription": "Compra supermercado",
                "normalizedDescription": "Compra supermercado",
                "amount": -20300.5,
                "currency": "CLP",
            }
        ],
        summary={
            "totalCredit": 0.0,
            "totalDebit": 20300.5,
            "transactionCount": 1,
            "openingBalance": None,
            "closingBalance": None,
            "periodStart": "2024-01-15",
            "periodEnd": "2024-01-15",
            "statementDate": None,
        },
    )

    checksum = "abc123"
    payload = build_result_payload(
        statement_id="stmt-1",
        user_id="user-1",
        parsed=parsed,
        status="completed",
        error=None,
        checksum=checksum,
    )

    assert payload["event"] == "parsed_statement"
    assert payload["statementId"] == "stmt-1"
    assert payload["userId"] == "user-1"
    assert payload["status"] == "completed"
    assert payload["processedAt"].endswith("Z")
    assert payload["summary"]["checksum"] == checksum

    expected_id = hashlib.sha1("stmt-1-0".encode("utf-8")).hexdigest()[:32]
    assert payload["transactions"][0]["id"] == expected_id
    assert payload["transactions"][0]["externalId"] == expected_id
    assert payload["transactions"][0]["description"] == "Compra supermercado"


def test_build_result_payload_handles_failed_status():
    payload = build_result_payload(
        statement_id="stmt-2",
        user_id="user-2",
        parsed=None,
        status="failed",
        error="Parsing error",
        checksum="zzz",
    )

    assert payload["status"] == "failed"
    assert payload["summary"] == {}
    assert payload["transactions"] == []
    assert payload["error"] == "Parsing error"
