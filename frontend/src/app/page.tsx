"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  JGitLabLogoMark,
  JGitLabSplashLoader,
  JGitLabWordmark,
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
    title: "Repository Static Analysis",
    badge: "metadata: read",
    summary: "Scans language distribution, dependency manifests, and entrypoints.",
    terminal: [
      "$ jgitlab analyze --repo jgitlab/ai-engineering-core --branch main",
      "[INFO] Detected languages: Python (64.2%), TypeScript (31.8%), SQL (4.0%)",
      "[INFO] Frameworks: FastAPI 0.115, SQLAlchemy 2.0, Next.js 15 App Router",
      "[OK] Indexed 48 source modules & 3 Architectural Decision Records (ADRs)",
    ],
  },
  {
    id: "plan",
    step: "02",
    title: "Structured AI Task Planning",
    badge: "OpenAI-Compatible Gateway",
    summary: "Synthesizes a deterministic step-by-step execution plan and risk score.",
    terminal: [
      "$ jgitlab plan --task 'Add sliding-window rate limiter to OAuth endpoints'",
      "[PLAN] Step 1: Inspect backend/app/core/middleware.py",
      "[PLAN] Step 2: Implement sliding-window rate limiter keyed by route + IP",
      "[PLAN] Step 3: Add pytest suite verifying 429 Retry-After headers",
      "[GATE] Risk Level: LOW · Status: AWAITING_HUMAN_APPROVAL",
    ],
  },
  {
    id: "sandbox",
    step: "03",
    title: "Isolated Sandbox & Test Runner",
    badge: "Path-Isolated",
    summary: "Applies code changes in an isolated workspace and runs automated pytest suites.",
    terminal: [
      "$ pytest tests/test_oauth_and_linking.py -v",
      "tests/test_oauth_and_linking.py::test_google_oauth_registration PASSED [ 25%]",
      "tests/test_oauth_and_linking.py::test_oauth_csrf_state_and_error PASSED [ 50%]",
      "tests/test_oauth_and_linking.py::test_account_linking_protection PASSED [ 75%]",
      "tests/test_oauth_and_linking.py::test_session_management_revocation PASSED [100%]",
      "[OK] 17 passed in 3.59s · 0 regressions detected",
    ],
  },
  {
    id: "pr",
    step: "04",
    title: "Unified Diff Review & PR Creation",
    badge: "pull_requests: write",
    summary: "Presents a syntax-highlighted git diff and opens a verified GitHub Pull Request.",
    terminal: [
      "diff --git a/backend/app/core/middleware.py b/backend/app/core/middleware.py",
      "@@ -54,4 +54,6 @@ RATE_LIMITS = (",
      "+    ('/api/v1/auth/oauth/', 30, 60),",
      "+    ('/api/v1/github/app/', 30, 60),",
      "[PR] Opened Pull Request #42 -> main (Verified by JGitLab AI Engineer)",
    ],
  },
];

