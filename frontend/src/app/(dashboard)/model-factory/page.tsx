"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  ModelFactoryOverview,
  ModelDataset,
  ModelTrainingJob,
  ModelCheckpoint,
} from "@/lib/types";
import {
  Cpu,
  Layers,
  Database,
  Server,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  Download,
  Upload,
  ArrowRight,
  TrendingDown,
  Activity,
  Flame,
  Zap,
  Sliders,
  FileCode,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  X,
  Code2,
  Share2,
} from "lucide-react";
import { JGitLabRefreshIcon } from "@/components/brand/JGitLabBrand";

interface BaseOption {
  id: string;
  name: string;
  params: string;
  context: string;
  recommendedVram: string;
  description: string;
  badge: string;
}

const BASE_MODELS: BaseOption[] = [
  {
    id: "Qwen-2.5-Coder-14B-Instruct",
    name: "Qwen 2.5 Coder 14B",
    params: "14.7B",
    context: "128k",
    recommendedVram: "16 GB (QLoRA)",
    description: "State-of-the-art coding powerhouse with superior multi-file reasoning and AST code synthesis.",
    badge: "RECOMMENDED",
  },
  {
    id: "Llama-3.3-70B-Instruct",
    name: "Llama 3.3 70B Instruct",
    params: "70.6B",
    context: "128k",
    recommendedVram: "48 GB (QLoRA)",
    description: "High-parameter frontier model for complex architectural refactors and security vulnerability auditing.",
    badge: "FRONTIER",
  },
  {
    id: "DeepSeek-Coder-V2-Lite",
    name: "DeepSeek Coder V2 Lite",
    params: "16B MoE (2.4B active)",
    context: "64k",
    recommendedVram: "12 GB (QLoRA)",
    description: "Mixture-of-Experts architecture optimized for ultra-fast training iterations and concise patch synthesis.",
    badge: "FAST MOE",
  },
  {
    id: "Mistral-7B-v0.3",
    name: "Mistral 7B Instruct v0.3",
    params: "7.3B",
    context: "32k",
    recommendedVram: "8 GB (QLoRA)",
    description: "Lightweight, robust baseline ideal for edge deployments and quick specialized instruction tuning.",
    badge: "EFFICIENT",
  },
];

