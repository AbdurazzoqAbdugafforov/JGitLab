import asyncio
from app.core.database import async_session_maker, init_db
from app.core.security import get_password_hash
from app.models.user import User, Organization, OrganizationMember
from app.models.project import Project
from app.models.memory import MemoryRecord
from app.models.activity import ActivityLog

async def seed():
    await init_db()
    async with async_session_maker() as db:
        # Check if already seeded
        from sqlalchemy import select
        res = await db.execute(select(User).where(User.email == "admin@jgitlab.local"))
        if res.scalar_one_or_none():
            print("Database already contains seed data.")
            return

        print("Seeding initial JGitLab platform data...")

        # 1. Admin User
        admin = User(
            email="admin@jgitlab.local",
            hashed_password=get_password_hash("JGitLab2026!Admin"),
            full_name="Lead System Architect",
            role="admin",
            is_superuser=True
        )
        db.add(admin)

        # 2. Engineer User
        engineer = User(
            email="engineer@jgitlab.local",
            hashed_password=get_password_hash("JGitLab2026!Dev"),
            full_name="AI Platform Engineer",
            role="engineer"
        )
        db.add(engineer)
        await db.flush()

        # 3. Organization
        org = Organization(
            name="JGitLab Core Labs",
            slug="jgitlab-core",
            description="Autonomous Software Engineering Systems & AI Tooling"
        )
        db.add(org)
        await db.flush()

        # Members
        db.add(OrganizationMember(organization_id=org.id, user_id=admin.id, role="owner"))
        db.add(OrganizationMember(organization_id=org.id, user_id=engineer.id, role="member"))

        # 4. Initial Demo Project
        project = Project(
            organization_id=org.id,
            name="JGitLab Engineering Engine",
            description="Next-generation autonomous AI engineering core and provider gateway",
            git_repo_url="https://github.com/jgitlab/ai-engineering-core",
            default_branch="main",
            tech_stack=["Python", "FastAPI", "Next.js", "TypeScript", "Tailwind CSS", "Docker", "PostgreSQL"]
        )
        db.add(project)
        await db.flush()

        # 5. Engineering Memories (ADRs & Architecture)
        mem1 = MemoryRecord(
            project_id=project.id,
            category="architecture",
            title="Core Platform Three-Pillar Architecture",
            content=(
                "JGitLab is architected around three foundational pillars:\n"
                "1. Autonomous AI Software Engineer: plan-execute-verify loop with backend tools and sandbox isolation.\n"
                "2. AI Model Factory: future capability for datasets, fine-tuning (LoRA), and proprietary inference.\n"
                "3. Persistent Engineering Memory: project-level architectural decisions and task lessons learned."
            ),
            summary="Three-pillar system: Autonomous Agent, Model Factory, Engineering Memory.",
            tags=["architecture", "pillars", "system-design"]
        )
        db.add(mem1)

        mem2 = MemoryRecord(
            project_id=project.id,
            category="adr",
            title="ADR-001: External Provider Interface Abstraction",
            content=(
                "Context: Initial MVP uses external AI APIs (OpenAI, OpenRouter, Groq, Ollama) while reserving "
                "a clean migration path to proprietary fine-tuned weights.\n"
                "Decision: Standardized on AIProvider abstract base class with generate_response, generate_structured_response, "
                "stream_response, and validate_connection.\n"
                "Consequences: The Autonomous AI Engineer interacts purely with the interface, allowing zero-code-change "
                "switch to internal model serving in Phase 4."
            ),
            summary="ADR-001: Abstract provider interface decouples agent logic from model host.",
            tags=["adr", "ai-provider", "abstraction"]
        )
        db.add(mem2)

        mem3 = MemoryRecord(
            project_id=project.id,
            category="adr",
            title="ADR-002: Dual Sandbox Architecture with Path Isolation",
            content=(
                "Context: AI code execution must be tightly isolated against host contamination.\n"
                "Decision: Implemented Docker container execution with memory/CPU limits as primary runner, "
                "paired with a secure local runner enforcing strict path traversal guards (os.path.commonpath) and forbidden command filters.\n"
                "Consequences: Development and testing run reliably on any developer machine while production containers remain strictly sandboxed."
            ),
            summary="ADR-002: Dual sandbox runner prevents path traversal and host resource abuse.",
            tags=["adr", "security", "sandbox"]
        )
        db.add(mem3)

        mem4 = MemoryRecord(
            project_id=project.id,
            category="tech_stack",
            title="Frontend & Backend Standards",
            content=(
                "Backend: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 async, Argon2 password hashing, Fernet secret encryption.\n"
                "Frontend: Next.js 15 App Router, TypeScript, Tailwind CSS, Lucide icons, Dark Charcoal (#0B0F17) + Electric Violet (#8B5CF6) design language."
            ),
            summary="Technology stack specifications and styling guidelines.",
            tags=["tech-stack", "standards"]
        )
        db.add(mem4)

        # 6. Initial Activity Log
        act = ActivityLog(
            project_id=project.id,
            user_id=admin.id,
            action_type="project_initialized",
            entity_type="project",
            entity_id=project.id,
            description="JGitLab initialized with Core Engineering Project and Architectural Memories."
        )
        db.add(act)

        await db.commit()
        print("Seed completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
