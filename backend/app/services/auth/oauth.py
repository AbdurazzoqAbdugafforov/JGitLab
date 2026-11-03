"""OAuth 2.0 / OpenID Connect login for Google and GitHub.

Security properties:
- `state` (CSRF), PKCE S256 `code_verifier`, and OIDC `nonce` are generated per flow and stored in a
  short-lived, signed, HttpOnly cookie scoped to the OAuth path. The callback rejects mismatches.
- Google: the ID token is verified (signature via Google JWKS, issuer, audience, expiry, nonce).
- GitHub: identity is read from /user and the primary *verified* email from /user/emails.
- Only identity scopes are requested. Provider access tokens are used once and never stored.
"""
import asyncio
import base64
import hashlib
import secrets
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import httpx
import jwt

from app.core.config import settings

FLOW_COOKIE = "jgl_oauth_flow"
FLOW_TTL_SECONDS = 600

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = ("https://accounts.google.com", "accounts.google.com")

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"

SUPPORTED_PROVIDERS = ("google", "github")


class OAuthError(Exception):
    """Carries a stable error code that the login page maps to a user-facing message."""
    def __init__(self, code: str, message: str = ""):
        super().__init__(message or code)
        self.code = code
        self.message = message or code


@dataclass
class ProviderIdentity:
    provider: str
    subject: str
    email: Optional[str]
    email_verified: bool
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


def provider_configured(provider: str) -> bool:
    if provider == "google":
        return settings.google_configured
    if provider == "github":
        return settings.github_login_configured
    return False


def callback_url(provider: str) -> str:
    return f"{settings.public_url}{settings.API_V1_STR}/auth/oauth/{provider}/callback"


def safe_next_path(value: Optional[str]) -> str:
    """Only allow same-origin relative paths to prevent open redirects."""
    if not value or not value.startswith("/") or value.startswith("//") or "\\" in value:
        return "/dashboard"
    return value[:300]


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def new_flow(provider: str, intent: str, next_path: str, link_user_id: Optional[str]) -> Dict[str, Any]:
    verifier = _b64url(secrets.token_bytes(48))
    return {
        "p": provider,
        "s": secrets.token_urlsafe(24),
        "v": verifier,
        "n": secrets.token_urlsafe(16),
        "i": intent,
        "nx": safe_next_path(next_path),
        "u": link_user_id,
        "exp": int(time.time()) + FLOW_TTL_SECONDS,
    }


def encode_flow(flow: Dict[str, Any]) -> str:
    return jwt.encode(flow, settings.auth_secret, algorithm="HS256")


def decode_flow(token: Optional[str]) -> Dict[str, Any]:
    if not token:
        raise OAuthError("state_missing", "The sign-in session expired. Please try again.")
    try:
        return jwt.decode(token, settings.auth_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise OAuthError("state_expired", "The sign-in attempt took too long. Please try again.")
    except jwt.PyJWTError:
        raise OAuthError("state_invalid", "The sign-in request could not be verified.")


def authorization_url(flow: Dict[str, Any]) -> str:
    provider = flow["p"]
    challenge = _b64url(hashlib.sha256(flow["v"].encode()).digest())
    if provider == "google":
        params = {
            "client_id": settings.AUTH_GOOGLE_ID,
            "redirect_uri": callback_url("google"),
            "response_type": "code",
            "scope": "openid email profile",
            "state": flow["s"],
            "nonce": flow["n"],
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "prompt": "select_account",
            "access_type": "online",
        }
        return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    if provider == "github":
        params = {
            "client_id": settings.AUTH_GITHUB_ID,
            "redirect_uri": callback_url("github"),
            "scope": "read:user user:email",
            "state": flow["s"],
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "allow_signup": "true",
        }
        return f"{GITHUB_AUTH_URL}?{urlencode(params)}"
    raise OAuthError("provider_unsupported")


# ---------------------------------------------------------------------------
# Code exchange + identity retrieval
# ---------------------------------------------------------------------------

_jwk_client: Optional[jwt.PyJWKClient] = None


def _verify_google_id_token(id_token: str, nonce: str) -> Dict[str, Any]:
    global _jwk_client
    if _jwk_client is None:
        _jwk_client = jwt.PyJWKClient(GOOGLE_JWKS_URL, cache_keys=True)
    signing_key = _jwk_client.get_signing_key_from_jwt(id_token)
    claims = jwt.decode(
        id_token,
        signing_key.key,
        algorithms=["RS256"],
        audience=settings.AUTH_GOOGLE_ID,
        options={"require": ["exp", "iat", "iss", "sub", "aud"]},
    )
    if claims.get("iss") not in GOOGLE_ISSUERS:
        raise OAuthError("token_invalid", "Unexpected token issuer.")
    if claims.get("nonce") != nonce:
        raise OAuthError("token_invalid", "Token nonce mismatch.")
    return claims


async def _exchange_google(code: str, flow: Dict[str, Any]) -> ProviderIdentity:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.AUTH_GOOGLE_ID,
                "client_secret": settings.AUTH_GOOGLE_SECRET,
                "redirect_uri": callback_url("google"),
                "grant_type": "authorization_code",
                "code_verifier": flow["v"],
            },
            headers={"Accept": "application/json"},
        )
    if resp.status_code != 200:
        raise OAuthError("token_exchange_failed", "Google rejected the sign-in code.")
    id_token = resp.json().get("id_token")
    if not id_token:
        raise OAuthError("token_exchange_failed", "Google did not return an ID token.")
    try:
        claims = await asyncio.to_thread(_verify_google_id_token, id_token, flow["n"])
    except OAuthError:
        raise
    except Exception:
        raise OAuthError("token_invalid", "Google identity token could not be verified.")
    return ProviderIdentity(
        provider="google",
        subject=str(claims["sub"]),
        email=(claims.get("email") or "").lower() or None,
        email_verified=bool(claims.get("email_verified")),
        display_name=claims.get("name"),
        avatar_url=claims.get("picture"),
    )


async def _exchange_github(code: str, flow: Dict[str, Any]) -> ProviderIdentity:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id": settings.AUTH_GITHUB_ID,
                "client_secret": settings.AUTH_GITHUB_SECRET,
                "code": code,
                "redirect_uri": callback_url("github"),
                "code_verifier": flow["v"],
            },
            headers={"Accept": "application/json"},
        )
        data = resp.json() if resp.status_code == 200 else {}
        token = data.get("access_token")
        if not token:
            raise OAuthError("token_exchange_failed", "GitHub rejected the sign-in code.")
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "JGitLab",
        }
        user_resp = await client.get(f"{settings.GITHUB_API_URL}/user", headers=headers)
        emails_resp = await client.get(f"{settings.GITHUB_API_URL}/user/emails", headers=headers)
    if user_resp.status_code != 200:
        raise OAuthError("profile_failed", "Could not read your GitHub profile.")
    profile = user_resp.json()
    email, verified = None, False
    if emails_resp.status_code == 200:
        for entry in emails_resp.json():
            if entry.get("primary") and entry.get("verified"):
                email, verified = entry.get("email", "").lower(), True
                break
    return ProviderIdentity(
        provider="github",
        subject=str(profile["id"]),
        email=email,
        email_verified=verified,
        username=profile.get("login"),
        display_name=profile.get("name") or profile.get("login"),
        avatar_url=profile.get("avatar_url"),
    )


async def exchange_code_for_identity(provider: str, code: str, flow: Dict[str, Any]) -> ProviderIdentity:
    if provider == "google":
        return await _exchange_google(code, flow)
    if provider == "github":
        return await _exchange_github(code, flow)
    raise OAuthError("provider_unsupported")
