from __future__ import annotations

import sys
from pathlib import Path
import types

import pytest

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

pytest.importorskip("pydantic")

if "supabase" not in sys.modules:
    supabase_stub = types.ModuleType("supabase")

    class _Client:  # pragma: no cover - simple stub
        pass

    def _create_client(*_args, **_kwargs):  # pragma: no cover - simple stub
        return _Client()

    supabase_stub.Client = _Client
    supabase_stub.create_client = _create_client
    sys.modules["supabase"] = supabase_stub
