from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: Optional[str] = None
    git_repo_url: Optional[str] = None
    default_branch: str = "main"
    tech_stack: List[str] = []

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    description: Optional[str] = None
    git_repo_url: Optional[str] = None
    default_branch: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    is_active: Optional[bool] = None

class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    git_repo_url: Optional[str] = None
    default_branch: str
    tech_stack: List[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

class ProjectDetailResponse(ProjectResponse):
    task_count: int = 0
    memory_count: int = 0
    has_active_provider: bool = False
    has_connected_repo: bool = False
