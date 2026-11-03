from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator


class UserCreate(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, description="Password must be at least 8 characters")
    full_name: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if "@" not in cleaned or cleaned.startswith("@") or cleaned.endswith("@"):
            raise ValueError("Please enter a valid email address.")
        return cleaned


class UserLogin(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str


class IdentityAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    provider: str
    provider_subject: str
    email: Optional[str] = None
    email_verified: bool = False
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    last_login_at: Optional[datetime] = None
    created_at: datetime


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    auth_method: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    last_seen_at: Optional[datetime] = None
    expires_at: datetime
    is_current: bool = False


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    email_verified: bool = False
    has_password: bool = True
    role: str
    is_active: bool
    is_superuser: bool
    onboarding: Optional[Dict[str, Any]] = None
    identities: List[IdentityAccountResponse] = []
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    csrf_token: Optional[str] = None
    user: UserResponse


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(default=None, min_length=8)


class OnboardingUpdate(BaseModel):
    completed_step: Optional[str] = None
    completed: Optional[List[str]] = None
    dismissed: Optional[bool] = None


class AuthProvidersStatus(BaseModel):
    google_enabled: bool
    github_enabled: bool
    email_enabled: bool = True
    github_app_enabled: bool
    github_app_name: Optional[str] = None


class OAuthRuntimeConfigUpdate(BaseModel):
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    github_client_id: Optional[str] = None
    github_client_secret: Optional[str] = None
    github_app_name: Optional[str] = None
    github_app_id: Optional[str] = None
    github_app_private_key: Optional[str] = None
