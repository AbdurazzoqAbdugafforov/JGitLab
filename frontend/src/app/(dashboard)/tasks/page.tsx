"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { AgentTask } from "@/lib/types";
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
  Code2,
  GitPullRequest,
  Terminal,
  FileDiff,
  Play,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Plus
} from "lucide-react";

export default function TasksWorkspacePage() {
  const { activeProject } = useAuth();
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDetail, setTaskDetail] = useState<AgentTask | null>(null);
  const [diffData, setDiffData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // PR Form
  const [isPreparingPR, setIsPreparingPR] = useState(false);
  const [prTitle, setPrTitle] = useState("");
  const [prBody, setPrBody] = useState("");
  const [prSubmitting, setPrSubmitting] = useState(false);
  const [prSuccess, setPrSuccess] = useState<any>(null);
  const [prError, setPrError] = useState<string | null>(null);

  const loadTasks = async () => {
    if (!activeProject) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getTasks(activeProject.id);
      setTasks(data);
      if (data.length > 0 && !selectedTaskId) {
        setSelectedTaskId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [activeProject]);

  useEffect(() => {
    async function loadDetail() {
      if (!selectedTaskId) return;
      try {
        const detail = await api.getTaskDetail(selectedTaskId);
        setTaskDetail(detail);
        setPrTitle(`feat: ${detail.title}`);
        setPrBody(`Autonomous AI Engineering task completed:\n\n${detail.description}\n\nAutomated tests verified.`);
        const diff = await api.getTaskDiff(selectedTaskId);
        setDiffData(diff);
      } catch (err) {
        console.error(err);
      }
    }
    loadDetail();
  }, [selectedTaskId]);

  const handleLaunchPR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDetail) return;
    setPrSubmitting(true);
    setPrError(null);
    try {
      const res = await api.preparePR(taskDetail.id, {
        title: prTitle,
        body: prBody,
      });
      setPrSuccess(res);
      setIsPreparingPR(false);
      loadTasks();
    } catch (err: any) {
      setPrError(err.message || "Failed to create pull request. Verify GitHub connection.");
    } finally {
      setPrSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-violet-400" />
            <span>Agent Task Workspace & Code Review</span>
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Inspect execution telemetry, review unified git diffs, and prepare verified Pull Requests.
          </p>
        </div>
        <Link
          href="/engineer"
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-glow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New AI Task</span>
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-charcoal-900 border border-border max-w-xl mx-auto space-y-4">
          <Terminal className="w-10 h-10 text-muted mx-auto opacity-40" />
          <h2 className="text-base font-semibold text-white">No Engineering Tasks Yet</h2>
          <p className="text-xs text-muted leading-relaxed">
            Create an autonomous task to modify code, run linters, and inspect generated git diffs.
          </p>
          <Link
            href="/engineer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-glow"
          >
            Submit Task in AI Engineer Console
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (4 cols): Task List */}
          <div className="lg:col-span-4 bg-charcoal-900 border border-border rounded-xl overflow-hidden divide-y divide-border">
            <div className="p-3 bg-charcoal-850 font-mono text-xs text-muted uppercase">
              Project Tasks ({tasks.length})
            </div>
            <div className="max-h-[640px] overflow-y-auto divide-y divide-border">
              {tasks.map((t) => {
                const isSelected = selectedTaskId === t.id;
                const isDone = t.status === "completed";
                const isRunning = t.status === "running";

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected ? "bg-violet-950/20 border-l-2 border-l-violet-500" : "hover:bg-charcoal-850/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.2 rounded ${
                          isDone
                            ? "bg-emerald-950/80 text-emerald-300"
                            : isRunning
                            ? "bg-violet-950/80 text-violet-300 animate-pulse"
                            : "bg-charcoal-800 text-muted"
                        }`}
                      >
                        {t.status}
                      </span>
                      <span className="text-[10px] font-mono text-muted">
                        {new Date(t.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-white block truncate">{t.title}</span>
                    <span className="text-[11px] text-muted block truncate mt-0.5">{t.description}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (8 cols): Task Details & Code Diff Review */}
          <div className="lg:col-span-8 space-y-6">
            {taskDetail && (
              <>
                {/* Task Header & Actions Card */}
                <div className="p-5 rounded-xl bg-charcoal-900 border border-border space-y-4 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-charcoal-850 text-cyan-400 border border-border">
                          Priority: {taskDetail.priority}
                        </span>
                        <span className="text-xs font-mono text-muted">Tokens: {taskDetail.total_tokens_used}</span>
                      </div>
                      <h2 className="text-base font-bold text-white">{taskDetail.title}</h2>
                      <p className="text-xs text-muted mt-1">{taskDetail.description}</p>
                    </div>

                    {/* PR Preparation Button */}
                    <div className="shrink-0">
                      {taskDetail.pr_url ? (
                        <a
                          href={taskDetail.pr_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800/60 text-xs font-mono flex items-center gap-1.5 hover:text-white"
                        >
                          <GitPullRequest className="w-3.5 h-3.5" />
                          <span>View PR #{taskDetail.pr_number}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsPreparingPR(true)}
                          className="px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-glow"
                        >
                          <GitPullRequest className="w-3.5 h-3.5" />
                          <span>Authorize Pull Request</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* PR Creation Modal */}
                {isPreparingPR && (
                  <div className="p-5 rounded-xl bg-charcoal-850 border border-violet-500/40 space-y-3">
                    <h3 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                      <GitPullRequest className="w-4 h-4 text-violet-400" />
                      <span>Prepare GitHub Pull Request</span>
                    </h3>
                    {prError && <div className="text-xs text-red-400 bg-red-950/40 p-2 rounded">{prError}</div>}
                    <form onSubmit={handleLaunchPR} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-mono text-muted mb-1">PR Title</label>
                        <input
                          type="text"
                          required
                          value={prTitle}
                          onChange={(e) => setPrTitle(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-charcoal-900 border border-border rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-muted mb-1">PR Description / Changelog</label>
                        <textarea
                          rows={3}
                          required
                          value={prBody}
                          onChange={(e) => setPrBody(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-charcoal-900 border border-border rounded text-white font-mono"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsPreparingPR(false)}
                          className="px-3 py-1.5 text-xs bg-charcoal-800 rounded text-muted hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={prSubmitting}
                          className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded shadow-glow"
                        >
                          {prSubmitting ? "Opening PR on GitHub..." : "Confirm & Push PR"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Diff Viewer Card */}
                <div className="p-5 rounded-xl bg-charcoal-900 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-muted flex items-center gap-2">
                      <FileDiff className="w-4 h-4 text-violet-400" />
                      <span>Unified Git Code Diff</span>
                    </span>
                    <span className="text-xs font-mono text-cyan-400">
                      {diffData?.changed_files?.length || 0} modified files
                    </span>
                  </div>

                  {!diffData?.unified_diff ? (
                    <div className="p-8 text-center text-xs text-muted font-mono bg-charcoal-950 rounded-lg">
                      No uncommitted git diff detected in workspace.
                    </div>
                  ) : (
                    <div className="bg-charcoal-950 border border-border rounded-lg overflow-x-auto max-h-[380px] p-3 font-mono text-xs leading-relaxed">
                      {diffData.unified_diff.split("\n").map((line: string, i: number) => {
                        let lineClass = "text-gray-300";
                        if (line.startsWith("+") && !line.startsWith("+++")) {
                          lineClass = "diff-add px-1 rounded-sm";
                        } else if (line.startsWith("-") && !line.startsWith("---")) {
                          lineClass = "diff-del px-1 rounded-sm";
                        } else if (line.startsWith("@@") || line.startsWith("diff --git")) {
                          lineClass = "diff-hdr font-bold";
                        }
                        return (
                          <div key={i} className={lineClass}>
                            {line}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Execution Steps Telemetry */}
                {taskDetail.steps && taskDetail.steps.length > 0 && (
                  <div className="p-5 rounded-xl bg-charcoal-900 border border-border space-y-3">
                    <span className="text-xs font-mono uppercase text-muted flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      <span>Execution Tool Telemetry ({taskDetail.steps.length} operations)</span>
                    </span>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {taskDetail.steps.map((st) => (
                        <div key={st.id} className="p-2.5 rounded bg-charcoal-850 text-xs font-mono flex items-center justify-between">
                          <span className="text-white flex items-center gap-2">
                            <span className="text-violet-400 font-bold">[{st.step_index}]</span>
                            <span>{st.title}</span>
                          </span>
                          <span className="text-muted text-[11px]">{st.latency_ms}ms · {st.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
