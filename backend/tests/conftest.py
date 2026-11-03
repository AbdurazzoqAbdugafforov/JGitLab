import os
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

os.environ["ENVIRONMENT"] = "test"

from app.core.database import Base, get_db
from app.main import app
from app.core.security import get_password_hash
from app.core.sessions import create_session
from app.api.deps import ensure_personal_workspace
from app.models.user import User
from app.models.project import Project

TEST_DB_URL = "sqlite+aiosqlite:///./test_jgitlab.db"

test_engine = create_async_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False, autocommit=False, autoflush=False)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    if os.path.exists("./test_jgitlab.db"):
        try:
            os.remove("./test_jgitlab.db")
        except Exception:
            pass


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    from sqlalchemy import select
    res = await db_session.execute(select(User).where(User.email == "test@jgitlab.io"))
    user = res.scalar_one_or_none()
    if not user:
        user = User(
            email="test@jgitlab.io",
            hashed_password=get_password_hash("TestPassword123!"),
            full_name="Test Engineer",
            email_verified=True,
            role="engineer",
        )
        db_session.add(user)
        await db_session.flush()
        await ensure_personal_workspace(db_session, user)
        await db_session.commit()
        await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(db_session: AsyncSession, test_user: User) -> dict:
    raw_token, _ = await create_session(db_session, test_user, auth_method="password")
    await db_session.commit()
    return {"Authorization": f"Bearer {raw_token}"}


@pytest_asyncio.fixture
async def test_project(db_session: AsyncSession, test_user: User) -> Project:
    from sqlalchemy import select
    org = await ensure_personal_workspace(db_session, test_user)
    res = await db_session.execute(select(Project).where(Project.name == "Test Project"))
    project = res.scalar_one_or_none()
    if not project:
        project = Project(
            organization_id=org.id,
            created_by_id=test_user.id,
            name="Test Project",
            description="Integration test project",
            tech_stack=["Python", "FastAPI"],
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)
    return project