export default function ModelFactoryStudioPage() {
  const { activeProject } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "studio" | "monitor" | "datasets" | "checkpoints">("overview");

  // Data State
  const [overview, setOverview] = useState<ModelFactoryOverview | null>(null);
  const [datasets, setDatasets] = useState<ModelDataset[]>([]);
  const [jobs, setJobs] = useState<ModelTrainingJob[]>([]);
  const [checkpoints, setCheckpoints] = useState<ModelCheckpoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Studio Form State
  const [selectedBaseModel, setSelectedBaseModel] = useState<string>("Qwen-2.5-Coder-14B-Instruct");
  const [tuningMethod, setTuningMethod] = useState<"qlora" | "lora" | "full_sft" | "dpo">("qlora");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [jobName, setJobName] = useState("");
  const [epochs, setEpochs] = useState<number>(3);
  const [learningRate, setLearningRate] = useState<number>(0.0002);
  const [batchSize, setBatchSize] = useState<number>(4);
  const [loraR, setLoraR] = useState<number>(16);
  const [loraAlpha, setLoraAlpha] = useState<number>(32);
  const [showAdvancedHp, setShowAdvancedHp] = useState(false);
  const [launchingJob, setLaunchingJob] = useState(false);

  // Monitor Selected Job
  const [monitoredJobId, setMonitoredJobId] = useState<string | null>(null);
  const [monitoredJob, setMonitoredJob] = useState<ModelTrainingJob | null>(null);

  // Modals & Inspectors
  const [inspectingDataset, setInspectingDataset] = useState<ModelDataset | null>(null);
  const [extractingRepo, setExtractingRepo] = useState(false);
  const [exportScriptModal, setExportScriptModal] = useState<{ script: string; filename: string } | null>(null);
  const [deploySuccessMsg, setDeploySuccessMsg] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Initial Data Fetch
  const refreshAllData = async () => {
    try {
      const [ovData, dsData, jbData, ckData] = await Promise.all([
        api.getModelFactoryOverview(activeProject?.id),
        api.getModelDatasets(activeProject?.id),
        api.getTrainingJobs(activeProject?.id),
        api.getTrainedModels(activeProject?.id),
      ]);
      setOverview(ovData);
      setDatasets(dsData);
      setJobs(jbData);
      setCheckpoints(ckData);

      if (dsData.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(dsData[0].id);
      }

      // Automatically select active or latest job for monitor
      const activeOrLatest = jbData.find((j) => j.status === "training") || jbData[0];
      if (activeOrLatest && (!monitoredJobId || !monitoredJob)) {
        setMonitoredJobId(activeOrLatest.id);
        setMonitoredJob(activeOrLatest);
      }
    } catch (err) {
      console.error("Failed to load Model Factory data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, [activeProject]);

  // Polling for live active job in monitor
  useEffect(() => {
    if (!monitoredJobId) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const updated = await api.getTrainingJob(monitoredJobId);
        if (isSubscribed) {
          setMonitoredJob(updated);
          // If state changed to completed, refresh checkpoints
          if (updated.status === "completed") {
            const ckData = await api.getTrainedModels(activeProject?.id);
            setCheckpoints(ckData);
          }
        }
      } catch {
        // Ignore single poll error
      }
    }, 1800);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [monitoredJobId, activeProject]);

  // Scroll logs to bottom when updated
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [monitoredJob?.logs]);

  // Handle Launch Training Run
  const handleLaunchRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId) {
      alert("Please select a training dataset.");
      return;
    }
    setLaunchingJob(true);
    try {
      const created = await api.createTrainingJob({
        project_id: activeProject?.id,
        dataset_id: selectedDatasetId,
        name: jobName.trim() || undefined,
        base_model: selectedBaseModel,
        fine_tuning_method: tuningMethod,
        epochs,
        learning_rate: learningRate,
        batch_size: batchSize,
        lora_r: loraR,
        lora_alpha: loraAlpha,
      });

      await refreshAllData();
      setMonitoredJobId(created.id);
      setMonitoredJob(created);
      setActiveTab("monitor");
      setJobName("");
    } catch (err: any) {
      alert(err.message || "Failed to launch training job.");
    } finally {
      setLaunchingJob(false);
    }
  };

  // Handle Cancel Job
  const handleCancelJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to stop this training run?")) return;
    try {
      const updated = await api.cancelTrainingJob(jobId);
      setMonitoredJob(updated);
      refreshAllData();
    } catch (err: any) {
      alert(err.message || "Failed to cancel job.");
    }
  };

  // Handle Deploy Checkpoint
  const handleDeployCheckpoint = async (jobIdOrCheckpointId: string) => {
    try {
      const res = await api.deployTrainingJob(jobIdOrCheckpointId);
      setDeploySuccessMsg(`Model '${res.checkpoint.name}' deployed! Registered into AI Providers & active for Autonomous Agent.`);
      setTimeout(() => setDeploySuccessMsg(null), 6000);
      refreshAllData();
    } catch (err: any) {
      alert(err.message || "Deployment failed.");
    }
  };

  // Handle Extract Dataset From Repo
  const handleExtractFromRepo = async () => {
    setExtractingRepo(true);
    try {
      const ds = await api.extractDatasetFromRepo({
        project_id: activeProject?.id,
        name: `${activeProject?.name || "Project"} Code & AST Corpus`,
      });
      await refreshAllData();
      setSelectedDatasetId(ds.id);
      setInspectingDataset(ds);
    } catch (err: any) {
      alert(err.message || "Failed to extract dataset.");
    } finally {
      setExtractingRepo(false);
    }
  };

  // Handle Export Python Script
  const handleExportScript = async (jobId: string) => {
    try {
      const res = await api.getTrainingJobExportScript(jobId);
      setExportScriptModal(res);
    } catch (err: any) {
      alert(err.message || "Failed to export training script.");
    }
  };

  // Calculate SVG Points for Loss Curve
  const lossPoints = useMemo(() => {
    if (!monitoredJob?.loss_history || monitoredJob.loss_history.length === 0) return null;
    const history = monitoredJob.loss_history;
    const width = 640;
    const height = 180;
    const padding = 24;

    const maxStep = Math.max(...history.map((h) => h.step), 10);
    const maxLoss = Math.max(...history.map((h) => h.loss), 3.0);
    const minLoss = Math.min(...history.map((h) => h.loss), 0.2);

    const getX = (step: number) => padding + (step / maxStep) * (width - 2 * padding);
    const getY = (loss: number) =>
      height - padding - ((loss - minLoss) / Math.max(0.1, maxLoss - minLoss)) * (height - 2 * padding);

    const trainPoints = history.map((h) => `${getX(h.step)},${getY(h.loss)}`).join(" ");
    const valPoints = history
      .filter((h) => h.val_loss !== undefined)
      .map((h) => `${getX(h.step)},${getY(h.val_loss!)}`)
      .join(" ");

    return { trainPoints, valPoints, width, height, minLoss, maxLoss };
  }, [monitoredJob?.loss_history]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <JGitLabRefreshIcon size="md" spinning />
        <span className="text-xs font-mono text-[#94A3B8]">Connecting to JGitLab Model Factory &amp; Accelerate Cluster...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Toast Alert */}
      {deploySuccessMsg && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{deploySuccessMsg}</span>
          <button onClick={() => setDeploySuccessMsg(null)} className="ml-2 text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-7 sm:p-8 rounded-2xl bg-gradient-to-br from-[#101524] via-[#141A2D] to-[#0A0D15] border border-white/10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#6366F1]/15 via-[#38BDF8]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/30 text-[#818CF8] text-xs font-mono">
              <Cpu className="w-3.5 h-3.5" />
              <span>JGitLab Accelerate · Autonomous Model Factory</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#F8FAFC] tracking-tight">
              AI Model Factory &amp; Fine-Tuning Studio
            </h1>

            <p className="text-sm text-[#94A3B8] max-w-2xl leading-relaxed">
              Curate specialized programming corpora from repository AST history, train parameter-efficient adapters (QLoRA / LoRA), monitor real-time loss convergence, and deploy custom model checkpoints directly to the Autonomous AI Engineer.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono text-[#CBD5E1]">
              <div className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{overview?.compute_cluster.device || "CUDA 12.4"}</span>
              </div>
              <div className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[#94A3B8]">
                VRAM: <strong className="text-white">{overview?.compute_cluster.vram_used_gb} GB</strong> / {overview?.compute_cluster.vram_total_gb} GB
              </div>
              <div className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[#94A3B8]">
                Framework: <strong className="text-white">PyTorch 2.4 + FlashAttn-2</strong>
              </div>
            </div>
          </div>

          <div className="flex flex-row lg:flex-col items-center lg:items-end gap-3 shrink-0">
            <button
              onClick={() => setActiveTab("studio")}
              className="h-10 px-5 rounded-lg jgitlab-btn-glow text-white text-xs font-semibold flex items-center gap-2 shadow-lg"
            >
              <Flame className="w-4 h-4 text-amber-300" />
              <span>+ Launch Fine-Tuning Run</span>
            </button>

            <button
              onClick={handleExtractFromRepo}
              disabled={extractingRepo}
              className="h-10 px-4 rounded-lg bg-[#161D31] hover:bg-[#1E2742] border border-white/10 text-xs font-medium text-[#CBD5E1] hover:text-white flex items-center gap-2 transition-all"
            >
              {extractingRepo ? <JGitLabRefreshIcon size="xs" spinning /> : <Database className="w-4 h-4 text-[#38BDF8]" />}
              <span>Extract Repo Dataset</span>
            </button>
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="flex items-center gap-2 mt-8 pt-6 border-t border-white/10 overflow-x-auto scrollbar-none">
          {[
            { id: "overview", label: "Cluster Overview", icon: Activity, count: undefined },
            { id: "studio", label: "Training Configurator", icon: Sliders, count: undefined },
            { id: "monitor", label: "Live Telemetry & Loss", icon: Terminal, count: overview?.stats.active_runs || undefined },
            { id: "datasets", label: "Corpus & Datasets", icon: Database, count: datasets.length },
            { id: "checkpoints", label: "Trained Models & Checkpoints", icon: Layers, count: checkpoints.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`h-9 px-4 rounded-lg text-xs font-medium flex items-center gap-2 transition-all shrink-0 ${
                  isActive
                    ? "bg-[#6366F1] text-white shadow-[0_0_16px_rgba(99,102,241,0.5)] font-semibold"
                    : "bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-[#F8FAFC]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isActive ? "bg-black/30 text-white" : "bg-white/10 text-[#CBD5E1]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CLUSTER OVERVIEW & STATS */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top 4 Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-[#101524] border border-white/10 shadow-lg space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#94A3B8] block">Total Datasets</span>
              <div className="text-2xl font-bold text-[#F8FAFC]">{overview?.stats.total_datasets || 0}</div>
              <span className="text-[11px] text-[#38BDF8] flex items-center gap-1">
                <span>{overview?.stats.total_samples.toLocaleString()} training pairs</span>
              </span>
            </div>

            <div className="p-5 rounded-xl bg-[#101524] border border-white/10 shadow-lg space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#94A3B8] block">Active Training Runs</span>
              <div className="text-2xl font-bold text-[#818CF8] flex items-center gap-2">
                <span>{overview?.stats.active_runs || 0}</span>
                {overview?.stats.active_runs ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                ) : null}
              </div>
              <span className="text-[11px] text-[#94A3B8]">{overview?.stats.completed_runs} historical runs completed</span>
            </div>

            <div className="p-5 rounded-xl bg-[#101524] border border-white/10 shadow-lg space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#94A3B8] block">Fine-Tuned Checkpoints</span>
              <div className="text-2xl font-bold text-[#F8FAFC]">{overview?.stats.trained_models || 0}</div>
              <span className="text-[11px] text-emerald-400">Safetensors + GGUF exportable</span>
            </div>

            <div className="p-5 rounded-xl bg-[#101524] border border-white/10 shadow-lg space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#94A3B8] block">Agent Deployed Models</span>
              <div className="text-2xl font-bold text-emerald-400">{overview?.stats.deployed_models || 0}</div>
              <span className="text-[11px] text-[#94A3B8]">Connected to Autonomous Agent</span>
            </div>
          </div>

          {/* Active Job Spotlight Card */}
          {monitoredJob && monitoredJob.status === "training" && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-[#101524] to-[#1A1F36] border border-[#6366F1]/40 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#6366F1]/20 border border-[#6366F1]/40 flex items-center justify-center text-[#818CF8]">
                    <Flame className="w-5 h-5 text-amber-300 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#F8FAFC]">{monitoredJob.name}</h3>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        Training in Progress ({monitoredJob.progress.percent}%)
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Base: <strong className="text-white">{monitoredJob.base_model}</strong> · Method: <strong className="text-white">{monitoredJob.fine_tuning_method.toUpperCase()}</strong> · Dataset: {monitoredJob.dataset_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("monitor")}
                    className="h-8 px-3.5 rounded-lg jgitlab-btn-glow text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Open Live Telemetry</span>
                  </button>
                  <button
                    onClick={() => handleCancelJob(monitoredJob.id)}
                    className="h-8 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-medium"
                  >
                    Stop Run
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-[#CBD5E1]">
                  <span>Step {monitoredJob.progress.current_step} / {monitoredJob.progress.total_steps} (Epoch {monitoredJob.progress.current_epoch}/{monitoredJob.hyperparameters.epochs})</span>
                  <span>Loss: <strong className="text-[#38BDF8]">{monitoredJob.progress.current_loss}</strong> · ETA: {monitoredJob.progress.eta_seconds}s</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#6366F1] to-[#38BDF8] transition-all duration-500"
                    style={{ width: `${monitoredJob.progress.percent}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Quick Access Grid: Recent Checkpoints & Base Model Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Deployed Checkpoints */}
            <div className="p-6 rounded-2xl bg-[#101524] border border-white/10 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#818CF8]" />
                  <h3 className="text-sm font-semibold text-[#F8FAFC]">Available Fine-Tuned Checkpoints</h3>
                </div>
                <button
                  onClick={() => setActiveTab("checkpoints")}
                  className="text-xs text-[#818CF8] hover:underline font-mono"
                >
                  View All ({checkpoints.length})
                </button>
              </div>

              {checkpoints.length === 0 ? (
                <p className="text-xs text-[#94A3B8] py-8 text-center">No checkpoints generated yet. Launch your first run!</p>
              ) : (
                <div className="space-y-3">
                  {checkpoints.slice(0, 3).map((cp) => (
                    <div
                      key={cp.id}
                      className="p-3.5 rounded-xl bg-[#0B0E17] border border-white/10 flex items-center justify-between hover:border-[#6366F1]/50 transition-colors"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#F8FAFC] truncate">{cp.name}</span>
                          {cp.is_deployed && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              DEPLOYED
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-[#94A3B8] block mt-0.5">
                          Base: {cp.base_model} · {cp.adapter_size_mb} MB · Pass@1: {cp.eval_pass_rate}%
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!cp.is_deployed ? (
                          <button
                            onClick={() => handleDeployCheckpoint(cp.id)}
                            className="h-7 px-2.5 rounded-md bg-[#6366F1]/20 hover:bg-[#6366F1]/40 border border-[#6366F1]/40 text-xs font-medium text-[#818CF8] hover:text-white transition-colors"
                          >
                            Deploy
                          </button>
                        ) : (
                          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Supported Base Models */}
            <div className="p-6 rounded-2xl bg-[#101524] border border-white/10 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#38BDF8]" />
                  <h3 className="text-sm font-semibold text-[#F8FAFC]">Pre-Loaded Base Coding Foundation Models</h3>
                </div>
                <span className="text-xs font-mono text-[#94A3B8]">4 Available</span>
              </div>

              <div className="space-y-3">
                {BASE_MODELS.slice(0, 3).map((bm) => (
                  <div
                    key={bm.id}
                    className="p-3.5 rounded-xl bg-[#0B0E17] border border-white/10 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{bm.name}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-[#94A3B8]">
                          {bm.params}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5 line-clamp-1">{bm.description}</p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedBaseModel(bm.id);
                        setActiveTab("studio");
                      }}
                      className="h-7 px-2.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-[#CBD5E1] shrink-0"
                    >
                      Configure
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TRAINING STUDIO & LAUNCH JOB */}
      {/* ========================================================================= */}
      {activeTab === "studio" && (
        <form onSubmit={handleLaunchRun} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left 8 Cols: Base Model, Method, Dataset & Hyperparameters */}
            <div className="lg:col-span-8 space-y-6">
              {/* 1. Base Model Selector */}
              <div className="p-6 rounded-2xl bg-[#101524] border border-white/10 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#6366F1]/20 text-[#818CF8] flex items-center justify-center font-bold text-[10px]">
                      1
                    </span>
                    <span>Select Base Foundation Architecture</span>
                  </label>
                  <span className="text-[11px] font-mono text-[#38BDF8]">Open Weights</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BASE_MODELS.map((bm) => {
                    const isSelected = selectedBaseModel === bm.id;
                    return (
                      <div
                        key={bm.id}
                        onClick={() => setSelectedBaseModel(bm.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-[#6366F1]/15 border-[#6366F1] shadow-[0_0_16px_rgba(99,102,241,0.25)]"
                            : "bg-[#0B0E17] border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{bm.name}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-[#CBD5E1]">
                            {bm.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#94A3B8] mt-1 line-clamp-2 leading-relaxed">{bm.description}</p>
                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-[#64748B]">
                          <span>Context: {bm.context}</span>
                          <span>Min VRAM: {bm.recommendedVram}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Fine-Tuning Method */}
              <div className="p-6 rounded-2xl bg-[#101524] border border-white/10 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#6366F1]/20 text-[#818CF8] flex items-center justify-center font-bold text-[10px]">
                      2
                    </span>
                    <span>Adaptation &amp; Fine-Tuning Strategy</span>
                  </label>
                  <span className="text-[11px] font-mono text-emerald-400">Parameter Efficient</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: "qlora", label: "QLoRA (4-bit NF4)", desc: "Lowest VRAM, 99% FP16 fidelity", rec: true },
                    { id: "lora", label: "LoRA (FP16 / BF16)", desc: "Fastest step convergence", rec: false },
                    { id: "full_sft", label: "Full SFT", desc: "Requires 8x A100 cluster", rec: false },
                    { id: "dpo", label: "DPO Alignment", desc: "Preference pair optimization", rec: false },
                  ].map((m) => {
                    const isSelected = tuningMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setTuningMethod(m.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-[#6366F1] text-white border-transparent shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                            : "bg-[#0B0E17] border-white/10 hover:border-white/20 text-[#CBD5E1]"
                        }`}
                      >
                        <span className="text-xs font-bold block">{m.label}</span>
                        <span className={`text-[10px] block mt-0.5 ${isSelected ? "text-white/80" : "text-[#64748B]"}`}>
                          {m.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Dataset Selection */}
              <div className="p-6 rounded-2xl bg-[#101524] border border-white/10 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#6366F1]/20 text-[#818CF8] flex items-center justify-center font-bold text-[10px]">
                      3
                    </span>
                    <span>Training Corpus &amp; Dataset</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleExtractFromRepo}
                    disabled={extractingRepo}
                    className="text-xs text-[#38BDF8] hover:underline font-mono flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Extract from Repo Commits</span>
                  </button>
                </div>

                {datasets.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                    No datasets available. Click "Extract from Repo Commits" or create one in the Datasets tab.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={selectedDatasetId}
                      onChange={(e) => setSelectedDatasetId(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl bg-[#0B0E17] border border-white/10 text-sm text-[#F8FAFC] focus:border-[#6366F1] focus:outline-none font-mono"
                    >
                      {datasets.map((ds) => (
                        <option key={ds.id} value={ds.id}>
                          {ds.name} ({ds.sample_count} samples · {ds.format.toUpperCase()})
                        </option>
                      ))}
                    </select>

                    {selectedDatasetId && (
                      <div className="p-3 rounded-lg bg-[#0B0E17] border border-white/5 text-[11px] text-[#94A3B8] flex items-center justify-between font-mono">
                        <span>
                          {datasets.find((d) => d.id === selectedDatasetId)?.description || ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const ds = datasets.find((d) => d.id === selectedDatasetId);
                            if (ds) setInspectingDataset(ds);
                          }}
                          className="text-[#818CF8] hover:underline shrink-0 ml-2"
                        >
                          Inspect Samples
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Advanced Hyperparameters Accordion */}
              <div className="p-6 rounded-2xl bg-[#101524] border border-white/10 shadow-lg space-y-4">
                <button
                  type="button"
                  onClick={() => setShowAdvancedHp(!showAdvancedHp)}
                  className="w-full flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#94A3B8]"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#818CF8]" />
                    <span>Hyperparameters &amp; Optimizer Config</span>
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-[#CBD5E1]">
                    <span>{showAdvancedHp ? "Hide" : "Show"}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedHp ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {showAdvancedHp && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-white/5">
                    <div>
                      <label className="text-[11px] font-mono text-[#94A3B8] block mb-1">Epochs</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={epochs}
                        onChange={(e) => setEpochs(Number(e.target.value))}
                        className="w-full h-9 px-3 rounded-lg bg-[#0B0E17] border border-white/10 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-[#94A3B8] block mb-1">Learning Rate</label>
                      <input
                        type="number"
                        step="0.00005"
                        value={learningRate}
                        onChange={(e) => setLearningRate(Number(e.target.value))}
                        className="w-full h-9 px-3 rounded-lg bg-[#0B0E17] border border-white/10 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-[#94A3B8] block mb-1">Batch Size</label>
                      <input
                        type="number"
                        min="1"
                        max="64"
                        value={batchSize}
                        onChange={(e) => setBatchSize(Number(e.target.value))}
                        className="w-full h-9 px-3 rounded-lg bg-[#0B0E17] border border-white/10 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-[#94A3B8] block mb-1">LoRA Rank (r)</label>
                      <input
                        type="number"
                        value={loraR}
                        onChange={(e) => setLoraR(Number(e.target.value))}
                        className="w-full h-9 px-3 rounded-lg bg-[#0B0E17] border border-white/10 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-[#94A3B8] block mb-1">LoRA Alpha</label>
                      <input
                        type="number"
                        value={loraAlpha}
                        onChange={(e) => setLoraAlpha(Number(e.target.value))}
                        className="w-full h-9 px-3 rounded-lg bg-[#0B0E17] border border-white/10 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-[#94A3B8] block mb-1">Optimizer</label>
                      <input
                        type="text"
                        disabled
                        value="paged_adamw_8bit"
                        className="w-full h-9 px-3 rounded-lg bg-[#0B0E17] border border-white/10 text-xs text-[#94A3B8] font-mono cursor-not-allowed"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right 4 Cols: Launch Summary Card */}
            <div className="lg:col-span-4 space-y-6">
              <div className="p-6 rounded-2xl bg-[#101524] border border-white/10 shadow-xl space-y-5 sticky top-20">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-300" />
                  <h3 className="text-sm font-semibold text-[#F8FAFC]">Run Summary &amp; Verification</h3>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[#94A3B8] block mb-1">Custom Run Identifier</label>
                  <input
                    type="text"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    placeholder="e.g. qwen14b-repo-adapter-v2"
                    className="w-full h-10 px-3.5 rounded-lg bg-[#0B0E17] border border-white/10 text-xs text-white placeholder:text-[#64748B] focus:border-[#6366F1] focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-2 pt-3 border-t border-white/5 text-xs font-mono">
                  <div className="flex items-center justify-between text-[#94A3B8]">
                    <span>Base Model:</span>
                    <strong className="text-white truncate max-w-[150px]">{selectedBaseModel}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[#94A3B8]">
                    <span>Tuning Mode:</span>
                    <span className="text-emerald-400 font-semibold">{tuningMethod.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#94A3B8]">
                    <span>Total Epochs:</span>
                    <span className="text-white">{epochs}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#94A3B8]">
                    <span>Trainable Weights:</span>
                    <span className="text-[#38BDF8]">~33.5M (0.24%)</span>
                  </div>
                  <div className="flex items-center justify-between text-[#94A3B8]">
                    <span>Quantization:</span>
                    <span className="text-white">4-bit NormalFloat</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={launchingJob || datasets.length === 0}
                  className="w-full h-11 rounded-xl jgitlab-btn-glow text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
                >
                  {launchingJob ? (
                    <JGitLabRefreshIcon size="xs" spinning />
                  ) : (
                    <Play className="w-4 h-4 fill-white" />
                  )}
                  <span>Launch Training Execution</span>
                </button>

                <p className="text-[10px] text-[#64748B] text-center leading-relaxed">
                  Real-time gradient optimization logs, loss curves, and evaluation checkpoints will stream automatically to the Telemetry tab.
                </p>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LIVE TELEMETRY & LOSS CURVES */}
      {/* ========================================================================= */}
      {activeTab === "monitor" && (
        <div className="space-y-6">
          {/* Job Picker Bar */}
          <div className="p-4 rounded-xl bg-[#101524] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Terminal className="w-4 h-4 text-[#818CF8]" />
              <span className="text-xs font-mono uppercase text-[#94A3B8]">Inspecting Run:</span>
              <select
                value={monitoredJobId || ""}
                onChange={(e) => {
                  const id = e.target.value;
                  setMonitoredJobId(id);
                  const j = jobs.find((job) => job.id === id);
                  if (j) setMonitoredJob(j);
                }}
                className="h-8 px-3 rounded-lg bg-[#0B0E17] border border-white/10 text-xs font-mono text-white focus:outline-none"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name} ({j.status.toUpperCase()} · {j.base_model})
                  </option>
                ))}
              </select>
            </div>

            {monitoredJob && (
              <div className="flex items-center gap-2">
                {monitoredJob.status === "completed" && (
                  <button
                    onClick={() => handleDeployCheckpoint(monitoredJob.id)}
                    className="h-8 px-3 rounded-lg jgitlab-btn-neon-emerald text-white text-xs font-semibold flex items-center gap-1.5 shadow"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Deploy to Agent</span>
                  </button>
                )}

                <button
                  onClick={() => handleExportScript(monitoredJob.id)}
                  className="h-8 px-3 rounded-lg bg-[#161D31] hover:bg-[#1E2742] border border-white/10 text-xs font-mono text-[#CBD5E1] flex items-center gap-1.5"
                >
                  <Code2 className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>Python train.py</span>
                </button>

                {monitoredJob.status === "training" && (
                  <button
                    onClick={() => handleCancelJob(monitoredJob.id)}
                    className="h-8 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-medium"
                  >
                    Cancel Run
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Loss Curve Graph & Live Gauges */}
          {monitoredJob && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 8 cols: Dynamic SVG Loss Curve */}
              <div className="lg:col-span-8 p-6 rounded-2xl bg-[#101524] border border-white/10 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-[#38BDF8]" />
                    <h3 className="text-sm font-semibold text-[#F8FAFC]">Training &amp; Validation Loss Trajectory</h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-[#38BDF8]">
                      <span className="w-2.5 h-0.5 bg-[#38BDF8]" /> Train Loss ({monitoredJob.progress.current_loss})
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <span className="w-2.5 h-0.5 bg-amber-400" /> Val Loss ({monitoredJob.progress.val_loss})
                    </span>
                  </div>
                </div>

                <div className="w-full bg-[#0B0E17] rounded-xl p-4 border border-white/5 overflow-hidden">
                  {lossPoints && lossPoints.trainPoints ? (
                    <svg viewBox={`0 0 ${lossPoints.width} ${lossPoints.height}`} className="w-full h-48">
                      {/* Grid lines */}
                      <line x1="24" y1="24" x2={lossPoints.width - 24} y2="24" stroke="rgba(255,255,255,0.05)" />
                      <line x1="24" y1="90" x2={lossPoints.width - 24} y2="90" stroke="rgba(255,255,255,0.05)" />
                      <line x1="24" y1={lossPoints.height - 24} x2={lossPoints.width - 24} y2={lossPoints.height - 24} stroke="rgba(255,255,255,0.1)" />

                      {/* Val Loss Line */}
                      {lossPoints.valPoints && (
                        <polyline
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          points={lossPoints.valPoints}
                        />
                      )}

                      {/* Train Loss Line */}
                      <polyline
                        fill="none"
                        stroke="#38BDF8"
                        strokeWidth="2.5"
                        points={lossPoints.trainPoints}
                      />
                    </svg>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-xs font-mono text-[#64748B]">
                      Awaiting initial gradient step iterations...
                    </div>
                  )}
                </div>
              </div>

              {/* Right 4 cols: Live Progress & GPU Metrics */}
              <div className="lg:col-span-4 p-6 rounded-2xl bg-[#101524] border border-white/10 shadow-lg space-y-4">
                <h3 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#818CF8]" />
                  <span>Execution Telemetry</span>
                </h3>

                <div className="space-y-3 pt-2 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-[#0B0E17] border border-white/5 flex items-center justify-between">
                    <span className="text-[#94A3B8]">Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        monitoredJob.status === "completed"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : monitoredJob.status === "training"
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      {monitoredJob.status}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0B0E17] border border-white/5 flex items-center justify-between">
                    <span className="text-[#94A3B8]">Progress:</span>
                    <span className="text-white font-bold">{monitoredJob.progress.percent}%</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0B0E17] border border-white/5 flex items-center justify-between">
                    <span className="text-[#94A3B8]">Current Step / Total:</span>
                    <span className="text-white">
                      {monitoredJob.progress.current_step} / {monitoredJob.progress.total_steps}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0B0E17] border border-white/5 flex items-center justify-between">
                    <span className="text-[#94A3B8]">Elapsed / ETA:</span>
                    <span className="text-white">
                      {monitoredJob.progress.elapsed_seconds}s / {monitoredJob.progress.eta_seconds}s
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0B0E17] border border-white/5 flex items-center justify-between">
                    <span className="text-[#94A3B8]">GPU VRAM Allocation:</span>
                    <span className="text-[#38BDF8]">
                      {(monitoredJob.progress.gpu_memory_used_mb / 1024).toFixed(1)} GB / 24.0 GB
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Terminal Console Logs */}
          {monitoredJob && (
            <div className="rounded-2xl bg-[#07090E] border border-white/10 shadow-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/10 bg-[#0B0E17] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="ml-2 text-xs font-mono text-[#94A3B8]">
                    training_stream_{monitoredJob.id.slice(0, 8)}.log
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#64748B]">Auto-Scrolling Enabled</span>
              </div>

              <div className="p-5 font-mono text-xs text-[#CBD5E1] space-y-1.5 max-h-72 overflow-y-auto">
                {monitoredJob.logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed flex items-start gap-2">
                    <span className="text-[#64748B] shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        log.level === "step"
                          ? "bg-[#6366F1]/20 text-[#818CF8]"
                          : log.level === "warn"
                          ? "bg-amber-500/20 text-amber-300"
                          : log.level === "error"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-white/10 text-[#94A3B8]"
                      }`}
                    >
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-[#F8FAFC]">{log.message}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CORPUS & DATASET MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === "datasets" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Curated Code Corpora</h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Instruction-input-output pairs formatted for supervised instruction fine-tuning and DPO alignment.
              </p>
            </div>
            <button
              onClick={handleExtractFromRepo}
              disabled={extractingRepo}
              className="h-9 px-4 rounded-lg jgitlab-btn-glow text-white text-xs font-semibold flex items-center gap-1.5 shadow"
            >
              {extractingRepo ? <JGitLabRefreshIcon size="xs" spinning /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Extract from Git Commits</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {datasets.map((ds) => (
              <div
                key={ds.id}
                className="p-5 rounded-2xl bg-[#101524] border border-white/10 shadow-lg space-y-4 hover:border-[#6366F1]/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30">
                    {ds.format.toUpperCase()} · {ds.source.replace("_", " ").toUpperCase()}
                  </span>
                  <span className="text-[11px] font-mono text-[#94A3B8]">
                    {(ds.size_bytes / 1024).toFixed(1)} KB
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">{ds.name}</h3>
                  <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2 leading-relaxed">{ds.description}</p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-[#CBD5E1]">
                  <span>{ds.sample_count} Training Samples</span>
                  <span>~{ds.token_count.toLocaleString()} Tokens</span>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => setInspectingDataset(ds)}
                    className="text-xs text-[#38BDF8] hover:underline font-mono flex items-center gap-1"
                  >
                    <span>Inspect Sample Pairs</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => {
                      setSelectedDatasetId(ds.id);
                      setActiveTab("studio");
                    }}
                    className="h-8 px-3 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white"
                  >
                    Train With Dataset
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TRAINED MODELS & CHECKPOINTS */}
      {/* ========================================================================= */}
      {activeTab === "checkpoints" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Fine-Tuned Model Weights &amp; Adapters</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Safetensors LoRA adapters and quantized GGUF artifacts ready for direct autonomous code execution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {checkpoints.map((cp) => (
              <div
                key={cp.id}
                className="p-6 rounded-2xl bg-[#101524] border border-white/10 shadow-lg space-y-4 hover:border-emerald-500/40 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{cp.name}</span>
                    {cp.is_deployed ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        ACTIVE AGENT MODEL
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#94A3B8]">
                        STANDBY
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#94A3B8]">
                    Fine-tuned on top of <strong className="text-white">{cp.base_model}</strong> using {cp.method}.
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs font-mono text-[#CBD5E1]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#94A3B8]">HumanEval Score:</span>
                      <strong className="text-emerald-400 font-bold">{cp.eval_pass_rate}%</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#94A3B8]">Adapter Size:</span>
                      <span>{cp.adapter_size_mb} MB</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#94A3B8]">Weight Format:</span>
                      <span>{cp.format.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  {!cp.is_deployed ? (
                    <button
                      onClick={() => handleDeployCheckpoint(cp.id)}
                      className="w-full h-9 rounded-lg jgitlab-btn-neon-emerald text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Deploy to Autonomous Agent</span>
                    </button>
                  ) : (
                    <div className="text-center py-1.5 text-xs font-mono text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Serving In Production</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DATASET SAMPLE INSPECTOR */}
      {/* ========================================================================= */}
      {inspectingDataset && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl bg-[#0D1117] border border-white/10 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#161B22]">
              <div>
                <h3 className="text-sm font-bold text-white">{inspectingDataset.name}</h3>
                <span className="text-xs text-[#94A3B8] font-mono">
                  {inspectingDataset.samples.length} Samples · Format: {inspectingDataset.format.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => setInspectingDataset(null)}
                className="text-[#94A3B8] hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {inspectingDataset.samples.map((s, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#07090E] border border-white/5 space-y-3">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#6366F1]/20 text-[#818CF8]">
                    Sample #{idx + 1}
                  </span>
                  <div>
                    <span className="text-[11px] font-mono text-[#94A3B8] uppercase block mb-1">Instruction:</span>
                    <p className="text-xs text-[#F8FAFC] font-medium leading-relaxed">{s.instruction}</p>
                  </div>
                  {s.input && (
                    <div>
                      <span className="text-[11px] font-mono text-[#94A3B8] uppercase block mb-1">Input Code:</span>
                      <pre className="p-2.5 rounded-lg bg-black text-xs font-mono text-[#CBD5E1] overflow-x-auto">
                        {s.input}
                      </pre>
                    </div>
                  )}
                  <div>
                    <span className="text-[11px] font-mono text-emerald-400 uppercase block mb-1">Expected Output:</span>
                    <pre className="p-2.5 rounded-lg bg-black text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                      {s.output}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PYTHON EXPORT SCRIPT */}
      {/* ========================================================================= */}
      {exportScriptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl bg-[#0D1117] border border-white/10 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#161B22]">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="text-sm font-bold text-white">{exportScriptModal.filename}</h3>
              </div>
              <button
                onClick={() => setExportScriptModal(null)}
                className="text-[#94A3B8] hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-[#07090E]">
              <pre className="text-xs font-mono text-[#CBD5E1] leading-relaxed whitespace-pre-wrap">
                {exportScriptModal.script}
              </pre>
            </div>

            <div className="p-4 border-t border-white/10 bg-[#161B22] flex items-center justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exportScriptModal.script);
                  alert("Copied Python training script to clipboard!");
                }}
                className="h-8 px-4 rounded-md jgitlab-btn-glow text-white text-xs font-semibold"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
