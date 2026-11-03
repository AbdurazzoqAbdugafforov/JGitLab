from datetime import datetime, timezone
from typing import Any, List, Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ensure_personal_workspace, get_current_session, get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password
from app.core.sessions import (
    clear_session_cookies,
    create_session,
    resolve_session,
    revoke_session,
    revoke_user_sessions,
    set_session_cookies,
)
from app.models.activity import ActivityLog
from app.models.user import IdentityAccount, Session, User
from app.schemas.auth import (
    AuthProvidersStatus,
    IdentityAccountResponse,
    OAuthRuntimeConfigUpdate,
    OnboardingUpdate,
    SessionResponse,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
)
from app.services.auth.accounts import resolve_identity
from app.services.auth.oauth import (
    FLOW_COOKIE,
    FLOW_TTL_SECONDS,
    OAuthError,
    SUPPORTED_PROVIDERS,
    authorization_url,
    decode_flow,
    encode_flow,
    exchange_code_for_identity,
    new_flow,
    provider_configured,
    safe_next_path,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


async def _serialize_user(db: AsyncSession, user: User) -> UserResponse:
    res = await db.execute(
        select(IdentityAccount)
        .where(IdentityAccount.user_id == user.id)
        .order_by(IdentityAccount.created_at.asc())
    )
    identities = list(res.scalars().all())
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        email_verified=bool(user.email_verified),
        has_password=bool(user.hashed_password),
        role=user.role,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        onboarding=user.onboarding or {"completed": [], "dismissed": False},
        identities=[IdentityAccountResponse.model_validate(i) for i in identities],
        created_at=user.created_at,
    )


@router.get("/providers", response_model=AuthProvidersStatus)
async def get_auth_providers() -> AuthProvidersStatus:
    return AuthProvidersStatus(
        google_enabled=settings.google_configured,
        github_enabled=settings.github_login_configured,
        email_enabled=True,
        github_app_enabled=settings.github_app_configured,
        github_app_name=settings.GITHUB_APP_NAME or None,
    )


@router.post("/oauth-config", response_model=AuthProvidersStatus)
async def update_oauth_runtime_config(
    config_in: OAuthRuntimeConfigUpdate,
) -> AuthProvidersStatus:
    """Allow local development / admin setup of OAuth & GitHub App credentials at runtime."""
    if config_in.google_client_id is not None:
        settings.AUTH_GOOGLE_ID = config_in.google_client_id.strip()
    if config_in.google_client_secret is not None:
        settings.AUTH_GOOGLE_SECRET = config_in.google_client_secret.strip()
    if config_in.github_client_id is not None:
        settings.AUTH_GITHUB_ID = config_in.github_client_id.strip()
    if config_in.github_client_secret is not None:
        settings.AUTH_GITHUB_SECRET = config_in.github_client_secret.strip()
    if config_in.github_app_name is not None:
        settings.GITHUB_APP_NAME = config_in.github_app_name.strip()
    if config_in.github_app_id is not None:
        settings.GITHUB_APP_ID = config_in.github_app_id.strip()
    if config_in.github_app_private_key is not None:
        settings.GITHUB_APP_PRIVATE_KEY = config_in.github_app_private_key.strip()

    return AuthProvidersStatus(
        google_enabled=settings.google_configured,
        github_enabled=settings.github_login_configured,
        email_enabled=True,
        github_app_enabled=settings.github_app_configured,
        github_app_name=settings.GITHUB_APP_NAME or None,
    )


