import os
import shutil
from typing import List, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db, async_session_maker
from app.core.config import settings
from app.core.security import decrypt_secret
from app.models.agent import AgentTask, AgentTaskStep, AgentApproval, AgentExecutionLog
from app.models.project import Project
from app.models.github import GitHubConnection, Repository
from app.models.activity import ActivityLog
from app.schemas.agent import (
    AgentTaskCreate, AgentTaskResponse, AgentTaskDetailResponse,
    AgentApprovalRequest, AgentPlanResponse, StructuredPlan
)
from app.schemas.github import PullRequestCreateRequest
from app.services.ai.factory import get_ai_provider_for_project
from app.services.sandbox.manager import sandbox_manager
from app.services.agent.planner import TaskPlanner
from app.services.agent.executor import AgentExecutionEngine
from app.services.agent.diff_engine import DiffEngine
from app.services.memory.service import EngineeringMemoryService
from app.services.github.client import GitHubClient
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/agent", tags=["AI Software Engineer"])

def _ensure_workspace_for_task(task_id: str, repo: Repository = None) -> str:
    ws_root = os.path.join(settings.WORKSPACE_STORAGE_DIR, f"task_{task_id}")
    os.makedirs(ws_root, exist_ok=True)
    
    # Initialize git repo in workspace if not already git
    git_dir = os.path.join(ws_root, ".git")
    if not os.path.exists(git_dir):
        # Create minimal git repo for diff engine tracking
        os.system(f'git -C "{ws_root}" init -q')
        # Create basic README or import repo structure
        readme_path = os.path.join(ws_root, "README.md")
        if not os.path.exists(readme_path):
            with open(readme_path, "w", encoding="utf-8") as f:
                f.write(f"# Project Workspace for Task {task_id}\n\nManaged by JGitLab Autonomous AI Engineer.\n")
            os.system(f'git -C "{ws_root}" add .')
            os.system(f'git -C "{ws_root}" commit -m "initial commit" -q')

    return ws_root

async def _run_executor_task(task_id: str, workspace_path: str, user_id: str):
    """Background task runner for agent execution"""
    async with async_session_maker() as session:
        try:
            task_res = await session.execute(select(AgentTask).where(AgentTask.id == task_id))
            task = task_res.scalar_one_or_none()
            if not task:
                return

            provider = await get_ai_provider_for_project(task.project_id, user_id, session)
            runner = await sandbox_manager.get_runner()
            engine = AgentExecutionEngine(
                task_id=task_id,
                workspace_path=workspace_path,
                provider=provider,
                runner=runner,
                db=session
            )
            await engine.execute_approved_task()

            # If completed, auto-record task memory
            if task.status == "completed":
                mem_service = EngineeringMemoryService(session, provider)
                await mem_service.record_task_completion(
                    project_id=task.project_id,
                    task_id=task.id,
                    task_title=task.title,
                    task_description=task.description,
                    diff_summary=task.diff_summary
                )

        except Exception as e:
            # Handle background task error
            print(f"[Executor Background Task Error]: {str(e)}")

