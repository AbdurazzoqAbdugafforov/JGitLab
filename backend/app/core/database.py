import os
import asyncio
import logging
from typing import AsyncGenerator
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

logger = logging.getLogger("jgitlab.database")

class Base(DeclarativeBase):
    pass

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    connect_args=connect_args
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def _alembic_config():
    from alembic.config import Config
    cfg = Config(os.path.join(BACKEND_DIR, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(BACKEND_DIR, "alembic"))
    return cfg

def _run_migrations_sync() -> None:
    """Bring the schema to head. Databases created before Alembic was adopted
    (tables exist, no alembic_version) are stamped at the initial revision first,
    so existing data is preserved and only incremental migrations run."""
    from alembic import command

    async def _inspect():
        async with engine.connect() as conn:
            return await conn.run_sync(lambda c: set(inspect(c).get_table_names()))

    tables = asyncio.run(_inspect())
    cfg = _alembic_config()
    if "alembic_version" not in tables and "users" in tables:
        if "identity_accounts" in tables:
            # Schema was created from current metadata (create_all) — already at head
            command.stamp(cfg, "head")
        else:
            logger.info("Existing pre-Alembic schema detected: stamping 001_initial")
            command.stamp(cfg, "001_initial")
    command.upgrade(cfg, "head")

async def run_migrations() -> None:
    # Alembic's env.py uses asyncio.run, so run it on a worker thread
    await asyncio.to_thread(_run_migrations_sync)

async def init_db():
    """Used by tests and seed: create tables directly from metadata."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
