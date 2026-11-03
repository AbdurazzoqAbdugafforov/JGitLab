# Windows 11 Local Setup Guide for JGitLab

This guide covers running **JGitLab** locally on Windows 11 with native PowerShell or Docker Desktop + WSL2.

---

## 📋 Prerequisites

1. **Windows 11** (Build 22000+)
2. **Python 3.12** (or `uv` / Python 3.11+)
3. **Node.js v20+** and **npm**
4. **Git for Windows** (v2.40+)
5. *(Optional)* **Docker Desktop for Windows** with WSL2 backend enabled.

---

## 🛠️ Step-by-Step Native Setup (Fastest for Development)

### 1. Clone & Open Terminal

Open **PowerShell** (Run as Administrator or regular user):
```powershell
cd C:\Users\acer\Desktop\JGitLab
```

### 2. Configure Environment

Copy the example environment file:
```powershell
Copy-Item .env.example .env
```

### 3. Backend Setup

```powershell
cd backend

# Create Python 3.12 virtual environment
uv venv --python 3.12 .venv

# Activate virtual environment
.\.venv\Scripts\activate

# Install dependencies
uv pip install -r requirements.txt

# Run initial seed script (creates tables, initial admin user, and memories)
python seed.py

# Start backend server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Verify backend health at: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)  
Interactive OpenAPI documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 4. Frontend Setup

Open a second PowerShell window:
```powershell
cd C:\Users\acer\Desktop\JGitLab\frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Docker Desktop & WSL2 Deployment

If you prefer running the full containerized stack (including PostgreSQL 16 with pgvector and Redis):

1. Launch **Docker Desktop** on Windows 11.
2. In PowerShell, navigate to `C:\Users\acer\Desktop\JGitLab`.
3. Run:
   ```powershell
   docker compose up --build -d
   ```
4. Check container logs:
   ```powershell
   docker compose logs -f backend
   ```
5. Access:
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend: [http://localhost:8000](http://localhost:8000)

---

## 🔍 Verifying the 14 User Workflows

1. **Workflow 1 (Register & Login)**:
   - Navigate to [http://localhost:3000/login](http://localhost:3000/login).
   - Click "Lead Architect" quick login or sign up with a new account.
2. **Workflow 2 & 3 (AI Provider Configuration & Validation)**:
   - Go to **AI Provider Settings** (`/settings/providers`).
   - Enter your OpenAI or OpenAI-compatible endpoint (OpenRouter, Groq, Ollama) and API key.
   - Click **"Validate Connection (Live Ping)"**. Observe real latency and available models.
   - Click **Save & Encrypt**.
3. **Workflow 4 & 5 (GitHub Connection & Repo Analysis)**:
   - Go to **GitHub Integration** (`/github`).
   - Connect with your Personal Access Token (PAT).
   - Select a repository to attach to your active project.
   - Inspect static analysis in **Repository Explorer** (`/repository`).
4. **Workflow 6, 7 & 8 (Task Planning & Approval)**:
   - Open **AI Software Engineer** (`/engineer`).
   - Submit a task (e.g., `"Add health check endpoint with database ping"`).
   - Review the structured plan, risk analysis, and testing strategy.
   - Click **Approve & Execute Task**.
5. **Workflow 9 & 10 (Sandboxed Execution & Automated Tests)**:
   - Watch the live execution stream over WebSockets as the agent runs tools (`create_file`, `edit_file`, `run_tests`).
6. **Workflow 11 & 12 (Diff Review & Pull Request Preparation)**:
   - Open **Agent Task Workspace** (`/tasks`).
   - Inspect the unified code diff with colored line-by-line additions/deletions.
   - Click **Authorize Pull Request** to create the branch and open a PR on GitHub.
7. **Workflow 13 & 14 (Engineering Memory & Dashboard)**:
   - Check **Engineering Memory** (`/memory`) to see automatic task post-mortems and search ADRs.
   - Check **Overview Dashboard** (`/dashboard`) for real task counts, tokens consumed, and audit trail.
