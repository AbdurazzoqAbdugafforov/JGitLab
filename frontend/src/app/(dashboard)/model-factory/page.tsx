"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Layers,
  Database,
  Cpu,
  Server,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Clock,
  Workflow,
  CheckCircle2,
  Lock
} from "lucide-react";

export default function ModelFactoryPreviewPage() {
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStatus() {
      try {
        const data = await api.getModelFactoryStatus();
        setStatusData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="p-8 rounded-2xl bg-gradient-to-r from-charcoal-900 via-violet-950/20 to-charcoal-900 border border-violet-500/30 relative overflow-hidden shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/40 text-cyan-300 text-xs font-mono mb-4">
          <Clock className="w-3.5 h-3.5" />
          <span>Future Platform Module · Architectural Roadmap</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          AI Model Factory
        </h1>

        <p className="mt-3 text-sm text-gray-300 max-w-2xl leading-relaxed">
          The long-term Pillar 2 of JGitLab: Train, evaluate, and serve proprietary code models. The initial MVP intentionally focuses on the Autonomous AI Engineer powered by external AI APIs, while the architecture is designed for zero-refactor model transitions.
        </p>

        {/* Note Alert per prompt rules */}
        <div className="mt-6 p-4 rounded-xl bg-charcoal-850/80 border border-border text-xs text-muted flex items-start gap-3 max-w-2xl">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-white block mb-0.5">Strict Production Transparency:</strong>
            These modules are scheduled for subsequent roadmap phases. No mock training actions, synthetic GPU metrics, or simulated deployments are presented here.
          </span>
        </div>
      </div>

      {/* Roadmap Phases */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase text-muted tracking-wider">
            Planned Evolution Stages
          </span>
          <span className="text-xs font-mono text-cyan-400">
            {statusData?.current_phase || "Phase 1 Active"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Phase 2: Dataset Management */}
          <div className="p-6 rounded-2xl bg-charcoal-900 border border-border space-y-4 relative flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-charcoal-850 text-cyan-400 border border-border text-xs font-mono font-bold">
                  PHASE 2
                </span>
                <span className="text-[10px] font-mono text-muted uppercase">Planned</span>
              </div>

              <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
                <Database className="w-5 h-5" />
              </div>

              <h2 className="text-base font-bold text-white">Dataset & Corpus Management</h2>
              <p className="text-xs text-muted leading-relaxed">
                Curate specialized programming corpora from organization repositories, extracting clean commit-to-diff instruction pairs and AST-validated examples.
              </p>

              <div className="space-y-1.5 pt-2 border-t border-border font-mono text-[11px] text-gray-300">
                <div>• Curated Code Corpus Deduplication</div>
                <div>• Commit-to-Diff Training Pairs</div>
                <div>• AST Syntax Consistency Checks</div>
                <div>• Target Entities: <code className="text-cyan-400">Dataset</code>, <code className="text-cyan-400">DatasetVersion</code></div>
              </div>
            </div>

            <div className="pt-4 border-t border-border text-[11px] font-mono text-muted flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Specification Ready
            </div>
          </div>

          {/* Phase 3: Fine-Tuning Infrastructure */}
          <div className="p-6 rounded-2xl bg-charcoal-900 border border-border space-y-4 relative flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-charcoal-850 text-violet-400 border border-border text-xs font-mono font-bold">
                  PHASE 3
                </span>
                <span className="text-[10px] font-mono text-muted uppercase">Planned</span>
              </div>

              <div className="w-10 h-10 rounded-xl bg-violet-950/60 border border-violet-800/40 flex items-center justify-center text-violet-400">
                <Cpu className="w-5 h-5" />
              </div>

              <h2 className="text-base font-bold text-white">Fine-Tuning Infrastructure</h2>
              <p className="text-xs text-muted leading-relaxed">
                Parameter-efficient adaptation pipelines utilizing LoRA and QLoRA on dedicated GPU clusters, with continuous eval suites and regression prevention.
              </p>

              <div className="space-y-1.5 pt-2 border-t border-border font-mono text-[11px] text-gray-300">
                <div>• LoRA & QLoRA Quantized Tuning</div>
                <div>• Distributed GPU Worker Coordination</div>
                <div>• Continuous Loss & Human-in-Loop Review</div>
                <div>• Target Entities: <code className="text-violet-400">TrainingJob</code>, <code className="text-violet-400">EvaluationReport</code></div>
              </div>
            </div>

            <div className="pt-4 border-t border-border text-[11px] font-mono text-muted flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Specification Ready
            </div>
          </div>

          {/* Phase 4: In-House Model Serving */}
          <div className="p-6 rounded-2xl bg-charcoal-900 border border-border space-y-4 relative flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-charcoal-850 text-emerald-400 border border-border text-xs font-mono font-bold">
                  PHASE 4
                </span>
                <span className="text-[10px] font-mono text-muted uppercase">Planned</span>
              </div>

              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
                <Server className="w-5 h-5" />
              </div>

              <h2 className="text-base font-bold text-white">Proprietary Serving & Hybrid Router</h2>
              <p className="text-xs text-muted leading-relaxed">
                Self-hosted vLLM inference endpoints with dynamic hybrid routing between external frontier models, local open-weight weights, and in-house checkpoints.
              </p>

              <div className="space-y-1.5 pt-2 border-t border-border font-mono text-[11px] text-gray-300">
                <div>• Dedicated vLLM / TensorRT Engines</div>
                <div>• Dynamic Hybrid Router</div>
                <div>• Zero-Downtime Model Hot-Swapping</div>
                <div>• Target Entities: <code className="text-emerald-400">ModelDeployment</code>, <code className="text-emerald-400">RoutingRule</code></div>
              </div>
            </div>

            <div className="pt-4 border-t border-border text-[11px] font-mono text-muted flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Specification Ready
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
