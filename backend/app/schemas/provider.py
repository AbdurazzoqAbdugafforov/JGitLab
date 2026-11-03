from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ProviderConfigCreate(BaseModel):
    project_id: Optional[str] = None
    provider_name: str = "openai-compatible"
    base_url: str = Field(default="https://api.openai.com/v1", description="OpenAI-compatible base API URL")
    api_key: str = Field(min_length=1, description="API Key (will be encrypted on backend)")
    model_name: str = Field(default="gpt-4o", description="Model identifier")
    embedding_model_name: Optional[str] = "text-embedding-3-small"
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    max_output_tokens: int = Field(default=4096, ge=256, le=32768)
    timeout_seconds: int = Field(default=60, ge=10, le=300)
    max_retries: int = Field(default=3, ge=0, le=5)

class ProviderConfigUpdate(BaseModel):
    provider_name: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    model_name: Optional[str] = None
    embedding_model_name: Optional[str] = None
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)
    max_output_tokens: Optional[int] = Field(default=None, ge=256, le=32768)
    timeout_seconds: Optional[int] = Field(default=None, ge=10, le=300)
    max_retries: Optional[int] = Field(default=None, ge=0, le=5)
    is_active: Optional[bool] = None

class ProviderConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: Optional[str] = None
    provider_name: str
    base_url: str
    api_key_masked: str
    model_name: str
    embedding_model_name: Optional[str] = None
    temperature: float
    max_output_tokens: int
    timeout_seconds: int
    max_retries: int
    is_active: bool
    validation_status: str
    validation_message: Optional[str] = None
    last_validated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class ProviderValidateRequest(BaseModel):
    config_id: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    model_name: Optional[str] = None

class ProviderValidateResponse(BaseModel):
    success: bool
    latency_ms: int
    message: str
    models_available: List[str] = []
