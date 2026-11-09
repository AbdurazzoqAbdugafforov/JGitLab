"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  JGitLabLogoMark,
  JGitLabSplashLoader,
  JGitLabWordmark,
  JGitLabRefreshIcon,
} from "@/components/brand/JGitLabBrand";
import {
  Terminal,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  GitPullRequest,
  Database,
  Cpu,
  CheckCircle2,
  FolderGit2,
  Lock,
  Play,
  Loader2,
  Layers,
  Code2,
} from "lucide-react";

const PIPELINE_STAGES = [
  {
    id: "analyze",
    step: "01",
    title: "Static Repository Inspection",
    badge: "metadata: read",
    summary: "Maps TypeScript AST, NestJS modules, Next.js routes, package manifests, and entrypoints.",
    terminal: [
      "$ jgitlab analyze --repo jgitlab/core --branch main",
      "[INFO] Detected stack: TypeScript 5.7, NestJS 11, Next.js 15 App Router",
      "[INFO] Project structure: 38 backend modules, 24 client routes, 8 tool executors",
      "[OK] Indexed package.json manifests & 5 Architectural Decision Records (ADRs)",
    ],
  },
  {
    id: "plan",
    step: "02",
    title: "Deterministic AI Task Planning",
    badge: "AI Provider Gateway",
    summary: "Synthesizes structured implementation steps, sandbox tests, and safety checkpoints.",
    terminal: [
      "$ jgitlab plan --task 'Implement RBAC AdminGuard and active session telemetry'",
      "[PLAN] Step 1: Create AdminGuard verifying role === 'admin' || is_superuser",
      "[PLAN] Step 2: Implement AdminController with user CRUD and session revocation",
      "[PLAN] Step 3: Run integration test suite verifying 403 Forbidden for non-admins",
      "[GATE] Risk Level: LOW · Status: AWAITING_HUMAN_APPROVAL",
    ],
  },
  {
    id: "sandbox",
    step: "03",
    title: "Path-Isolated Sandbox Runner",
    badge: "Sanitized Child Process",
    summary: "Applies code diffs in a quarantined directory and executes automated Jest test suites.",
    terminal: [
      "$ npm test -- --runInBand test/admin.spec.ts",
      "PASS test/admin.spec.ts (7.105 s)",
      "  Admin Module & RBAC Security Suite",
      "    √ Enforces RBAC: Admin succeeds, Engineer gets 403 Forbidden (185 ms)",
      "[OK] 4 passed in 7.10s · 0 regressions detected · Secrets sanitized",
    ],
  },
  {
    id: "pr",
    step: "04",
    title: "Unified Diff Review & Pull Request",
    badge: "pull_requests: write",
    summary: "Presents syntax-highlighted git diffs and creates verified GitHub pull requests.",
    terminal: [
      "diff --git a/backend/src/auth/admin.guard.ts b/backend/src/auth/admin.guard.ts",
      "@@ -0,0 +1,42 @@",
      "+@Injectable()",
      "+export class AdminGuard implements CanActivate { ... }",
      "[PR] Opened Pull Request #24 -> main (Verified by JGitLab AI Engineer)",
    ],
  },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return <JGitLabSplashLoader label="Loading JGitLab Platform..." fullScreen />;
  }

  const stage = PIPELINE_STAGES[activeStage];

  return (
    <div className="min-h-screen bg-[#0A0D14] bg-hero-glow text-[#F0F6FC] flex flex-col justify-between selection:bg-[#1F6FEB] selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-[#30363D] bg-[#0D1117]/95 backdrop-blur-md sticky top-0 z-50">
        <div className="h-[2px] w-full bg-gradient-to-r from-[#1F6FEB] via-[#388BFD]/50 to-transparent" />
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <JGitLabLogoMark size="md" glow />
            <div className="flex items-center gap-2.5">
              <JGitLabWordmark size="md" />
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#1F6FEB]/15 text-[#58A6FF] border border-[#1F6FEB]/30 font-mono uppercase tracking-wider">
                Enterprise v2.5
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-[#8B949E]">
            <a href="#pipeline" className="hover:text-[#F0F6FC] transition-colors">
              Autonomous Pipeline
            </a>
            <a href="#pillars" className="hover:text-[#F0F6FC] transition-colors">
              Platform Architecture
            </a>
            <a href="#security" className="hover:text-[#F0F6FC] transition-colors">
              Security &amp; Scope
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-medium text-[#C9D1D9] hover:text-white px-2.5 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="h-8 px-3.5 text-xs sm:text-sm font-semibold rounded-md jgitlab-btn-glow text-white flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24 space-y-24 flex-1 w-full">
        {/* Split Hero + Interactive Pipeline Preview */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left 6 cols: Value Proposition */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1F6FEB]/10 border border-[#1F6FEB]/30 text-[#58A6FF] text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 text-[#58A6FF]" />
              <span>Enterprise Autonomous Engineering Runtime</span>
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold tracking-tight leading-[1.12] text-[#F0F6FC]">
              One platform to{" "}
              <span className="bg-gradient-to-r from-[#58A6FF] via-[#79C0FF] to-[#F0F6FC] bg-clip-text text-transparent">
                build, verify, and ship
              </span>{" "}
              production code.
            </h1>

            <p className="text-base sm:text-lg text-[#8B949E] leading-relaxed max-w-xl">
              Connect your GitHub repositories with fine-grained scope, synthesize deterministic execution plans, verify changes inside an isolated sandbox, and open verified pull requests backed by persistent Engineering Memory.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="h-10 px-5 text-sm font-semibold rounded-md jgitlab-btn-glow text-white flex items-center gap-2"
              >
                <span>Launch JGitLab Studio</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/login"
                className="h-10 px-4 text-sm font-medium rounded-md bg-[#21262D] hover:bg-[#30363D] text-[#F0F6FC] border border-[#30363D] flex items-center gap-2 transition-all"
              >
                <Terminal className="w-4 h-4 text-[#58A6FF]" />
                <span>Sign In to Workspace</span>
              </Link>
            </div>

            {/* Trust Specs */}
            <div className="pt-4 grid grid-cols-3 gap-4 border-t border-[#30363D] text-xs">
              <div>
                <span className="font-mono text-[#58A6FF] font-semibold block">GitHub App v2</span>
                <span className="text-[#8B949E]">All or Selected Repos</span>
              </div>
              <div>
                <span className="font-mono text-[#58A6FF] font-semibold block">Human-in-Loop</span>
                <span className="text-[#8B949E]">Mandatory Plan Gate</span>
              </div>
              <div>
                <span className="font-mono text-[#3FB950] font-semibold block">Fernet AES-128</span>
                <span className="text-[#8B949E]">Zero-Leak Key Vault</span>
              </div>
            </div>
          </div>

          {/* Right 6 cols: Interactive Pipeline Simulator */}
          <div id="pipeline" className="lg:col-span-6">
            <div className="rounded-xl border border-[#30363D] bg-[#0D1117] shadow-2xl overflow-hidden">
              {/* Window Top Bar */}
              <div className="px-4 py-2.5 border-b border-[#30363D] bg-[#161B22] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F85149]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D29922]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3FB950]" />
                  <span className="ml-2 text-xs font-mono text-[#C9D1D9]">
                    jgitlab-agent://autonomous-pipeline
                  </span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#238636]/15 text-[#3FB950] border border-[#238636]/40">
                  Interactive Preview
                </span>
              </div>

              {/* Stage Selector Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#30363D] bg-[#0A0D14]">
                {PIPELINE_STAGES.map((s, idx) => {
                  const isSelected = idx === activeStage;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveStage(idx)}
                      className={`p-3 text-left transition-all border-b-2 ${
                        isSelected
                          ? "border-[#1F6FEB] bg-[#1F6FEB]/10 text-[#F0F6FC]"
                          : "border-transparent text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#161B22]"
                      }`}
                    >
                      <span className="text-[10px] font-mono text-[#58A6FF] block">
                        STEP {s.step}
                      </span>
                      <span className="text-xs font-semibold truncate block mt-0.5">
                        {s.title.split(" ")[0]} {s.title.split(" ")[1]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Stage Detail & Terminal Output */}
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#F0F6FC]">{stage.title}</h3>
                    <p className="text-xs text-[#8B949E] mt-0.5">{stage.summary}</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1F6FEB]/15 text-[#58A6FF] border border-[#1F6FEB]/30 shrink-0">
                    {stage.badge}
                  </span>
                </div>

                <div className="rounded-lg bg-[#0A0D14] border border-[#30363D] p-4 font-mono text-xs space-y-2 min-h-[175px]">
                  {stage.terminal.map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.startsWith("$")
                          ? "text-[#58A6FF] font-semibold"
                          : line.startsWith("+")
                          ? "text-[#3FB950] bg-[#238636]/15 px-1.5 py-0.5 rounded"
                          : line.includes("PASSED") || line.startsWith("[OK]") || line.startsWith("[PR]")
                          ? "text-[#3FB950]"
                          : line.startsWith("[GATE]")
                          ? "text-[#E3B341]"
                          : "text-[#C9D1D9]"
                      }
                    >
                      {line}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-[#8B949E] font-mono">
                  <span>Click any stage above to inspect execution telemetry</span>
                  <Link href="/login" className="text-[#58A6FF] hover:underline">
                    Open live console →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Three Platform Pillars Bento Grid */}
        <section id="pillars" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#58A6FF]">
                Unified Architecture
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#F0F6FC] tracking-tight mt-1">
                Three Long-Term Engineering Pillars
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#8B949E] max-w-md">
              Built API-first today for external frontier models, architected for zero-rewrite integration of proprietary models tomorrow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-interactive p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-md bg-[#1F6FEB]/15 border border-[#1F6FEB]/30 flex items-center justify-center text-[#58A6FF]">
                  <Code2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#238636]/15 text-[#3FB950] border border-[#238636]/40">
                  Pillar 1 · Active MVP
                </span>
              </div>
              <h3 className="text-base font-bold text-[#F0F6FC]">Autonomous AI Software Engineer</h3>
              <p className="text-xs sm:text-sm text-[#8B949E] leading-relaxed">
                Analyzes repositories, synthesizes structured execution plans, pauses for human approval, executes controlled file modifications, runs unit tests, and prepares GitHub pull requests.
              </p>
            </div>

            <div className="card-interactive p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-md bg-[#1F6FEB]/15 border border-[#1F6FEB]/30 flex items-center justify-center text-[#58A6FF]">
                  <Database className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#238636]/15 text-[#3FB950] border border-[#238636]/40">
                  Pillar 3 · Active MVP
                </span>
              </div>
              <h3 className="text-base font-bold text-[#F0F6FC]">Persistent Engineering Memory</h3>
              <p className="text-xs sm:text-sm text-[#8B949E] leading-relaxed">
                Stores Architectural Decision Records (ADRs), repository conventions, bug-fix root causes, and tech stack rules—automatically injected into every planning cycle.
              </p>
            </div>

            <div className="card-interactive p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-md bg-[#1F6FEB]/15 border border-[#1F6FEB]/30 flex items-center justify-center text-[#58A6FF]">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#D29922]/15 text-[#E3B341] border border-[#D29922]/40">
                  Pillar 2 · Roadmap Module
                </span>
              </div>
              <h3 className="text-base font-bold text-[#F0F6FC]">AI Model Factory Ready</h3>
              <p className="text-xs sm:text-sm text-[#8B949E] leading-relaxed">
                Provider-independent AI gateway abstraction (`OpenAICompatibleProvider`) designed so future fine-tuned checkpoints and vLLM clusters plug in without rewriting the agent runtime.
              </p>
            </div>
          </div>
        </section>

        {/* Role Separation Architecture Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#A371F7]">
                Access Control &amp; RBAC
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#F0F6FC] tracking-tight mt-1">
                Two Purpose-Built Profiles: Admin vs Engineer
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#8B949E] max-w-md">
              Least-privilege separation ensures engineers focus on code delivery while system architects oversee governance, active sessions, and security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-interactive p-6 space-y-4 border border-[#A371F7]/30 bg-[#161B22]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-md bg-[#A371F7]/15 border border-[#A371F7]/30 flex items-center justify-center text-[#A371F7]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#F0F6FC]">Lead Architect (Admin)</h3>
                    <span className="text-[10px] font-mono text-[#D2A8FF]">Superuser · Full Platform Scope</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#A371F7]/15 text-[#D2A8FF] border border-[#A371F7]/30">
                  System Governance
                </span>
              </div>
              <ul className="space-y-2 text-xs text-[#C9D1D9]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3FB950] mt-0.5 shrink-0" />
                  <span><strong>Global Project Access:</strong> Inspect and manage all workspaces and repositories across the organization.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3FB950] mt-0.5 shrink-0" />
                  <span><strong>User Provisioning:</strong> Create accounts directly, promote to admin, suspend accounts, and reset passwords.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3FB950] mt-0.5 shrink-0" />
                  <span><strong>Session &amp; Token Invalidation:</strong> Real-time visibility into all active sessions with 1-click token revocation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3FB950] mt-0.5 shrink-0" />
                  <span><strong>Security Management:</strong> Dedicated Admin Console with telemetry, audit trails, and runtime OAuth configuration.</span>
                </li>
              </ul>
            </div>

            <div className="card-interactive p-6 space-y-4 border border-[#58A6FF]/30 bg-[#161B22]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-md bg-[#1F6FEB]/15 border border-[#1F6FEB]/30 flex items-center justify-center text-[#58A6FF]">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#F0F6FC]">Platform Engineer</h3>
                    <span className="text-[10px] font-mono text-[#58A6FF]">Developer · Scoped Project Scope</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1F6FEB]/15 text-[#58A6FF] border border-[#1F6FEB]/30">
                  Engineering Delivery
                </span>
              </div>
              <ul className="space-y-2 text-xs text-[#C9D1D9]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#58A6FF] mt-0.5 shrink-0" />
                  <span><strong>Workspace Isolation:</strong> Restricted exclusively to repositories and projects where the engineer has membership.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#58A6FF] mt-0.5 shrink-0" />
                  <span><strong>Autonomous Task Execution:</strong> Run AI plans, execute sandbox test suites, inspect unified diffs, and create PRs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#58A6FF] mt-0.5 shrink-0" />
                  <span><strong>Engineering Memory:</strong> Store and query architectural decisions, tech stack notes, and bug fix learnings.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#F85149] mt-0.5 shrink-0" />
                  <span><strong>No Admin Privileges:</strong> Cannot alter system configurations, access other users’ sessions, or view unauthorized repos.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Security & GitHub App Section */}
        <section
          id="security"
          className="rounded-xl border border-[#30363D] bg-[#161B22] p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
        >
          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[#3FB950]">
              <ShieldCheck className="w-4 h-4" />
              <span>ZERO-TRUST IDENTITY &amp; REPOSITORY GOVERNANCE</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#F0F6FC]">
              Strict Separation of User Authentication &amp; Repository Scope
            </h3>
            <p className="text-xs sm:text-sm text-[#8B949E] leading-relaxed">
              Signing in with Google or GitHub verifies your identity only (`read:user`, `user:email`). Repository access is granted separately via the GitHub App where you choose either <strong>All Repositories</strong> or <strong>Selected Repositories</strong>.
            </p>
          </div>
          <div className="lg:col-span-5 grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#30363D]">
              <Lock className="w-4 h-4 text-[#58A6FF] mb-1.5" />
              <div className="text-[#F0F6FC] font-semibold">PKCE + State</div>
              <div className="text-[11px] text-[#8B949E]">OAuth 2.0 CSRF Protection</div>
            </div>
            <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#30363D]">
              <FolderGit2 className="w-4 h-4 text-[#58A6FF] mb-1.5" />
              <div className="text-[#F0F6FC] font-semibold">Scoped Repos</div>
              <div className="text-[11px] text-[#8B949E]">Enforced per API call</div>
            </div>
            <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#30363D]">
              <CheckCircle2 className="w-4 h-4 text-[#3FB950] mb-1.5" />
              <div className="text-[#F0F6FC] font-semibold">Argon2 + Fernet</div>
              <div className="text-[11px] text-[#8B949E]">Encrypted credentials</div>
            </div>
            <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#30363D]">
              <GitPullRequest className="w-4 h-4 text-[#58A6FF] mb-1.5" />
              <div className="text-[#F0F6FC] font-semibold">Verified PRs</div>
              <div className="text-[11px] text-[#8B949E]">Human approval gate</div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#30363D] bg-[#0D1117] py-8 text-center text-xs text-[#8B949E] font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <JGitLabLogoMark size="sm" glow />
            <JGitLabWordmark size="sm" />
            <span>· Autonomous AI Software Engineering Platform</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-[#F0F6FC]">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-[#F0F6FC]">
              Register
            </Link>
            <Link href="/help" className="hover:text-[#F0F6FC]">
              Documentation
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
