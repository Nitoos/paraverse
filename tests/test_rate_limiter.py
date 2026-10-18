import asyncio
import time

import pytest

from backend.rate_limiter import TokenBucket, with_backoff


@pytest.mark.asyncio
async def test_bucket_allows_burst_up_to_rate():
    bucket = TokenBucket(rate_per_minute=60)
    start = time.monotonic()
    for _ in range(6):
        await bucket.acquire()
    assert time.monotonic() - start < 1.0


@pytest.mark.asyncio
async def test_bucket_blocks_over_rate():
    bucket = TokenBucket(rate_per_minute=60)  # 1/second
    bucket._tokens = 1.0  # drain to 1
    t0 = time.monotonic()
    await bucket.acquire()  # uses last token
    await asyncio.wait_for(bucket.acquire(), timeout=2.5)
    assert time.monotonic() - t0 >= 0.9


@pytest.mark.asyncio
async def test_backoff_retries_on_resource_exhausted():
    try:
        from google.api_core.exceptions import ResourceExhausted
    except ImportError:
        from backend.rate_limiter import ResourceExhausted  # type: ignore

    call_count = 0

    async def flaky():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise ResourceExhausted("quota")
        return "ok"

    result = await with_backoff(lambda: flaky(), max_retries=5)
    assert result == "ok"
    assert call_count == 3


@pytest.mark.asyncio
async def test_backoff_exhausts_retries_and_raises():
    try:
        from google.api_core.exceptions import ResourceExhausted
    except ImportError:
        from backend.rate_limiter import ResourceExhausted  # type: ignore

    async def always_fails():
        raise ResourceExhausted("quota")

    with pytest.raises(ResourceExhausted):
        await with_backoff(lambda: always_fails(), max_retries=3)
