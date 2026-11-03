import os
import base64
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "JGitLab"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = Field(
        default="jgitlab-super-secret-key-change-in-production-2026-secure-32chars",
        description="Key used for JWT token generation and validation"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # AES/Fernet encryption key for API keys and GitHub tokens
    # Generates a stable fallback if not provided
    ENCRYPTION_KEY: str = Field(
        default="cE1xWjRkTEpTYnF1Q2U0d1p5N3Y5SGFuYjJ1OTZtNnY=",
        description="Fernet URL-safe base64-encoded 32-byte key"
    )

    # Database
    # Supports postgresql+asyncpg://... or fallback to sqlite+aiosqlite:///./jgitlab.db
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./jgitlab.db",
        description="Async database connection URL"
    )
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # GitHub OAuth
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:3000/api/auth/callback/github"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    # Agent & Sandbox Limits
    MAX_TASK_STEPS: int = 25
    MAX_TASK_TOKENS: int = 150000
    TASK_TIMEOUT_SECONDS: int = 600
    SANDBOX_TIMEOUT_SECONDS: int = 120
    SANDBOX_MEMORY_LIMIT: str = "1024m"
    SANDBOX_CPU_QUOTA: int = 100000
    
    # Workspace storage
    WORKSPACE_STORAGE_DIR: str = os.path.abspath("./workspaces")

settings = Settings()
