"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { AgentTask } from "@/lib/types";
import {
  GitPullRequest,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Bot,
  GitBranch,
} from "lucide-react";

export default function CodeReviewsPage() {
  const { activeProject } = useAuth();
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [diffData, setDiffData] = useState<{
    has_changes: boolean;
    unified_diff: string;
    changed_files: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [diffLoading, setDiffLoading] = useState(false);

  const [prTitle, setPrTitle] = useState("");
  const [prBody, setPrBody] = useState("");
  const [creatingPr, setCreatingPr] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadTasks() {
      if (!activeProject) {
        setTasks([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const list = await api.getTasks(activeProject.id);
        setTasks(list);
        if (list.length > 0) {
          selectTaskForReview(list[0]);
        }
      } catch {
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, [activeProject]);

  const selectTaskForReview = async (task: AgentTask) => {
    setSelectedTask(task);
    setPrTitle(`feat(ai): ${task.title}`);
    setPrBody(
      `## Summary\nAutomated engineering changes for task **${task.title}**.\n\n${task.description}`
    );
    setDiffLoading(true);
    setNotice(null);
    try {
      const d = await api.getTaskDiff(task.id);
      setDiffData(d);
    } catch {
      setDiffData({
        has_changes: Boolean(task.diff_summary),
        unified_diff: task.diff_summary || "",
        changed_files: [],
      });
    } finally {
      setDiffLoading(false);
    }
  };

  const handlePreparePR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setCreatingPr(true);
    setNotice(null);
    try {
      const res = await api.preparePR(selectedTask.id, {
        title: prTitle,
        body: prBody,
        base_branch: selectedTask.target_branch || "main",
      });
      setNotice({
        type: "success",
        text: `Pull Request #${res.pr_number} prepared on branch ${res.branch}.`,
      });
      if (activeProject) {
        const updated = await api.getTasks(activeProject.id);
        setTasks(updated);
        const found = updated.find((t) => t.id === selectedTask.id);
        if (found) setSelectedTask(found);
      }
    } catch (err: any) {
      setNotice({
        type: "error",
        text: err.message || "Could not prepare Pull Request on GitHub.",
      });
    } finally {
      setCreatingPr(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Code Diff Review &amp; Pull Request Preparation
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Inspect unified diffs generated in the isolated sandbox before publishing branches or opening GitHub Pull Requests.
          </p>
        </div>

        <Link
          href="/engineer"
          className="h-9 px-3.5 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium inline-flex items-center gap-1.5"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>New Engineering Task</span>
        </Link>
      </div>

      {notice && (
        <div
          className={`p-3.5 rounded-md border text-xs flex items-center gap-2.5 ${
            notice.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
              : "bg-red-500/10 border-red-500/30 text-red-200"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-lg bg-[#0D111A] border border-white/[0.07] p-10 text-center space-y-3">
          <GitPullRequest className="w-8 h-8 text-gray-600 mx-auto" />
          <div className="text-sm font-medium text-white">
            No agent tasks available for code review
          </div>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Run an autonomous engineering task first to generate code modifications, sandbox test results, and unified diffs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Task Selector */}
          <div className="lg:col-span-4 rounded-lg bg-[#0D111A] border border-white/[0.07] overflow-hidden h-fit">
            <div className="px-4 py-3 border-b border-white/[0.06] text-xs font-semibold text-white">
              Project Tasks ({tasks.length})
            </div>
            <div className="divide-y divide-white/[0.06] max-h-[520px] overflow-y-auto">
              {tasks.map((t) => {
                const active = selectedTask?.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTaskForReview(t)}
                    className={`w-full text-left p-3.5 transition-colors ${
                      active ? "bg-violet-500/15" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-300">
                        {t.status.replace("_", " ")}
                      </span>
                      {t.pr_number && (
                        <span className="text-[10px] font-mono text-violet-300">
                          PR #{t.pr_number}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-white truncate">{t.title}</p>
                    <p className="text-[11px] font-mono text-gray-500 mt-1 flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      <span>{t.created_branch || t.target_branch}</span>
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Unified Diff Viewer & PR Preparation */}
          <div className="lg:col-span-8 space-y-6">
            {selectedTask && (
              <>
                <div className="rounded-lg bg-[#0D111A] border border-white/[0.07] overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode2 className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-semibold text-white">
                        Unified Code Diff · {selectedTask.title}
                      </span>
                    </div>
                    {selectedTask.pr_url && (
                      <a
                        href={selectedTask.pr_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono text-violet-300 hover:text-white flex items-center gap-1"
                      >
                        <span>View PR #{selectedTask.pr_number}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {diffLoading ? (
                    <div className="p-8 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                    </div>
                  ) : !diffData?.unified_diff ? (
                    <div className="p-8 text-center text-xs text-gray-500">
                      No unified diff recorded for this task yet. Approve and execute the task plan in the AI Engineer workspace to generate changes.
                    </div>
                  ) : (
                    <pre className="p-4 text-xs font-mono overflow-x-auto bg-[#070A10] max-h-[420px] leading-relaxed">
                      {diffData.unified_diff.split("\n").map((line, i) => {
                        const cls = line.startsWith("+")
                          ? "diff-add"
                          : line.startsWith("-")
                          ? "diff-del"
                          : line.startsWith("@@")
                          ? "diff-hdr"
                          : "text-gray-300";
                        return (
                          <div key={i} className={`px-2 ${cls}`}>
                            {line}
                          </div>
                        );
                      })}
                    </pre>
                  )}
                </div>

                {/* PR Preparation Form */}
                <form
                  onSubmit={handlePreparePR}
                  className="rounded-lg bg-[#0D111A] border border-white/[0.07] p-5 space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <GitPullRequest className="w-4 h-4 text-violet-400" />
                    <h2 className="text-sm font-semibold text-white">
                      Prepare GitHub Pull Request
                    </h2>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Pull Request Title
                    </label>
                    <input
                      type="text"
                      required
                      value={prTitle}
                      onChange={(e) => setPrTitle(e.target.value)}
                      className="w-full h-9 px-3 rounded-md bg-[#090C13] border border-white/[0.1] text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Pull Request Description (Markdown)
                    </label>
                    <textarea
                      rows={4}
                      value={prBody}
                      onChange={(e) => setPrBody(e.target.value)}
                      className="w-full p-3 rounded-md bg-[#090C13] border border-white/[0.1] text-xs text-white font-mono"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={creatingPr}
                      className="h-9 px-4 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium flex items-center gap-1.5"
                    >
                      <GitPullRequest className="w-3.5 h-3.5" />
                      <span>
                        {creatingPr ? "Creating Pull Request..." : "Create Pull Request on GitHub"}
                      </span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
