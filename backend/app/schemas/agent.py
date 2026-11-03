from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class AgentTaskCreate(BaseModel):
    project_id: str
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=5)
    priority: str = Field(default="medium", pattern="^(low|medium|high|urgent)$")
    target_branch: str = "main"

class PlanFileTarget(BaseModel):
    path: str
    action: str # read, create, edit, delete
    reason: str

class PlanStepItem(BaseModel):
    step_number: int
    title: str
    description: str
    tools: List[str]

class StructuredPlan(BaseModel):
    task_summary: str
    existing_architecture_analysis: str
    files_to_inspect: List[str]
    files_likely_to_change: List[PlanFileTarget]
    proposed_implementation_steps: List[PlanStepItem]
    potential_risks: List[str]
    dependencies: List[str]
    testing_strategy: str

class AgentPlanResponse(BaseModel):
    task_id: str
    status: str
    plan: StructuredPlan
    approval_id: str

class AgentApprovalRequest(BaseModel):
    decision: str = Field(pattern="^(approved|rejected)$")
    feedback: Optional[str] = None

class AgentTaskStepResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    step_index: int
    step_type: str
    title: str
    description: Optional[str] = None
    tool_name: Optional[str] = None
    tool_input: Optional[Dict[str, Any]] = None
    tool_output: Optional[Any] = None
    status: str
    error_message: Optional[str] = None
    latency_ms: int
    tokens_used: int
    created_at: datetime

class AgentApprovalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    step_index: int
    approval_type: str
    action_summary: str
    payload: Optional[Dict[str, Any]] = None
    status: str
    decided_by: Optional[str] = None
    decided_at: Optional[datetime] = None
    feedback: Optional[str] = None
    created_at: datetime

class ExecutionLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    level: str
    message: str
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

class AgentTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    user_id: str
    title: str
    description: str
    status: str
    priority: str
    target_branch: str
    created_branch: Optional[str] = None
    pr_number: Optional[int] = None
    pr_url: Optional[str] = None
    total_tokens_used: int
    estimated_cost: float
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class AgentTaskDetailResponse(AgentTaskResponse):
    plan_json: Optional[Dict[str, Any]] = None
    diff_summary: Optional[str] = None
    test_results_json: Optional[Dict[str, Any]] = None
    failure_analysis: Optional[str] = None
    steps: List[AgentTaskStepResponse] = []
    approvals: List[AgentApprovalResponse] = []
    logs: List[ExecutionLogResponse] = []
