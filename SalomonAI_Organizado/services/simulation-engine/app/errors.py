from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import Request
from fastapi.responses import JSONResponse


class ServiceError(Exception):
    """Base application error with a standardized payload."""

    def __init__(
        self,
        *,
        code: str,
        message: str,
        status_code: int,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class UnauthorizedError(ServiceError):
    def __init__(self, message: str = "Invalid or missing credentials") -> None:
        super().__init__(code="UNAUTHORIZED", message=message, status_code=401)


class ServiceDisabledError(ServiceError):
    def __init__(self) -> None:
        super().__init__(
            code="SERVICE_DISABLED",
            message="Simulation features are currently disabled",
            status_code=503,
        )


class RateLimitError(ServiceError):
    def __init__(self, retry_after: int) -> None:
        super().__init__(
            code="RATE_LIMITED",
            message="Too many requests. Please try again later.",
            status_code=429,
            details={"retry_after": retry_after},
        )


class BadRequestError(ServiceError):
    def __init__(self, message: str, *, details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(code="VALIDATION_ERROR", message=message, status_code=400, details=details)


def format_error_response(request: Request, exc: ServiceError) -> JSONResponse:
    correlation_id = getattr(request.state, "correlation_id", None)
    payload = {
        "error": {
            "code": exc.code,
            "message": exc.message,
            "correlationId": correlation_id,
            "details": exc.details,
        }
    }
    return JSONResponse(status_code=exc.status_code, content=payload)
