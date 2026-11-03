import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db, run_migrations
from app.core.middleware import CSRFMiddleware, RateLimitMiddleware, SecurityHeadersMiddleware
from app.core.websocket import ws_manager
from app.api.auth import router as auth_router
from app.api.projects import router as projects_router
from app.api.github import router as github_router
from app.api.providers import router as providers_router
from app.api.agent import router as agent_router
from app.api.memory import router as memory_router
from app.api.activity import router as activity_router
from app.api.model_factory import router as model_factory_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.validate_for_production()
    os.makedirs(settings.WORKSPACE_STORAGE_DIR, exist_ok=True)
    if settings.RUN_MIGRATIONS_ON_STARTUP and settings.ENVIRONMENT != "test":
        try:
            await run_migrations()
        except Exception:
            await init_db()
    else:
        await init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="JGitLab — Autonomous AI Software Engineering Platform API",
    lifespan=lifespan,
)

# Security & Rate-Limiting Middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CSRFMiddleware)
app.add_middleware(RateLimitMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST Routers
api_v1_prefix = settings.API_V1_STR
app.include_router(auth_router, prefix=api_v1_prefix)
app.include_router(projects_router, prefix=api_v1_prefix)
app.include_router(github_router, prefix=api_v1_prefix)
app.include_router(providers_router, prefix=api_v1_prefix)
app.include_router(agent_router, prefix=api_v1_prefix)
app.include_router(memory_router, prefix=api_v1_prefix)
app.include_router(activity_router, prefix=api_v1_prefix)
app.include_router(model_factory_router, prefix=api_v1_prefix)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }


@app.websocket("/ws/tasks/{task_id}")
async def websocket_task_endpoint(websocket: WebSocket, task_id: str):
    await ws_manager.connect_task(task_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_task(task_id, websocket)
    except Exception:
        ws_manager.disconnect_task(task_id, websocket)


@app.websocket("/ws/global")
async def websocket_global_endpoint(websocket: WebSocket):
    await ws_manager.connect_global(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_global(websocket)
    except Exception:
        ws_manager.disconnect_global(websocket)
