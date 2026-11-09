# Windows 11 Local Setup Guide for JGitLab

This guide covers running **JGitLab** locally on Windows 11 with Node.js (NestJS backend + Next.js frontend) or Docker Desktop.

---

## 📋 Prerequisites

1. **Windows 11** (Build 22000+)
2. **Node.js v20+** and **npm**
3. **Git for Windows** (v2.40+)
4. *(Optional)* **Docker Desktop for Windows** with WSL2 backend enabled.

---

## 🛠️ Step-by-Step Native Setup

### 1. Configure Environment

Copy the example environment file if `.env` does not exist:
```powershell
Copy-Item .env.example .env
```

### 2. NestJS Backend Setup

```powershell
cd backend
npm install
npm run build
npm run start:dev
```

Verify backend health at: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### 3. Next.js Frontend Setup

Open a second PowerShell window:
```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
