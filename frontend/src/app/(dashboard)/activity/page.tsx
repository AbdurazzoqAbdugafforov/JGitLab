"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { ActivityLog } from "@/lib/types";
import {
  History,
  Clock,
  Terminal,
  Brain,
  Sliders,
  FolderGit2,
  Search,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

const ENTITY_FILTERS = [
  { id: "all", label: "All Events" },
  { id: "task", label: "Agent Tasks" },
  { id: "project", label: "Projects" },
  { id: "memory", label: "Memory" },
  { id: "provider", label: "AI Providers" },
  { id: "user", label: "Auth & Identity" },
];

export default function ActivityLogsPage() {
  const { activeProject } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("all");
  const [query, setQuery] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getActivityLogs(activeProject?.id);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [activeProject]);

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "project":
        return <FolderGit2 className="w-4 h-4 text-violet-400" />;
      case "task":
        return <Terminal className="w-4 h-4 text-cyan-400" />;
      case "memory":
        return <Brain className="w-4 h-4 text-emerald-400" />;
      case "provider":
        return <Sliders className="w-4 h-4 text-amber-400" />;
      case "user":
        return <ShieldCheck className="w-4 h-4 text-orange-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesEntity = entityFilter === "all" || log.entity_type === entityFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      log.action_type.toLowerCase().includes(q) ||
      log.description.toLowerCase().includes(q) ||
      (log.entity_type || "").toLowerCase().includes(q);
    return matchesEntity && matchesQuery;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-violet-400" />
            <span>Audit Trail &amp; Activity Logs</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Immutable log of system actions, tool executions, memory additions, and authentication events.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          className="h-9 px-3.5 rounded-lg bg-[#0E131D] hover:bg-[#141B29] border border-white/[0.08] text-xs text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Interactive Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl bg-[#0B0F19] border border-white/[0.07]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {ENTITY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setEntityFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                entityFilter === f.id
                  ? "bg-violet-600 text-white"
                  : "bg-white/[0.03] text-gray-400 hover:text-white hover:bg-white/[0.07]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter audit trail..."
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#070A10] border border-white/[0.08] text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500/60"
          />
        </div>
      </div>

      <div className="bg-[#0B0F19] border border-white/[0.07] rounded-xl divide-y divide-white/[0.06] overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No activity records match your current filter.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 hover:bg-white/[0.02] transition-colors flex items-start gap-3.5 text-xs"
            >
              <div className="p-2.5 rounded-lg bg-[#111726] border border-white/[0.07] shrink-0 mt-0.5">
                {getEntityIcon(log.entity_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 uppercase border border-violet-500/25">
                    {log.action_type}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-400 uppercase">
                    {log.entity_type}
                  </span>
                  <span className="font-mono text-[11px] text-gray-500 ml-auto">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-100">{log.description}</p>
                {log.metadata_json && (
                  <pre className="mt-2 p-2.5 rounded-lg bg-[#06080D] border border-white/[0.06] font-mono text-[11px] text-gray-400 overflow-x-auto max-h-32">
                    {JSON.stringify(log.metadata_json, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
