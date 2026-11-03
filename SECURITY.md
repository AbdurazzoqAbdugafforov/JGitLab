# JGitLab Security Policy & Architecture

Security is a foundational pillar of **JGitLab**. Because an autonomous engineering platform interacts with external AI APIs, sensitive repositories, and code execution environments, strict defense-in-depth measures are enforced across all layers.

---

## 🔒 1. Authentication & Session Security

- **Password Hashing**: Passwords are never stored in cleartext. JGitLab utilizes the **Argon2id** algorithm via `passlib[argon2]` and `argon2-cffi`, the password-hashing winner designed to resist GPU/ASIC cracking.
- **Session Tokens**: JWT access tokens are signed using HMAC-SHA256 with a cryptographically random secret key (`SECRET_KEY`).
- **Cookie Flags**: Tokens delivered to the browser are configured with `HttpOnly`, preventing extraction by malicious client-side JavaScript (mitigating XSS). `SameSite=Lax` is enforced to prevent Cross-Site Request Forgery (CSRF).
- **Authorization**: All permission checks are performed strictly on the backend. Frontend routes never gate sensitive data alone.

---

## 🔑 2. Cryptographic Secret Management

- **External AI API Keys & GitHub Tokens**: Stored at rest using **Fernet symmetric encryption** (`cryptography` library), which implements AES-128 in CBC mode with PKCS7 padding and HMAC-SHA256 authentication using a 256-bit URL-safe base64 key (`ENCRYPTION_KEY`).
- **Zero Raw Exposure Policy**:
  - Raw API keys and GitHub tokens are decrypted in-memory only during the exact duration of external provider network requests.
  - Secret keys are **never returned in plain text** in normal API responses.
  - In all UI lists and REST endpoints, secrets are strictly masked (e.g. `sk-proj...wxyz`).
  - Secrets are never written to application logs, audit trails, or Git commits.

---

## 🛡️ 3. Execution Sandboxing & Filesystem Protection

Autonomous agents run commands and modify code inside controlled workspaces. Untrusted model outputs are never executed directly on the developer's raw host system:

- **Path Traversal Prevention**:
  Before any file tool (`read_file`, `create_file`, `edit_file`, `delete_file`) executes, the path is normalized and validated:
  ```python
  if not combined.startswith(workspace_real) and os.path.commonpath([workspace_real, combined]) != workspace_real:
      raise PermissionError("Access denied: Path attempts to traverse outside workspace boundary.")
  ```
  Path traversal attempts like `../../etc/passwd` or `..\outside.txt` are caught and blocked immediately.
- **Protected File Patterns**:
  Files matching `.env`, `.env.*`, `id_rsa`, `*.pem`, and `*.key` cannot be created, edited, or read by the AI agent.
- **System Command Filtering**:
  Destructive system commands (such as `rm -rf /`, `mkfs`, fork bombs) are filtered and terminated prior to process invocation.
- **Docker Isolation**:
  In containerized environments, commands run in ephemeral containers with:
  - Strict RAM ceiling (`--memory=1024m`).
  - CPU quota (`--cpus=1.0`).
  - Process limits (`--pids-limit=64`).
  - Non-root execution.
  - Read-only mounts or isolated workspace bounds.
  - Network disabled by default during untrusted compilation.

---

## 🚦 4. Human-in-the-Loop Approval & Cost Guards

- **Plan Approval Barrier**: The agent cannot execute modifications without explicit user approval of the implementation plan.
- **Destructive Operation Pauses**: High-risk operations (such as `delete_file`) immediately pause the agent execution loop, create an approval request, and notify the user.
- **Infinite Loop Prevention**: Every task enforces `MAX_TASK_STEPS` (default: 25) and `MAX_TASK_TOKENS` (default: 150,000). The agent is aborted if consecutive tool failures reach threshold or if execution times out.
- **No Automatic Deployment**: Changes remain on dedicated feature branches (`jgitlab/task-...`). The platform prepares Pull Requests for human review; code is never automatically merged to production branches.

---

## 📋 5. Audit Logging

Every significant security event (user registration, provider credential save, GitHub connection, task creation, plan approval, and PR preparation) generates an immutable `ActivityLog` entry recording timestamp, actor, entity ID, action type, and optional IP address.
