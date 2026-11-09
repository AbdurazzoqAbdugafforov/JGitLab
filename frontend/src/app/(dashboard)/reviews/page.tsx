"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  FolderTree,
  Search,
  Copy,
  Check,
  ShieldCheck,
  ThumbsUp,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { JGitLabRefreshIcon } from "@/components/brand/JGitLabBrand";
import { VSCodeDiffViewer } from "@/components/vscode/VSCodeSyntaxHighlighter";

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

  // Filters & Search
  const [reviewFilter, setReviewFilter] = useState<"all" | "changes" | "pr_created">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Review decision state
  const [copiedDiff, setCopiedDiff] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<"approved" | "changes_requested" | null>(null);

  // PR Form
  const [prTitle, setPrTitle] = useState("");
  const [prBody, setPrBody] = useState("");
  const [creatingPr, setCreatingPr] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadTasks = async () => {
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
  };

  useEffect(() => {
    loadTasks();
  }, [activeProject]);

  const selectTaskForReview = async (task: AgentTask) => {
    setSelectedTask(task);
    setReviewDecision(null);
    setPrTitle(`feat(ai): ${task.title}`);
    setPrBody(
      `## Summary\nAutomated engineering changes for task **${task.title}**.\n\n${task.description}\n\n## Verification\n- Automated sandbox tests completed\n- Architectural invariants verified by JGitLab AI Agent`
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

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchFilter =
        reviewFilter === "all" ||
        (reviewFilter === "changes" && (t.status === "completed" || t.status === "running")) ||
        (reviewFilter === "pr_created" && Boolean(t.pr_number));
      const matchSearch =
        !searchQuery.trim() ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [tasks, reviewFilter, searchQuery]);

  const handleCopyDiff = () => {
    if (!diffData?.unified_diff) return;
    navigator.clipboard.writeText(diffData.unified_diff);
    setCopiedDiff(true);
    setTimeout(() => setCopiedDiff(false), 2000);
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
      <div className="pb-5 border-b border-[#30363D] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#F0F6FC] tracking-tight flex items-center gap-2">
            <GitPullRequest className="w-5 h-5 text-[#58A6FF]" />
            <span>Code Diff Review &amp; Pull Request Preparation</span>
          </h1>
          <p className="text-xs text-[#8B949E] mt-1">
            Inspect unified diffs generated in the isolated sandbox before publishing branches or opening GitHub Pull Requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadTasks}
            disabled={loading}
            title="Refresh review tasks"
            className="h-9 px-3 rounded-lg bg-[#161B22] hover:bg-[#21262D] text-[#8B949E] hover:text-[#F0F6FC] border border-[#30363D] text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <JGitLabRefreshIcon size="sm" spinning={loading} />
            <span>Refresh</span>
          </button>
          <Link
            href="/engineer"
            className="h-9 px-3.5 rounded-lg bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-[0_4px_14px_rgba(31,111,235,0.35)] transition-all"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>New Task in AI Studio</span>
          </Link>
        </div>
      </div>

      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 font-mono ${
            notice.type === "success"
              ? "bg-[#238636]/15 border-[#238636]/40 text-[#3FB950]"
              : "bg-[#F85149]/15 border-[#F85149]/40 text-[#F85149]"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-[#3FB950] shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#F85149] shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <JGitLabRefreshIcon size="lg" spinning={true} />
          <span className="text-xs font-mono text-[#8B949E]">Loading review tasks...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl bg-[#161B22] border border-[#30363D] p-10 text-center space-y-3">
          <GitPullRequest className="w-8 h-8 text-[#8B949E] mx-auto opacity-40" />
          <div className="text-sm font-medium text-[#F0F6FC]">
            No agent tasks available for code review
          </div>
          <p className="text-xs text-[#8B949E] max-w-md mx-auto leading-relaxed">
            Run an autonomous engineering task first to generate code modifications, sandbox test results, and unified diffs.
          </p>
          <Link
            href="/engineer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1F6FEB] text-white text-xs font-semibold shadow-md"
          >
            Launch AI Engineer Console
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Task Selector & Filter */}
          <div className="lg:col-span-4 rounded-xl bg-[#161B22] border border-[#30363D] overflow-hidden h-fit flex flex-col">
            <div className="p-3 border-b border-[#30363D] bg-[#0D1117] space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[#F0F6FC]">
                <span>Project Tasks ({filteredTasks.length}/{tasks.length})</span>
                <span className="text-[11px] font-mono text-[#58A6FF]">{activeProject?.name || "Workspace"}</span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 text-[11px] font-mono">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "changes", label: "With Diffs" },
                    { id: "pr_created", label: "PR Open" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setReviewFilter(tab.id)}
                    className={`px-2 py-0.5 rounded-full transition-colors ${
                      reviewFilter === tab.id
                        ? "bg-[#1F6FEB] text-white font-bold"
                        : "bg-[#161B22] text-[#8B949E] hover:text-white border border-[#30363D]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#161B22] border border-[#30363D] rounded-lg text-xs text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#58A6FF]"
                />
              </div>
            </div>

            <div className="divide-y divide-[#30363D] max-h-[560px] overflow-y-auto">
              {filteredTasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8B949E] font-mono">
                  No tasks match current filter.
                </div>
              ) : (
                filteredTasks.map((t) => {
                  const active = selectedTask?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => selectTaskForReview(t)}
                      className={`w-full text-left p-3.5 transition-colors ${
                        active ? "bg-[#1F6FEB]/15 border-l-2 border-l-[#58A6FF]" : "hover:bg-[#0D1117]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#0D1117] text-[#8B949E] border border-[#30363D]">
                          {t.status.replace("_", " ")}
                        </span>
                        {t.pr_number && (
                          <span className="text-[10px] font-mono text-[#58A6FF] flex items-center gap-1">
                            <GitPullRequest className="w-3 h-3" />
                            <span>PR #{t.pr_number}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-[#F0F6FC] truncate">{t.title}</p>
                      <p className="text-[11px] font-mono text-[#8B949E] mt-1 flex items-center gap-1">
                        <GitBranch className="w-3 h-3 text-[#58A6FF]" />
                        <span>{t.created_branch || t.target_branch}</span>
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Unified Diff Viewer & PR Preparation */}
          <div className="lg:col-span-8 space-y-6">
            {selectedTask && (
              <>
                {/* PR Status Banner if already created */}
                {selectedTask.pr_number && (
                  <div className="p-4 rounded-xl bg-[#238636]/10 border border-[#238636]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#238636]/20 border border-[#238636]/40 flex items-center justify-center text-[#3FB950] shrink-0">
                        <GitPullRequest className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#F0F6FC] flex items-center gap-2">
                          <span>Pull Request #{selectedTask.pr_number} is Published</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#238636]/20 text-[#3FB950] border border-[#238636]/40 uppercase">
                            Open
                          </span>
                        </div>
                        <div className="text-[11px] text-[#8B949E] font-mono mt-0.5">
                          Branch: {selectedTask.created_branch || selectedTask.target_branch}
                        </div>
                      </div>
                    </div>

                    {selectedTask.pr_url && (
                      <a
                        href={selectedTask.pr_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-sm"
                      >
                        <span>View on GitHub</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}

                {/* Diff Viewer Card */}
                <div className="rounded-xl bg-[#161B22] border border-[#30363D] overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[#30363D] bg-[#0D1117] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileCode2 className="w-4 h-4 text-[#58A6FF]" />
                      <span className="text-sm font-semibold text-[#F0F6FC]">
                        Unified Code Diff · {selectedTask.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Copy Diff */}
                      <button
                        type="button"
                        onClick={handleCopyDiff}
                        title="Copy raw unified diff to clipboard"
                        className="px-2.5 py-1 rounded bg-[#161B22] hover:bg-[#21262D] text-[#8B949E] hover:text-white border border-[#30363D] text-[11px] font-mono flex items-center gap-1 transition-colors"
                      >
                        {copiedDiff ? (
                          <>
                            <Check className="w-3 h-3 text-[#3FB950]" />
                            <span className="text-[#3FB950]">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Diff</span>
                          </>
                        )}
                      </button>

                      {/* Inspect in VS Code */}
                      <Link
                        href={
                          typeof window !== "undefined" && localStorage.getItem("jgitlab_active_repo")
                            ? `/repository?repo=${encodeURIComponent(localStorage.getItem("jgitlab_active_repo")!)}`
                            : "/repository"
                        }
                        className="px-2.5 py-1 rounded bg-[#161B22] hover:bg-[#21262D] text-[#8B949E] hover:text-[#58A6FF] border border-[#30363D] text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                      >
                        <FolderTree className="w-3 h-3 text-[#58A6FF]" />
                        <span>Inspect in VS Code</span>
                      </Link>

                      {selectedTask.pr_url && (
                        <a
                          href={selectedTask.pr_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-mono text-[#58A6FF] hover:text-[#79C0FF] flex items-center gap-1 ml-1"
                        >
                          <span>PR #{selectedTask.pr_number}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Review Decision Buttons */}
                  <div className="px-5 py-2.5 bg-[#161B22]/60 border-b border-[#30363D]/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#8B949E]">Review Decision:</span>
                      <button
                        type="button"
                        onClick={() => setReviewDecision("approved")}
                        className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                          reviewDecision === "approved"
                            ? "bg-[#238636] border-[#3FB950] text-white shadow-sm"
                            : "bg-[#161B22] border-[#30363D] text-[#8B949E] hover:text-[#3FB950] hover:border-[#3FB950]/50"
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Approve Changes</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setReviewDecision("changes_requested")}
                        className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                          reviewDecision === "changes_requested"
                            ? "bg-[#D29922] border-[#E3B341] text-black shadow-sm"
                            : "bg-[#161B22] border-[#30363D] text-[#8B949E] hover:text-[#E3B341] hover:border-[#D29922]/50"
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Request Changes</span>
                      </button>
                    </div>

                    <span className="text-[11px] font-mono text-[#8B949E] hidden sm:inline">
                      {diffData?.changed_files?.length || 1} file(s) modified
                    </span>
                  </div>

                  {diffLoading ? (
                    <div className="p-8 flex flex-col items-center justify-center gap-2">
                      <JGitLabRefreshIcon size="md" spinning={true} />
                      <span className="text-xs font-mono text-[#8B949E]">Fetching unified diff...</span>
                    </div>
                  ) : !diffData?.unified_diff ? (
                    <div className="p-8 text-center text-xs text-[#8B949E] font-mono">
                      No unified diff recorded for this task yet. Approve and execute the task plan in the AI Engineer workspace to generate changes.
                    </div>
                  ) : (
                    <div className="p-3 bg-[#0A0D14]">
                      <VSCodeDiffViewer diff={diffData.unified_diff} maxHeight="480px" />
                    </div>
                  )}
                </div>

                {/* PR Preparation Form */}
                <form
                  onSubmit={handlePreparePR}
                  className="rounded-xl bg-[#161B22] border border-[#30363D] p-5 space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <GitPullRequest className="w-4 h-4 text-[#58A6FF]" />
                    <h2 className="text-sm font-semibold text-[#F0F6FC]">
                      {selectedTask.pr_number ? "Update Pull Request Details" : "Prepare GitHub Pull Request"}
                    </h2>
                  </div>

                  <div>
                    <label className="block text-xs text-[#8B949E] mb-1 font-mono uppercase">
                      Pull Request Title
                    </label>
                    <input
                      type="text"
                      required
                      value={prTitle}
                      onChange={(e) => setPrTitle(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] focus:border-[#58A6FF] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#8B949E] mb-1 font-mono uppercase">
                      Pull Request Description (Markdown)
                    </label>
                    <textarea
                      rows={4}
                      value={prBody}
                      onChange={(e) => setPrBody(e.target.value)}
                      className="w-full p-3 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] font-mono focus:border-[#58A6FF] focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={creatingPr}
                      className="h-9 px-4 rounded-lg bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_4px_14px_rgba(31,111,235,0.35)] transition-all disabled:opacity-50"
                    >
                      <GitPullRequest className="w-3.5 h-3.5" />
                      <span>
                        {creatingPr
                          ? "Creating Pull Request..."
                          : selectedTask.pr_number
                          ? "Re-publish Pull Request"
                          : "Create Pull Request on GitHub"}
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
