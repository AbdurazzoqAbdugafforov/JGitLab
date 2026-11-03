from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class GitHubConnectPAT(BaseModel):
    personal_access_token: str = Field(min_length=10, description="GitHub Personal Access Token (classic or fine-grained)")
    username: Optional[str] = None


class GitHubOAuthCallback(BaseModel):
    code: str
    state: Optional[str] = None


class GitHubInstallationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    installation_id: Optional[int] = None
    account_login: Optional[str] = None
    account_type: Optional[str] = None
    account_avatar_url: Optional[str] = None
    repository_selection: Optional[str] = None  # all | selected
    permissions: Optional[Dict[str, str]] = None
    status: str  # active | pending_approval | suspended | revoked | error
    status_message: Optional[str] = None
    repository_count: Optional[int] = None
    last_synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class GitHubAppConfigResponse(BaseModel):
    configured: bool
    app_name: Optional[str] = None
    install_url: Optional[str] = None
    requested_permissions: Dict[str, str] = {
        "metadata": "read",
        "contents": "write",
        "pull_requests": "write",
        "checks": "read",
    }


class GitHubConnectionStatus(BaseModel):
    is_connected: bool
    connection_mode: Optional[str] = None  # github_app | pat | none
    github_username: Optional[str] = None
    avatar_url: Optional[str] = None
    token_type: Optional[str] = None
    updated_at: Optional[datetime] = None
    app_configured: bool = False
    app_name: Optional[str] = None
    installations: List[GitHubInstallationResponse] = []


class GitHubRepoSummary(BaseModel):
    id: int
    name: str
    full_name: str
    owner: str
    html_url: str
    clone_url: str
    default_branch: str
    description: Optional[str] = None
    language: Optional[str] = None
    is_private: bool
    updated_at: Optional[str] = None
    installation_id: Optional[int] = None
    permissions: Optional[Dict[str, bool]] = None


class RepoSelectRequest(BaseModel):
    project_id: str
    full_name: str
    clone_url: Optional[str] = None
    default_branch: Optional[str] = "main"
    installation_id: Optional[int] = None


class RepoAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    installation_id: Optional[int] = None
    full_name: str
    default_branch: str
    languages: Dict[str, Any]
    frameworks: List[str]
    dependencies: Dict[str, Any]
    file_tree_summary: Dict[str, Any]
    analysis_summary: Dict[str, Any]
    last_analyzed_at: Optional[datetime] = None


class BranchCreateRequest(BaseModel):
    branch_name: str
    base_branch: Optional[str] = "main"


class PullRequestCreateRequest(BaseModel):
    title: str
    body: str
    head_branch: Optional[str] = None
    base_branch: str = "main"
