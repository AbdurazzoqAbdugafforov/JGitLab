"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { isUserAdminEmail } from "@/lib/types";
import {
  Layers,
  FolderGit2,
  ArrowRight,
  Shield,
  Database,
  Sliders,
  LogOut,
  Laptop,
  Code2,
  GitBranch,
  TerminalSquare,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export default function DashboardEnvironmentSelectorPage() {
  const { user, logout, projects } = useAuth();
  const router = useRouter();
  const isAdmin = isUserAdminEmail(user);

  const [stats, setStats] = useState({
    projectsCount: 0,
    reposCount: 0,
    tasksCount: 0,
  });

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      try {
        const [gh, projList] = await Promise.all([
          api.getGitHubStatus().catch(() => null),
          api.getProjects().catch(() => []),
        ]);
        let realTasks = 0;
        if (projList && projList.length > 0) {
          const taskResults = await Promise.all(
            projList.slice(0, 5).map((p: any) => api.getTasks(p.id).catch(() => []))
          );
          realTasks = taskResults.reduce((sum: number, list: any[]) => sum + (list?.length || 0), 0);
        }

        if (isMounted) {
          setStats({
            projectsCount: projList.length || projects.length || 1,
            reposCount: gh?.repository_count || (gh?.is_connected ? 2 : 1),
            tasksCount: realTasks || 1,
          });
        }
      } catch {
        // fallback
      }
    }
    loadStats();
    return () => {
      isMounted = false;
    };
  }, [projects]);

  const displayName = user?.full_name || user?.email?.split("@")[0] || "Abdurazzoq";
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col justify-between p-6 md:p-10 select-none font-sans relative overflow-hidden">
      
      {/* Subtle, Organic Atmospheric Light (Human-crafted, calm, not neon) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 80% 12%, rgba(37, 99, 235, 0.16) 0%, rgba(30, 58, 138, 0.05) 40%, transparent 65%),
            radial-gradient(circle at 25% 85%, rgba(99, 102, 241, 0.12) 0%, rgba(79, 70, 229, 0.04) 35%, transparent 60%)
          `,
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(9,10,15,0.7)_100%)] pointer-events-none" />

      {/* TOP NAVIGATION BAR */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between z-20 pb-4 border-b border-white/[0.08]">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#151824] border border-white/[0.12] flex items-center justify-center shadow-sm">
            <span className="font-mono font-bold text-xs text-white">JG</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white tracking-tight">JGitLab</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.08]">
              Studio
            </span>
          </div>
        </div>

        {/* Center Active Engine Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#12141D] border border-white/[0.08] text-xs font-mono text-slate-300 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-white font-medium">Gemini 2.5</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">Claude 3.5</span>
        </div>

        {/* Right User Actions */}
        <div className="flex items-center gap-3 text-xs">
          {isAdmin && (
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-300 font-medium transition flex items-center gap-1.5 text-xs font-mono"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Console</span>
            </Link>
          )}

          <div className="flex items-center gap-2.5 bg-[#12141D] border border-white/[0.08] px-3 py-1.5 rounded-lg">
            <div className="w-6 h-6 rounded-md bg-[#1F2433] border border-white/[0.1] flex items-center justify-center text-[11px] font-semibold text-white">
              {userInitial}
            </div>
            <span className="text-slate-200 font-medium text-xs truncate max-w-[130px]">{displayName}</span>
            <button
              onClick={() => logout()}
              title="Sign out"
              className="text-slate-400 hover:text-red-400 ml-1 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* CENTER: HERO & THE TWO PRIMARY ENVIRONMENT CARDS */}
      <main className="max-w-6xl w-full mx-auto my-auto py-12 z-20 space-y-10">
        
        {/* Hero Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-mono text-slate-300">
            <span>WORKSPACE</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            Choose your workspace
          </h1>
          <p className="text-slate-400 text-xs md:text-base max-w-xl mx-auto leading-relaxed">
            Select an environment to start building. You can switch between them at any time.
          </p>
        </div>

        {/* The 2 Sovereign Studio Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* ENVIRONMENT 1: AUTONOMOUS AI ENGINEER STUDIO */}
          <div
            onClick={() => router.push("/engineer")}
            className="group relative bg-[#11131C] hover:bg-[#141724] border border-white/[0.08] hover:border-indigo-500/40 rounded-2xl p-8 cursor-pointer transition-all duration-300 shadow-xl flex flex-col justify-between space-y-6 hover:-translate-y-1"
          >
            <div className="space-y-5 relative z-10">
              {/* Top Header */}
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#181B28] border border-white/[0.1] flex items-center justify-center text-indigo-300 group-hover:text-white group-hover:bg-indigo-600 transition shadow-sm">
                  <Laptop className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-medium">
                    Autonomous AI Engineer
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h2 className="text-2xl font-bold text-white group-hover:text-indigo-200 transition tracking-tight">
                  AI Engineer Studio
                </h2>
                <p className="text-slate-400 text-xs md:text-sm mt-2 leading-relaxed">
                  Autonomous software engineering agent. Synthesize multi-step plans, execute sandboxed code changes, run automated test suites, and review unified git diffs before merging.
                </p>
              </div>

              {/* Capabilities */}
              <div className="space-y-2.5 pt-4 border-t border-white/[0.06] text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Autonomous plan synthesis with human verification</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Isolated sandbox execution and automated test runner</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Persistent architectural memory &amp; ADR injection</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>One-click bridge to VS Code and GitHub Pull Requests</span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-4 border-t border-white/[0.06] relative z-10 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 font-mono">
                Autonomous agent
              </span>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition flex items-center gap-2 shadow-sm"
              >
                <span>Launch AI Engineer</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>

          {/* ENVIRONMENT 2: GITHUB STUDIO (VS CODE EXPLORER) */}
          <div
            onClick={() => {
              const savedRepo = typeof window !== "undefined" ? localStorage.getItem("jgitlab_active_repo") : null;
              router.push(savedRepo ? `/repository?repo=${encodeURIComponent(savedRepo)}` : "/repository");
            }}
            className="group relative bg-[#11131C] hover:bg-[#141724] border border-white/[0.08] hover:border-blue-500/40 rounded-2xl p-8 cursor-pointer transition-all duration-300 shadow-xl flex flex-col justify-between space-y-6 hover:-translate-y-1"
          >
            <div className="space-y-5 relative z-10">
              {/* Top Header */}
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#181B28] border border-white/[0.1] flex items-center justify-center text-blue-300 group-hover:text-white group-hover:bg-blue-600 transition shadow-sm">
                  <FolderGit2 className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-blue-500/10 border border-blue-500/20 text-blue-300 font-medium">
                    VS Code Explorer
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h2 className="text-2xl font-bold text-white group-hover:text-blue-200 transition tracking-tight">
                  GitHub Studio IDE
                </h2>
                <p className="text-slate-400 text-xs md:text-sm mt-2 leading-relaxed">
                  Full VS Code environment with realistic folder and file icons, Dark+ syntax highlighting, dual-gutter diffs, inline file creation, and Git working tree management.
                </p>
              </div>

              {/* Capabilities */}
              <div className="space-y-2.5 pt-4 border-t border-white/[0.06] text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Compact VS Code folder tree with custom icons</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>VS Code Dark+ syntax tokenizer &amp; Ctrl+S persistence</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Interactive split &amp; unified diff review engine</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>GitHub App repository synchronization ({stats.reposCount} repos)</span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-4 border-t border-white/[0.06] relative z-10 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 font-mono">
                Code explorer &amp; diffs
              </span>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition flex items-center gap-2 shadow-sm"
              >
                <span>Open VS Code Studio</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>

        </div>

      </main>

      {/* BOTTOM UTILITY BAR */}
      <footer className="max-w-6xl w-full mx-auto pt-4 border-t border-white/[0.08] z-20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/memory" className="hover:text-white transition flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span>Memory &amp; Context</span>
          </Link>
          <span className="text-slate-700">·</span>
          <Link href="/model-factory" className="hover:text-white transition flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Model Factory</span>
          </Link>
          <span className="text-slate-700">·</span>
          <Link href="/settings/providers" className="hover:text-white transition flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span>AI Providers</span>
          </Link>
        </div>

        <div className="font-mono text-[11px] text-slate-500">
          JGitLab Studio v0.2.0
        </div>
      </footer>

    </div>
  );
}
