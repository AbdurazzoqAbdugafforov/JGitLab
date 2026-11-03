"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { ActivityLog } from "@/lib/types";
import {
  History,
  Clock,
  Filter,
  CheckCircle2,
  Terminal,
  Brain,
  Sliders,
  FolderGit2,
  GitPullRequest
} from "lucide-react";

export default function ActivityLogsPage() {
  const { activeProject } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      try {
        const data = await api.getActivityLogs(activeProject?.id);
        setLogs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
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
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-violet-400" />
            <span>Audit Trail & Activity Logs</span>
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Immutable log of system actions, tool executions, memory additions, and authentication events.
          </p>
        </div>
      </div>

      <div className="bg-charcoal-900 border border-border rounded-xl divide-y divide-border overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted">No activity records found.</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-charcoal-850/50 transition-colors flex items-start gap-3 text-xs">
              <div className="p-2 rounded-lg bg-charcoal-850 border border-border shrink-0 mt-0.5">
                {getEntityIcon(log.entity_type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-charcoal-800 text-gray-300 uppercase border border-border">
                    {log.action_type}
                  </span>
                  <span className="font-mono text-[11px] text-muted">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-white">{log.description}</p>
                {log.metadata_json && (
                  <pre className="mt-2 p-2 rounded bg-charcoal-950 font-mono text-[11px] text-gray-400 overflow-x-auto max-h-32">
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
