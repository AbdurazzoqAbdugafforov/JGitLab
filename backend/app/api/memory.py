from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.memory import MemoryRecord
from app.models.activity import ActivityLog
from app.schemas.memory import (
    MemoryRecordCreate, MemoryRecordResponse, MemorySearchQuery
)
from app.services.memory.service import EngineeringMemoryService
from app.services.ai.factory import get_ai_provider_for_project
from app.api.deps import get_current_user, verify_project_access
from app.models.user import User

router = APIRouter(prefix="/memory", tags=["Engineering Memory"])

@router.get("", response_model=List[MemoryRecordResponse])
async def list_memories(
    project_id: str,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    await verify_project_access(project_id, db, current_user)
    stmt = select(MemoryRecord).where(MemoryRecord.project_id == project_id)
    if category:
        stmt = stmt.where(MemoryRecord.category == category)
    result = await db.execute(stmt.order_by(MemoryRecord.created_at.desc()))
    return result.scalars().all()

@router.post("", response_model=MemoryRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_memory(
    mem_in: MemoryRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    await verify_project_access(mem_in.project_id, db, current_user)
    provider = None
    try:
        provider = await get_ai_provider_for_project(mem_in.project_id, current_user.id, db)
    except Exception:
        pass

    service = EngineeringMemoryService(db, provider)
    record = await service.add_memory(
        project_id=mem_in.project_id,
        category=mem_in.category,
        title=mem_in.title,
        content=mem_in.content,
        summary=mem_in.summary,
        tags=mem_in.tags,
        source_task_id=mem_in.source_task_id
    )

    act = ActivityLog(
        project_id=mem_in.project_id,
        user_id=current_user.id,
        action_type="memory_added",
        entity_type="memory",
        entity_id=record.id,
        description=f"Added [{record.category}] memory: '{record.title}'."
    )
    db.add(act)
    await db.commit()

    return record

@router.post("/search", response_model=List[MemoryRecordResponse])
async def search_memories(
    query_in: MemorySearchQuery,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    await verify_project_access(query_in.project_id, db, current_user)
    provider = None
    try:
        provider = await get_ai_provider_for_project(query_in.project_id, current_user.id, db)
    except Exception:
        pass

    service = EngineeringMemoryService(db, provider)
    records = await service.search_memories(
        project_id=query_in.project_id,
        query=query_in.query,
        category=query_in.category,
        limit=query_in.limit
    )
    return records

@router.get("/{memory_id}", response_model=MemoryRecordResponse)
async def get_memory(
    memory_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(select(MemoryRecord).where(MemoryRecord.id == memory_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Memory record not found")
    await verify_project_access(record.project_id, db, current_user)
    return record

@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(select(MemoryRecord).where(MemoryRecord.id == memory_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Memory record not found")
    await verify_project_access(record.project_id, db, current_user)

    await db.delete(record)
    await db.commit()
    return {"message": "Memory record deleted successfully."}
