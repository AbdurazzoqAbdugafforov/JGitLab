import os
import logging
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

logger = logging.getLogger("jgitlab.config")

_DEV_SECRET = "jgitlab-dev-only-secret-change-me-0000000000000000"


class Settings(BaseSettings):
    # Reads backend/.env first, then the repository root .env
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "JGitLab"
    VERSION: str = "0.2.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"  # development | production | test

    # ---------------------------------------------------------------
    # Core secrets
    # ---------------------------------------------------------------
    SECRET_KEY: str = Field(default=_DEV_SECRET, description="Legacy signing key / fallback")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # Signs OAuth state / PKCE flow cookies and CSRF tokens
    AUTH_SECRET: str = ""
    # Public URL of the web app (the browser-facing origin). OAuth callbacks are built from it.
    AUTH_URL: str = "http://localhost:3000"
    # Internal key: peppers session-token hashes and signs GitHub App installation state
    BACKEND_INTERNAL_SIGNING_KEY: str = ""

    # Fernet key for encrypted credential storage (AI keys, GitHub tokens)
    ENCRYPTION_KEY: str = Field(default="cE1xWjRkTEpTYnF1Q2U0d1p5N3Y5SGFuYjJ1OTZtNnY=")

    # Sessions
    SESSION_COOKIE_NAME: str = "jgl_session"
    CSRF_COOKIE_NAME: str = "jgl_csrf"
    SESSION_TTL_HOURS: int = 24 * 14
    REAUTH_WINDOW_MINUTES: int = 15
    COOKIE_SECURE: Optional[bool] = None  # None => auto (true when AUTH_URL is https)

    # ---------------------------------------------------------------
    # Database / infra
    # ---------------------------------------------------------------
    DATABASE_URL: str = "sqlite+aiosqlite:///./jgitlab.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    RUN_MIGRATIONS_ON_STARTUP: bool = True

    # ---------------------------------------------------------------
    # Identity providers (login only)
    # ---------------------------------------------------------------
    AUTH_GOOGLE_ID: str = ""
    AUTH_GOOGLE_SECRET: str = ""
    AUTH_GITHUB_ID: str = ""
    AUTH_GITHUB_SECRET: str = ""

    # ---------------------------------------------------------------
    # GitHub App (repository access — separate from GitHub login)
    # ---------------------------------------------------------------
    GITHUB_APP_ID: str = ""
    GITHUB_APP_NAME: str = ""  # the app "slug" as in https://github.com/apps/<slug>
    GITHUB_APP_CLIENT_ID: str = ""
    GITHUB_APP_CLIENT_SECRET: str = ""
    GITHUB_APP_PRIVATE_KEY: str = ""  # PEM; literal "\n" sequences are accepted
    GITHUB_APP_PRIVATE_KEY_PATH: str = ""
    GITHUB_APP_WEBHOOK_SECRET: str = ""
    GITHUB_API_URL: str = "https://api.github.com"
    GITHUB_WEB_URL: str = "https://github.com"

    # CORS (only needed when the browser talks to the API cross-origin)
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Agent & sandbox limits
    MAX_TASK_STEPS: int = 25
    MAX_TASK_TOKENS: int = 150000
    TASK_TIMEOUT_SECONDS: int = 600
    SANDBOX_TIMEOUT_SECONDS: int = 120
    SANDBOX_MEMORY_LIMIT: str = "1024m"
    SANDBOX_CPU_QUOTA: int = 100000

    WORKSPACE_STORAGE_DIR: str = os.path.abspath("./workspaces")

    # ---------------------------------------------------------------
    # Derived helpers
    # ---------------------------------------------------------------
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def auth_secret(self) -> str:
        return self.AUTH_SECRET or self.SECRET_KEY

    @property
    def internal_signing_key(self) -> str:
        return self.BACKEND_INTERNAL_SIGNING_KEY or self.SECRET_KEY

    @property
    def cookie_secure(self) -> bool:
        if self.COOKIE_SECURE is not None:
            return self.COOKIE_SECURE
        return self.AUTH_URL.lower().startswith("https://")

    @property
    def public_url(self) -> str:
        return self.AUTH_URL.rstrip("/")

    @property
    def google_configured(self) -> bool:
        return bool(self.AUTH_GOOGLE_ID and self.AUTH_GOOGLE_SECRET)

    @property
    def github_login_configured(self) -> bool:
        return bool(self.AUTH_GITHUB_ID and self.AUTH_GITHUB_SECRET)

    @property
    def github_app_private_key(self) -> str:
        if self.GITHUB_APP_PRIVATE_KEY:
            return self.GITHUB_APP_PRIVATE_KEY.replace("\\n", "\n").strip()
        if self.GITHUB_APP_PRIVATE_KEY_PATH and os.path.exists(self.GITHUB_APP_PRIVATE_KEY_PATH):
            with open(self.GITHUB_APP_PRIVATE_KEY_PATH, "r", encoding="utf-8") as fh:
                return fh.read().strip()
        return ""

    @property
    def github_app_configured(self) -> bool:
        return bool(
            self.GITHUB_APP_ID
            and self.GITHUB_APP_NAME
            and self.github_app_private_key
        )

    def validate_for_production(self) -> None:
        if not self.is_production:
            return
        problems = []
        if self.SECRET_KEY == _DEV_SECRET and not (self.AUTH_SECRET and self.BACKEND_INTERNAL_SIGNING_KEY):
            problems.append("AUTH_SECRET and BACKEND_INTERNAL_SIGNING_KEY must be set")
        if not self.cookie_secure:
            problems.append("AUTH_URL must be https (or COOKIE_SECURE=true) in production")
        if problems:
            raise RuntimeError("Insecure production configuration: " + "; ".join(problems))


settings = Settings()
