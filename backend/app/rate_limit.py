"""
Shared rate limiter (slowapi, in-memory).

In-memory storage is per process, which is fine for a single uvicorn worker
(Render free tier). Behind a proxy, run uvicorn with --proxy-headers so the
client IP is the real visitor and not the proxy.
"""

import os

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    enabled=os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true",
)

AUTH_RATE_LIMIT = os.getenv("AUTH_RATE_LIMIT", "5/minute")
