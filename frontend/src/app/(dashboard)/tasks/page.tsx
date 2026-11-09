"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Plus,
  FolderTree,
  Search,
  X,
  GitBranch,
  Shield,
  Sparkles,
  Filter,
  Check,
  AlertTriangle,
  Bot,
  Zap,
} from "lucide-react";
import { JGitLabRefreshIcon } from "@/components/brand/JGitLabBrand";
import { VSCodeDiffViewer } from "@/components/vscode/VSCodeSyntaxHighlighter";

export default function TasksWorkspacePage() {
  const { activeProject } = useAuth();
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDetail, setTaskDetail] = useState<AgentTask | null>(null);
  const [diffData, setDiffData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "running" | "pending" | "failed">("all");
  const [taskSearch, setTaskSearch] = useState("");

  // Quick Create Modal
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [newTaskAutoPlan, setNewTaskAutoPlan] = useState(true);
  const [creatingTaskLoading, setCreatingTaskLoading] = useState(false);

  // Plan Approval state
  const [approvingPlan, setApprovingPlan] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "info" | "error"; text: string } | null>(null);

  // PR Form
  const [isPreparingPR, setIsPreparingPR] = useState(false);
  const [prTitle, setPrTitle] = useState("");
  const [prBody, setPrBody] = useState("");
  const [prSubmitting, setPrSubmitting] = useState(false);
  const [prSuccess, setPrSuccess] = useState<any>(null);
  const [prError, setPrError] = useState<string | null>(null);

  const showToast = (text: string, type: "success" | "info" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

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

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "completed" && t.status === "completed") ||
        (statusFilter === "running" && t.status === "running") ||
        (statusFilter === "pending" && (t.status === "pending" || t.status === "awaiting_approval" || t.status === "planning")) ||
        (statusFilter === "failed" && (t.status === "failed" || t.status === "cancelled"));
      const matchSearch =
        !taskSearch.trim() ||
        t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
        t.description.toLowerCase().includes(taskSearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [tasks, statusFilter, taskSearch]);

  const handleQuickCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newTaskTitle.trim()) return;
    setCreatingTaskLoading(true);
    try {
      const created = await api.createTask({
        project_id: activeProject.id,
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || `Task: ${newTaskTitle.trim()}`,
        priority: newTaskPriority,
      });

      if (newTaskAutoPlan) {
        await api.generatePlan(created.id).catch(() => null);
      }

      setIsCreatingTask(false);
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskPriority("medium");
      await loadTasks();
      setSelectedTaskId(created.id);
      showToast(`Task "${created.title}" created successfully.`, "success");
    } catch (err: any) {
      alert(err.message || "Failed to create task");
    } finally {
      setCreatingTaskLoading(false);
    }
  };

  const handleApprovePlanFromDetail = async () => {
    if (!taskDetail) return;
    setApprovingPlan(true);
    try {
      await api.approvePlan(taskDetail.id, { decision: "approved" });
      showToast(`Plan approved! Sandbox execution started.`, "success");
      await loadTasks();
      const updated = await api.getTaskDetail(taskDetail.id);
      setTaskDetail(updated);
    } catch (err: any) {
      alert(err.message || "Failed to approve plan");
    } finally {
      setApprovingPlan(false);
    }
  };

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
      showToast(`Pull request #${res.pr_number} prepared on branch ${res.branch}.`, "success");
      await loadTasks();
      const updated = await api.getTaskDetail(taskDetail.id);
      setTaskDetail(updated);
    } catch (err: any) {
      setPrError(err.message || "Failed to create pull request. Verify GitHub connection.");
    } finally {
      setPrSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-3.5 rounded-xl border text-xs font-mono flex items-center gap-2.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-2 ${
            toastMessage.type === "success"
              ? "bg-[#238636]/90 border-[#3FB950] text-white"
              : toastMessage.type === "error"
              ? "bg-[#F85149]/90 border-[#F85149] text-white"
              : "bg-[#1F6FEB]/90 border-[#58A6FF] text-white"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#30363D]">
        <div>
          <h1 className="text-xl font-bold text-[#F0F6FC] tracking-tight flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-[#58A6FF]" />
            <span>Agent Task Workspace &amp; Code Review</span>
          </h1>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Inspect execution telemetry, synthesize plans, review unified git diffs, and prepare verified Pull Requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadTasks}
            disabled={loading}
            title="Refresh tasks list"
            className="px-3.5 py-2 rounded-lg bg-[#161B22] hover:bg-[#21262D] text-xs font-mono text-[#8B949E] hover:text-[#F0F6FC] border border-[#30363D] flex items-center gap-1.5 transition-colors"
          >
            <JGitLabRefreshIcon size="sm" spinning={loading} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreatingTask(true)}
            className="px-3.5 py-2 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_4px_14px_rgba(35,134,54,0.35)] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>

          <Link
            href="/engineer"
            className="px-3.5 py-2 rounded-lg bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_4px_14px_rgba(31,111,235,0.35)] transition-all"
          >
            <Bot className="w-4 h-4" />
            <span>AI Studio</span>
          </Link>
        </div>
      </div>

      {/* Quick Task Creation Modal */}
      {isCreatingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-lg bg-[#161B22] border border-[#30363D] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363D]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1F6FEB]/15 border border-[#1F6FEB]/30 flex items-center justify-center text-[#58A6FF]">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#F0F6FC]">Create Engineering Task</h3>
                  <p className="text-[11px] text-[#8B949E]">Target project: {activeProject?.name || "Active Workspace"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingTask(false)}
                className="p-1 rounded-lg text-[#8B949E] hover:text-white hover:bg-[#21262D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateTask} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[#8B949E] font-mono text-[11px] uppercase mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement user cart checkout modal with coupon discount"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#F0F6FC] focus:border-[#58A6FF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] font-mono text-[11px] uppercase mb-1">
                  Task Specification / Requirements
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe technical requirements, files to update, edge cases, and verification criteria..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full p-3 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#F0F6FC] focus:border-[#58A6FF] focus:outline-none font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] font-mono text-[11px] uppercase mb-1.5">
                  Priority Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["low", "medium", "high", "urgent"] as const).map((p) => {
                    const isSelected = newTaskPriority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewTaskPriority(p)}
                        className={`py-1.5 px-2 rounded-lg font-mono text-xs uppercase border transition-colors ${
                          isSelected
                            ? p === "urgent"
                              ? "bg-rose-500/20 border-rose-500 text-rose-300 font-bold"
                              : p === "high"
                              ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold"
                              : "bg-[#1F6FEB]/20 border-[#58A6FF] text-[#58A6FF] font-bold"
                            : "bg-[#0D1117] border-[#30363D] text-[#8B949E] hover:text-white"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoPlanToggle"
                  checked={newTaskAutoPlan}
                  onChange={(e) => setNewTaskAutoPlan(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#0D1117] border-[#30363D] text-[#1F6FEB] focus:ring-0"
                />
                <label htmlFor="autoPlanToggle" className="text-xs text-[#C9D1D9] cursor-pointer">
                  Automatically synthesize multi-step plan upon submission
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#30363D]">
                <button
                  type="button"
                  onClick={() => setIsCreatingTask(false)}
                  className="px-4 py-2 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTaskLoading || !newTaskTitle.trim()}
                  className="px-4 py-2 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_2px_8px_rgba(35,134,54,0.35)] disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{creatingTaskLoading ? "Creating..." : "Create Task"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#161B22] border border-[#30363D] max-w-xl mx-auto space-y-4">
          <Terminal className="w-10 h-10 text-[#8B949E] mx-auto opacity-40" />
          <h2 className="text-base font-semibold text-[#F0F6FC]">No Engineering Tasks Yet</h2>
          <p className="text-xs text-[#8B949E] leading-relaxed">
            Create an autonomous task to modify code, run linters, and inspect generated git diffs.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsCreatingTask(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold shadow-[0_4px_14px_rgba(35,134,54,0.35)]"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Task</span>
            </button>
            <Link
              href="/engineer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-semibold shadow-[0_4px_14px_rgba(31,111,235,0.35)]"
            >
              <Bot className="w-4 h-4" />
              <span>AI Engineer Studio</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (4 cols): Task List with Filter & Search */}
          <div className="lg:col-span-4 bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden flex flex-col h-fit">
            {/* Filter Pills */}
            <div className="p-3 bg-[#0D1117] border-b border-[#30363D] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[#8B949E] uppercase">
                  Project Tasks ({filteredTasks.length}/{tasks.length})
                </span>
                <span className="text-[11px] font-mono text-[#58A6FF]">
                  {activeProject?.name || "Workspace"}
                </span>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-mono">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "completed", label: "Done" },
                    { id: "running", label: "Active" },
                    { id: "pending", label: "Pending" },
                    { id: "failed", label: "Failed" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-2 py-0.5 rounded-full transition-colors ${
                      statusFilter === tab.id
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
                  placeholder="Filter tasks by name..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#161B22] border border-[#30363D] rounded-lg text-xs text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#58A6FF]"
                />
              </div>
            </div>

            {/* Task Items List */}
            <div className="max-h-[640px] overflow-y-auto divide-y divide-[#30363D]">
              {filteredTasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8B949E] font-mono">
                  No tasks match current filter.
                </div>
              ) : (
                filteredTasks.map((t) => {
                  const isSelected = selectedTaskId === t.id;
                  const isDone = t.status === "completed";
                  const isRunning = t.status === "running";
                  const isPending = t.status === "pending" || t.status === "awaiting_approval" || t.status === "planning";
                  const isFailed = t.status === "failed" || t.status === "cancelled";

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTaskId(t.id)}
                      className={`p-3.5 cursor-pointer transition-colors ${
                        isSelected ? "bg-[#1F6FEB]/15 border-l-2 border-l-[#58A6FF]" : "hover:bg-[#0D1117]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                            isDone
                              ? "bg-[#238636]/20 text-[#3FB950] border border-[#238636]/40"
                              : isRunning
                              ? "bg-[#1F6FEB]/20 text-[#58A6FF] border border-[#1F6FEB]/40 animate-pulse"
                              : isFailed
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              : "bg-[#D29922]/20 text-[#E3B341] border border-[#D29922]/40"
                          }`}
                        >
                          {t.status.replace("_", " ")}
                        </span>
                        <span className="text-[10px] font-mono text-[#8B949E]">
                          {new Date(t.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[#F0F6FC] block truncate">{t.title}</span>
                      <span className="text-[11px] text-[#8B949E] block truncate mt-0.5">{t.description}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column (8 cols): Task Details, Plan Approval & Code Diff Review */}
          <div className="lg:col-span-8 space-y-6">
            {taskDetail && (
              <>
                {/* Task Header & Actions Card */}
                <div className="p-5 rounded-xl bg-[#161B22] border border-[#30363D] space-y-4 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                            taskDetail.priority === "urgent"
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                              : taskDetail.priority === "high"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : "bg-[#1F6FEB]/20 text-[#58A6FF] border-[#1F6FEB]/40"
                          }`}
                        >
                          Priority: {taskDetail.priority}
                        </span>

                        <span className="text-xs font-mono text-[#8B949E] flex items-center gap-1">
                          <GitBranch className="w-3 h-3 text-[#58A6FF]" />
                          <span>{taskDetail.created_branch || taskDetail.target_branch || "main"}</span>
                        </span>

                        <span className="text-xs font-mono text-[#8B949E]">
                          Tokens: {taskDetail.total_tokens_used || 0}
                        </span>
                      </div>

                      <h2 className="text-base font-bold text-[#F0F6FC] leading-snug">{taskDetail.title}</h2>
                      <p className="text-xs text-[#8B949E] leading-relaxed">{taskDetail.description}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Approve Plan & Execute Button if pending */}
                      {(taskDetail.status === "awaiting_approval" || taskDetail.status === "pending") && (
                        <button
                          type="button"
                          onClick={handleApprovePlanFromDetail}
                          disabled={approvingPlan}
                          className="px-3.5 py-2 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_4px_14px_rgba(35,134,54,0.35)] transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{approvingPlan ? "Starting Execution..." : "Approve & Run Task"}</span>
                        </button>
                      )}

                      {/* PR Preparation Button */}
                      {taskDetail.pr_url ? (
                        <a
                          href={taskDetail.pr_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-[#238636]/20 text-[#3FB950] border border-[#238636]/50 text-xs font-mono flex items-center gap-1.5 hover:text-white"
                        >
                          <GitPullRequest className="w-3.5 h-3.5" />
                          <span>View PR #{taskDetail.pr_number}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsPreparingPR(true)}
                          className="px-3.5 py-2 rounded-lg bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_4px_14px_rgba(31,111,235,0.35)]"
                        >
                          <GitPullRequest className="w-3.5 h-3.5" />
                          <span>Authorize Pull Request</span>
                        </button>
                      )}

                      <Link
                        href={
                          typeof window !== "undefined" && localStorage.getItem("jgitlab_active_repo")
                            ? `/repository?repo=${encodeURIComponent(localStorage.getItem("jgitlab_active_repo")!)}`
                            : "/repository"
                        }
                        className="px-3 py-2 rounded-lg bg-[#161B22] hover:bg-[#21262D] text-[#8B949E] hover:text-white border border-[#30363D] text-xs font-mono flex items-center gap-1.5 transition-colors"
                        title="Open in VS Code"
                      >
                        <FolderTree className="w-3.5 h-3.5 text-[#58A6FF]" />
                        <span className="hidden sm:inline">VS Code</span>
                      </Link>
                    </div>
                  </div>

                  {/* Failure Alert Box */}
                  {taskDetail.failure_analysis && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      <div>
                        <div className="font-semibold font-mono uppercase text-[11px] mb-0.5">Execution Interrupted</div>
                        <div className="leading-relaxed">{taskDetail.failure_analysis}</div>
                      </div>
                    </div>
                  )}

                  {/* Implementation Plan Card */}
                  {taskDetail.plan_json && (
                    <div className="p-4 rounded-lg bg-[#0D1117] border border-[#30363D] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-[#8B949E] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#58A6FF]" />
                          <span>Proposed Implementation Plan</span>
                        </span>
                        <span className="text-[11px] font-mono text-[#58A6FF]">
                          {(taskDetail.plan_json.proposed_implementation_steps || []).length} steps
                        </span>
                      </div>

                      <div className="space-y-2">
                        {(taskDetail.plan_json.proposed_implementation_steps || []).map((st: any) => (
                          <div
                            key={st.step_number}
                            className="p-2.5 rounded bg-[#161B22] border border-[#30363D]/60 flex items-start gap-2.5 text-xs"
                          >
                            <span className="w-5 h-5 rounded bg-[#1F6FEB]/20 border border-[#1F6FEB]/40 text-[#58A6FF] font-mono text-[11px] flex items-center justify-center shrink-0 font-bold">
                              {st.step_number}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-[#F0F6FC] block">{st.title}</span>
                              <span className="text-[11px] text-[#8B949E] block mt-0.5">{st.description}</span>
                            </div>
                            {st.tools && (
                              <div className="flex items-center gap-1 shrink-0">
                                {st.tools.map((tl: string) => (
                                  <span key={tl} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#0D1117] text-[#8B949E] border border-[#30363D]">
                                    {tl}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* PR Creation Modal */}
                {isPreparingPR && (
                  <div className="p-5 rounded-xl bg-[#161B22] border border-[#1F6FEB]/50 space-y-3">
                    <h3 className="text-xs font-bold text-[#F0F6FC] uppercase font-mono flex items-center gap-1.5">
                      <GitPullRequest className="w-4 h-4 text-[#58A6FF]" />
                      <span>Prepare GitHub Pull Request</span>
                    </h3>
                    {prError && (
                      <div className="text-xs text-[#F85149] bg-[#F85149]/10 border border-[#F85149]/30 p-2 rounded">
                        {prError}
                      </div>
                    )}
                    <form onSubmit={handleLaunchPR} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-mono text-[#8B949E] mb-1">PR Title</label>
                        <input
                          type="text"
                          required
                          value={prTitle}
                          onChange={(e) => setPrTitle(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-[#0D1117] border border-[#30363D] rounded text-[#F0F6FC] focus:border-[#58A6FF] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-[#8B949E] mb-1">PR Description / Changelog</label>
                        <textarea
                          rows={3}
                          required
                          value={prBody}
                          onChange={(e) => setPrBody(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-[#0D1117] border border-[#30363D] rounded text-[#F0F6FC] font-mono focus:border-[#58A6FF] focus:outline-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsPreparingPR(false)}
                          className="px-3 py-1.5 text-xs bg-[#21262D] hover:bg-[#30363D] rounded text-[#8B949E] hover:text-[#F0F6FC]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={prSubmitting}
                          className="px-4 py-1.5 text-xs bg-[#238636] hover:bg-[#2ea043] text-white font-semibold rounded shadow-[0_2px_8px_rgba(35,134,54,0.35)]"
                        >
                          {prSubmitting ? "Opening PR on GitHub..." : "Confirm & Push PR"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Diff Viewer Card */}
                <div className="p-5 rounded-xl bg-[#161B22] border border-[#30363D] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-[#8B949E] flex items-center gap-2">
                      <FileDiff className="w-4 h-4 text-[#58A6FF]" />
                      <span>Unified Git Code Diff</span>
                    </span>
                    <div className="flex items-center gap-3">
                      <Link
                        href={
                          typeof window !== "undefined" && localStorage.getItem("jgitlab_active_repo")
                            ? `/repository?repo=${encodeURIComponent(localStorage.getItem("jgitlab_active_repo")!)}`
                            : "/repository"
                        }
                        className="text-xs font-mono text-[#8B949E] hover:text-[#58A6FF] flex items-center gap-1.5 transition-colors"
                      >
                        <FolderTree className="w-3.5 h-3.5 text-[#58A6FF]" />
                        <span>Inspect in VS Code</span>
                      </Link>
                      <span className="text-xs font-mono text-[#58A6FF]">
                        {diffData?.changed_files?.length || 0} modified files
                      </span>
                    </div>
                  </div>

                  {!diffData?.unified_diff ? (
                    <div className="p-8 text-center text-xs text-[#8B949E] font-mono bg-[#0D1117] rounded-lg border border-[#30363D]">
                      No uncommitted git diff detected in workspace. Approve and execute the task to generate code changes.
                    </div>
                  ) : (
                    <div className="p-1 bg-[#0A0D14] rounded-lg border border-[#30363D]">
                      <VSCodeDiffViewer diff={diffData.unified_diff} maxHeight="380px" />
                    </div>
                  )}
                </div>

                {/* Execution Steps Telemetry */}
                {taskDetail.steps && taskDetail.steps.length > 0 && (
                  <div className="p-5 rounded-xl bg-[#161B22] border border-[#30363D] space-y-3">
                    <span className="text-xs font-mono uppercase text-[#8B949E] flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-[#58A6FF]" />
                      <span>Execution Tool Telemetry ({taskDetail.steps.length} operations)</span>
                    </span>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {taskDetail.steps.map((st) => (
                        <div key={st.id} className="p-2.5 rounded bg-[#0D1117] text-xs font-mono flex items-center justify-between border border-[#30363D]">
                          <span className="text-[#F0F6FC] flex items-center gap-2">
                            <span className="text-[#58A6FF] font-bold">[{st.step_index}]</span>
                            <span>{st.title}</span>
                          </span>
                          <span className="text-[#8B949E] text-[11px]">{st.latency_ms}ms · {st.status}</span>
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
