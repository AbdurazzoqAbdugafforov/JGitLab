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

---

## ✅ Quality Verification & QA Certification

### QA Standards Compliance

**JGitLab v1.0.0** (Backend v0.2.0) complies with enterprise-grade quality standards:

- **Test Framework**: Jest with ts-jest (TypeScript support) configured in NestJS backend
- **Test Coverage**: All critical modules include `.spec.ts` unit and integration tests
- **Test Execution**: `npm test` runs Jest in single-band mode for deterministic results
- **Code Quality**: TypeScript strict mode enabled; type safety enforced across codebase
- **Type Checking**: `npm run typecheck` validates TypeScript compilation without emitting code

### Autonomous Execution Safety Gates

The Autonomous AI Software Engineer implements **human-in-the-loop approval gating** for all operations:

1. **Planning Phase**: Agent analyzes task, identifies risks, generates step-by-step plan with testing strategy
2. **Approval Gate**: Human reviews plan, identifies concerns, and explicitly approves execution
3. **Sandboxed Execution**: All code changes execute within secure sandbox environment; no production impact until approved
4. **Verification Phase**: Automated tests run post-execution; unified git diffs reviewed before action
5. **Remote Operations**: **Explicit human approval required** for all GitHub push operations per ADR standards

**Safety-Critical Operations Requiring Explicit Approval**:
- Remote git push to GitHub repositories
- Modifications to authentication or authorization controls
- Infrastructure-as-code changes affecting live resources
- Destructive operations (file deletion, database operations, etc.)

### Verification Procedures

#### Backend Verification
```powershell
# Unit and integration tests
cd backend
npm test

# Type checking
npm run typecheck

# Build verification
npm run build
```

#### Frontend Verification
```powershell
# Development build verification
cd frontend
npm run build

# Next.js linting
npm run lint
```

#### End-to-End Workflow
1. **Code Changes**: Autonomous agent implements changes in sandboxed environment
2. **Automated Testing**: Jest runs test suite; all tests must pass before proceeding
3. **Diff Review**: Unified git diff generated and reviewed in `/reviews` endpoint
4. **Approval Request**: System requests explicit human approval for remote push
5. **Remote Operation**: Only after human approval, changes are pushed to GitHub

### Certification Details

| Aspect | Status | Details |
|--------|--------|---------|
| **Project Name** | ✅ Certified | JGitLab Autonomous AI Software Engineering Platform |
| **Version** | ✅ v1.0.0 | Root package; Backend v0.2.0 |
| **Backend Framework** | ✅ NestJS 11 | TypeScript-based, strict mode enabled |
| **Frontend Framework** | ✅ Next.js 15 | App Router, production-ready |
| **Test Framework** | ✅ Jest 29.7.0 | ts-jest transformer, single-band execution |
| **Type Safety** | ✅ TypeScript 5.7 | Strict mode, `noEmit` type checking |
| **Human Approval Gates** | ✅ Implemented | Required for remote operations per ADR standards |
| **Autonomous Execution** | ✅ Implemented | Sandboxed with verification strategy |
| **Last Verified** | ✅ Current Release | v1.0.0 / Backend v0.2.0 |

### Autonomous Execution Requirements

For safe autonomous operation:

1. **Environment Isolation**: All code changes execute in sandboxed workspace; verified before remote operations
2. **Deterministic Testing**: Jest runs with `--runInBand` flag for consistent test results
3. **Planning Transparency**: Agent generates detailed risk analysis and testing strategy before execution
4. **Explicit Approval**: No remote operations proceed without human authorization
5. **Audit Trail**: All task executions logged with planning phase, risk analysis, approval status, and execution results

### Support & Verification Contact

For QA certification questions or verification procedures:
- Backend Issues: Review `npm test` output and jest configuration in `backend/package.json`
- Frontend Issues: Review Next.js build logs and `frontend/next.config.ts`
- Architectural Questions: Consult persistent memory store (`/memory`) and ADR documentation
- GitHub Integration: Verify GitHub App configuration in **Settings > Connected Apps**

---