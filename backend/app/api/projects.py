from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    ensure_personal_workspace,
    get_accessible_project_ids,
    get_current_user,
    get_user_org_ids,
    verify_project_access,
)
from app.core.database import get_db
from app.models.activity import ActivityLog
from app.models.agent import AgentTask
from app.models.github import Repository
from app.models.memory import MemoryRecord
from app.models.project import Project
from app.models.provider import AIProviderConfiguration
from app.models.user import Organization, OrganizationMember, User
from app.schemas.project import (
    ProjectCreate,
    ProjectDetailResponse,
    ProjectResponse,
    ProjectUpdate,
)

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("/workspaces")
async def list_workspaces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    await ensure_personal_workspace(db, current_user)
    await db.commit()
    res = await db.execute(
        select(Organization, OrganizationMember.role)
        .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
        .where(OrganizationMember.user_id == current_user.id)
        .order_by(Organization.is_personal.desc(), Organization.created_at.asc())
    )
    items = []
    for org, role in res.all():
        items.append(
            {
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "description": org.description,
                "is_personal": org.is_personal,
                "role": role,
            }
        )
    return items


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    organization_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    await ensure_personal_workspace(db, current_user)
    await db.commit()
    accessible_ids = await get_accessible_project_ids(db, current_user)
    if not accessible_ids:
        return []
    stmt = select(Project).where(Project.id.in_(accessible_ids))
    if organization_id:
        stmt = stmt.where(Project.organization_id == organization_id)
    result = await db.execute(stmt.order_by(Project.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    personal_org = await ensure_personal_workspace(db, current_user)
    org_ids = await get_user_org_ids(db, current_user)
    target_org_id = personal_org.id
    if getattr(project_in, "organization_id", None) and project_in.organization_id in org_ids:
        target_org_id = project_in.organization_id

    project = Project(
        organization_id=target_org_id,
        created_by_id=current_user.id,
        name=project_in.name,
        description=project_in.description,
        git_repo_url=project_in.git_repo_url,
        default_branch=project_in.default_branch,
        tech_stack=project_in.tech_stack,
    )
    db.add(project)
    await db.flush()

    db.add(
        ActivityLog(
            project_id=project.id,
            user_id=current_user.id,
            action_type="project_created",
            entity_type="project",
            entity_id=project.id,
            description=f"Project '{project.name}' was created.",
        )
    )
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    project = await verify_project_access(project_id, db, current_user)

    task_res = await db.execute(select(func.count(AgentTask.id)).where(AgentTask.project_id == project_id))
    task_count = task_res.scalar_one() or 0

    mem_res = await db.execute(select(func.count(MemoryRecord.id)).where(MemoryRecord.project_id == project_id))
    mem_count = mem_res.scalar_one() or 0

    prov_res = await db.execute(
        select(AIProviderConfiguration.id).where(
            and_(
                AIProviderConfiguration.project_id == project_id,
                AIProviderConfiguration.is_active == True,
            )
        )
    )
    has_provider = prov_res.scalar_one_or_none() is not None
    if not has_provider:
        user_prov = await db.execute(
            select(AIProviderConfiguration.id).where(
                and_(
                    AIProviderConfiguration.user_id == current_user.id,
                    AIProviderConfiguration.is_active == True,
                )
            )
        )
        has_provider = user_prov.scalar_one_or_none() is not None

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
    current_user: User = Depends(get_current_user),
) -> Any:
    project = await verify_project_access(project_id, db, current_user)

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
    current_user: User = Depends(get_current_user),
) -> Any:
    project = await verify_project_access(project_id, db, current_user)
    await db.delete(project)
    await db.commit()
    return {"message": "Project deleted successfully."}
