import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_memory_creation_and_search(client: AsyncClient, auth_headers: dict, test_project):
    # 1. Add Architecture Memory
    mem_payload = {
        "project_id": test_project.id,
        "category": "architecture",
        "title": "Authentication Token Architecture",
        "content": "JGitLab uses HttpOnly JWT cookies and Bearer tokens for authentication.",
        "summary": "HttpOnly JWT authentication scheme.",
        "tags": ["auth", "security", "jwt"]
    }
    create_resp = await client.post("/api/v1/memory", json=mem_payload, headers=auth_headers)
    assert create_resp.status_code == 201, create_resp.text
    mem_data = create_resp.json()
    assert mem_data["category"] == "architecture"

    # 2. Add ADR
    adr_payload = {
        "project_id": test_project.id,
        "category": "adr",
        "title": "ADR-003: Postgres pgvector Storage",
        "content": "Use pgvector for high dimensional semantic embedding search with cosine distance.",
        "summary": "pgvector adoption decision.",
        "tags": ["adr", "database", "embeddings"]
    }
    await client.post("/api/v1/memory", json=adr_payload, headers=auth_headers)

    # 3. Search memories
    search_payload = {
        "project_id": test_project.id,
        "query": "authentication security",
        "limit": 5
    }
    search_resp = await client.post("/api/v1/memory/search", json=search_payload, headers=auth_headers)
    assert search_resp.status_code == 200
    results = search_resp.json()
    assert len(results) >= 1
    assert any("Authentication" in r["title"] for r in results)
