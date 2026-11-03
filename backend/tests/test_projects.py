import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_project_crud_and_activity(client: AsyncClient, auth_headers: dict):
    # 1. Create project
    proj_in = {
        "name": "Cloud Native Orchestrator",
        "description": "Multi-cluster agent platform",
        "tech_stack": ["Go", "Kubernetes", "Next.js"],
        "default_branch": "main"
    }
    create_resp = await client.post("/api/v1/projects", json=proj_in, headers=auth_headers)
    assert create_resp.status_code == 201, create_resp.text
    project = create_resp.json()
    project_id = project["id"]
    assert project["name"] == "Cloud Native Orchestrator"

    # 2. Get project details
    detail_resp = await client.get(f"/api/v1/projects/{project_id}", headers=auth_headers)
    assert detail_resp.status_code == 200
    data = detail_resp.json()
    assert data["name"] == "Cloud Native Orchestrator"
    assert "task_count" in data
    assert "memory_count" in data

    # 3. Check activity log
    act_resp = await client.get(f"/api/v1/activity/logs?project_id={project_id}", headers=auth_headers)
    assert act_resp.status_code == 200
    logs = act_resp.json()
    assert len(logs) >= 1
    assert any(l["action_type"] == "project_created" for l in logs)
