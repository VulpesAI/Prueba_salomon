from __future__ import annotations

import logging
from typing import Any, Dict
from uuid import uuid4

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .auth import AuthenticatedUser, get_current_user
from .errors import (
    BadRequestError,
    ServiceDisabledError,
    ServiceError,
    UnauthorizedError,
    format_error_response,
)
from .rate_limit import RateLimiter
from .schemas import (
    BudgetWhatIfRequest,
    BudgetWhatIfResponse,
    MortgageSimulationRequest,
    MortgageSimulationResponse,
)
from .service import simulate_budget, simulate_mortgage
from .settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
rate_limiter = RateLimiter(settings.rate_limit_requests, settings.rate_limit_window_seconds)

app = FastAPI(title="SalomonAI Simulation Engine", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def correlation_middleware(request: Request, call_next):
    correlation_id = request.headers.get("x-correlation-id") or str(uuid4())
    request.state.correlation_id = correlation_id
    response = await call_next(request)
    response.headers["x-correlation-id"] = correlation_id
    return response


@app.exception_handler(ServiceError)
async def service_error_handler(request: Request, exc: ServiceError):
    logger.warning("application_error", extra={"code": exc.code, "correlation_id": request.state.correlation_id})
    return format_error_response(request, exc)


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/metrics")
async def metrics() -> Dict[str, Any]:
    return {
        "version": app.version,
        "feature_simulations": settings.feature_simulations,
        "rate_limit_requests": settings.rate_limit_requests,
    }


def _ensure_enabled() -> None:
    if not settings.feature_simulations:
        raise ServiceDisabledError()


async def _enforce_rate_limit(user: AuthenticatedUser) -> None:
    await rate_limiter.check(user.sub)


@app.post("/api/v1/simulations/mortgage", response_model=MortgageSimulationResponse)
async def mortgage_simulation(
    payload: MortgageSimulationRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    _ensure_enabled()
    await _enforce_rate_limit(user)
    try:
        result = simulate_mortgage(payload)
    except ValueError as exc:
        raise BadRequestError(str(exc)) from exc
    return result


@app.post("/api/v1/simulations/budget-whatif", response_model=BudgetWhatIfResponse)
async def budget_simulation(
    payload: BudgetWhatIfRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    _ensure_enabled()
    await _enforce_rate_limit(user)
    try:
        return simulate_budget(payload)
    except ValueError as exc:
        raise BadRequestError(str(exc)) from exc


@app.exception_handler(UnauthorizedError)
async def unauthorized_handler(request: Request, exc: UnauthorizedError):
    return format_error_response(request, exc)


@app.exception_handler(Exception)
async def unexpected_handler(request: Request, exc: Exception):
    logger.exception("unexpected_error", extra={"correlation_id": request.state.correlation_id})
    error = ServiceError(code="INTERNAL", message="Unexpected error", status_code=500)
    return format_error_response(request, error)
