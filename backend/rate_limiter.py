import asyncio
import random
import time
from typing import Any, Callable, Coroutine

from backend.config import GEMINI_RPM

try:
    from google.api_core.exceptions import ResourceExhausted
except ImportError:
    class ResourceExhausted(Exception):  # type: ignore
        pass


def _is_rate_limit(exc: Exception) -> bool:
    msg = str(exc)
    return "429" in msg or "RESOURCE_EXHAUSTED" in msg or isinstance(exc, ResourceExhausted)


class TokenBucket:
    def __init__(self, rate_per_minute: int):
        self._rate = rate_per_minute / 60.0  # tokens per second
        self._tokens = float(rate_per_minute)  # start full
        self._last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    def _refill(self) -> None:
        now = time.monotonic()
        elapsed = now - self._last_refill
        self._tokens = min(self._tokens + elapsed * self._rate, self._rate * 60)
        self._last_refill = now

    async def acquire(self) -> None:
        async with self._lock:
            self._refill()
            if self._tokens >= 1.0:
                self._tokens -= 1.0
                return
            # Wait until enough time passes for one token
            wait_time = (1.0 - self._tokens) / self._rate
        await asyncio.sleep(wait_time)
        async with self._lock:
            self._refill()
            self._tokens -= 1.0


async def with_backoff(
    fn: Callable[[], Coroutine],
    max_retries: int = 6,
) -> Any:
    for attempt in range(max_retries):
        try:
            return await fn()
        except Exception as exc:
            if not _is_rate_limit(exc):
                raise
            if attempt == max_retries - 1:
                raise
            delay = min(2 ** attempt * 2 + random.uniform(0, 1), 30)
            await asyncio.sleep(delay)
    raise Exception("Max retries exceeded")


# Module-level singleton
bucket = TokenBucket(rate_per_minute=GEMINI_RPM)
