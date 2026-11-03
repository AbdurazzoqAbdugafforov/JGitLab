import os
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.provider import AIProviderConfiguration
from app.core.security import decrypt_secret
from app.services.ai.base import AIProvider, AIAuthenticationError
from app.services.ai.openai_provider import OpenAICompatibleProvider

async def get_ai_provider_for_project(
    project_id: Optional[str],
    user_id: Optional[str],
    db: AsyncSession
) -> AIProvider:
    """
    Resolve and construct an AIProvider instance for a project or user.
    Decrypts API key in-memory only.
    """
    config: Optional[AIProviderConfiguration] = None

    # 1. Project-specific active provider
    if project_id:
        result = await db.execute(
            select(AIProviderConfiguration).where(
                and_(
                    AIProviderConfiguration.project_id == project_id,
                    AIProviderConfiguration.is_active == True
                )
            ).order_by(AIProviderConfiguration.created_at.desc())
        )
        config = result.scalar_one_or_none()

    # 2. User-level active provider fallback
    if not config and user_id:
        result = await db.execute(
            select(AIProviderConfiguration).where(
                and_(
                    AIProviderConfiguration.user_id == user_id,
                    AIProviderConfiguration.is_active == True
                )
            ).order_by(AIProviderConfiguration.created_at.desc())
        )
        config = result.scalar_one_or_none()

    # 3. If config found in database, decrypt and instantiate
    if config:
        decrypted_key = decrypt_secret(config.api_key_enc)
        return OpenAICompatibleProvider(
            api_key=decrypted_key,
            base_url=config.base_url,
            model_name=config.model_name,
            embedding_model_name=config.embedding_model_name,
            temperature=config.temperature,
            max_output_tokens=config.max_output_tokens,
            timeout_seconds=config.timeout_seconds,
            max_retries=config.max_retries
        )

    # 4. Check server environment variable fallback (e.g. OPENAI_API_KEY)
    env_key = os.getenv("OPENAI_API_KEY", "")
    if env_key:
        return OpenAICompatibleProvider(
            api_key=env_key,
            base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
            model_name=os.getenv("OPENAI_MODEL_NAME", "gpt-4o"),
            embedding_model_name=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
            temperature=0.2,
            max_output_tokens=4096
        )

    raise AIAuthenticationError(
        "No AI provider configured. Please configure an OpenAI-compatible API key and endpoint in Provider Settings."
    )
