from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque
from typing import Deque, DefaultDict

from .errors import RateLimitError


class RateLimiter:
    """Simple in-memory rate limiter suitable for single-instance deployments."""

    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = max(limit, 0)
        self.window_seconds = max(window_seconds, 1)
        self._hits: DefaultDict[str, Deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def check(self, key: str) -> None:
        if self.limit == 0:
            return
        now = time.monotonic()
        async with self._lock:
            history = self._hits[key]
            while history and now - history[0] > self.window_seconds:
                history.popleft()
            if len(history) >= self.limit:
                retry_after = max(int(self.window_seconds - (now - history[0])), 1)
                raise RateLimitError(retry_after)
            history.append(now)
