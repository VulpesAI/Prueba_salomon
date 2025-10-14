from __future__ import annotations

import importlib
import sys
from pathlib import Path
from typing import Any, Dict, Tuple

import pytest
import respx
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from httpx import ASGITransport, AsyncClient
from jose import jwt
from jose.utils import base64url_encode

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def _int_to_base64(value: int) -> str:
    length = (value.bit_length() + 7) // 8
    return base64url_encode(value.to_bytes(length, "big")).decode("utf-8")


def generate_token_and_jwks() -> Tuple[str, Dict[str, Any]]:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_key = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_numbers = key.public_key().public_numbers()
    jwk = {
        "kty": "RSA",
        "kid": "test-key",
        "use": "sig",
        "alg": "RS256",
        "n": _int_to_base64(public_numbers.n),
        "e": _int_to_base64(public_numbers.e),
    }
    token = jwt.encode({"sub": "user-123"}, private_key, algorithm="RS256", headers={"kid": "test-key"})
    return token, {"keys": [jwk]}


def load_app(monkeypatch: pytest.MonkeyPatch, **env: str):
    defaults = {
        "FEATURE_SIMULATIONS": "true",
        "SUPABASE_JWKS_URL": "http://test.local/jwks",
        "SIMULATION_RATE_LIMIT_REQUESTS": "5",
        "SIMULATION_RATE_LIMIT_WINDOW_SECONDS": "60",
    }
    for key in defaults:
        monkeypatch.delenv(key, raising=False)
    defaults.update(env)
    for key, value in defaults.items():
        monkeypatch.setenv(key, value)

    import app.settings as settings_module

    settings_module.get_settings.cache_clear()
    importlib.reload(settings_module)
    import app.auth as auth_module

    importlib.reload(auth_module)
    import app.main as main_module

    importlib.reload(main_module)
    return main_module.app


@pytest.mark.asyncio
async def test_mortgage_simulation_returns_dividendo(monkeypatch: pytest.MonkeyPatch):
    app = load_app(monkeypatch)
    token, jwks = generate_token_and_jwks()
    async with respx.mock(assert_all_called=False) as router:
        router.get("http://test.local/jwks").respond(json=jwks)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            payload = {
                "loan_amount": 100_000_000,
                "annual_interest_rate": 4.5,
                "years": 20,
                "payments_per_year": 12,
            }
            response = await client.post(
                "/api/v1/simulations/mortgage",
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
            )
    assert response.status_code == 200
    body = response.json()
    assert body["dividendo"] > 0
    assert body["cae"] >= 0
    assert len(body["tabla_resumida"]) == 12


@pytest.mark.asyncio
async def test_budget_simulation_flags_low_savings(monkeypatch: pytest.MonkeyPatch):
    app = load_app(monkeypatch)
    token, jwks = generate_token_and_jwks()
    async with respx.mock(assert_all_called=False) as router:
        router.get("http://test.local/jwks").respond(json=jwks)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            payload = {
                "monthly_income": 1_000_000,
                "initial_savings": 100_000,
                "categories": [
                    {"name": "Arriendo", "amount": 600_000, "type": "fixed"},
                    {"name": "Gastos variables", "amount": 450_000, "type": "variable"},
                ],
                "savings_target_rate": 0.2,
            }
            response = await client.post(
                "/api/v1/simulations/budget-whatif",
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
            )
    assert response.status_code == 200
    body = response.json()
    assert len(body["proyeccion_12m"]) == 12
    assert any("ahorro" in alert.lower() for alert in body["alerts"])


@pytest.mark.asyncio
async def test_rate_limit_enforced(monkeypatch: pytest.MonkeyPatch):
    app = load_app(monkeypatch, SIMULATION_RATE_LIMIT_REQUESTS="1")
    token, jwks = generate_token_and_jwks()
    async with respx.mock(assert_all_called=False) as router:
        router.get("http://test.local/jwks").respond(json=jwks)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            payload = {
                "loan_amount": 50_000_000,
                "annual_interest_rate": 3.5,
                "years": 15,
            }
            first = await client.post(
                "/api/v1/simulations/mortgage",
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
            )
            second = await client.post(
                "/api/v1/simulations/mortgage",
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
            )
    assert first.status_code == 200
    assert second.status_code == 429
    assert second.json()["error"]["code"] == "RATE_LIMITED"


@pytest.mark.asyncio
async def test_service_disabled_returns_503(monkeypatch: pytest.MonkeyPatch):
    app = load_app(monkeypatch, FEATURE_SIMULATIONS="false")
    token, jwks = generate_token_and_jwks()
    async with respx.mock(assert_all_called=False) as router:
        router.get("http://test.local/jwks").respond(json=jwks)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            payload = {
                "loan_amount": 50_000_000,
                "annual_interest_rate": 3.5,
                "years": 15,
            }
            response = await client.post(
                "/api/v1/simulations/mortgage",
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
            )
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "SERVICE_DISABLED"


@pytest.mark.asyncio
async def test_missing_token_returns_401(monkeypatch: pytest.MonkeyPatch):
    app = load_app(monkeypatch)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.post(
            "/api/v1/simulations/mortgage",
            json={
                "loan_amount": 10_000_000,
                "annual_interest_rate": 3.0,
                "years": 10,
            },
        )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"
