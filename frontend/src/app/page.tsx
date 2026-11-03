"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { Cpu, Terminal, Shield, Sparkles, ArrowRight, GitBranch, Database } from "lucide-react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal-950 text-foreground flex flex-col justify-between selection:bg-violet-600 selection:text-white">
      {/* Navigation */}
      <header className="border-b border-border bg-charcoal-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-400 flex items-center justify-center text-white font-mono font-bold text-lg shadow-glow">
              J
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white">JGitLab</span>
              <span className="text-xs ml-2 px-1.5 py-0.5 rounded bg-violet-950/80 text-violet-300 border border-violet-800/40 font-mono">
                AI PLATFORM
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-glow hover:shadow-violet-600/50"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-20 flex-1 flex flex-col items-center text-center justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-charcoal-850 border border-violet-500/30 text-violet-300 text-xs font-mono mb-8 shadow-glow">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Next-Generation Autonomous AI Software Engineering</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1] text-white">
          One intelligent platform to{" "}
          <span className="bg-gradient-to-r from-violet-400 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
            build, understand, and evolve
          </span>{" "}
          software.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-muted max-w-2xl leading-relaxed">
          Autonomous AI Software Engineer powered by external AI APIs, isolated sandboxed code execution, and persistent Engineering Memory.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="px-6 py-3.5 text-base font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-glow flex items-center gap-2"
          >
            Launch Platform <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="px-6 py-3.5 text-base font-medium rounded-xl bg-charcoal-850 hover:bg-charcoal-800 text-foreground border border-border transition-all"
          >
            Sign In with Credentials
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          <div className="p-6 rounded-2xl bg-charcoal-900/80 border border-border hover:border-violet-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-violet-950/80 border border-violet-800/40 flex items-center justify-center text-violet-400 mb-4">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-white">Autonomous AI Engineer</h3>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              Accepts natural-language tasks, synthesizes plans, calls backend tools, inspects project trees, and applies targeted edits.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-charcoal-900/80 border border-border hover:border-violet-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/40 flex items-center justify-center text-cyan-400 mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-white">Engineering Memory</h3>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              Persistent project architecture, tech stack decisions, and ADRs injected into every agent prompt for contextual execution.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-charcoal-900/80 border border-border hover:border-violet-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-violet-950/80 border border-violet-800/40 flex items-center justify-center text-violet-400 mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-white">Sandboxed Verification</h3>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              Isolated Docker and path-traversal protected execution. Code changes are verified with automated tests and interactive diff review.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-charcoal-900/40 py-6 text-center text-xs text-muted font-mono">
        JGitLab © 2026. Built with FastAPI, Next.js, and Provider-Independent AI Architecture.
      </footer>
    </div>
  );
}
