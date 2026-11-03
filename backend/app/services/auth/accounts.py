"""Maps a verified provider identity to a platform account.

Linking rules (account-takeover resistant):
1. An existing (provider, subject) identity always signs in its owner.
2. Linking a *new* identity requires an authenticated session whose user initiated the link flow.
   An identity that already belongs to another account is never moved.
3. Sign-in with an unknown identity creates a new account only when the provider asserts a
   verified email. If that email already belongs to an existing account we do NOT auto-link
   (local email/password accounts are not email-verified, so a match is not proof of ownership);
   the user must sign in with their original method and link from Settings.
"""
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ensure_personal_workspace
from app.models.activity import ActivityLog
from app.models.user import IdentityAccount, User
from app.services.auth.oauth import OAuthError, ProviderIdentity


@dataclass
class LoginResolution:
    user: User
    outcome: str  # signed_in | registered | linked | already_linked


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _refresh_identity(identity: IdentityAccount, info: ProviderIdentity) -> None:
    identity.email = info.email
    identity.email_verified = info.email_verified
    identity.username = info.username
    identity.display_name = info.display_name
    identity.avatar_url = info.avatar_url
    identity.last_login_at = _now()


async def resolve_identity(
    db: AsyncSession,
    info: ProviderIdentity,
    intent: str,
    link_user: Optional[User],
) -> LoginResolution:
    result = await db.execute(
        select(IdentityAccount).where(
            IdentityAccount.provider == info.provider,
            IdentityAccount.provider_subject == info.subject,
        )
    )
    identity = result.scalar_one_or_none()

    # ---- link flow -------------------------------------------------------
    if intent == "link":
        if link_user is None:
            raise OAuthError("link_requires_session", "Sign in again to link another provider.")
        if identity:
            if identity.user_id != link_user.id:
                raise OAuthError(
                    "identity_in_use",
                    f"This {info.provider.title()} account is already linked to a different JGitLab account.",
                )
            _refresh_identity(identity, info)
            return LoginResolution(link_user, "already_linked")
        identity = IdentityAccount(user_id=link_user.id, provider=info.provider, provider_subject=info.subject)
        _refresh_identity(identity, info)
        db.add(identity)
        if not link_user.avatar_url and info.avatar_url:
            link_user.avatar_url = info.avatar_url
        db.add(ActivityLog(
            user_id=link_user.id, action_type="identity_linked", entity_type="account",
            entity_id=link_user.id, description=f"Linked {info.provider.title()} sign-in to account.",
        ))
        await db.flush()
        return LoginResolution(link_user, "linked")

    # ---- sign-in flow ----------------------------------------------------
    if identity:
        user = (await db.execute(select(User).where(User.id == identity.user_id))).scalar_one()
        if not user.is_active:
            raise OAuthError("account_disabled", "This account has been deactivated.")
        _refresh_identity(identity, info)
        await db.flush()
        return LoginResolution(user, "signed_in")

    if not info.email or not info.email_verified:
        raise OAuthError(
            "email_unverified",
            f"Your {info.provider.title()} account has no verified primary email address.",
        )

    existing = (await db.execute(select(User).where(func.lower(User.email) == info.email.lower()))).scalar_one_or_none()
    if existing:
        raise OAuthError(
            "account_exists",
            "An account with this email already exists. Sign in with your original method, "
            f"then link {info.provider.title()} from Settings.",
        )

    user = User(
        email=info.email.lower(),
        hashed_password=None,
        full_name=info.display_name,
        avatar_url=info.avatar_url,
        email_verified=True,
        role="engineer",
        onboarding={"completed": ["account"], "dismissed": False},
    )
    db.add(user)
    await db.flush()
    identity = IdentityAccount(user_id=user.id, provider=info.provider, provider_subject=info.subject)
    _refresh_identity(identity, info)
    db.add(identity)
    await ensure_personal_workspace(db, user)
    db.add(ActivityLog(
        user_id=user.id, action_type="account_registered", entity_type="account",
        entity_id=user.id, description=f"Account created with {info.provider.title()}.",
    ))
    await db.flush()
    return LoginResolution(user, "registered")
