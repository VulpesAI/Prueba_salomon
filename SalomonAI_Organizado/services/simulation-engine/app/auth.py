from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Dict

import httpx
from fastapi import Depends, Request
from jose import JWTError, jwt

from .errors import UnauthorizedError
from .settings import SimulationSettings, get_settings


@dataclass
class AuthenticatedUser:
    sub: str


class JWKSCache:
    """Fetches and caches JWKS documents with background refresh."""

    def __init__(self, ttl_seconds: int = 3600) -> None:
        self._ttl = ttl_seconds
        self._jwks: Dict[str, Any] | None = None
        self._fetched_at: float | None = None
        self._lock = asyncio.Lock()

    async def get_jwks(self, url: str) -> Dict[str, Any]:
        import time

        async with self._lock:
            now = time.monotonic()
            if self._jwks and self._fetched_at and now - self._fetched_at < self._ttl:
                return self._jwks
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
            if "keys" not in data:
                raise UnauthorizedError("JWKS endpoint returned an invalid payload")
            self._jwks = data
            self._fetched_at = now
            return data


_jwks_cache = JWKSCache()


async def get_current_user(
    request: Request,
    settings: SimulationSettings = Depends(get_settings),
) -> AuthenticatedUser:
    header = request.headers.get("authorization") or request.headers.get("Authorization")
    if not header or not header.lower().startswith("bearer "):
        raise UnauthorizedError("Missing bearer token")
    token = header.split(" ", 1)[1].strip()
    if not token:
        raise UnauthorizedError("Missing bearer token")
    try:
        unverified = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise UnauthorizedError("Invalid token header") from exc

    try:
        jwks = await _jwks_cache.get_jwks(settings.jwks_url)
    except httpx.HTTPError as exc:
        raise UnauthorizedError("Unable to verify credentials") from exc

    key = None
    for jwk_item in jwks.get("keys", []):
        if jwk_item.get("kid") == unverified.get("kid"):
            key = jwk_item
            break
    if key is None and jwks.get("keys"):
        # fallback to first key for Supabase projects without kid rotation
        key = jwks["keys"][0]
    if key is None:
        raise UnauthorizedError("Signing key not found")

    try:
        payload = jwt.decode(
            token,
            key,
            algorithms=[key.get("alg", "RS256")],
            options={"verify_aud": False},
        )
    except JWTError as exc:
        raise UnauthorizedError("Invalid token") from exc

    subject = payload.get("sub")
    if not subject:
        raise UnauthorizedError("Token missing subject")

    request.state.user = {"sub": subject}
    return AuthenticatedUser(sub=str(subject))
