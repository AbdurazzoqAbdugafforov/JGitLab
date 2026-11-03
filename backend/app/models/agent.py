import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class AgentTask(Base):
    __tablename__ = "agent_tasks"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="pending", nullable=False) # pending, planning, awaiting_approval, running, testing, completed, failed, cancelled
    priority = Column(String(20), default="medium", nullable=False) # low, medium, high, urgent
    target_branch = Column(String(100), default="main", nullable=False)
    created_branch = Column(String(100), nullable=True)
    pr_number = Column(Integer, nullable=True)
    pr_url = Column(String(512), nullable=True)
    plan_json = Column(JSON, nullable=True)
    diff_summary = Column(Text, nullable=True)
    test_results_json = Column(JSON, nullable=True)
    failure_analysis = Column(Text, nullable=True)
    total_tokens_used = Column(Integer, default=0, nullable=False)
    estimated_cost = Column(Float, default=0.0, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    project = relationship("Project", back_populates="tasks")
    user = relationship("User", back_populates="tasks")
    steps = relationship("AgentTaskStep", back_populates="task", cascade="all, delete-orphan", order_by="AgentTaskStep.step_index")
    approvals = relationship("AgentApproval", back_populates="task", cascade="all, delete-orphan")
    logs = relationship("AgentExecutionLog", back_populates="task", cascade="all, delete-orphan", order_by="AgentExecutionLog.created_at")

class AgentTaskStep(Base):
    __tablename__ = "agent_task_steps"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    task_id = Column(String(36), ForeignKey("agent_tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    step_index = Column(Integer, nullable=False)
    step_type = Column(String(50), nullable=False) # plan, tool_call, tool_result, reflection, test_run, error, finish
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    tool_name = Column(String(100), nullable=True)
    tool_input = Column(JSON, nullable=True)
    tool_output = Column(JSON, nullable=True)
    status = Column(String(50), default="pending", nullable=False) # pending, executing, completed, failed, skipped
    error_message = Column(Text, nullable=True)
    latency_ms = Column(Integer, default=0, nullable=False)
    tokens_used = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    task = relationship("AgentTask", back_populates="steps")

class AgentApproval(Base):
    __tablename__ = "agent_approvals"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    task_id = Column(String(36), ForeignKey("agent_tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    step_index = Column(Integer, default=0, nullable=False)
    approval_type = Column(String(50), nullable=False) # plan_execution, dangerous_command, file_deletion, pr_submission
    action_summary = Column(Text, nullable=False)
    payload = Column(JSON, nullable=True)
    status = Column(String(50), default="pending", nullable=False) # pending, approved, rejected
    decided_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=True)
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    task = relationship("AgentTask", back_populates="approvals")

class AgentExecutionLog(Base):
    __tablename__ = "agent_execution_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    task_id = Column(String(36), ForeignKey("agent_tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    level = Column(String(20), default="info", nullable=False) # info, debug, warning, error
    message = Column(Text, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    task = relationship("AgentTask", back_populates="logs")
