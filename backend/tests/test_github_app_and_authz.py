import pytest
from httpx import AsyncClient
from app.core.config import settings
from app.services.github.app_service import GitHubAppError, encode_install_state


MOCK_REPOS_SELECTED = [
    {
        "id": 9001,
        "name": "platform-core",
        "full_name": "acme-org/platform-core",
        "owner": "acme-org",
        "is_private": True,
        "default_branch": "main",
        "html_url": "https://github.com/acme-org/platform-core",
        "clone_url": "https://github.com/acme-org/platform-core.git",
        "description": "Core autonomous engineering service",
        "language": "Python",
        "updated_at": "2026-11-01T10:00:00Z",
    },
    {
        "id": 9002,
        "name": "web-console",
        "full_name": "acme-org/web-console",
        "owner": "acme-org",
        "is_private": False,
        "default_branch": "main",
        "html_url": "https://github.com/acme-org/web-console",
        "clone_url": "https://github.com/acme-org/web-console.git",
        "description": "Developer UI console",
        "language": "TypeScript",
        "updated_at": "2026-11-02T12:00:00Z",
    },
]


@pytest.mark.asyncio
async def test_github_app_install_all_and_selected_repos_and_scope_enforcement(
    client: AsyncClient, auth_headers: dict, test_user, test_project, monkeypatch
):
    monkeypatch.setattr(settings, "GITHUB_APP_NAME", "jgitlab-ai-engineer")
    monkeypatch.setattr(settings, "GITHUB_APP_ID", "123456")
    monkeypatch.setattr(settings, "GITHUB_APP_PRIVATE_KEY", "test-key")

    # 1. Request GitHub App installation URL
    install_url_resp = await client.post(
        "/api/v1/github/app/install-url?next_path=/github",
        headers=auth_headers,
    )
    assert install_url_resp.status_code == 200
    install_data = install_url_resp.json()
    assert "github.com/apps/jgitlab-ai-engineer/installations/new" in install_data["install_url"]
    state = install_data["state"]

    # 2. Mock GitHub App metadata & repository list for Option B (Selected Repositories)
    async def mock_fetch_meta(installation_id: int):
        assert installation_id == 55001
        return {
            "id": 55001,
            "account": {
                "login": "acme-org",
                "id": 77,
                "type": "Organization",
                "avatar_url": "https://avatars.githubusercontent.com/u/77",
            },
            "repository_selection": "selected",
            "permissions": {
                "metadata": "read",
                "contents": "write",
                "pull_requests": "write",
                "checks": "read",
            },
            "events": ["push", "pull_request"],
            "suspended_at": None,
        }

    async def mock_list_repos(installation_id: int):
        assert installation_id == 55001
        return ("selected", MOCK_REPOS_SELECTED)

    async def mock_mint_token(installation_id: int):
        return "ghs_mock_installation_token_55001"

    monkeypatch.setattr("app.api.github.fetch_installation_metadata", mock_fetch_meta)
    monkeypatch.setattr("app.api.github.list_installation_repositories", mock_list_repos)
    monkeypatch.setattr("app.api.github.mint_installation_token", mock_mint_token)

    # 3. Complete GitHub App callback
    cb_resp = await client.get(
        f"/api/v1/github/app/callback?installation_id=55001&setup_action=install&state={state}",
        follow_redirects=False,
    )
    assert cb_resp.status_code == 302
    assert "install_status=active" in cb_resp.headers["location"]

    # 4. Check GitHub status endpoint shows active installation with "selected" repository access
    status_resp = await client.get("/api/v1/github/status", headers=auth_headers)
    assert status_resp.status_code == 200
    st = status_resp.json()
    assert st["is_connected"] is True
    assert st["connection_mode"] == "github_app"
    assert len(st["installations"]) == 1
    assert st["installations"][0]["repository_selection"] == "selected"
    assert st["installations"][0]["repository_count"] == 2
    assert st["installations"][0]["account_login"] == "acme-org"

    # 5. List repositories & filter by search query
    repos_resp = await client.get("/api/v1/github/repos?q=platform-core", headers=auth_headers)
    assert repos_resp.status_code == 200
    repos = repos_resp.json()
    assert len(repos) == 1
    assert repos[0]["full_name"] == "acme-org/platform-core"

    # 6. Attempt to connect a repository OUTSIDE the selected installation scope -> must fail with 403
    unauth_select = await client.post(
        "/api/v1/github/select-repo",
        headers=auth_headers,
        json={
            "project_id": test_project.id,
            "full_name": "acme-org/secret-unselected-repo",
            "installation_id": 55001,
        },
    )
    assert unauth_select.status_code == 403
    assert "not authorized" in unauth_select.json()["detail"].lower()

    # 7. Connect an authorized repository within the selected installation scope -> succeeds
    async def mock_repo_details(self, full_name: str):
        return {
            "id": 9001,
            "full_name": full_name,
            "default_branch": "main",
            "clone_url": f"https://github.com/{full_name}.git",
            "html_url": f"https://github.com/{full_name}",
        }

    async def mock_repo_tree(self, full_name: str, branch: str = "main"):
        return [
            {"path": "pyproject.toml", "type": "blob"},
            {"path": "app/main.py", "type": "blob"},
        ]

    async def mock_file_content(self, full_name: str, path: str, branch: str = "main"):
        if path == "pyproject.toml":
            return '[project]\nname = "platform-core"\ndependencies = ["fastapi"]\n'
        return None

    monkeypatch.setattr("app.services.github.client.GitHubClient.get_repo_details", mock_repo_details)
    monkeypatch.setattr("app.services.github.client.GitHubClient.get_repo_tree", mock_repo_tree)
    monkeypatch.setattr("app.services.github.client.GitHubClient.get_file_content", mock_file_content)

    auth_select = await client.post(
        "/api/v1/github/select-repo",
        headers=auth_headers,
        json={
            "project_id": test_project.id,
            "full_name": "acme-org/platform-core",
            "installation_id": 55001,
        },
    )
    assert auth_select.status_code == 200
    assert auth_select.json()["full_name"] == "acme-org/platform-core"


