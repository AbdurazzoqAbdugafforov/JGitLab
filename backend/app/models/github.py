import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON, BigInteger
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class GitHubConnection(Base):
    """Legacy personal-access-token connection (kept for backwards compatibility)."""
    __tablename__ = "github_connections"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    access_token_enc = Column(Text, nullable=False) # Encrypted
    token_type = Column(String(50), default="bearer", nullable=False) # oauth or pat
    scope = Column(String(255), default="repo,read:user", nullable=False)
    github_username = Column(String(100), nullable=True)
    github_user_id = Column(String(100), nullable=True)
    avatar_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="github_connections")

class GitHubInstallation(Base):
    """A GitHub App installation the user has proven access to.
    Installation access tokens are short-lived and minted on demand; they are never persisted."""
    __tablename__ = "github_installations"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    installation_id = Column(BigInteger, nullable=True, index=True)  # null while org approval is pending
    account_login = Column(String(255), nullable=True)
    account_type = Column(String(30), nullable=True)  # User | Organization
    account_avatar_url = Column(String(512), nullable=True)
    repository_selection = Column(String(20), nullable=True)  # all | selected
    permissions = Column(JSON, nullable=True)
    status = Column(String(30), default="active", nullable=False)  # active | pending_approval | suspended | revoked | error
    status_message = Column(Text, nullable=True)
    repository_count = Column(Integer, nullable=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="github_installations")

class Repository(Base):
    __tablename__ = "repositories"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    installation_id = Column(BigInteger, nullable=True, index=True)  # GitHub App installation granting access
    github_repo_id = Column(Integer, nullable=True)
    full_name = Column(String(255), nullable=False) # owner/repo
    owner = Column(String(100), nullable=False)
    repo_name = Column(String(150), nullable=False)
    clone_url = Column(String(512), nullable=True)
    default_branch = Column(String(100), default="main", nullable=False)
    local_path = Column(String(512), nullable=True)
    languages = Column(JSON, default=dict, nullable=False)
    frameworks = Column(JSON, default=list, nullable=False)
    dependencies = Column(JSON, default=dict, nullable=False)
    file_tree_summary = Column(JSON, default=dict, nullable=False)
    analysis_summary = Column(JSON, default=dict, nullable=False)
    last_analyzed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    project = relationship("Project", back_populates="repositories")
