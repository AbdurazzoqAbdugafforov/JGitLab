"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { AgentTask, StructuredPlan, AgentTaskStep, ExecutionLog } from "@/lib/types";
import { useTaskWebSocket, WSEvent } from "@/lib/use-websocket";
import {
  Bot,
  Send,
  Terminal,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Code2,
  ShieldAlert,
  FileCode,
  FilePlus,
  RefreshCw,
  GitBranch,
  FileText
} from "lucide-react";

export default function AIEngineerPage() {
  const { activeProject } = useAuth();
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");

  const [activeTask, setActiveTask] = useState<AgentTask | null>(null);
  const [planData, setPlanData] = useState<StructuredPlan | null>(null);
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [rejectionFeedback, setRejectionFeedback] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live steps and logs
  const [liveSteps, setLiveSteps] = useState<AgentTaskStep[]>([]);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);

  // WebSocket for live execution updates
  const { isConnected } = useTaskWebSocket(activeTask?.id || null, (evt: WSEvent) => {
    if (evt.type === "log") {
      setLiveLogs((prev) => [...prev, `[${evt.data.level?.toUpperCase()}] ${evt.data.message}`]);
    } else if (evt.type === "step") {
      setLiveSteps((prev) => [
        ...prev,
        {
          id: `step-${Date.now()}`,
          step_index: evt.data.step_index,
          step_type: "tool_call",
          title: `Tool: ${evt.data.tool_name}`,
          tool_name: evt.data.tool_name,
          tool_output: evt.data.output,
          status: evt.data.status,
          latency_ms: 0,
          tokens_used: 0,
          created_at: new Date().toISOString(),
        },
      ]);
    } else if (evt.type === "status_change") {
      if (activeTask) {
        setActiveTask({ ...activeTask, status: evt.data.status });
      }
      if (evt.data.status === "completed") {
        refreshActiveTask();
      }
    }
  });

  const refreshActiveTask = async () => {
    if (!activeTask) return;
    try {
      const detailed = await api.getTaskDetail(activeTask.id);
      setActiveTask(detailed);
      if (detailed.steps) setLiveSteps(detailed.steps);
      if (detailed.logs) setLiveLogs(detailed.logs.map((l) => `[${l.level.toUpperCase()}] ${l.message}`));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAndPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) {
      setError("Please select or create an active project first.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    setPlanData(null);
    setLiveSteps([]);
    setLiveLogs([]);

    try {
      // 1. Create task
      const task = await api.createTask({
        project_id: activeProject.id,
        title: taskTitle,
        description: taskDescription,
        priority: priority,
      });
      setActiveTask(task);
      setIsSubmitting(false);

      // 2. Trigger task planner
      setIsPlanning(true);
      const planRes = await api.generatePlan(task.id);
      setPlanData(planRes.plan);
      setApprovalId(planRes.approval_id);
      setActiveTask({ ...task, status: "awaiting_approval", plan_json: planRes.plan });
    } catch (err: any) {
      setError(err.message || "Failed to create and plan task. Verify that your AI Provider is configured.");
    } finally {
      setIsSubmitting(false);
      setIsPlanning(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!activeTask) return;
    setIsApproving(true);
    setError(null);
    try {
      const res = await api.approvePlan(activeTask.id, { decision: "approved" });
      setActiveTask({ ...activeTask, status: "running" });
    } catch (err: any) {
      setError(err.message || "Failed to approve plan.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectPlan = async () => {
    if (!activeTask) return;
    try {
      await api.approvePlan(activeTask.id, { decision: "rejected", feedback: rejectionFeedback });
      setActiveTask({ ...activeTask, status: "cancelled" });
      setIsRejecting(false);
    } catch (err: any) {
      setError(err.message || "Failed to reject plan.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bot className="w-5 h-5 text-violet-400" />
            <span>Autonomous AI Software Engineer</span>
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Submit a development task. The agent analyzes project context, drafts a plan, and executes verified tool operations.
          </p>
        </div>
        {activeTask && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted">Status:</span>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-mono uppercase font-semibold ${
                activeTask.status === "completed"
                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                  : activeTask.status === "running"
                  ? "bg-violet-950/60 text-violet-300 border border-violet-800/40 animate-pulse"
                  : activeTask.status === "awaiting_approval"
                  ? "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                  : "bg-charcoal-850 text-gray-300 border border-border"
              }`}
            >
              {activeTask.status.replace("_", " ")}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Execution Interrupted</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Grid: Task Form + Execution Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Submit Task Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-charcoal-900 border border-border rounded-xl p-5 shadow-lg">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-violet-400" />
              <span>Define Engineering Task</span>
            </h2>

            <form onSubmit={handleCreateAndPlan} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1.5">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Add rate-limiting middleware to authentication API"
                  className="w-full px-3 py-2 rounded-lg bg-charcoal-850 border border-border focus:border-violet-500 focus:outline-none text-xs text-white placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1.5">Detailed Description & Requirements</label>
                <textarea
                  required
                  rows={4}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Specify exact functionality, test cases, or constraints..."
                  className="w-full px-3 py-2 rounded-lg bg-charcoal-850 border border-border focus:border-violet-500 focus:outline-none text-xs text-white placeholder-gray-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-muted mb-1.5">Priority</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-charcoal-850 border border-border focus:border-violet-500 focus:outline-none text-xs text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-muted mb-1.5">Project Target</label>
                  <div className="px-3 py-2 rounded-lg bg-charcoal-850/50 border border-border text-xs text-muted font-mono truncate">
                    {activeProject?.name || "No Project"}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isPlanning || !activeProject}
                className="w-full py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-glow hover:shadow-violet-600/50"
              >
                {isPlanning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing & Synthesizing Plan...</span>
                  </>
                ) : isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating Task...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Analyze & Generate Plan</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Examples Helper */}
          <div className="bg-charcoal-900 border border-border rounded-xl p-4">
            <span className="text-[11px] font-mono uppercase text-muted block mb-2">Example Tasks</span>
            <div className="space-y-1.5">
              {[
                "Implement health check endpoint with database ping",
                "Create a responsive dashboard header component",
                "Add automated unit test suite for user registration",
                "Optimize SQL query latency with indexed search",
              ].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setTaskTitle(ex);
                    setTaskDescription(`Implement: ${ex}. Follow clean architecture, write unit tests, and verify within sandbox.`);
                  }}
                  className="w-full text-left text-xs text-gray-400 hover:text-violet-400 hover:bg-charcoal-850 p-1.5 rounded transition-colors truncate"
                >
                  → {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Plan Review & Live Streaming Execution Console */}
        <div className="lg:col-span-7 space-y-6">
          {/* Plan Review Box (if plan generated) */}
          {planData && activeTask?.status === "awaiting_approval" && (
            <div className="bg-charcoal-900 border-2 border-violet-500/40 rounded-xl p-5 shadow-glow space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-violet-950/80 border border-violet-800/40 flex items-center justify-center text-violet-400">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-semibold text-sm text-white">Proposed Implementation Plan</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/40">
                  Approval Required
                </span>
              </div>

              <div className="text-xs text-gray-300 leading-relaxed bg-charcoal-850 p-3 rounded-lg border border-border">
                <span className="font-semibold text-white block mb-1">Architecture Analysis:</span>
                {planData.existing_architecture_analysis}
              </div>

              {/* Proposed Steps */}
              <div>
                <span className="text-xs font-mono uppercase text-muted block mb-2">Execution Roadmap</span>
                <div className="space-y-2">
                  {planData.proposed_implementation_steps.map((st) => (
                    <div key={st.step_number} className="p-2.5 rounded-lg bg-charcoal-850 border border-border flex items-start gap-3 text-xs">
                      <span className="w-5 h-5 rounded-full bg-violet-900 text-violet-200 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {st.step_number}
                      </span>
                      <div className="flex-1">
                        <span className="font-semibold text-white block">{st.title}</span>
                        <span className="text-muted block mt-0.5">{st.description}</span>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {st.tools.map((tl) => (
                            <span key={tl} className="px-1.5 py-0.2 rounded bg-charcoal-800 text-cyan-400 font-mono text-[10px]">
                              {tl}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Files likely to change */}
              {planData.files_likely_to_change.length > 0 && (
                <div>
                  <span className="text-xs font-mono uppercase text-muted block mb-1.5">Target Files</span>
                  <div className="flex flex-wrap gap-1.5">
                    {planData.files_likely_to_change.map((fc, idx) => (
                      <span key={idx} className="px-2 py-1 rounded bg-charcoal-850 text-gray-300 text-[11px] font-mono border border-border flex items-center gap-1.5">
                        <FileCode className="w-3 h-3 text-violet-400" />
                        <span>{fc.path}</span>
                        <span className="text-[10px] text-muted">({fc.action})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Testing Strategy */}
              <div className="text-xs text-muted bg-charcoal-850/60 p-2.5 rounded-lg border border-border">
                <span className="font-semibold text-gray-300 block mb-0.5">Automated Verification Strategy:</span>
                {planData.testing_strategy}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleApprovePlan}
                  disabled={isApproving}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-glow"
                >
                  {isApproving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>Approve & Execute Task</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRejecting(!isRejecting)}
                  className="px-3 py-2 rounded-lg bg-charcoal-800 hover:bg-charcoal-700 text-gray-400 hover:text-red-400 text-xs font-medium border border-border transition-colors"
                >
                  Reject Plan
                </button>
              </div>

              {/* Rejection input */}
              {isRejecting && (
                <div className="p-3 bg-charcoal-850 rounded-lg border border-red-500/30 space-y-2 mt-2">
                  <input
                    type="text"
                    value={rejectionFeedback}
                    onChange={(e) => setRejectionFeedback(e.target.value)}
                    placeholder="Provide feedback on why this plan was rejected..."
                    className="w-full px-3 py-1.5 text-xs bg-charcoal-900 border border-border rounded text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleRejectPlan}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded"
                  >
                    Confirm Rejection
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Live Execution Console */}
          <div className="bg-charcoal-900 border border-border rounded-xl overflow-hidden shadow-lg flex flex-col h-[520px]">
            {/* Terminal Top Bar */}
            <div className="h-10 bg-charcoal-850 border-b border-border px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                <span className="text-xs font-mono text-muted ml-2">agent-execution-stream</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-gray-500"}`} />
                <span className="text-[11px] font-mono text-muted">{isConnected ? "Live WS" : "Disconnected"}</span>
              </div>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-3 bg-charcoal-950">
              {liveSteps.length === 0 && liveLogs.length === 0 ? (
                <div className="text-muted/60 text-center py-20">
                  <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <span>Awaiting task execution... Output and tool telemetry will stream here in real time.</span>
                </div>
              ) : (
                <>
                  {/* Logs */}
                  {liveLogs.map((log, index) => (
                    <div key={index} className="text-gray-400 leading-relaxed">
                      <span className="text-violet-400 mr-2">›</span>
                      <span>{log}</span>
                    </div>
                  ))}

                  {/* Tool Step Cards */}
                  {liveSteps.map((st, idx) => (
                    <div key={idx} className="p-3 rounded bg-charcoal-900 border border-border space-y-1.5 my-2">
                      <div className="flex items-center justify-between">
                        <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{st.title}</span>
                        </span>
                        <span className="text-[10px] text-muted">{st.status}</span>
                      </div>
                      {st.tool_output && (
                        <pre className="p-2 bg-charcoal-950 rounded text-[11px] text-gray-300 overflow-x-auto max-h-36">
                          {typeof st.tool_output === "string" ? st.tool_output : JSON.stringify(st.tool_output, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Terminal Footer */}
            {activeTask?.status === "completed" && (
              <div className="p-3 bg-emerald-950/30 border-t border-emerald-800/40 flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Task Completed & Changes Verified
                </span>
                <a href="/tasks" className="text-violet-400 hover:text-violet-300 font-semibold underline">
                  Review Diff & PR →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
