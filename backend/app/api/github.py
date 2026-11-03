import os
from typing import List, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.security import encrypt_secret, decrypt_secret
from app.models.github import GitHubConnection, Repository
from app.models.project import Project
from app.models.activity import ActivityLog
from app.schemas.github import (
    GitHubConnectPAT, GitHubConnectionStatus, GitHubRepoSummary,
    RepoSelectRequest, RepoAnalysisResponse, PullRequestCreateRequest
)
from app.services.github.client import GitHubClient
from app.services.github.analyzer import RepositoryAnalyzer
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/github", tags=["GitHub Integration"])

@router.get("/status", response_model=GitHubConnectionStatus)
async def get_github_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(
        select(GitHubConnection).where(GitHubConnection.user_id == current_user.id)
    )
    conn = result.scalar_one_or_none()
    if not conn:
        return GitHubConnectionStatus(is_connected=False)

    return GitHubConnectionStatus(
        is_connected=True,
        github_username=conn.github_username,
        avatar_url=conn.avatar_url,
        token_type=conn.token_type,
        updated_at=conn.updated_at
    )

@router.post("/connect-pat", response_model=GitHubConnectionStatus)
async def connect_pat(
    pat_in: GitHubConnectPAT,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    client = GitHubClient(pat_in.personal_access_token)
    try:
        user_info = await client.get_user_profile()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"GitHub token verification failed: {str(e)}"
        )

    username = user_info.get("login")
    avatar = user_info.get("avatar_url")
    gh_id = str(user_info.get("id"))

    # Check existing connection
    result = await db.execute(
        select(GitHubConnection).where(GitHubConnection.user_id == current_user.id)
    )
    conn = result.scalar_one_or_none()

    enc_token = encrypt_secret(pat_in.personal_access_token)
    if conn:
        conn.access_token_enc = enc_token
        conn.github_username = username
        conn.github_user_id = gh_id
        conn.avatar_url = avatar
        conn.token_type = "pat"
    else:
        conn = GitHubConnection(
            user_id=current_user.id,
            access_token_enc=enc_token,
            github_username=username,
            github_user_id=gh_id,
            avatar_url=avatar,
            token_type="pat"
        )
        db.add(conn)

    # Activity log
    act = ActivityLog(
        user_id=current_user.id,
        action_type="github_connected",
        entity_type="github",
        entity_id=conn.id,
        description=f"Connected GitHub account @{username}."
    )
    db.add(act)
    await db.commit()
    await db.refresh(conn)

    return GitHubConnectionStatus(
        is_connected=True,
        github_username=conn.github_username,
        avatar_url=conn.avatar_url,
        token_type=conn.token_type,
        updated_at=conn.updated_at
    )

@router.post("/disconnect")
async def disconnect_github(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(
        select(GitHubConnection).where(GitHubConnection.user_id == current_user.id)
    )
    conn = result.scalar_one_or_none()
    if conn:
        await db.delete(conn)
        await db.commit()
    return {"message": "GitHub account disconnected."}

@router.get("/repos", response_model=List[GitHubRepoSummary])
async def list_github_repositories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(
        select(GitHubConnection).where(GitHubConnection.user_id == current_user.id)
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=400, detail="GitHub is not connected. Please connect your GitHub account first.")

    raw_token = decrypt_secret(conn.access_token_enc)
    client = GitHubClient(raw_token)
    try:
        repos = await client.list_user_repos()
        return repos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch repositories: {str(e)}")

@router.post("/select-repo", response_model=RepoAnalysisResponse)
async def select_and_analyze_repository(
    req: RepoSelectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    proj_res = await db.execute(select(Project).where(Project.id == req.project_id))
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    conn_res = await db.execute(select(GitHubConnection).where(GitHubConnection.user_id == current_user.id))
    conn = conn_res.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=400, detail="GitHub connection required to select repository.")

    raw_token = decrypt_secret(conn.access_token_enc)
    client = GitHubClient(raw_token)

    # 1. Fetch repo details from GitHub
    try:
        repo_details = await client.get_repo_details(req.full_name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot access repository {req.full_name}: {str(e)}")

    owner, repo_name = req.full_name.split("/")
    default_branch = req.default_branch or repo_details.get("default_branch", "main")

    # 2. Inspect git tree
    tree_items = await client.get_repo_tree(req.full_name, branch=default_branch)
    file_paths = [item.get("path") for item in tree_items if item.get("type") == "blob"]

    # 3. Read manifests if present
    contents_map = {}
    for key_file in ["package.json", "requirements.txt", "pyproject.toml"]:
        if key_file in file_paths:
            content = await client.get_file_content(req.full_name, key_file, branch=default_branch)
            if content:
                contents_map[key_file] = content

    # 4. Perform static analysis
    analysis_data = RepositoryAnalyzer.analyze_file_list(file_paths, contents_map)

    # 5. Save or update Repository record
    repo_res = await db.execute(select(Repository).where(Repository.project_id == req.project_id))
    repo = repo_res.scalar_one_or_none()

    if not repo:
        repo = Repository(
            project_id=req.project_id,
            github_repo_id=repo_details.get("id"),
            full_name=req.full_name,
            owner=owner,
            repo_name=repo_name,
            clone_url=req.clone_url or repo_details.get("clone_url"),
            default_branch=default_branch,
            languages=analysis_data.get("languages", {}),
            frameworks=analysis_data.get("frameworks", []),
            dependencies=analysis_data.get("dependencies", {}),
            file_tree_summary={"directories": analysis_data.get("directories", []), "important_files": analysis_data.get("important_files", [])},
            analysis_summary=analysis_data.get("analysis_summary", {}),
            last_analyzed_at=datetime.now(timezone.utc)
        )
        db.add(repo)
    else:
        repo.full_name = req.full_name
        repo.owner = owner
        repo.repo_name = repo_name
        repo.clone_url = req.clone_url or repo_details.get("clone_url")
        repo.default_branch = default_branch
        repo.languages = analysis_data.get("languages", {})
        repo.frameworks = analysis_data.get("frameworks", [])
        repo.dependencies = analysis_data.get("dependencies", {})
        repo.file_tree_summary = {"directories": analysis_data.get("directories", []), "important_files": analysis_data.get("important_files", [])}
        repo.analysis_summary = analysis_data.get("analysis_summary", {})
        repo.last_analyzed_at = datetime.now(timezone.utc)

    # Update project tech stack with detected frameworks
    project.tech_stack = list(set(project.tech_stack + analysis_data.get("frameworks", [])))
    project.git_repo_url = repo_details.get("html_url")

    # Activity log
    act = ActivityLog(
        project_id=project.id,
        user_id=current_user.id,
        action_type="repo_analyzed",
        entity_type="repository",
        entity_id=repo.id,
        description=f"Analyzed repository {req.full_name} ({analysis_data.get('total_files_analyzed')} files)."
    )
    db.add(act)
    await db.commit()
    await db.refresh(repo)

    return RepoAnalysisResponse.model_validate(repo)

@router.get("/analysis/{project_id}", response_model=RepoAnalysisResponse)
async def get_repo_analysis(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(select(Repository).where(Repository.project_id == project_id))
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="No repository connected to this project yet.")
    return RepoAnalysisResponse.model_validate(repo)
