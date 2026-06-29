import time
from collections import defaultdict
from fastapi import Request, HTTPException


class RateLimiter:
    """Simple in-memory rate limiter per IP."""

    def __init__(self):
        self._store: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str, max_requests: int, window_seconds: int):
        now = time.time()
        cutoff = now - window_seconds
        self._store[key] = [t for t in self._store[key] if t > cutoff]
        if len(self._store[key]) >= max_requests:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later.",
            )
        self._store[key].append(now)


rate_limiter = RateLimiter()


def rate_limit_auth(request: Request):
    """Rate limit auth endpoints: 5 requests per minute per IP."""
    ip = request.client.host if request.client else "unknown"
    rate_limiter.check(f"auth:{ip}", max_requests=5, window_seconds=60)


def rate_limit_otp(request: Request):
    """Rate limit OTP endpoints: 3 requests per minute per IP."""
    ip = request.client.host if request.client else "unknown"
    rate_limiter.check(f"otp:{ip}", max_requests=3, window_seconds=60)
