"""GitHub App integration for installation-scoped repository access.

Why a GitHub App instead of a broad OAuth token:
- Users choose either ALL repositories or SELECTED repositories on the official GitHub screen.
- Permissions are fine-grained: metadata:read, contents:write, pull_requests:write, checks:read.
- Installation access tokens are short-lived (1 hour) and minted server-side from the App's
  private key on demand — never stored in the database and never exposed to browsers.
"""
import secrets
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlencode

import httpx
import jwt

from app.core.config import settings

INSTALL_STATE_TTL = 900  # 15 minutes

RECOMMENDED_PERMISSIONS: Dict[str, str] = {
    "metadata": "read",
    "contents": "write",
    "pull_requests": "write",
    "checks": "read",
}

# In-memory cache of short-lived installation tokens: installation_id -> (token, expires_epoch)
_installation_token_cache: Dict[int, Tuple[str, float]] = {}


class GitHubAppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def encode_install_state(user_id: str, next_path: str = "/github") -> str:
    payload = {
        "purpose": "gh_app_install",
        "uid": user_id,
        "nx": next_path if next_path.startswith("/") and not next_path.startswith("//") else "/github",
        "nonce": secrets.token_urlsafe(12),
        "exp": int(time.time()) + INSTALL_STATE_TTL,
    }
    return jwt.encode(payload, settings.internal_signing_key, algorithm="HS256")


def decode_install_state(token: Optional[str]) -> Dict[str, Any]:
    if not token:
        raise GitHubAppError("state_missing", "Installation state token is missing.")
    try:
        data = jwt.decode(token, settings.internal_signing_key, algorithms=["HS256"])
        if data.get("purpose") != "gh_app_install":
            raise GitHubAppError("state_invalid", "Invalid installation state purpose.")
        return data
    except jwt.ExpiredSignatureError:
        raise GitHubAppError("state_expired", "Installation session expired. Please start again.")
    except jwt.PyJWTError:
        raise GitHubAppError("state_invalid", "Invalid installation state token.")


def build_install_url(state: str) -> str:
    if not settings.GITHUB_APP_NAME:
        raise GitHubAppError(
            "app_not_configured",
            "GitHub App is not configured on this server. Set GITHUB_APP_NAME, GITHUB_APP_ID, and GITHUB_APP_PRIVATE_KEY.",
            status_code=503,
        )
    slug = settings.GITHUB_APP_NAME.strip()
    return f"{settings.GITHUB_WEB_URL.rstrip('/')}/apps/{slug}/installations/new?{urlencode({'state': state})}"


def build_manage_installation_url(installation_id: Optional[int], account_type: Optional[str] = None) -> str:
    base = settings.GITHUB_WEB_URL.rstrip("/")
    if installation_id:
        return f"{base}/settings/installations/{installation_id}"
    if settings.GITHUB_APP_NAME:
        return f"{base}/apps/{settings.GITHUB_APP_NAME.strip()}/installations/new"
    return f"{base}/settings/installations"


def create_app_jwt() -> str:
    """Create a short-lived RS256 JWT signed with the GitHub App private key."""
    if not settings.GITHUB_APP_ID or not settings.github_app_private_key:
        raise GitHubAppError(
            "app_not_configured",
            "GitHub App credentials (GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY) are not configured.",
            status_code=503,
        )
    now = int(time.time())
    payload = {
        "iat": now - 60,
        "exp": now + (9 * 60),
        "iss": str(settings.GITHUB_APP_ID),
    }
    try:
        return jwt.encode(payload, settings.github_app_private_key, algorithm="RS256")
    except Exception as exc:
        raise GitHubAppError("app_key_invalid", f"Failed to sign GitHub App JWT: {exc}", status_code=500)


def _app_headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {create_app_jwt()}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "JGitLab-GitHubApp",
    }


