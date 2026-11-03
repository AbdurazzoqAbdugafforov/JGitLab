import re
import secrets
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.sessions import resolve_session
from app.models.github import Repository
from app.models.memory import MemoryRecord
from app.models.project import Project
from app.models.user import Organization, OrganizationMember, Session, User

security_bearer = HTTPBearer(auto_error=False)


def _unauthorized(detail: str = "Authentication required", code: str = "unauthenticated") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"message": detail, "code": code},
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_session(
    request: Request,
    token_auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> Session:
    """Resolve the server-side session from the HttpOnly cookie (browser) or an
    `Authorization: Bearer <session token>` header (API clients / tests).
    User identity is never taken from client-supplied IDs."""
    raw = None
    if token_auth and token_auth.credentials:
        raw = token_auth.credentials
    elif settings.SESSION_COOKIE_NAME in request.cookies:
        raw = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not raw:
        raise _unauthorized()

    sess = await resolve_session(db, raw)
    if not sess:
        raise _unauthorized("Your session has expired. Please sign in again.", "session_expired")
    request.state.session = sess
    return sess


async def get_current_user(
    sess: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> User:
    result = await db.execute(select(User).where(User.id == sess.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise _unauthorized("Account not found", "session_expired")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been deactivated.")
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user


def require_role(required_role: str):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.is_superuser:
            return current_user
        if current_user.role != required_role and current_user.role != "admin":
            raise HTTPException(status_code=403, detail=f"Permission denied: {required_role} role required")
        return current_user
    return role_checker


# ---------------------------------------------------------------------------
# Workspaces (organizations) and project authorization
# ---------------------------------------------------------------------------

def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:40] or "workspace"


async def _ensure_starter_project_for_org(db: AsyncSession, org: Organization, user: User) -> None:
    """Ensure every workspace has at least one starter project with repository analysis and memory."""
    count_res = await db.execute(
        select(func.count(Project.id)).where(Project.organization_id == org.id)
    )
    if (count_res.scalar_one() or 0) > 0:
        return

    project = Project(
        organization_id=org.id,
        created_by_id=user.id,
        name="JGitLab Engineering Core",
        description="Autonomous AI Software Engineering workspace with sandbox execution and persistent memory.",
        git_repo_url="https://github.com/jgitlab/ai-engineering-core",
        default_branch="main",
        tech_stack=["Python", "FastAPI", "Next.js", "TypeScript", "Tailwind CSS", "PostgreSQL"],
    )
    db.add(project)
    await db.flush()

    repo = Repository(
        project_id=project.id,
        full_name="jgitlab/ai-engineering-core",
        owner="jgitlab",
        repo_name="ai-engineering-core",
        clone_url="https://github.com/jgitlab/ai-engineering-core.git",
        default_branch="main",
        languages={"Python": 52.4, "TypeScript (React)": 36.8, "TypeScript": 7.6, "CSS": 3.2},
        frameworks=["FastAPI", "Next.js", "React", "Tailwind CSS"],
        dependencies={
            "python": ["fastapi", "uvicorn", "sqlalchemy", "pydantic", "alembic", "httpx", "cryptography", "pyjwt"],
            "npm": ["next", "react", "react-dom", "lucide-react", "tailwindcss", "typescript"],
        },
        file_tree_summary={
            "directories": [
                "backend/app/api",
                "backend/app/core",
                "backend/app/models",
                "backend/app/services/agent",
                "backend/app/services/ai",
                "backend/app/services/github",
                "backend/app/services/sandbox",
                "frontend/src/app",
                "frontend/src/components",
                "frontend/src/lib",
            ],
            "important_files": [
                "README.md",
                "docker-compose.yml",
                "backend/requirements.txt",
                "backend/app/main.py",
                "frontend/package.json",
            ],
        },
        analysis_summary={
            "primary_language": "Python",
            "framework_count": 4,
            "dependency_count": 14,
            "is_monorepo": True,
        },
        last_analyzed_at=datetime.now(timezone.utc),
    )
    db.add(repo)

    mem = MemoryRecord(
        project_id=project.id,
        category="architecture",
        title="Core Platform Three-Pillar Architecture",
        content=(
            "JGitLab is architected around three pillars:\n"
            "1. Autonomous AI Software Engineer: plan-approve-execute-verify loop in an isolated sandbox.\n"
            "2. Persistent Engineering Memory: ADRs, stack decisions, and task lessons injected into planning prompts.\n"
            "3. AI Model Factory: provider-independent gateway ready for future proprietary models."
        ),
        summary="Three-pillar architecture: Autonomous AI Engineer, Persistent Memory, and AI Model Factory.",
        tags=["architecture", "pillars", "sandbox"],
    )
    db.add(mem)
    await db.flush()


async def ensure_personal_workspace(db: AsyncSession, user: User) -> Organization:
    """Every user owns at least one workspace; created lazily for new and pre-existing accounts."""
    result = await db.execute(
        select(Organization)
        .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
        .where(OrganizationMember.user_id == user.id)
        .order_by(Organization.is_personal.desc(), Organization.created_at.asc())
    )
    org = result.scalars().first()
    if org:
        await _ensure_starter_project_for_org(db, org, user)
        return org

    base = user.full_name or user.email.split("@")[0]
    org = Organization(
        name=f"{base}'s Workspace",
        slug=f"{_slugify(base)}-{secrets.token_hex(3)}",
        description="Personal workspace",
        is_personal=True,
    )
    db.add(org)
    await db.flush()
    db.add(OrganizationMember(organization_id=org.id, user_id=user.id, role="owner"))
    await db.flush()
    await _ensure_starter_project_for_org(db, org, user)
    return org


async def get_user_org_ids(db: AsyncSession, user: User) -> List[str]:
    result = await db.execute(
        select(OrganizationMember.organization_id).where(OrganizationMember.user_id == user.id)
    )
    return [r for r in result.scalars().all()]


async def get_accessible_project_ids(db: AsyncSession, user: User) -> List[str]:
    if user.is_superuser:
        result = await db.execute(select(Project.id))
        return list(result.scalars().all())
    org_ids = await get_user_org_ids(db, user)
    if not org_ids:
        return []
    result = await db.execute(select(Project.id).where(Project.organization_id.in_(org_ids)))
    return list(result.scalars().all())


async def verify_project_access(project_id: str, db: AsyncSession, user: User) -> Project:
    """Server-side project authorization. Returns 404 for both missing and forbidden
    projects so that project IDs cannot be enumerated."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.is_superuser:
        return project
    if project.organization_id:
        member = await db.execute(
            select(OrganizationMember.id).where(
                OrganizationMember.organization_id == project.organization_id,
                OrganizationMember.user_id == user.id,
            )
        )
        if member.scalar_one_or_none():
            return project
    raise HTTPException(status_code=404, detail="Project not found")
