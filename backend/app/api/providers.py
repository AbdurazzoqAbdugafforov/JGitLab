from typing import List, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.security import encrypt_secret, decrypt_secret, mask_secret
from app.models.provider import AIProviderConfiguration
from app.models.activity import ActivityLog
from app.schemas.provider import (
    ProviderConfigCreate, ProviderConfigUpdate, ProviderConfigResponse,
    ProviderValidateRequest, ProviderValidateResponse
)
from app.services.ai.openai_provider import OpenAICompatibleProvider
from app.services.ai.base import AIProviderError
from app.api.deps import get_current_user, verify_project_access
from app.models.user import User

router = APIRouter(prefix="/providers", tags=["AI Providers"])

def _to_response(config: AIProviderConfiguration) -> ProviderConfigResponse:
    # Decrypt in memory only to mask
    raw_key = decrypt_secret(config.api_key_enc)
    masked = mask_secret(raw_key)

    return ProviderConfigResponse(
        id=config.id,
        project_id=config.project_id,
        provider_name=config.provider_name,
        base_url=config.base_url,
        api_key_masked=masked,
        model_name=config.model_name,
        embedding_model_name=config.embedding_model_name,
        temperature=config.temperature,
        max_output_tokens=config.max_output_tokens,
        timeout_seconds=config.timeout_seconds,
        max_retries=config.max_retries,
        is_active=config.is_active,
        validation_status=config.validation_status,
        validation_message=config.validation_message,
        last_validated_at=config.last_validated_at,
        created_at=config.created_at,
        updated_at=config.updated_at
    )

@router.get("", response_model=List[ProviderConfigResponse])
async def list_providers(
    project_id: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    if project_id:
        await verify_project_access(project_id, db, current_user)
    stmt = select(AIProviderConfiguration).where(AIProviderConfiguration.user_id == current_user.id)
    if project_id:
        stmt = stmt.where(AIProviderConfiguration.project_id == project_id)
    result = await db.execute(stmt.order_by(AIProviderConfiguration.created_at.desc()))
    configs = result.scalars().all()
    return [_to_response(c) for c in configs]

@router.post("", response_model=ProviderConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_provider(
    config_in: ProviderConfigCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    if config_in.project_id:
        await verify_project_access(config_in.project_id, db, current_user)
    encrypted_key = encrypt_secret(config_in.api_key)

    # Deactivate previous configs for this scope if setting active
    if config_in.project_id:
        prev = await db.execute(
            select(AIProviderConfiguration).where(
                and_(
                    AIProviderConfiguration.project_id == config_in.project_id,
                    AIProviderConfiguration.user_id == current_user.id
                )
            )
        )
        for p in prev.scalars().all():
            p.is_active = False

    config = AIProviderConfiguration(
        project_id=config_in.project_id,
        user_id=current_user.id,
        provider_name=config_in.provider_name,
        base_url=config_in.base_url,
        api_key_enc=encrypted_key,
        model_name=config_in.model_name,
        embedding_model_name=config_in.embedding_model_name,
        temperature=config_in.temperature,
        max_output_tokens=config_in.max_output_tokens,
        timeout_seconds=config_in.timeout_seconds,
        max_retries=config_in.max_retries,
        is_active=True,
        validation_status="untested"
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)

    # Log activity
    log = ActivityLog(
        project_id=config.project_id,
        user_id=current_user.id,
        action_type="provider_configured",
        entity_type="provider",
        entity_id=config.id,
        description=f"AI Provider '{config.provider_name}' configured for model '{config.model_name}'."
    )
    db.add(log)
    await db.commit()

    return _to_response(config)

@router.post("/validate", response_model=ProviderValidateResponse)
async def validate_provider(
    val_req: ProviderValidateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    # Resolve base_url, api_key, model_name
    base_url = val_req.base_url
    api_key = val_req.api_key
    model_name = val_req.model_name or "gpt-4o"
    config_obj: AIProviderConfiguration = None

    if val_req.config_id:
        result = await db.execute(
            select(AIProviderConfiguration).where(
                and_(
                    AIProviderConfiguration.id == val_req.config_id,
                    AIProviderConfiguration.user_id == current_user.id
                )
            )
        )
        config_obj = result.scalar_one_or_none()
        if config_obj:
            base_url = base_url or config_obj.base_url
            model_name = model_name or config_obj.model_name
            if not api_key:
                api_key = decrypt_secret(config_obj.api_key_enc)

    if not api_key or not base_url:
        raise HTTPException(status_code=400, detail="Missing API Key or Base URL for connection test.")

    provider = OpenAICompatibleProvider(
        api_key=api_key,
        base_url=base_url,
        model_name=model_name,
        timeout_seconds=15
    )

    try:
        val_result = await provider.validate_connection()
        if config_obj:
            config_obj.validation_status = "success"
            config_obj.validation_message = val_result.message
            config_obj.last_validated_at = datetime.now(timezone.utc)
            await db.commit()

        return ProviderValidateResponse(
            success=True,
            latency_ms=val_result.latency_ms,
            message=val_result.message,
            models_available=val_result.available_models
        )
    except AIProviderError as e:
        if config_obj:
            config_obj.validation_status = "error"
            config_obj.validation_message = e.message
            config_obj.last_validated_at = datetime.now(timezone.utc)
            await db.commit()
        return ProviderValidateResponse(
            success=False,
            latency_ms=0,
            message=f"Validation failed: {e.message}",
            models_available=[]
        )
    except Exception as e:
        if config_obj:
            config_obj.validation_status = "error"
            config_obj.validation_message = str(e)
            config_obj.last_validated_at = datetime.now(timezone.utc)
            await db.commit()
        return ProviderValidateResponse(
            success=False,
            latency_ms=0,
            message=f"Connection error: {str(e)}",
            models_available=[]
        )

@router.delete("/{config_id}")
async def delete_provider(
    config_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(
        select(AIProviderConfiguration).where(
            and_(
                AIProviderConfiguration.id == config_id,
                AIProviderConfiguration.user_id == current_user.id
            )
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Provider configuration not found")

    await db.delete(config)
    await db.commit()
    return {"message": "Provider configuration removed."}