@pytest.mark.asyncio
async def test_github_app_pending_org_approval_and_revocation_sync(
    client: AsyncClient, auth_headers: dict, test_user, monkeypatch
):
    monkeypatch.setattr(settings, "GITHUB_APP_NAME", "jgitlab-ai-engineer")
    monkeypatch.setattr(settings, "GITHUB_APP_ID", "123456")
    monkeypatch.setattr(settings, "GITHUB_APP_PRIVATE_KEY", "test-key")
    state = encode_install_state(test_user.id, "/github")

    # 1. Organization approval requested (setup_action=request without installation_id)
    req_cb = await client.get(
        f"/api/v1/github/app/callback?setup_action=request&state={state}",
        follow_redirects=False,
    )
    assert req_cb.status_code == 302
    assert "install_status=pending_approval" in req_cb.headers["location"]

    status_resp = await client.get("/api/v1/github/status", headers=auth_headers)
    installations = status_resp.json()["installations"]
    assert any(i["status"] == "pending_approval" for i in installations)

    # 2. Install Option A (All Repositories) and then simulate revocation on GitHub
    async def mock_fetch_all(installation_id: int):
        return {
            "id": installation_id,
            "account": {"login": "dev-user", "id": 88, "type": "User", "avatar_url": None},
            "repository_selection": "all",
            "permissions": {"metadata": "read", "contents": "write", "pull_requests": "write"},
            "events": [],
            "suspended_at": None,
        }

    async def mock_list_all(installation_id: int):
        return ("all", MOCK_REPOS_SELECTED)

    monkeypatch.setattr("app.api.github.fetch_installation_metadata", mock_fetch_all)
    monkeypatch.setattr("app.api.github.list_installation_repositories", mock_list_all)

    cb_all = await client.get(
        f"/api/v1/github/app/callback?installation_id=66001&setup_action=install&state={state}",
        follow_redirects=False,
    )
    assert cb_all.status_code == 302

    st2 = await client.get("/api/v1/github/status", headers=auth_headers)
    active_inst = next(i for i in st2.json()["installations"] if i["installation_id"] == 66001)
    assert active_inst["repository_selection"] == "all"
    assert active_inst["status"] == "active"

    # 3. Simulate user revoking the installation on GitHub -> sync detects 404 / installation_revoked
    async def mock_fetch_revoked(installation_id: int):
        raise GitHubAppError(
            "installation_revoked",
            "GitHub App installation was uninstalled or revoked on GitHub.",
            404,
        )

    monkeypatch.setattr("app.api.github.fetch_installation_metadata", mock_fetch_revoked)

    sync_resp = await client.post(
        f"/api/v1/github/app/installations/{active_inst['id']}/sync",
        headers=auth_headers,
    )
    assert sync_resp.status_code == 200
    assert sync_resp.json()["status"] == "revoked"


@pytest.mark.asyncio
async def test_project_level_authorization_isolation(
    client: AsyncClient, auth_headers: dict, test_project
):
    # Register a second independent user (User B)
    reg_b = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "userb@jgitlab.io",
            "password": "UserBPass2026!",
            "full_name": "Isolated Engineer B",
        },
    )
    assert reg_b.status_code == 200
    headers_b = {"Authorization": f"Bearer {reg_b.json()['access_token']}"}
    client.cookies.clear()

    # User B cannot view User A's project in list
    list_b = await client.get("/api/v1/projects", headers=headers_b)
    assert list_b.status_code == 200
    assert all(p["id"] != test_project.id for p in list_b.json())

    # User B receives 404 when attempting direct access to User A's project, tasks, memories, or repo analysis
    get_proj_b = await client.get(f"/api/v1/projects/{test_project.id}", headers=headers_b)
    assert get_proj_b.status_code == 404

    tasks_b = await client.get(f"/api/v1/agent/tasks?project_id={test_project.id}", headers=headers_b)
    assert tasks_b.status_code == 404

    mem_b = await client.get(f"/api/v1/memory?project_id={test_project.id}", headers=headers_b)
    assert mem_b.status_code == 404

    repo_b = await client.get(f"/api/v1/github/analysis/{test_project.id}", headers=headers_b)
    assert repo_b.status_code == 404
