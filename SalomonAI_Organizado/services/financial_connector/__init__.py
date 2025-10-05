"""Alias package to import modules stored under the ``financial-connector`` directory."""

from pathlib import Path

_alias_root = Path(__file__).resolve().parent
_target_root = _alias_root.parent / "financial-connector"

if not _target_root.exists():  # pragma: no cover - defensive guard
    raise RuntimeError(
        "El paquete 'financial-connector' no está disponible en la ruta esperada"
    )

__path__ = [str(_target_root)]