export default function HomePage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [activeStage, setActiveStage] = useState(0);
  const [demoSigningIn, setDemoSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleInstantDemo = async () => {
    setDemoSigningIn(true);
    try {
      await login("admin@jgitlab.local", "JGitLab2026!Admin");
      router.push("/dashboard");
    } catch {
      router.push("/login");
    } finally {
      setDemoSigningIn(false);
    }
  };

  if (loading) {
    return <JGitLabSplashLoader label="Loading JGitLab Platform..." fullScreen />;
  }

  const stage = PIPELINE_STAGES[activeStage];

  return (
    <div className="min-h-screen bg-[#06080D] bg-hero-glow text-[#F3F4F6] flex flex-col justify-between selection:bg-violet-600 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-white/[0.08] bg-[#04060E]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="h-[2px] w-full bg-gradient-to-r from-cyan-400 via-violet-500 to-orange-500" />
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <JGitLabLogoMark size="md" />
            <div className="flex items-center gap-2.5">
              <JGitLabWordmark size="lg" showBrackets />
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono uppercase tracking-wider">
                AI Studio v2.5
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-gray-400">
            <a href="#pipeline" className="hover:text-white transition-colors">
              Autonomous Pipeline
            </a>
            <a href="#pillars" className="hover:text-white transition-colors">
              Platform Pillars
            </a>
            <a href="#security" className="hover:text-white transition-colors">
              GitHub App Security
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleInstantDemo}
              disabled={demoSigningIn}
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-medium text-cyan-300 transition-colors"
            >
              {demoSigningIn ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>Instant Demo</span>
            </button>
            <Link
              href="/login"
              className="text-xs sm:text-sm font-medium text-gray-300 hover:text-white px-2.5 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="h-9 px-4 text-xs sm:text-sm font-semibold rounded-xl jgitlab-btn-glow text-white flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pt-14 pb-24 space-y-24 flex-1 w-full">
        {/* Split Hero + Interactive Pipeline Preview */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left 6 cols: Value Proposition */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/[0.09] border border-violet-500/25 text-violet-200 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>API-First Autonomous Software Engineering Runtime</span>
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.08] text-white">
              One intelligent platform to{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-orange-400 bg-clip-text text-transparent">
                build, understand, and evolve
              </span>{" "}
              software.
            </h1>

            <p className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-xl">
              Connect your GitHub repositories with fine-grained scope, synthesize structured execution plans with external AI models, verify code in an isolated sandbox, and ship pull requests backed by persistent Engineering Memory.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <Link
                href="/register"
                className="h-12 px-6 text-sm font-semibold rounded-xl jgitlab-btn-glow text-white flex items-center gap-2"
              >
                <span>Launch JGitLab Studio</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={handleInstantDemo}
                disabled={demoSigningIn}
                className="h-12 px-5 text-sm font-medium rounded-xl bg-[#0B1022] hover:bg-[#121A36] text-gray-200 border border-cyan-400/30 flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)]"
              >
                {demoSigningIn ? (
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                ) : (
                  <Terminal className="w-4 h-4 text-cyan-400" />
                )}
                <span>1-Click Lead Architect Demo</span>
              </button>
            </div>

            {/* Trust / Architecture Specs */}
            <div className="pt-4 grid grid-cols-3 gap-4 border-t border-white/[0.07] text-xs">
              <div>
                <span className="font-mono text-cyan-400 font-semibold block">GitHub App v2</span>
                <span className="text-gray-500">All or Selected Repos</span>
              </div>
              <div>
                <span className="font-mono text-violet-400 font-semibold block">Human-in-Loop</span>
                <span className="text-gray-500">Mandatory Plan Approval</span>
              </div>
              <div>
                <span className="font-mono text-orange-400 font-semibold block">Fernet AES-128</span>
                <span className="text-gray-500">Encrypted AI API Keys</span>
              </div>
            </div>
          </div>

          {/* Right 6 cols: Interactive Pipeline Simulator */}
          <div id="pipeline" className="lg:col-span-6">
            <div className="rounded-2xl border border-white/[0.1] bg-[#0A0E17]/95 shadow-2xl overflow-hidden">
              {/* Window Top Bar */}
              <div className="px-4 py-3 border-b border-white/[0.07] bg-[#0D121F] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                  <span className="ml-2 text-xs font-mono text-gray-300">
                    jgitlab-agent://autonomous-pipeline
                  </span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                  Interactive Preview
                </span>
              </div>

              {/* Stage Selector Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-white/[0.07] bg-[#080B12]">
                {PIPELINE_STAGES.map((s, idx) => {
                  const isSelected = idx === activeStage;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveStage(idx)}
                      className={`p-3 text-left transition-all border-b-2 ${
                        isSelected
                          ? "border-violet-500 bg-violet-500/[0.08] text-white"
                          : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]"
                      }`}
                    >
                      <span className="text-[10px] font-mono text-cyan-400 block">
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
                    <h3 className="text-sm font-semibold text-white">{stage.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{stage.summary}</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30 shrink-0">
                    {stage.badge}
                  </span>
                </div>

                <div className="rounded-xl bg-[#05070B] border border-white/[0.07] p-4 font-mono text-xs space-y-2 min-h-[175px]">
                  {stage.terminal.map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.startsWith("$")
                          ? "text-cyan-300 font-semibold"
                          : line.startsWith("+")
                          ? "text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded"
                          : line.includes("PASSED") || line.startsWith("[OK]") || line.startsWith("[PR]")
                          ? "text-emerald-300"
                          : line.startsWith("[GATE]")
                          ? "text-amber-300"
                          : "text-gray-300"
                      }
                    >
                      {line}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-gray-500 font-mono">
                  <span>Click any stage above to inspect execution telemetry</span>
                  <Link href="/login" className="text-violet-400 hover:text-violet-300">
                    Open live console →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Three Platform Pillars Bento Grid */}
        <section id="pillars" className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                Unified Architecture
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
                Three Long-Term Engineering Pillars
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 max-w-md">
              Built API-first today for external frontier models, architected for zero-rewrite integration of proprietary models tomorrow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-interactive rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-300">
                  <Code2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                  Pillar 1 · Active MVP
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Autonomous AI Software Engineer</h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Analyzes repositories, synthesizes structured execution plans, pauses for human approval, executes controlled file modifications, runs unit tests, and prepares GitHub pull requests.
              </p>
            </div>

            <div className="card-interactive rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                  <Database className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                  Pillar 3 · Active MVP
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Persistent Engineering Memory</h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Stores Architectural Decision Records (ADRs), repository conventions, bug-fix root causes, and tech stack rules—automatically injected into every planning cycle.
              </p>
            </div>

            <div className="card-interactive rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-300">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/25">
                  Pillar 2 · Roadmap Module
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">AI Model Factory Ready</h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Provider-independent AI gateway abstraction (`OpenAICompatibleProvider`) designed so future fine-tuned checkpoints and vLLM clusters plug in without rewriting the agent runtime.
              </p>
            </div>
          </div>
        </section>

        {/* Security & GitHub App Section */}
        <section
          id="security"
          className="rounded-2xl border border-white/[0.08] bg-[#0B0F19] p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
        >
          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>ZERO-TRUST IDENTITY &amp; REPOSITORY GOVERNANCE</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Strict Separation of User Authentication &amp; Repository Scope
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Signing in with Google or GitHub verifies your identity only (`read:user`, `user:email`). Repository access is granted separately via the GitHub App where you choose either <strong>All Repositories</strong> or <strong>Selected Repositories</strong>.
            </p>
          </div>
          <div className="lg:col-span-5 grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.06]">
              <Lock className="w-4 h-4 text-violet-400 mb-1.5" />
              <div className="text-white font-semibold">PKCE + State</div>
              <div className="text-[11px] text-gray-500">OAuth 2.0 CSRF Protection</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.06]">
              <FolderGit2 className="w-4 h-4 text-cyan-400 mb-1.5" />
              <div className="text-white font-semibold">Scoped Repos</div>
              <div className="text-[11px] text-gray-500">Enforced per API call</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.06]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1.5" />
              <div className="text-white font-semibold">Argon2 + Fernet</div>
              <div className="text-[11px] text-gray-500">Encrypted credentials</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.06]">
              <GitPullRequest className="w-4 h-4 text-orange-400 mb-1.5" />
              <div className="text-white font-semibold">Verified PRs</div>
              <div className="text-[11px] text-gray-500">Human approval gate</div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 text-center text-xs text-gray-500 font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <JGitLabLogoMark size="sm" />
            <span className="text-gray-300 font-semibold">JGitLab</span>
            <span>· Autonomous AI Software Engineering Platform</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-gray-300">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-gray-300">
              Register
            </Link>
            <Link href="/help" className="hover:text-gray-300">
              Documentation
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