@router.post("/tasks", response_model=AgentTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_in: AgentTaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    # Verify project exists
    proj_res = await db.execute(select(Project).where(Project.id == task_in.project_id))
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    task = AgentTask(
        project_id=task_in.project_id,
        user_id=current_user.id,
        title=task_in.title,
        description=task_in.description,
        priority=task_in.priority,
        target_branch=task_in.target_branch,
        status="pending"
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    # Activity log
    act = ActivityLog(
        project_id=project.id,
        user_id=current_user.id,
        action_type="task_created",
        entity_type="task",
        entity_id=task.id,
        description=f"Submitted engineering task: '{task.title}'"
    )
    db.add(act)
    await db.commit()

    return task

@router.get("/tasks", response_model=List[AgentTaskResponse])
async def list_tasks(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(
        select(AgentTask).where(AgentTask.project_id == project_id).order_by(AgentTask.created_at.desc())
    )
    return result.scalars().all()

@router.get("/tasks/{task_id}", response_model=AgentTaskDetailResponse)
async def get_task_detail(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(select(AgentTask).where(AgentTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    steps_res = await db.execute(select(AgentTaskStep).where(AgentTaskStep.task_id == task_id).order_by(AgentTaskStep.step_index.asc()))
    approvals_res = await db.execute(select(AgentApproval).where(AgentApproval.task_id == task_id).order_by(AgentApproval.created_at.desc()))
    logs_res = await db.execute(select(AgentExecutionLog).where(AgentExecutionLog.task_id == task_id).order_by(AgentExecutionLog.created_at.asc()))

    resp_data = AgentTaskDetailResponse.model_validate(task)
    resp_data.steps = steps_res.scalars().all()
    resp_data.approvals = approvals_res.scalars().all()
    resp_data.logs = logs_res.scalars().all()
    return resp_data

@router.post("/tasks/{task_id}/plan")
async def generate_task_plan(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(select(AgentTask).where(AgentTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    provider = await get_ai_provider_for_project(task.project_id, current_user.id, db)

    # Fetch project & repo context
    proj_res = await db.execute(select(Project).where(Project.id == task.project_id))
    project = proj_res.scalar_one_or_none()
    repo_res = await db.execute(select(Repository).where(Repository.project_id == task.project_id))
    repo = repo_res.scalar_one_or_none()

    project_context = {
        "project_name": project.name if project else "JGitLab Project",
        "tech_stack": project.tech_stack if project else [],
        "repo_name": repo.full_name if repo else "Local Repository",
        "frameworks": repo.frameworks if repo else []
    }

    # Fetch relevant memories
    mem_service = EngineeringMemoryService(db, provider)
    relevant_memories = await mem_service.search_memories(
        project_id=task.project_id,
        query=f"{task.title} {task.description}",
        limit=5
    )
    memory_context = [
        {"category": m.category, "title": m.title, "content": m.content, "summary": m.summary}
        for m in relevant_memories
    ]

    task.status = "planning"
    await db.commit()

    try:
        planner = TaskPlanner(provider)
        plan_dict = await planner.generate_plan(
            task_title=task.title,
            task_description=task.description,
            project_context=project_context,
            memory_context=memory_context
        )
    except Exception as e:
        task.status = "failed"
        task.failure_analysis = f"Planning failed: {str(e)}"
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Planning generation failed: {str(e)}")

    task.plan_json = plan_dict
    task.status = "awaiting_approval"

    # Create approval record
    approval = AgentApproval(
        task_id=task.id,
        step_index=0,
        approval_type="plan_execution",
        action_summary=f"Approve implementation plan with {len(plan_dict.get('proposed_implementation_steps', []))} steps",
        payload=plan_dict,
        status="pending"
    )
    db.add(approval)

    # Activity log
    act = ActivityLog(
        project_id=task.project_id,
        user_id=current_user.id,
        action_type="plan_generated",
        entity_type="task",
        entity_id=task.id,
        description=f"Generated structured plan for task '{task.title}'."
    )
    db.add(act)
    await db.commit()

    return {
        "task_id": task.id,
        "status": task.status,
        "plan": plan_dict,
        "approval_id": approval.id
    }

@router.post("/tasks/{task_id}/approve")
async def approve_task_plan(
    task_id: str,
    approval_in: AgentApprovalRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(select(AgentTask).where(AgentTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Find pending approval
    app_res = await db.execute(
        select(AgentApproval).where(
            and_(AgentApproval.task_id == task_id, AgentApproval.status == "pending")
        ).order_by(AgentApproval.created_at.desc())
    )
    approval = app_res.scalar_one_or_none()

    if approval:
        approval.status = approval_in.decision
        approval.decided_by = current_user.id
        approval.decided_at = datetime.now(timezone.utc)
        approval.feedback = approval_in.feedback

    if approval_in.decision == "rejected":
        task.status = "cancelled"
        task.failure_analysis = f"User rejected approval: {approval_in.feedback or 'No feedback provided'}"
        await db.commit()
        return {"status": "cancelled", "message": "Task plan was rejected by user."}

    # Setup workspace
    repo_res = await db.execute(select(Repository).where(Repository.project_id == task.project_id))
    repo = repo_res.scalar_one_or_none()
    workspace_path = _ensure_workspace_for_task(task.id, repo)

    task.status = "running"
    await db.commit()

    # Trigger background execution loop
    background_tasks.add_task(_run_executor_task, task.id, workspace_path, current_user.id)

    return {"status": "running", "message": "Plan approved. Autonomous execution started."}

@router.get("/tasks/{task_id}/diff")
async def get_task_diff(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(select(AgentTask).where(AgentTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    ws_path = os.path.join(settings.WORKSPACE_STORAGE_DIR, f"task_{task_id}")
    if not os.path.exists(ws_path):
        return {"has_changes": False, "unified_diff": task.diff_summary or "", "changed_files": []}

    runner = await sandbox_manager.get_runner()
    diff_data = await DiffEngine.get_diff(ws_path, runner)
    return diff_data

@router.post("/tasks/{task_id}/prepare-pr")
async def prepare_pull_request(
    task_id: str,
    pr_req: PullRequestCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(select(AgentTask).where(AgentTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    conn_res = await db.execute(select(GitHubConnection).where(GitHubConnection.user_id == current_user.id))
    conn = conn_res.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=400, detail="GitHub must be connected to open a pull request.")

    repo_res = await db.execute(select(Repository).where(Repository.project_id == task.project_id))
    repo = repo_res.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=400, detail="No GitHub repository associated with this project.")

    raw_token = decrypt_secret(conn.access_token_enc)
    client = GitHubClient(raw_token)

    branch_name = pr_req.head_branch or f"jgitlab/task-{task.id[:8]}"

    try:
        # 1. Create remote branch
        await client.create_branch(repo.full_name, branch_name, base_branch=pr_req.base_branch)
        # 2. Open PR
        pr_response = await client.create_pull_request(
            full_name=repo.full_name,
            title=pr_req.title,
            body=pr_req.body,
            head_branch=branch_name,
            base_branch=pr_req.base_branch
        )

        task.created_branch = branch_name
        task.pr_number = pr_response.get("number")
        task.pr_url = pr_response.get("html_url")
        await db.commit()

        # Log activity
        act = ActivityLog(
            project_id=task.project_id,
            user_id=current_user.id,
            action_type="pr_created",
            entity_type="task",
            entity_id=task.id,
            description=f"Created Pull Request #{task.pr_number} on {repo.full_name}: '{pr_req.title}'"
        )
        db.add(act)
        await db.commit()

        return {
            "success": True,
            "pr_number": task.pr_number,
            "pr_url": task.pr_url,
            "branch": branch_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to prepare pull request: {str(e)}")
