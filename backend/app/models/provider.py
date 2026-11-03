import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class AIProviderConfiguration(Base):
    __tablename__ = "ai_provider_configurations"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_name = Column(String(100), default="openai-compatible", nullable=False)
    base_url = Column(String(512), default="https://api.openai.com/v1", nullable=False)
    api_key_enc = Column(Text, nullable=False) # Fernet encrypted
    model_name = Column(String(100), default="gpt-4o", nullable=False)
    embedding_model_name = Column(String(100), default="text-embedding-3-small", nullable=True)
    temperature = Column(Float, default=0.2, nullable=False)
    max_output_tokens = Column(Integer, default=4096, nullable=False)
    timeout_seconds = Column(Integer, default=60, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    last_validated_at = Column(DateTime(timezone=True), nullable=True)
    validation_status = Column(String(50), default="untested", nullable=False) # untested, success, error
    validation_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    project = relationship("Project", back_populates="provider_configs")
    user = relationship("User", back_populates="provider_configs")
