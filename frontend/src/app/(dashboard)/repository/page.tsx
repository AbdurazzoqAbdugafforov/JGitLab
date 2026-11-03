"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { RepoAnalysis } from "@/lib/types";
import {
  FolderTree,
  FileCode,
  Layers,
  Package,
  Github,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  FileText
} from "lucide-react";

export default function RepositoryExplorerPage() {
  const { activeProject } = useAuth();
  const [analysis, setAnalysis] = useState<RepoAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalysis() {
      if (!activeProject) return;
      setLoading(true);
      try {
        const data = await api.getRepoAnalysis(activeProject.id);
        setAnalysis(data);
        if (data.file_tree_summary?.important_files?.length) {
          setSelectedFile(data.file_tree_summary.important_files[0]);
        }
      } catch (err) {
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    }
    loadAnalysis();
  }, [activeProject]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-violet-400" />
            <span>Repository Explorer & Static Analysis</span>
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Architectural structure, language breakdown, dependencies, and file map for {activeProject?.name}.
          </p>
        </div>
        <Link
          href="/github"
          className="px-3.5 py-1.5 rounded-lg bg-charcoal-850 hover:bg-charcoal-800 text-xs font-mono text-muted hover:text-white border border-border flex items-center gap-1.5 transition-colors"
        >
          <Github className="w-3.5 h-3.5" />
          <span>Connect Different Repo</span>
        </Link>
      </div>

      {!analysis ? (
        <div className="p-12 text-center rounded-2xl bg-charcoal-900 border border-border max-w-xl mx-auto space-y-4">
          <Github className="w-10 h-10 text-muted mx-auto opacity-40" />
          <h2 className="text-base font-semibold text-white">No GitHub Repository Linked</h2>
          <p className="text-xs text-muted leading-relaxed">
            Link a repository to this project to perform automated static analysis, language detection, and dependency inspection.
          </p>
          <Link
            href="/github"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-glow transition-all"
          >
            Connect GitHub Repository
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Repository Summary Bar */}
          <div className="p-5 rounded-2xl bg-charcoal-900 border border-border grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase text-muted block">Repository</span>
              <span className="text-sm font-bold text-white font-mono truncate block mt-0.5">
                {analysis.full_name}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-muted block">Default Branch</span>
              <span className="text-xs font-mono text-cyan-400 block mt-0.5">{analysis.default_branch}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-muted block">Primary Language</span>
              <span className="text-xs font-mono text-violet-300 block mt-0.5">
                {analysis.analysis_summary?.primary_language || "Multi-language"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-muted block">Frameworks Detected</span>
              <span className="text-xs font-mono text-emerald-400 block mt-0.5">
                {analysis.frameworks?.join(", ") || "None"}
              </span>
            </div>
          </div>

          {/* Language Breakdown Bar */}
          {analysis.languages && Object.keys(analysis.languages).length > 0 && (
            <div className="p-5 rounded-xl bg-charcoal-900 border border-border space-y-3">
              <span className="text-xs font-mono uppercase text-muted block">Languages Distribution</span>
              {/* Colored multi-segment bar */}
              <div className="h-2.5 w-full bg-charcoal-800 rounded-full flex overflow-hidden">
                {Object.entries(analysis.languages).map(([lang, pct], idx) => {
                  const colors = ["bg-violet-500", "bg-cyan-400", "bg-emerald-400", "bg-amber-400", "bg-rose-400"];
                  const color = colors[idx % colors.length];
                  return <div key={lang} style={{ width: `${pct}%` }} className={`h-full ${color}`} title={`${lang}: ${pct}%`} />;
                })}
              </div>
              <div className="flex flex-wrap gap-4 pt-1 text-xs font-mono">
                {Object.entries(analysis.languages).map(([lang, pct], idx) => {
                  const colors = ["text-violet-400", "text-cyan-400", "text-emerald-400", "text-amber-400", "text-rose-400"];
                  const color = colors[idx % colors.length];
                  return (
                    <span key={lang} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${color.replace("text-", "bg-")}`} />
                      <span className="text-white">{lang}</span>
                      <span className="text-muted">{pct}%</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Two-Column Grid: Directories & Dependencies */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Directories & Key Files */}
            <div className="p-5 rounded-xl bg-charcoal-900 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-muted flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-violet-400" />
                  <span>Important Architecture Files</span>
                </span>
                <span className="text-xs font-mono text-muted">
                  {analysis.file_tree_summary?.important_files?.length || 0} files
                </span>
              </div>
              <div className="divide-y divide-border">
                {analysis.file_tree_summary?.important_files?.map((f) => (
                  <div key={f} className="py-2 flex items-center justify-between text-xs font-mono text-gray-300">
                    <span className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-muted" />
                      <span>{f}</span>
                    </span>
                    <span className="text-[10px] text-muted">Architecture Entrypoint</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-border">
                <span className="text-xs font-mono uppercase text-muted block mb-2">Key Directories</span>
                <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                  {analysis.file_tree_summary?.directories?.slice(0, 15).map((d) => (
                    <span key={d} className="px-2 py-0.5 rounded bg-charcoal-850 text-gray-300 border border-border">
                      📁 {d}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Dependencies */}
            <div className="p-5 rounded-xl bg-charcoal-900 border border-border space-y-4">
              <span className="text-xs font-mono uppercase text-muted flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400" />
                <span>Detected Package Dependencies</span>
              </span>

              {Object.keys(analysis.dependencies || {}).length === 0 ? (
                <p className="text-xs text-muted">No external dependencies detected in repository.</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(analysis.dependencies).map(([ecosystem, deps]) => (
                    <div key={ecosystem} className="space-y-2">
                      <span className="text-xs font-mono text-cyan-300 uppercase block font-semibold">
                        {ecosystem} ({deps.length} packages)
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                        {deps.map((dep) => (
                          <span
                            key={dep}
                            className="px-2 py-0.5 rounded bg-charcoal-850 text-gray-300 text-[11px] font-mono border border-border"
                          >
                            {dep}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
