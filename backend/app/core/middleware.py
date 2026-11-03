"""HTTP middleware: CSRF double-submit protection, security headers, and simple rate limiting."""
import hmac
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Tuple

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import settings

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Endpoints reachable without an established session, or authenticated by other means
CSRF_EXEMPT_PREFIXES = (
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/oauth-config",
    "/api/v1/github/webhook",  # authenticated by HMAC signature
)


class CSRFMiddleware(BaseHTTPMiddleware):
    """Requests authenticated by the session cookie must echo the CSRF cookie in X-CSRF-Token.
    Bearer-token requests carry no ambient credentials and are not CSRF-prone."""

    async def dispatch(self, request: Request, call_next):
        if request.method in UNSAFE_METHODS and not request.url.path.startswith(CSRF_EXEMPT_PREFIXES):
            has_session_cookie = settings.SESSION_COOKIE_NAME in request.cookies
            has_bearer = request.headers.get("authorization", "").lower().startswith("bearer ")
            if has_session_cookie and not has_bearer:
                cookie = request.cookies.get(settings.CSRF_COOKIE_NAME, "")
                header = request.headers.get("x-csrf-token", "")
                if not cookie or not header or not hmac.compare_digest(cookie, header):
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF validation failed. Refresh the page and try again.", "code": "csrf_failed"},
                    )
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        if request.url.path.startswith("/api/"):
            response.headers.setdefault("Cache-Control", "no-store")
        return response


# (path prefix, max requests, window seconds)
RATE_LIMITS: Tuple[Tuple[str, int, int], ...] = (
    ("/api/v1/auth/login", 10, 60),
    ("/api/v1/auth/register", 5, 60),
    ("/api/v1/auth/oauth/", 30, 60),
    ("/api/v1/providers/validate", 10, 60),
    ("/api/v1/github/app/", 30, 60),
    ("/api/v1/agent/tasks", 60, 60),
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """In-process sliding-window limiter keyed by client IP + rule.
    For multi-instance deployments, replace the store with Redis."""

    def __init__(self, app):
        super().__init__(app)
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        if settings.ENVIRONMENT == "test":
            return await call_next(request)
        path = request.url.path
        for prefix, limit, window in RATE_LIMITS:
            if path.startswith(prefix):
                ip = request.client.host if request.client else "unknown"
                key = f"{prefix}|{ip}"
                now = time.monotonic()
                q = self._hits[key]
                while q and now - q[0] > window:
                    q.popleft()
                if len(q) >= limit:
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Too many requests. Please wait a moment and try again.", "code": "rate_limited"},
                        headers={"Retry-After": str(window)},
                    )
                q.append(now)
                break
        return await call_next(request)
