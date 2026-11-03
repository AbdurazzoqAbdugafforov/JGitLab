# JGitLab — Next-Generation AI Engineering Platform

> **"One intelligent platform to build, understand, and evolve AI-powered software."**

**JGitLab** is a unified, API-first Autonomous AI Software Engineering platform. Built with a production-grade Python FastAPI backend and a Next.js 15 App Router frontend, JGitLab orchestrates external AI model APIs to autonomously inspect repositories, plan multi-step implementations, execute sandboxed code operations, verify changes with automated tests, review unified diffs, and push pull requests to GitHub.

---

## 🏛️ The Three Long-Term Pillars

1. **Autonomous AI Software Engineer (Active MVP)**
   - Natural-language engineering task interface.
   - Structured step-by-step task planning with risk evaluation and testing strategy.
   - User approval gating before sensitive or destructive code operations.
   - 13 backend agent tools (`list_files`, `read_file`, `search_code`, `create_file`, `edit_file`, `delete_file`, `run_tests`, `run_linter`, `run_build`, `inspect_git_diff`, etc.).
   - Sandboxed execution with path traversal barriers, timeout guards, and Docker isolation.
   - Post-execution unified git diff review and automated pull request generation.

2. **Persistent Engineering Memory (Active MVP)**
   - Long-term project knowledge store: architecture notes, technology decisions, ADRs (Architecture Decision Records), and bug fix histories.
   - Hybrid retrieval engine: semantic vector cosine similarity + scored keyword search fallback.
   - Automatic context injection: relevant memories are retrieved and fed to the agent before planning and execution.
   - Auto-records completed task summaries and diff learnings.

3. **AI Model Factory (Architectural Roadmap — Coming Soon)**
   - Modular abstraction designed for seamless transition from external APIs to in-house proprietary weights without refactoring agent logic.
   - Planned Phase 2: Curated code corpus and instruction-response pair datasets.
   - Planned Phase 3: Fine-tuning pipelines with LoRA and QLoRA on dedicated GPU clusters.
   - Planned Phase 4: Self-hosted vLLM inference serving with hybrid dynamic routing.

---

## 💻 Technology Stack

### Frontend
- **Framework**: Next.js 15 App Router (TypeScript, React 19)
- **Styling**: Tailwind CSS with custom Dark Charcoal (`#0B0F17`), Electric Violet (`#8B5CF6`), and Subtle Cyan (`#06B6D4`) design language.
- **Components**: Radix UI primitives, Lucide React icons, Tailwind Merge.
- **State & Networking**: Custom React Auth Context, WebSocket real-time log hook.

### Backend
- **Framework**: Python 3.12+ with FastAPI & Uvicorn.
- **Validation**: Pydantic v2 & Pydantic Settings.
- **Database & ORM**: SQLAlchemy 2 (Async), PostgreSQL with pgvector extension (production) & SQLite Async fallback (zero-config local dev).
- **Security & Crypto**: Argon2 password hashing, Fernet (AES-128-CBC + HMAC-SHA256) secret encryption, PyJWT.
- **Real-time**: WebSockets for live agent execution telemetry and log broadcasting.

### Isolation & Execution
- **Sandbox**: Dual-runner architecture (Docker Sandbox Runner with CPU/memory limits + Local Restricted Runner with strict path traversal barriers).

---

## 🚀 Quickstart Guide

### Option 1: Docker Compose (Full Stack with PostgreSQL & Redis)

1. Clone repository and navigate to root:
   ```powershell
   git clone https://github.com/your-org/JGitLab.git
   cd JGitLab
   ```

2. Copy the environment variables:
   ```powershell
   Copy-Item .env.example .env
   ```

3. Build and start containers:
   ```powershell
   docker compose up --build
   ```

4. Access the applications:
   - **Frontend UI**: [http://localhost:3000](http://localhost:3000)
   - **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option 2: Native Local Development (Windows 11 / macOS / Linux)

#### Backend Setup
```powershell
cd backend

# Create virtual environment
uv venv --python 3.12 .venv
# Or: python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\activate   # Windows
# source .venv/bin/activate # Linux/macOS

# Install dependencies
uv pip install -r requirements.txt

# Run seed script (creates admin/dev accounts and demo project)
python seed.py

# Launch FastAPI server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### Frontend Setup
```powershell
cd frontend

# Install dependencies
npm install

# Run Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Pre-Seeded Developer Accounts

| Role | Email | Password |
|---|---|---|
| **Lead Architect (Admin)** | `admin@jgitlab.local` | `JGitLab2026!Admin` |
| **Platform Engineer** | `engineer@jgitlab.local` | `JGitLab2026!Dev` |

---

## 🧪 Running Automated Tests

Run the backend test suite:
```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -v
```

Tests include:
- `test_auth.py`: User registration, Argon2 login verification, token decoding.
- `test_provider.py`: Fernet AES API key encryption, secret masking (`sk-proj...`), provider error mapping (401, 429, timeouts).
- `test_agent_tools.py`: 13 backend agent tools, path traversal barrier validation (`../../escaped.txt`), `.env` policy protection.
- `test_memory.py`: Engineering Memory storage, ADR recording, semantic search.
- `test_projects.py`: Project lifecycle and activity audit logging.

---

## 🛡️ Security Guarantees

- **API Keys & Secrets**: Encrypted at rest using Fernet with a 32-byte secret key. Keys are never logged, never returned in cleartext via API endpoints, and displayed strictly masked (`sk-proj-****abcd`).
- **Filesystem Sandbox**: All agent tools enforce `os.path.commonpath([workspace, target]) == workspace`. Directory traversal outside the workspace is physically prevented. Access to `.env` files is blocked by security policy.
- **Human-in-the-Loop Approval**: Plans require user authorization before execution starts. Dangerous operations (such as file deletions) pause execution and require explicit approval.
