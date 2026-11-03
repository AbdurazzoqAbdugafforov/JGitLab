"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { AgentTask, MemoryRecord, ActivityLog } from "@/lib/types";
import {
  Bot,
  Terminal,
  Brain,
  Cpu,
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderTree,
  GitPullRequest,
  Sparkles
} from "lucide-react";

export default function DashboardOverviewPage() {
  const { activeProject } = useAuth();
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (!activeProject) return;
      setLoading(true);
      try {
        const [taskList, memList, actList] = await Promise.all([
          api.getTasks(activeProject.id).catch(() => []),
          api.getMemories(activeProject.id).catch(() => []),
          api.getActivityLogs(activeProject.id).catch(() => []),
        ]);
        setTasks(taskList);
        setMemories(memList);
        setActivities(actList);
      } catch (err) {
        console.error("Dashboard data load error", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [activeProject]);

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const runningTasks = tasks.filter((t) => t.status === "running" || t.status === "planning" || t.status === "awaiting_approval").length;
  const totalTokens = tasks.reduce((sum, t) => sum + (t.total_tokens_used || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-charcoal-900 via-charcoal-850 to-charcoal-900 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-950/80 border border-violet-800/40 text-violet-300 text-[11px] font-mono mb-2">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Autonomous Software Engineer · Active Workspace</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {activeProject ? activeProject.name : "Select a Project"}
          </h1>
          <p className="text-sm text-muted mt-1 max-w-xl">
            {activeProject?.description || "Build, inspect, and autonomously evolve your codebase with external AI APIs and isolated sandboxes."}
          </p>
        </div>
        <Link
          href="/engineer"
          className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold flex items-center gap-2 shadow-glow transition-all shrink-0"
        >
          <Bot className="w-4 h-4" />
          <span>Launch AI Engineer</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completed Tasks */}
        <div className="p-5 rounded-xl bg-charcoal-900 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted uppercase">Completed Tasks</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{completedTasks}</span>
            <span className="text-xs text-muted">tasks done</span>
          </div>
          <div className="mt-2 text-xs text-muted">
            {runningTasks > 0 ? (
              <span className="text-violet-400 font-medium">{runningTasks} in progress</span>
            ) : (
              "Ready for new tasks"
            )}
          </div>
        </div>

        {/* Tokens Monitored */}
        <div className="p-5 rounded-xl bg-charcoal-900 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted uppercase">Tokens Monitored</span>
            <div className="w-7 h-7 rounded-lg bg-violet-950/60 border border-violet-800/40 flex items-center justify-center text-violet-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {totalTokens.toLocaleString()}
            </span>
            <span className="text-xs text-muted">tokens</span>
          </div>
          <div className="mt-2 text-xs text-muted">Tracked via external AI provider</div>
        </div>

        {/* Engineering Memory Records */}
        <div className="p-5 rounded-xl bg-charcoal-900 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted uppercase">Engineering Memories</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
              <Brain className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{memories.length}</span>
            <span className="text-xs text-muted">ADRs & Architecture</span>
          </div>
          <div className="mt-2 text-xs text-muted">Injected into agent context</div>
        </div>

        {/* Tech Stack */}
        <div className="p-5 rounded-xl bg-charcoal-900 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted uppercase">Tech Stack Modules</span>
            <div className="w-7 h-7 rounded-lg bg-charcoal-800 border border-border flex items-center justify-center text-gray-300">
              <FolderTree className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {activeProject?.tech_stack && activeProject.tech_stack.length > 0 ? (
              activeProject.tech_stack.slice(0, 4).map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-0.5 rounded bg-charcoal-850 border border-border text-[11px] font-mono text-gray-300"
                >
                  {tech}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted">No tech stack configured</span>
            )}
          </div>
          <div className="mt-2 text-xs text-muted">Auto-detected from repo manifests</div>
        </div>
      </div>

      {/* Main Grid: Recent Tasks & Memory Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Agent Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-violet-400" />
              <span>Recent AI Engineering Tasks</span>
            </h2>
            <Link href="/tasks" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              View all tasks <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-charcoal-900 border border-border rounded-xl divide-y divide-border overflow-hidden">
            {tasks.length === 0 ? (
              <div className="p-8 text-center">
                <Bot className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted">No tasks submitted yet for this project.</p>
                <Link
                  href="/engineer"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white transition-all shadow-glow"
                >
                  Submit First Task
                </Link>
              </div>
            ) : (
              tasks.slice(0, 5).map((t) => {
                const isRunning = t.status === "running" || t.status === "planning";
                const isDone = t.status === "completed";
                const isAwaiting = t.status === "awaiting_approval";

                return (
                  <div key={t.id} className="p-4 hover:bg-charcoal-850/60 transition-colors flex items-center justify-between gap-4">
                    <div className="truncate">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                            isDone
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                              : isRunning
                              ? "bg-violet-950/60 text-violet-300 border border-violet-800/40 animate-pulse"
                              : isAwaiting
                              ? "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                              : "bg-charcoal-800 text-muted border border-border"
                          }`}
                        >
                          {isRunning ? <Clock className="w-3 h-3" /> : isDone ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {t.status.replace("_", " ")}
                        </span>
                        <span className="text-[11px] font-mono text-muted uppercase">[{t.priority}]</span>
                      </div>
                      <Link href={`/tasks`} className="text-sm font-medium text-white hover:text-violet-400 truncate block">
                        {t.title}
                      </Link>
                      <span className="text-xs text-muted truncate block mt-0.5">{t.description}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {t.diff_summary && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-charcoal-800 text-cyan-400 border border-border">
                          Diff Ready
                        </span>
                      )}
                      {t.pr_url && (
                        <a
                          href={t.pr_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-violet-950/80 text-violet-300 border border-violet-800/40 flex items-center gap-1 hover:text-white"
                        >
                          <GitPullRequest className="w-3 h-3" /> PR #{t.pr_number}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Engineering Memory & Audit Stream */}
        <div className="space-y-6">
          {/* Engineering Memory Card */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <span>Engineering Memory</span>
              </h2>
              <Link href="/memory" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                Explore <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-charcoal-900 border border-border rounded-xl p-4 divide-y divide-border">
              {memories.length === 0 ? (
                <p className="text-xs text-muted text-center py-4">No architectural memories recorded yet.</p>
              ) : (
                memories.slice(0, 3).map((m) => (
                  <div key={m.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-charcoal-850 text-cyan-300 text-[10px] font-mono uppercase border border-border">
                        {m.category}
                      </span>
                      <span className="text-xs font-semibold text-white truncate">{m.title}</span>
                    </div>
                    <p className="text-xs text-muted line-clamp-2">{m.summary || m.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Log Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>Recent Platform Activity</span>
              </h2>
              <Link href="/activity" className="text-xs text-muted hover:text-white flex items-center gap-1">
                Full Log <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-charcoal-900 border border-border rounded-xl p-4 space-y-3">
              {activities.length === 0 ? (
                <p className="text-xs text-muted text-center py-4">No recent activity recorded.</p>
              ) : (
                activities.slice(0, 4).map((a) => (
                  <div key={a.id} className="flex items-start gap-2.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-gray-300 leading-snug">{a.description}</p>
                      <span className="text-[10px] font-mono text-muted">
                        {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
