import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.normalizer import normalize_lines


def test_normalize_lines_extracts_amounts_and_dates():
    lines = [
        "01/02/2025 SUPERMERCADO MXN 1,234.50",
        "2025-03-15 Pago servicio -560.00",
        "Texto sin monto",
    ]

    transactions = normalize_lines(lines, currency="MXN")

    assert len(transactions) == 2
    assert transactions[0].amount == 1234.5
    assert transactions[0].date == "2025-02-01"
    assert transactions[1].amount == -560.0
    assert transactions[1].date == "2025-03-15"