@router.post("/register", response_model=TokenResponse)
async def register(
    user_in: UserCreate,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> Any:
    email_norm = user_in.email.lower().strip()
    existing = await db.execute(select(User).where(func.lower(User.email) == email_norm))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create account with the provided details. Try signing in instead.",
        )

    user = User(
        email=email_norm,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        email_verified=False,
        role="engineer",
        onboarding={"completed": ["account"], "dismissed": False},
    )
    db.add(user)
    await db.flush()
    await ensure_personal_workspace(db, user)

    raw_token, _ = await create_session(db, user, auth_method="password", request=request)
    csrf_token = set_session_cookies(response, raw_token)

    db.add(
        ActivityLog(
            user_id=user.id,
            action_type="account_registered",
            entity_type="account",
            entity_id=user.id,
            description="Account created with email & password.",
        )
    )
    await db.commit()
    await db.refresh(user)

    return TokenResponse(
        access_token=raw_token,
        token_type="bearer",
        csrf_token=csrf_token,
        user=await _serialize_user(db, user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    login_in: UserLogin,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> Any:
    email_norm = login_in.email.lower().strip()
    result = await db.execute(select(User).where(func.lower(User.email) == email_norm))
    user = result.scalar_one_or_none()

    # Do not reveal whether the email exists or uses OAuth-only sign-in
    if not user or not user.hashed_password or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )

    await ensure_personal_workspace(db, user)
    raw_token, _ = await create_session(db, user, auth_method="password", request=request)
    csrf_token = set_session_cookies(response, raw_token)
    await db.commit()

    return TokenResponse(
        access_token=raw_token,
        token_type="bearer",
        csrf_token=csrf_token,
        user=await _serialize_user(db, user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    await ensure_personal_workspace(db, current_user)
    return await _serialize_user(db, current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    update_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    current_session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> Any:
    if update_in.full_name is not None:
        current_user.full_name = update_in.full_name.strip() or None
    if update_in.avatar_url is not None:
        current_user.avatar_url = update_in.avatar_url.strip() or None

    if update_in.new_password:
        if current_user.hashed_password:
            if not update_in.current_password or not verify_password(
                update_in.current_password, current_user.hashed_password
            ):
                raise HTTPException(status_code=400, detail="Current password is incorrect.")
        current_user.hashed_password = get_password_hash(update_in.new_password)
        # Revoke all other sessions when password changes
        await revoke_user_sessions(db, current_user.id, except_session_id=current_session.id)

    await db.commit()
    await db.refresh(current_user)
    return await _serialize_user(db, current_user)


@router.patch("/onboarding", response_model=UserResponse)
async def update_onboarding(
    payload: OnboardingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    state = dict(current_user.onboarding or {"completed": [], "dismissed": False})
    completed = list(state.get("completed") or [])
    if payload.completed is not None:
        completed = list(dict.fromkeys(payload.completed))
    if payload.completed_step and payload.completed_step not in completed:
        completed.append(payload.completed_step)
    state["completed"] = completed
    if payload.dismissed is not None:
        state["dismissed"] = payload.dismissed
    current_user.onboarding = state
    await db.commit()
    await db.refresh(current_user)
    return await _serialize_user(db, current_user)


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> Any:
    tokens_to_revoke = set()
    cookie_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if cookie_token:
        tokens_to_revoke.add(cookie_token)
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        bearer_token = auth_header.split(" ", 1)[1].strip()
        if bearer_token:
            tokens_to_revoke.add(bearer_token)
    for raw in tokens_to_revoke:
        sess = await resolve_session(db, raw)
        if sess:
            await revoke_session(db, sess)
    if tokens_to_revoke:
        await db.commit()
    clear_session_cookies(response)
    return {"message": "Successfully signed out."}


# ---------------------------------------------------------------------------
# OAuth 2.0 / OIDC login & account linking (Google & GitHub)
# ---------------------------------------------------------------------------

def _error_redirect(target_base: str, code: str, message: str = "") -> RedirectResponse:
    params = {"auth_error": code}
    if message:
        params["auth_error_description"] = message[:200]
    sep = "&" if "?" in target_base else "?"
    resp = RedirectResponse(url=f"{target_base}{sep}{urlencode(params)}", status_code=302)
    resp.delete_cookie(FLOW_COOKIE, path="/")
    return resp


@router.get("/oauth/{provider}/start")
async def oauth_start(
    provider: str,
    request: Request,
    intent: str = Query(default="login", pattern="^(login|link)$"),
    next: str = Query(default="/dashboard"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    provider = provider.lower()
    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(status_code=404, detail="Unsupported authentication provider.")

    return_page = "/settings/account" if intent == "link" else "/login"
    if not provider_configured(provider):
        return _error_redirect(
            f"{settings.public_url}{return_page}",
            f"{provider}_not_configured",
            f"{provider.title()} OAuth credentials are not configured on the server.",
        )

    link_user_id: Optional[str] = None
    if intent == "link":
        raw = request.cookies.get(settings.SESSION_COOKIE_NAME)
        if not raw:
            auth_h = request.headers.get("authorization", "")
            if auth_h.lower().startswith("bearer "):
                raw = auth_h.split(" ", 1)[1].strip()
        sess = await resolve_session(db, raw) if raw else None
        if not sess:
            return _error_redirect(
                f"{settings.public_url}/login",
                "link_requires_session",
                "Please sign in before linking another identity provider.",
            )
        link_user_id = sess.user_id

    flow = new_flow(provider=provider, intent=intent, next_path=next, link_user_id=link_user_id)
    redirect_to = authorization_url(flow)
    resp = RedirectResponse(url=redirect_to, status_code=302)
    resp.set_cookie(
        FLOW_COOKIE,
        encode_flow(flow),
        max_age=FLOW_TTL_SECONDS,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    return resp


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> Any:
    provider = provider.lower()
    flow_cookie = request.cookies.get(FLOW_COOKIE)

    try:
        flow = decode_flow(flow_cookie)
    except OAuthError as exc:
        return _error_redirect(f"{settings.public_url}/login", exc.code, exc.message)

    intent = flow.get("i", "login")
    fallback_page = "/settings/account" if intent == "link" else "/login"

    if error:
        err_code = "access_denied" if error == "access_denied" else "provider_error"
        return _error_redirect(
            f"{settings.public_url}{fallback_page}",
            err_code,
            error_description or f"{provider.title()} sign-in was cancelled.",
        )

    if not code or not state or state != flow.get("s") or provider != flow.get("p"):
        return _error_redirect(
            f"{settings.public_url}{fallback_page}",
            "state_mismatch",
            "Security verification failed (state mismatch). Please try signing in again.",
        )

    link_user: Optional[User] = None
    if intent == "link":
        uid = flow.get("u")
        if uid:
            res = await db.execute(select(User).where(User.id == uid))
            link_user = res.scalar_one_or_none()

    try:
        info = await exchange_code_for_identity(provider, code, flow)
        resolution = await resolve_identity(db, info, intent=intent, link_user=link_user)
    except OAuthError as exc:
        await db.rollback()
        return _error_redirect(f"{settings.public_url}{fallback_page}", exc.code, exc.message)
    except Exception:
        await db.rollback()
        return _error_redirect(
            f"{settings.public_url}{fallback_page}",
            "oauth_failed",
            f"Could not complete {provider.title()} authentication.",
        )

    user = resolution.user
    raw_token, _ = await create_session(db, user, auth_method=provider, request=request)
    await db.commit()

    if resolution.outcome == "registered":
        destination = "/onboarding"
    elif intent == "link":
        destination = f"{safe_next_path(flow.get('nx'))}?linked={provider}"
    else:
        destination = safe_next_path(flow.get("nx"))

    resp = RedirectResponse(url=f"{settings.public_url}{destination}", status_code=302)
    resp.delete_cookie(FLOW_COOKIE, path="/")
    set_session_cookies(resp, raw_token)
    return resp


# ---------------------------------------------------------------------------
# Connected identity providers & active sessions management
# ---------------------------------------------------------------------------

@router.get("/identities", response_model=List[IdentityAccountResponse])
async def list_identities(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    res = await db.execute(
        select(IdentityAccount)
        .where(IdentityAccount.user_id == current_user.id)
        .order_by(IdentityAccount.created_at.asc())
    )
    return list(res.scalars().all())


@router.delete("/identities/{provider}")
async def unlink_identity(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    provider = provider.lower()
    res = await db.execute(
        select(IdentityAccount).where(
            and_(
                IdentityAccount.user_id == current_user.id,
                IdentityAccount.provider == provider,
            )
        )
    )
    target = res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail=f"{provider.title()} is not linked to your account.")

    count_res = await db.execute(
        select(func.count(IdentityAccount.id)).where(IdentityAccount.user_id == current_user.id)
    )
    total_identities = count_res.scalar_one() or 0
    if not current_user.hashed_password and total_identities <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot unlink your only sign-in method. Set a password or link another provider first.",
        )

    await db.delete(target)
    db.add(
        ActivityLog(
            user_id=current_user.id,
            action_type="identity_unlinked",
            entity_type="account",
            entity_id=current_user.id,
            description=f"Unlinked {provider.title()} sign-in from account.",
        )
    )
    await db.commit()
    return {"message": f"{provider.title()} sign-in has been unlinked."}


@router.get("/sessions", response_model=List[SessionResponse])
async def list_active_sessions(
    current_user: User = Depends(get_current_user),
    current_session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> Any:
    now = datetime.now(timezone.utc)
    res = await db.execute(
        select(Session)
        .where(
            and_(
                Session.user_id == current_user.id,
                Session.revoked_at.is_(None),
                Session.expires_at > now,
            )
        )
        .order_by(Session.created_at.desc())
    )
    items = []
    for s in res.scalars().all():
        dto = SessionResponse.model_validate(s)
        dto.is_current = s.id == current_session.id
        items.append(dto)
    return items


@router.delete("/sessions/{session_id}")
async def revoke_single_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    res = await db.execute(
        select(Session).where(and_(Session.id == session_id, Session.user_id == current_user.id))
    )
    target = res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Session not found.")
    await revoke_session(db, target)
    await db.commit()
    return {"message": "Session revoked."}


@router.post("/sessions/revoke-others")
async def revoke_other_sessions(
    current_user: User = Depends(get_current_user),
    current_session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> Any:
    revoked = await revoke_user_sessions(db, current_user.id, except_session_id=current_session.id)
    await db.commit()
    return {"message": f"Signed out from {revoked} other session(s).", "revoked_count": revoked}
