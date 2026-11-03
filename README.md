# JGitLab — Next-Generation AI Engineering Platform

> **"One intelligent platform to build, understand, and evolve AI-powered software."**

**JGitLab** is an API-first Autonomous AI Software Engineering platform built with a Python FastAPI backend and a Next.js 15 App Router frontend. It orchestrates external AI model APIs, a least-privilege GitHub App integration, and persistent engineering memory to inspect repositories, plan multi-step implementations, execute sandboxed code changes, verify with automated tests, review unified diffs, and prepare GitHub Pull Requests.

---

## 🏛️ Core Architecture & Pillars

1. **Autonomous AI Software Engineer (Active MVP)**
   - Natural-language engineering task workspace (`/engineer`, `/tasks`, `/reviews`).
   - Structured step-by-step task planning with risk evaluation and testing strategy.
   - Human-in-the-loop approval gating before code execution or destructive operations.
   - 13 backend agent tools (`list_files`, `read_file`, `search_code`, `create_file`, `edit_file`, `delete_file`, `run_tests`, `run_linter`, `run_build`, `inspect_git_diff`, etc.).
   - Post-execution unified git diff review (`/reviews`) and automated pull request preparation.

2. **Identity Authentication vs. GitHub App Repository Access**
   - **Google OAuth 2.0 / OIDC Login** (`openid email profile`): PKCE S256 + JWKS ID token verification + verified email enforcement.
   - **GitHub OAuth 2.0 Login** (`read:user user:email`): Authenticates user identity only; never requests broad repository scopes at sign-in.
   - **GitHub App Installation** (`/github`): Separate, user-controlled repository authorization supporting **Option A (All Repositories)** and **Option B (Selected Repositories)** with minimal permissions (`metadata: read`, `contents: write`, `pull_requests: write`, `checks: read`).
   - **Multi-Provider Account Linking** (`/settings/account`): Link Google and GitHub to the same account with lockout protection.

3. **Persistent Engineering Memory (`/memory`)**
   - Project-scoped store for architecture notes, technology stack decisions, ADRs, and bug fix learnings.
   - Hybrid semantic + keyword retrieval automatically injected into agent planning context.

4. **AI Model Factory (`/model-factory` — Architectural Roadmap)**
   - Provider-independent `AIProvider` interface ready for future fine-tuned models without rewriting agent orchestration.

---

## 🔐 Configuring OAuth & GitHub App Credentials

Copy `.env.example` to `.env` (or `backend/.env`) and configure:

### 1. Google OAuth 2.0 / OIDC
1. Open the [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Add Authorized Redirect URI:
   - `http://localhost:3000/api/v1/auth/oauth/google/callback`
4. Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in `.env`.

### 2. GitHub OAuth App (Identity Sign-In Only)
1. Open **GitHub Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Set Authorization callback URL:
   - `http://localhost:3000/api/v1/auth/oauth/github/callback`
3. Set `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` in `.env`.

### 3. GitHub App (Repository Access — All or Selected Repositories)
1. Open **GitHub Settings → Developer settings → GitHub Apps → New GitHub App**.
2. Set **Callback URL** and **Setup URL (Redirect on update)**:
   - `http://localhost:3000/api/v1/github/app/callback`
3. Configure **Repository permissions**:
   - `Metadata`: Read-only
   - `Contents`: Read and write
   - `Pull requests`: Read and write
   - `Checks`: Read-only
4. Generate a Private Key (`.pem`) and set in `.env`:
   - `GITHUB_APP_ID`, `GITHUB_APP_NAME` (your app slug), `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, and `GITHUB_APP_PRIVATE_KEY` (or `GITHUB_APP_PRIVATE_KEY_PATH`).

---

## 🚀 Quickstart Guide

### Backend Setup
```powershell
cd backend
.\.venv\Scripts\python.exe seed.py
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend Setup
```powershell
cd frontend
npm install
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🔑 Pre-Seeded Developer Accounts

| Role | Email | Password |
|---|---|---|
| **Lead Architect (Admin)** | `admin@jgitlab.local` | `JGitLab2026!Admin` |
| **Platform Engineer** | `engineer@jgitlab.local` | `JGitLab2026!Dev` |

---

## 🧪 Running Automated Tests

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -v
```

Test coverage (`17 passed`):
- `test_oauth_and_linking.py`: Google OIDC login, GitHub OAuth login, CSRF state validation, denied OAuth handling, unverified email rejection, multi-provider account linking, no silent auto-linking on unauthenticated email collision, unlink lockout protection, session revocation, and logout.
- `test_github_app_and_authz.py`: GitHub App installation URL & signed state, Option A (All Repositories) & Option B (Selected Repositories) callbacks, pending organization approval, repository scope enforcement (`403` on unauthorized repo), revoked installation sync detection, and cross-user project authorization isolation.
- `test_auth.py`, `test_provider.py`, `test_agent_tools.py`, `test_memory.py`, `test_projects.py`.
