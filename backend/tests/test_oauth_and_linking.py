import pytest
from httpx import AsyncClient
from app.core.config import settings
from app.services.auth.oauth import FLOW_COOKIE, OAuthError, ProviderIdentity, decode_flow


@pytest.mark.asyncio
async def test_google_oauth_registration_and_returning_login(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(settings, "AUTH_GOOGLE_ID", "test-google-client-id")
    monkeypatch.setattr(settings, "AUTH_GOOGLE_SECRET", "test-google-client-secret")

    # 1. Start Google OAuth flow
    start_resp = await client.get(
        "/api/v1/auth/oauth/google/start?next=/dashboard",
        follow_redirects=False,
    )
    assert start_resp.status_code == 302
    redirect_loc = start_resp.headers["location"]
    assert "accounts.google.com/o/oauth2/v2/auth" in redirect_loc
    flow_cookie = start_resp.cookies.get(FLOW_COOKIE)
    assert flow_cookie is not None
    flow_data = decode_flow(flow_cookie)
    assert flow_data is not None
    state = flow_data["s"]

    # 2. Mock token exchange returning a verified Google identity
    async def mock_exchange(provider, code, flow):
        assert provider == "google"
        assert code == "valid-google-code"
        return ProviderIdentity(
            provider="google",
            subject="google-sub-1001",
            email="ada@jgitlab.io",
            email_verified=True,
            username="ada",
            display_name="Ada Lovelace",
            avatar_url="https://lh3.googleusercontent.com/a/ada",
        )

    monkeypatch.setattr("app.api.auth.exchange_code_for_identity", mock_exchange)

    # 3. Complete callback -> creates new user and session cookie
    client.cookies.set(FLOW_COOKIE, flow_cookie)
    cb_resp = await client.get(
        f"/api/v1/auth/oauth/google/callback?code=valid-google-code&state={state}",
        follow_redirects=False,
    )
    assert cb_resp.status_code == 302
    assert "/onboarding" in cb_resp.headers["location"]
    session_cookie = cb_resp.cookies.get(settings.SESSION_COOKIE_NAME)
    assert session_cookie is not None

    # 4. Verify authenticated /me via session cookie
    client.cookies.set(settings.SESSION_COOKIE_NAME, session_cookie)
    me_resp = await client.get("/api/v1/auth/me")
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "ada@jgitlab.io"
    assert me_data["email_verified"] is True
    assert me_data["has_password"] is False
    assert len(me_data["identities"]) == 1
    assert me_data["identities"][0]["provider"] == "google"
    assert me_data["identities"][0]["provider_subject"] == "google-sub-1001"
    user_id = me_data["id"]

    # 5. Returning login with the same Google identity logs into the same user
    client.cookies.clear()
    start_resp_2 = await client.get("/api/v1/auth/oauth/google/start?next=/projects", follow_redirects=False)
    flow_cookie_2 = start_resp_2.cookies.get(FLOW_COOKIE)
    state_2 = decode_flow(flow_cookie_2)["s"]

    client.cookies.set(FLOW_COOKIE, flow_cookie_2)
    cb_resp_2 = await client.get(
        f"/api/v1/auth/oauth/google/callback?code=valid-google-code&state={state_2}",
        follow_redirects=False,
    )
    assert cb_resp_2.status_code == 302
    assert cb_resp_2.headers["location"].endswith("/projects")
    session_cookie_2 = cb_resp_2.cookies.get(settings.SESSION_COOKIE_NAME)

    client.cookies.set(settings.SESSION_COOKIE_NAME, session_cookie_2)
    me_resp_2 = await client.get("/api/v1/auth/me")
    assert me_resp_2.json()["id"] == user_id


@pytest.mark.asyncio
async def test_oauth_csrf_state_and_error_handling(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(settings, "AUTH_GITHUB_ID", "test-gh-id")
    monkeypatch.setattr(settings, "AUTH_GITHUB_SECRET", "test-gh-secret")

    # 1. Invalid state parameter rejected
    start_resp = await client.get("/api/v1/auth/oauth/github/start", follow_redirects=False)
    flow_cookie = start_resp.cookies.get(FLOW_COOKIE)

    client.cookies.set(FLOW_COOKIE, flow_cookie)
    bad_state_resp = await client.get(
        "/api/v1/auth/oauth/github/callback?code=abc&state=tampered-state",
        follow_redirects=False,
    )
    assert bad_state_resp.status_code == 302
    assert "auth_error=state_mismatch" in bad_state_resp.headers["location"]

    # 2. User denied authorization at provider
    client.cookies.set(FLOW_COOKIE, flow_cookie)
    denied_resp = await client.get(
        "/api/v1/auth/oauth/github/callback?error=access_denied",
        follow_redirects=False,
    )
    assert denied_resp.status_code == 302
    assert "auth_error=access_denied" in denied_resp.headers["location"]

    # 3. Unverified email rejected
    state = decode_flow(flow_cookie)["s"]

    async def mock_unverified(provider, code, flow):
        raise OAuthError("email_unverified", "Email is not verified.")

    monkeypatch.setattr("app.api.auth.exchange_code_for_identity", mock_unverified)
    client.cookies.set(FLOW_COOKIE, flow_cookie)
    unverified_resp = await client.get(
        f"/api/v1/auth/oauth/github/callback?code=abc&state={state}",
        follow_redirects=False,
    )
    assert unverified_resp.status_code == 302
    assert "auth_error=email_unverified" in unverified_resp.headers["location"]


@pytest.mark.asyncio
async def test_account_linking_and_unlink_lockout_protection(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(settings, "AUTH_GOOGLE_ID", "test-google-id")
    monkeypatch.setattr(settings, "AUTH_GOOGLE_SECRET", "test-google-secret")
    monkeypatch.setattr(settings, "AUTH_GITHUB_ID", "test-gh-id")
    monkeypatch.setattr(settings, "AUTH_GITHUB_SECRET", "test-gh-secret")

    # 1. Create user via Google OAuth
    start_g = await client.get("/api/v1/auth/oauth/google/start", follow_redirects=False)
    fc_g = start_g.cookies.get(FLOW_COOKIE)
    state_g = decode_flow(fc_g)["s"]

    async def mock_google_exchange(provider, code, flow):
        return ProviderIdentity(
            provider="google",
            subject="g-link-sub-1",
            email="linus@jgitlab.io",
            email_verified=True,
            username="torvalds",
            display_name="Linus Torvalds",
            avatar_url=None,
        )

    monkeypatch.setattr("app.api.auth.exchange_code_for_identity", mock_google_exchange)
    client.cookies.set(FLOW_COOKIE, fc_g)
    cb_g = await client.get(
        f"/api/v1/auth/oauth/google/callback?code=g1&state={state_g}",
        follow_redirects=False,
    )
    session_token = cb_g.cookies.get(settings.SESSION_COOKIE_NAME)
    auth_headers = {"Authorization": f"Bearer {session_token}"}

    # 2. Prevent unlinking when Google is the user's ONLY authentication method (no password, no other OAuth)
    unlink_sole = await client.delete("/api/v1/auth/identities/google", headers=auth_headers)
    assert unlink_sole.status_code == 400
    assert "only sign-in method" in unlink_sole.json()["detail"]

    # 3. Link GitHub account to the same authenticated user
    start_gh = await client.get(
        "/api/v1/auth/oauth/github/start?intent=link&next=/settings/account",
        headers=auth_headers,
        follow_redirects=False,
    )
    fc_gh = start_gh.cookies.get(FLOW_COOKIE)
    flow_gh = decode_flow(fc_gh)
    assert flow_gh["i"] == "link"
    state_gh = flow_gh["s"]

    async def mock_github_exchange(provider, code, flow):
        return ProviderIdentity(
            provider="github",
            subject="gh-link-sub-99",
            email="linus@jgitlab.io",
            email_verified=True,
            username="torvalds-gh",
            display_name="Linus Torvalds",
            avatar_url="https://avatars.githubusercontent.com/u/99",
        )

    monkeypatch.setattr("app.api.auth.exchange_code_for_identity", mock_github_exchange)
    client.cookies.set(FLOW_COOKIE, fc_gh)
    client.cookies.set(settings.SESSION_COOKIE_NAME, session_token)
    cb_gh = await client.get(
        f"/api/v1/auth/oauth/github/callback?code=gh1&state={state_gh}",
        follow_redirects=False,
    )
    assert cb_gh.status_code == 302
    assert "linked=github" in cb_gh.headers["location"]

    # 4. Verify both Google and GitHub identities are attached to the same user
    identities_resp = await client.get("/api/v1/auth/identities", headers=auth_headers)
    assert identities_resp.status_code == 200
    providers = {i["provider"] for i in identities_resp.json()}
    assert providers == {"google", "github"}

    # 5. Unlinking Google now succeeds because GitHub remains linked
    unlink_ok = await client.delete("/api/v1/auth/identities/google", headers=auth_headers)
    assert unlink_ok.status_code == 200
    assert "unlinked" in unlink_ok.json()["message"].lower()


@pytest.mark.asyncio
async def test_no_silent_auto_linking_on_unauthenticated_matching_email(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(settings, "AUTH_GITHUB_ID", "test-gh-id")
    monkeypatch.setattr(settings, "AUTH_GITHUB_SECRET", "test-gh-secret")

    # 1. Register user via email/password
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "existing@jgitlab.io",
            "password": "Password1234!",
            "full_name": "Existing User",
        },
    )
    assert reg.status_code == 200

    # 2. Attempt unauthenticated OAuth login with a new GitHub identity sharing the same email
    client.cookies.clear()
    start_gh = await client.get("/api/v1/auth/oauth/github/start", follow_redirects=False)
    fc_gh = start_gh.cookies.get(FLOW_COOKIE)
    state_gh = decode_flow(fc_gh)["s"]

    async def mock_github_same_email(provider, code, flow):
        return ProviderIdentity(
            provider="github",
            subject="gh-new-subject-777",
            email="existing@jgitlab.io",
            email_verified=True,
            username="existing-gh",
            display_name="Existing User",
            avatar_url=None,
        )

    monkeypatch.setattr("app.api.auth.exchange_code_for_identity", mock_github_same_email)
    client.cookies.set(FLOW_COOKIE, fc_gh)
    cb_gh = await client.get(
        f"/api/v1/auth/oauth/github/callback?code=gh2&state={state_gh}",
        follow_redirects=False,
    )
    assert cb_gh.status_code == 302
    assert "auth_error=account_exists" in cb_gh.headers["location"]


@pytest.mark.asyncio
async def test_session_management_and_logout_revocation(client: AsyncClient):
    # 1. Register & login from two sessions
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "sessions@jgitlab.io", "password": "SessionPass2026!", "full_name": "Session Tester"},
    )
    token1 = reg.json()["access_token"]

    login2 = await client.post(
        "/api/v1/auth/login",
        json={"email": "sessions@jgitlab.io", "password": "SessionPass2026!"},
    )
    token2 = login2.json()["access_token"]
    client.cookies.clear()

    # 2. List active sessions
    sessions_resp = await client.get(
        "/api/v1/auth/sessions",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert sessions_resp.status_code == 200
    assert len(sessions_resp.json()) == 2

    # 3. Revoke other sessions from token1
    revoke_others = await client.post(
        "/api/v1/auth/sessions/revoke-others",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert revoke_others.status_code == 200

    # 4. Verify token2 is now unauthorized (401) while token1 remains valid
    me2 = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token2}"})
    assert me2.status_code == 401

    me1 = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token1}"})
    assert me1.status_code == 200

    # 5. Logout revokes token1
    logout = await client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token1}"})
    assert logout.status_code == 200

    me1_after = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token1}"})
    assert me1_after.status_code == 401