async def fetch_installation_metadata(installation_id: int) -> Dict[str, Any]:
    """Fetch installation details using the App JWT."""
    url = f"{settings.GITHUB_API_URL.rstrip('/')}/app/installations/{installation_id}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, headers=_app_headers())
    if resp.status_code == 404:
        raise GitHubAppError("installation_revoked", "GitHub App installation was removed or not found.", status_code=404)
    if resp.status_code != 200:
        raise GitHubAppError("installation_lookup_failed", f"GitHub API returned {resp.status_code}.", status_code=resp.status_code)
    return resp.json()


async def mint_installation_token(installation_id: int, force_refresh: bool = False) -> str:
    """Mint (or return cached) short-lived installation access token."""
    now = time.time()
    cached = _installation_token_cache.get(installation_id)
    if cached and not force_refresh and cached[1] - now > 120:
        return cached[0]

    url = f"{settings.GITHUB_API_URL.rstrip('/')}/app/installations/{installation_id}/access_tokens"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, headers=_app_headers())
    if resp.status_code == 404:
        _installation_token_cache.pop(installation_id, None)
        raise GitHubAppError("installation_revoked", "GitHub App installation was revoked on GitHub.", status_code=404)
    if resp.status_code == 403:
        _installation_token_cache.pop(installation_id, None)
        raise GitHubAppError("installation_suspended", "GitHub App installation is suspended or lacks permission.", status_code=403)
    if resp.status_code not in (200, 201):
        raise GitHubAppError("token_mint_failed", f"Could not mint installation token ({resp.status_code}).", status_code=resp.status_code)

    data = resp.json()
    token = data["token"]
    # Default 55 minutes if expires_at parsing fails
    exp_epoch = now + 3300
    exp_str = data.get("expires_at")
    if exp_str:
        try:
            exp_dt = datetime.fromisoformat(exp_str.replace("Z", "+00:00"))
            exp_epoch = exp_dt.timestamp()
        except Exception:
            pass
    _installation_token_cache[installation_id] = (token, exp_epoch)
    return token


def clear_cached_installation_token(installation_id: Optional[int]) -> None:
    if installation_id is not None:
        _installation_token_cache.pop(installation_id, None)


async def list_installation_repositories(installation_id: int) -> Tuple[str, List[Dict[str, Any]]]:
    """Return (repository_selection, repositories) granted to this installation."""
    token = await mint_installation_token(installation_id)
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "JGitLab-GitHubApp",
    }
    repos: List[Dict[str, Any]] = []
    selection = "selected"
    url = f"{settings.GITHUB_API_URL.rstrip('/')}/installation/repositories"
    async with httpx.AsyncClient(timeout=20.0) as client:
        page = 1
        while page <= 5:
            resp = await client.get(url, headers=headers, params={"per_page": 100, "page": page})
            if resp.status_code == 401 or resp.status_code == 403:
                raise GitHubAppError("installation_forbidden", "Installation token rejected by GitHub.", status_code=resp.status_code)
            if resp.status_code != 200:
                raise GitHubAppError("repos_fetch_failed", f"Failed to list installation repositories ({resp.status_code}).")
            payload = resp.json()
            selection = payload.get("repository_selection") or selection
            items = payload.get("repositories") or []
            for r in items:
                repos.append(
                    {
                        "id": r.get("id"),
                        "name": r.get("name"),
                        "full_name": r.get("full_name"),
                        "owner": (r.get("owner") or {}).get("login", ""),
                        "html_url": r.get("html_url"),
                        "clone_url": r.get("clone_url"),
                        "default_branch": r.get("default_branch", "main"),
                        "description": r.get("description"),
                        "language": r.get("language"),
                        "is_private": bool(r.get("private", False)),
                        "updated_at": r.get("updated_at"),
                        "installation_id": installation_id,
                        "permissions": r.get("permissions"),
                    }
                )
            if len(items) < 100:
                break
            page += 1
    return selection, repos
