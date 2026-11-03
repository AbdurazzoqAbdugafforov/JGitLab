from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class GitHubConnectPAT(BaseModel):
    personal_access_token: str = Field(min_length=10, description="GitHub Personal Access Token (classic or fine-grained)")
    username: Optional[str] = None

class GitHubOAuthCallback(BaseModel):
    code: str
    state: Optional[str] = None

class GitHubConnectionStatus(BaseModel):
    is_connected: bool
    github_username: Optional[str] = None
    avatar_url: Optional[str] = None
    token_type: Optional[str] = None
    updated_at: Optional[datetime] = None

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

class RepoSelectRequest(BaseModel):
    project_id: str
    full_name: str
    clone_url: Optional[str] = None
    default_branch: Optional[str] = "main"

class RepoAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
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
    head_branch: str
    base_branch: str = "main"
