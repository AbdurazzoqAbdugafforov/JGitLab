# JGitLab System Architecture

This document describes the architectural principles, module boundaries, data flows, and future migration paths of the **JGitLab** platform.

---

## 🏗️ High-Level System Architecture

```mermaid
flowchart TD
    User["Developer / Engineer"] -->|HTTPS / Next.js 15 UI| Frontend["Frontend (Next.js App Router)"]
    Frontend -->|REST API & WebSockets| Backend["FastAPI Backend Core"]

    subgraph Backend_Core ["FastAPI Backend Services"]
        AuthSvc["Auth & RBAC (Argon2 + JWT)"]
        ProviderSvc["AI Provider Gateway (AES-Fernet)"]
        PlannerSvc["Task Planner & Risk Evaluator"]
        ExecEngine["Agent Execution Engine (Loop & Budget Guard)"]
        MemorySvc["Engineering Memory (Vector + Keyword)"]
        GitHubSvc["GitHub Client & Repo Analyzer"]
    end

    Backend --> AuthSvc
    Backend --> ProviderSvc
    Backend --> ExecEngine
    Backend --> MemorySvc
    Backend --> GitHubSvc

    ExecEngine --> ToolExec["Tool Registry (13 Agent Tools)"]

    subgraph Sandbox_Layer ["Sandboxed Execution Boundary"]
        DockerRunner["Docker Runner (Non-root, CPU/RAM Limit)"]
        LocalRunner["Local Restricted Runner (Path-Traversal Guard)"]
        WorkspaceFS["Ephemeral Task Workspace"]
    end

    ToolExec --> DockerRunner
    ToolExec --> LocalRunner
    DockerRunner --> WorkspaceFS
    LocalRunner --> WorkspaceFS

    subgraph Data_Storage ["Persistent Storage"]
        PostgreSQL[("PostgreSQL 16 + pgvector")]
        RedisQueue[("Redis Job & Event Bus")]
        EncryptedVault[("Encrypted Secrets Vault")]
    end

    Backend_Core --> PostgreSQL
    Backend_Core --> RedisQueue
    Backend_Core --> EncryptedVault

    subgraph External_AI_Providers ["External AI APIs (Initial MVP)"]
        OpenAI["OpenAI API (GPT-4o)"]
        OpenRouter["OpenRouter (Claude 3.5, Llama 3.3)"]
        Groq["Groq Cloud"]
        Ollama["Local vLLM / Ollama"]
    end

    ProviderSvc --> OpenAI
    ProviderSvc --> OpenRouter
    ProviderSvc --> Groq
    ProviderSvc --> Ollama

    subgraph Future_Pillars ["Phase 2-4: Model Factory (Planned)"]
        DataCorpus["Curated Dataset Pipeline"]
        LoRATrainer["LoRA / QLoRA GPU Worker"]
        DedicatedInference["vLLM Proprietary Serving"]
    end

    ProviderSvc -.-> DedicatedInference
```

---

## 🧩 Architectural Modules

### 1. Provider Abstraction (`app.services.ai`)
The core interface is `AIProvider`:
- `validate_connection() -> AIValidationResult`: Live healthcheck and model discovery.
- `generate_response(messages, tools, temperature, max_tokens) -> AIResponse`: Standard completion with tool call parsing.
- `generate_structured_response(messages, schema) -> Dict`: Schema-enforced JSON generation.
- `stream_response(messages, tools) -> AsyncGenerator[AIStreamChunk]`: Token streaming.
- `generate_embedding(text) -> List[float]`: Semantic representation for memory.

The initial implementation is `OpenAICompatibleProvider`. Because modern inference engines (vLLM, TensorRT-LLM, Ollama) and external model APIs (OpenAI, OpenRouter, Groq, DeepSeek) expose this interface, the Autonomous AI Engineer interacts purely with the abstraction. **Transitioning to proprietary fine-tuned weights in Phase 4 requires zero refactoring of agent planning or execution loops.**

### 2. Dual Sandbox Architecture (`app.services.sandbox`)
To prevent host contamination while enabling friction-free development:
- **Docker Runner**: Spins up ephemeral containers with `--memory=1024m`, `--cpus=1.0`, `--pids-limit=64`, and non-root user. Network access is restricted.
- **Local Restricted Runner**: Active in environments where the Docker daemon is inactive. Enforces strict boundary checks via `os.path.commonpath([workspace, target]) == workspace`. Blocks malicious system calls (`rm -rf /`, `mkfs`, fork bombs) and forbids reading/writing `.env` files.

### 3. Engineering Memory Pipeline (`app.services.memory`)
Project knowledge is indexed across 5 distinct categories:
- `architecture`: High-level structural invariants and boundaries.
- `adr`: Architecture Decision Records documenting context, decision, and consequences.
- `tech_stack`: Framework choices, package manifests, and runtime dependencies.
- `bug_fix`: Past issues and exact resolution strategies.
- `task_learning`: Auto-recorded task summaries and diff post-mortems.

When planning a task:
1. The user's prompt is embedded or tokenized.
2. Relevant memories are fetched via cosine similarity (with pgvector or vector math) or scored keyword matching.
3. Relevant memories are injected directly into the LLM system context, ensuring the agent adheres to existing architecture.

---

## 🔄 Agent Execution Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as Developer
    participant UI as Frontend Workspace
    participant API as FastAPI Backend
    participant Mem as Engineering Memory
    participant AI as External AI Provider
    participant Sandbox as Isolated Sandbox

    User->>UI: Submit Engineering Task
    UI->>API: POST /api/v1/agent/tasks
    API->>Mem: Retrieve Relevant ADRs & Context
    Mem-->>API: Architecture Decisions
    API->>AI: Synthesize Structured Implementation Plan
    AI-->>API: Structured Plan (Files, Steps, Risks)
    API-->>UI: Display Plan for Review

    User->>UI: Click "Approve & Execute"
    UI->>API: POST /api/v1/agent/tasks/{id}/approve
    API-->>UI: WebSocket Connected

    loop Execution Loop (Up to MAX_TASK_STEPS)
        API->>AI: Next Step + Available Tools
        AI-->>API: Tool Calls (e.g. read_file, edit_file)
        API->>Sandbox: Execute Tool within Workspace
        Sandbox-->>API: Tool Result / Terminal Output
        API->>UI: Stream Step Telemetry over WebSocket
    end

    API->>Sandbox: Run Automated Verification Tests
    Sandbox-->>API: Test Results (0 Errors)
    API->>Sandbox: Generate Unified Git Diff
    Sandbox-->>API: Diff Output
    API->>Mem: Auto-record Task Learning
    API->>UI: Task Completed, Diff Ready for PR Review
```
