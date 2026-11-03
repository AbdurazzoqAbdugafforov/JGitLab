"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  AgentTask,
  MemoryRecord,
  ActivityLog,
  GitHubConnectionStatus,
  AIProviderConfig,
} from "@/lib/types";
import {
  Bot,
  Terminal,
  Brain,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderGit2,
  GitPullRequest,
  Github,
  Sliders,
  Compass,
  Code2,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const { user, activeProject, projects } = useAuth();
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [ghStatus, setGhStatus] = useState<GitHubConnectionStatus | null>(null);
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [gh, provs, actList] = await Promise.all([
          api.getGitHubStatus().catch(() => null),
          api.getProviders().catch(() => []),
          api.getActivityLogs(activeProject?.id).catch(() => []),
        ]);
        setGhStatus(gh);
        setProviders(provs);
        setActivities(actList);

        if (activeProject) {
          const [taskList, memList] = await Promise.all([
            api.getTasks(activeProject.id).catch(() => []),
            api.getMemories(activeProject.id).catch(() => []),
          ]);
          setTasks(taskList);
          setMemories(memList);
        } else {
          setTasks([]);
          setMemories([]);
        }
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [activeProject]);

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const runningTasks = tasks.filter(
    (t) =>
      t.status === "running" ||
      t.status === "planning" ||
      t.status === "awaiting_approval" ||
      t.status === "testing"
  ).length;
  const connectedReposCount = projects.filter(
    (p) => Boolean(p.git_repo_url) || Boolean(p.has_connected_repo)
  ).length;
  const tasksWithChanges = tasks.filter((t) => Boolean(t.diff_summary) || Boolean(t.pr_url));
  const activeProvidersCount = providers.filter((p) => p.is_active).length;

  const showOnboardingCard = !user?.onboarding?.dismissed;

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="p-6 rounded-lg bg-[#0D111A] border border-white/[0.07] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>WORKSPACE OVERVIEW</span>
            {activeProject && (
              <>
                <span>·</span>
                <span className="text-violet-300">{activeProject.name}</span>
              </>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            {activeProject ? activeProject.name : "Engineering Workspace"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">
            {activeProject?.description ||
              "Plan, execute, test, and review code changes across your connected GitHub repositories."}
          </p>
        </div>

        <Link
          href="/engineer"
          className="h-10 px-4 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors shadow-sm shrink-0"
        >
          <Bot className="w-4 h-4" />
          <span>Start an AI Engineering Task</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Guided Onboarding Banner for New Users */}
      {showOnboardingCard && (
        <div className="p-4 sm:px-5 rounded-lg bg-[#101624] border border-violet-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Compass className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xs sm:text-sm font-semibold text-white">
                Complete your workspace setup
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Connect your GitHub App repository scope, configure an external AI provider key, and run your first engineering task.
              </p>
            </div>
          </div>
          <Link
            href="/onboarding"
            className="h-8 px-3.5 rounded-md bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-xs font-medium text-violet-200 inline-flex items-center gap-1.5 shrink-0"
          >
            <span>Open Setup Guide</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Real Workspace Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-[#0D111A] border border-white/[0.07]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-400 uppercase">
              Active Projects
            </span>
            <FolderGit2 className="w-4 h-4 text-violet-400" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white font-mono">
              {projects.length}
            </span>
            <span className="text-xs text-gray-500">
              ({connectedReposCount} with repo)
            </span>
          </div>
          <Link
            href="/projects"
            className="mt-2 inline-block text-[11px] text-violet-400 hover:text-violet-300 font-mono"
          >
            Manage projects →
          </Link>
        </div>

        <div className="p-4 rounded-lg bg-[#0D111A] border border-white/[0.07]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-400 uppercase">
              Agent Tasks
            </span>
            <Terminal className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-3">
            <div>
              <span className="text-2xl font-semibold text-white font-mono">
                {runningTasks}
              </span>
              <span className="text-xs text-gray-500 ml-1">running</span>
            </div>
            <span className="text-gray-700">·</span>
            <div>
              <span className="text-lg font-semibold text-emerald-400 font-mono">
                {completedTasks}
              </span>
              <span className="text-xs text-gray-500 ml-1">completed</span>
            </div>
          </div>
          <Link
            href="/tasks"
            className="mt-2 inline-block text-[11px] text-cyan-400 hover:text-cyan-300 font-mono"
          >
            Inspect task queue →
          </Link>
        </div>

        <div className="p-4 rounded-lg bg-[#0D111A] border border-white/[0.07]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-400 uppercase">
              GitHub Integration
            </span>
            <Github className="w-4 h-4 text-gray-300" />
          </div>
          <div className="mt-2.5">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded border ${
                ghStatus?.is_connected
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-white/[0.04] text-gray-400 border-white/[0.08]"
              }`}
            >
              {ghStatus?.is_connected
                ? `Connected (@${ghStatus.github_username || "App"})`
                : "Not Connected"}
            </span>
          </div>
          <Link
            href="/github"
            className="mt-2.5 inline-block text-[11px] text-violet-400 hover:text-violet-300 font-mono"
          >
            Configure repository scope →
          </Link>
        </div>

        <div className="p-4 rounded-lg bg-[#0D111A] border border-white/[0.07]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-400 uppercase">
              AI API Provider
            </span>
            <Sliders className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2.5">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded border ${
                activeProvidersCount > 0
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-300 border-amber-500/30"
              }`}
            >
              {activeProvidersCount > 0
                ? `${activeProvidersCount} Active Gateway(s)`
                : "No API Key Configured"}
            </span>
          </div>
          <Link
            href="/settings/providers"
            className="mt-2.5 inline-block text-[11px] text-violet-400 hover:text-violet-300 font-mono"
          >
            Configure AI models →
          </Link>
        </div>
      </div>

      {/* Main Content Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Recent Tasks & Recent Code Changes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Agent Tasks */}
          <div className="rounded-lg bg-[#0D111A] border border-white/[0.07] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-violet-400" />
                <span>Recent Engineering Tasks</span>
              </h2>
              <Link
                href="/tasks"
                className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {tasks.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <Bot className="w-7 h-7 text-gray-600 mx-auto" />
                <div>
                  <p className="text-xs font-medium text-white">
                    No engineering tasks executed yet
                  </p>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                    Describe a feature, bug fix, or refactoring task. The AI Engineer will inspect your repository, propose a structured plan, and await your approval.
                  </p>
                </div>
                <Link
                  href="/engineer"
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white"
                >
                  <span>Start an AI Engineering Task</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {tasks.slice(0, 5).map((t) => {
                  const isRunning =
                    t.status === "running" || t.status === "planning" || t.status === "testing";
                  const isDone = t.status === "completed";
                  const isAwaiting = t.status === "awaiting_approval";

                  return (
                    <div
                      key={t.id}
                      className="p-4 hover:bg-white/[0.015] transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${
                              isDone
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                : isRunning
                                ? "bg-violet-500/15 text-violet-300 border-violet-500/30"
                                : isAwaiting
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                : "bg-white/[0.04] text-gray-400 border-white/[0.08]"
                            }`}
                          >
                            {isRunning ? (
                              <Clock className="w-3 h-3" />
                            ) : isDone ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            {t.status.replace("_", " ")}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500 uppercase">
                            [{t.priority}]
                          </span>
                        </div>
                        <Link
                          href="/tasks"
                          className="text-xs sm:text-sm font-medium text-white hover:text-violet-300 truncate block"
                        >
                          {t.title}
                        </Link>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {t.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {t.diff_summary && (
                          <Link
                            href="/reviews"
                            className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/25"
                          >
                            Review Diff
                          </Link>
                        )}
                        {t.pr_url && (
                          <a
                            href={t.pr_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-mono px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30 flex items-center gap-1"
                          >
                            <GitPullRequest className="w-3 h-3" />
                            <span>PR #{t.pr_number}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Code Changes */}
          <div className="rounded-lg bg-[#0D111A] border border-white/[0.07] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span>Recent Code Changes &amp; Pull Requests</span>
              </h2>
              <Link
                href="/reviews"
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <span>Open Code Reviews</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {tasksWithChanges.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                No code diffs or pull requests have been generated for this project yet.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {tasksWithChanges.slice(0, 4).map((t) => (
                  <div
                    key={t.id}
                    className="p-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-white block truncate">
                        {t.title}
                      </span>
                      <span className="text-[11px] font-mono text-gray-500">
                        Branch: {t.created_branch || t.target_branch}
                      </span>
                    </div>
                    <Link
                      href="/reviews"
                      className="h-7 px-2.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-gray-200 shrink-0 flex items-center gap-1"
                    >
                      <span>Inspect Diff</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Engineering Memory & Audit Stream */}
        <div className="space-y-6">
          {/* Engineering Memory */}
          <div className="rounded-lg bg-[#0D111A] border border-white/[0.07] overflow-hidden">
            <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <span>Engineering Memory ({memories.length})</span>
              </h2>
              <Link
                href="/memory"
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                Explore →
              </Link>
            </div>
            <div className="p-4 divide-y divide-white/[0.06]">
              {memories.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  No architectural memories recorded yet.
                </p>
              ) : (
                memories.slice(0, 3).map((m) => (
                  <div key={m.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-cyan-300 text-[10px] font-mono uppercase border border-white/[0.06]">
                        {m.category}
                      </span>
                      <span className="text-xs font-medium text-white truncate">
                        {m.title}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">
                      {m.summary || m.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-lg bg-[#0D111A] border border-white/[0.07] overflow-hidden">
            <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>Recent Activity</span>
              </h2>
              <Link
                href="/activity"
                className="text-xs text-gray-400 hover:text-white"
              >
                Full log →
              </Link>
            </div>
            <div className="p-4 space-y-3">
              {activities.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  No recent activity recorded.
                </p>
              ) : (
                activities.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-start gap-2.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-gray-300 leading-snug">{a.description}</p>
                      <span className="text-[10px] font-mono text-gray-500">
                        {new Date(a.created_at).toLocaleString()}
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
