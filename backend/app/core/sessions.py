"""Server-side session management.

Design:
- The browser receives an opaque, high-entropy random token in an HttpOnly cookie.
- The database stores only HMAC-SHA256(token, BACKEND_INTERNAL_SIGNING_KEY).
- Sessions expire, can be revoked individually or in bulk, and record auth method / last seen.
- A separate non-HttpOnly CSRF cookie implements the double-submit pattern for cookie-authenticated
  state-changing requests (see CSRFMiddleware).
"""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from fastapi import Request, Response
from sqlalchemy import select, update, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import Session, User


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    # SQLite returns naive datetimes; normalise to UTC-aware for comparisons
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def hash_session_token(token: str) -> str:
    return hmac.new(settings.internal_signing_key.encode(), token.encode(), hashlib.sha256).hexdigest()


def client_ip(request: Optional[Request]) -> Optional[str]:
    if request is None:
        return None
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()[:45]
    return request.client.host[:45] if request.client else None


async def create_session(
    db: AsyncSession, user: User, auth_method: str, request: Optional[Request] = None
) -> Tuple[str, Session]:
    raw = secrets.token_urlsafe(48)
    now = utc_now()
    sess = Session(
        user_id=user.id,
        token_hash=hash_session_token(raw),
        auth_method=auth_method,
        ip_address=client_ip(request),
        user_agent=(request.headers.get("user-agent", "")[:500] if request else None),
        expires_at=now + timedelta(hours=settings.SESSION_TTL_HOURS),
        last_seen_at=now,
        created_at=now,
    )
    db.add(sess)
    await db.flush()
    return raw, sess


async def resolve_session(db: AsyncSession, raw_token: str) -> Optional[Session]:
    if not raw_token or len(raw_token) > 256:
        return None
    result = await db.execute(select(Session).where(Session.token_hash == hash_session_token(raw_token)))
    sess = result.scalar_one_or_none()
    if not sess or sess.revoked_at is not None:
        return None
    now = utc_now()
    if _aware(sess.expires_at) <= now:
        return None
    # Throttle last_seen writes to once a minute
    last = _aware(sess.last_seen_at)
    if last is None or (now - last) > timedelta(minutes=1):
        sess.last_seen_at = now
    return sess


def session_is_fresh(sess: Session) -> bool:
    """True when the session was created recently enough for sensitive operations."""
    created = _aware(sess.created_at)
    return created is not None and (utc_now() - created) <= timedelta(minutes=settings.REAUTH_WINDOW_MINUTES)


async def revoke_session(db: AsyncSession, sess: Session) -> None:
    sess.revoked_at = utc_now()
    await db.flush()


async def revoke_user_sessions(db: AsyncSession, user_id: str, except_session_id: Optional[str] = None) -> int:
    stmt = update(Session).where(and_(Session.user_id == user_id, Session.revoked_at.is_(None)))
    if except_session_id:
        stmt = stmt.where(Session.id != except_session_id)
    result = await db.execute(stmt.values(revoked_at=utc_now()))
    return result.rowcount or 0


def set_session_cookies(response: Response, raw_token: str) -> str:
    max_age = settings.SESSION_TTL_HOURS * 3600
    response.set_cookie(
        settings.SESSION_COOKIE_NAME,
        raw_token,
        max_age=max_age,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    csrf = secrets.token_urlsafe(32)
    response.set_cookie(
        settings.CSRF_COOKIE_NAME,
        csrf,
        max_age=max_age,
        httponly=False,  # must be readable by the SPA to echo in X-CSRF-Token
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    return csrf


def clear_session_cookies(response: Response) -> None:
    response.delete_cookie(settings.SESSION_COOKIE_NAME, path="/")
    response.delete_cookie(settings.CSRF_COOKIE_NAME, path="/")
