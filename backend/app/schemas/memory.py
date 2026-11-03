from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class MemoryRecordCreate(BaseModel):
    project_id: str
    category: str = Field(default="architecture", pattern="^(architecture|tech_stack|adr|bug_fix|task_learning)$")
    title: str = Field(min_length=2, max_length=200)
    content: str = Field(min_length=5)
    summary: Optional[str] = None
    tags: List[str] = []
    source_task_id: Optional[str] = None

class MemoryRecordUpdate(BaseModel):
    category: Optional[str] = Field(default=None, pattern="^(architecture|tech_stack|adr|bug_fix|task_learning)$")
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    content: Optional[str] = Field(default=None, min_length=5)
    summary: Optional[str] = None
    tags: Optional[List[str]] = None

class MemoryRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    category: str
    title: str
    content: str
    summary: Optional[str] = None
    tags: List[str]
    source_task_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class MemorySearchQuery(BaseModel):
    project_id: str
    query: str
    category: Optional[str] = None
    limit: int = Field(default=5, ge=1, le=20)
