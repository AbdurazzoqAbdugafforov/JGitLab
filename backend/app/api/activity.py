from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.models.activity import ActivityLog, Notification
from app.schemas.activity import ActivityLogResponse, NotificationResponse
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/activity", tags=["Activity & Notifications"])

@router.get("/logs", response_model=List[ActivityLogResponse])
async def list_activity_logs(
    project_id: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    stmt = select(ActivityLog)
    if project_id:
        stmt = stmt.where(ActivityLog.project_id == project_id)
    stmt = stmt.order_by(ActivityLog.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/notifications", response_model=List[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    stmt = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)
    stmt = stmt.order_by(Notification.created_at.desc()).limit(30)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(
        select(Notification).where(
            and_(Notification.id == notification_id, Notification.user_id == current_user.id)
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    await db.commit()
    return {"message": "Notification marked as read."}
