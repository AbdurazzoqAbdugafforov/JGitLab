from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.core.database import get_db
from app.models.project import Project
from app.models.agent import AgentTask
from app.models.memory import MemoryRecord
from app.models.provider import AIProviderConfiguration
from app.models.github import Repository
from app.models.activity import ActivityLog
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectDetailResponse
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    return result.scalars().all()

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    project = Project(
        name=project_in.name,
        description=project_in.description,
        git_repo_url=project_in.git_repo_url,
        default_branch=project_in.default_branch,
        tech_stack=project_in.tech_stack
    )
    db.add(project)
    await db.flush()

    # Log activity
    log = ActivityLog(
        project_id=project.id,
        user_id=current_user.id,
        action_type="project_created",
        entity_type="project",
        entity_id=project.id,
        description=f"Project '{project.name}' was created."
    )
    db.add(log)
    await db.commit()
    await db.refresh(project)
    return project

@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Aggregate counts
    task_res = await db.execute(select(func.count(AgentTask.id)).where(AgentTask.project_id == project_id))
    task_count = task_res.scalar_one() or 0

    mem_res = await db.execute(select(func.count(MemoryRecord.id)).where(MemoryRecord.project_id == project_id))
    mem_count = mem_res.scalar_one() or 0

    prov_res = await db.execute(select(AIProviderConfiguration.id).where(
        and_(AIProviderConfiguration.project_id == project_id, AIProviderConfiguration.is_active == True)
    ))
    has_provider = prov_res.scalar_one_or_none() is not None

    repo_res = await db.execute(select(Repository.id).where(Repository.project_id == project_id))
    has_repo = repo_res.scalar_one_or_none() is not None

    data = ProjectDetailResponse.model_validate(project)
    data.task_count = task_count
    data.memory_count = mem_count
    data.has_active_provider = has_provider
    data.has_connected_repo = has_repo
    return data

@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    update_in: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if update_in.name is not None:
        project.name = update_in.name
    if update_in.description is not None:
        project.description = update_in.description
    if update_in.git_repo_url is not None:
        project.git_repo_url = update_in.git_repo_url
    if update_in.default_branch is not None:
        project.default_branch = update_in.default_branch
    if update_in.tech_stack is not None:
        project.tech_stack = update_in.tech_stack
    if update_in.is_active is not None:
        project.is_active = update_in.is_active

    await db.commit()
    await db.refresh(project)
    return project

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(project)
    await db.commit()
    return {"message": "Project deleted successfully."}
