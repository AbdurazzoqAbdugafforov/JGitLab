import pytest
from httpx import AsyncClient
from app.core.security import encrypt_secret, decrypt_secret, mask_secret
from app.services.ai.openai_provider import OpenAICompatibleProvider
from app.services.ai.base import AIAuthenticationError, AIRateLimitError

def test_secret_encryption_and_masking():
    raw_key = "sk-proj-1234567890abcdefghijklmnopqrstuvwxyz"
    encrypted = encrypt_secret(raw_key)
    assert encrypted != raw_key
    decrypted = decrypt_secret(encrypted)
    assert decrypted == raw_key

    masked = mask_secret(raw_key)
    assert "..." in masked
    assert not masked.startswith("sk-proj-1234567890abcdef")
    assert masked.endswith("wxyz")
    assert raw_key not in masked

def test_openai_provider_error_handling():
    provider = OpenAICompatibleProvider(api_key="invalid_test_key", base_url="https://api.openai.com/v1")
    
    with pytest.raises(AIAuthenticationError):
        provider._handle_error_response(401, '{"error": {"message": "Incorrect API key provided"}}')

    with pytest.raises(AIRateLimitError):
        provider._handle_error_response(429, '{"error": {"message": "Rate limit reached for requests"}}')

@pytest.mark.asyncio
async def test_provider_configuration_endpoint(client: AsyncClient, auth_headers: dict, test_project):
    payload = {
        "project_id": test_project.id,
        "provider_name": "openai-compatible",
        "base_url": "https://api.openai.com/v1",
        "api_key": "sk-test-secret-key-1234567890",
        "model_name": "gpt-4o",
        "temperature": 0.2
    }
    resp = await client.post("/api/v1/providers", json=payload, headers=auth_headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert "api_key" not in data  # Never raw key
    assert "api_key_masked" in data
    assert "..." in data["api_key_masked"]

    # List configs
    list_resp = await client.get(f"/api/v1/providers?project_id={test_project.id}", headers=auth_headers)
    assert list_resp.status_code == 200
    configs = list_resp.json()
    assert len(configs) >= 1
