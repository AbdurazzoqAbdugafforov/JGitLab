# JGitLab — Next-Generation AI Engineering Platform

> **"One intelligent platform to build, understand, and evolve AI-powered software."**

**JGitLab** is an API-first Autonomous AI Software Engineering platform built with a **NestJS 11 (TypeScript)** backend and a **Next.js 15 App Router** frontend. It orchestrates external AI model APIs, a least-privilege GitHub App integration, and persistent engineering memory to inspect repositories, plan multi-step implementations, execute sandboxed code changes, verify with automated tests, review unified diffs, and prepare GitHub Pull Requests.

---

## 🏛️ Core Architecture & Pillars

1. **Autonomous AI Software Engineer (Active MVP)**
   - Natural-language engineering task workspace (`/engineer`, `/tasks`, `/reviews`).
   - Structured step-by-step task planning with risk evaluation and testing strategy.
   - Human-in-the-loop approval gating before code execution or destructive operations.
   - 12 backend agent tools (`list_files`, `read_file`, `search_code`, `create_file`, `edit_file`, `delete_file`, `run_tests`, `run_linter`, `run_build`, `inspect_git_diff`, etc.).
   - Post-execution unified git diff review (`/reviews`) and automated pull request preparation.

2. **Identity Authentication vs. GitHub App Repository Access**
   - **Google OAuth 2.0 / OIDC Login** (`openid email profile`): PKCE S256 + ID token verification + verified email enforcement.
   - **GitHub OAuth 2.0 Login** (`read:user user:email`): Authenticates user identity only; never requests broad repository scopes at sign-in.
   - **GitHub App Installation** (`/github`): Separate, user-controlled repository authorization supporting **Option A (All Repositories)** and **Option B (Selected Repositories)** with minimal permissions (`metadata: read`, `contents: write`, `pull_requests: write`, `checks: read`).
   - **Multi-Provider Account Linking** (`/settings/account`): Link Google and GitHub to the same account with lockout protection.

3. **Persistent Engineering Memory (`/memory`)**
   - Project-scoped store for architecture notes, technology stack decisions, ADRs, and bug fix learnings.
   - Hybrid semantic + keyword retrieval automatically injected into agent planning context.

4. **AI Model Factory (`/model-factory` — Architectural Roadmap)**
   - Provider-independent `AIProvider` interface ready for future fine-tuned models without rewriting agent orchestration.

---

## 🚀 Quickstart Guide

### 1. NestJS Backend Setup
```powershell
cd backend
npm install
npm run build
npm run start:dev
```
The NestJS backend listens on `http://127.0.0.1:8000` (API prefix `/api/v1`, health check `/health`, WebSocket `/ws/tasks/:taskId` and `/ws/global`) and automatically seeds default accounts, projects, and architectural memories on first startup.

### 2. Next.js Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🔑 Pre-Seeded Developer & Judge Accounts

| Role | Email | Password | 1-Click Login |
|---|---|---|---|
| **Lead Architect (Admin)** | `abdurazzoqabdugafforov54@gmail.com` | `Admin12345!` | Available on `/login` |
| **System Admin** | `admin@jgitlab.local` | `Admin12345!` | Available on `/login` |
| **Platform Engineer** | `engineer@jgitlab.local` | `Admin12345!` | Available on `/login` |

---

## 🧪 Running Automated Tests

```powershell
cd backend
npm test
```
