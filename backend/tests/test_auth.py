import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_and_login_flow(client: AsyncClient):
    # 1. Register
    reg_payload = {
        "email": "newdev@jgitlab.io",
        "password": "SecurePassword2026!",
        "full_name": "New Developer"
    }
    reg_resp = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 200, reg_resp.text
    data = reg_resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "newdev@jgitlab.io"
    assert data["user"]["full_name"] == "New Developer"

    # 2. Login with correct password
    login_payload = {
        "email": "newdev@jgitlab.io",
        "password": "SecurePassword2026!"
    }
    login_resp = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # 3. Verify /me endpoint
    me_resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "newdev@jgitlab.io"

    # 4. Login with incorrect password
    bad_login = await client.post("/api/v1/auth/login", json={"email": "newdev@jgitlab.io", "password": "WrongPassword!"})
    assert bad_login.status_code == 401
