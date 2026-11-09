"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AdminAuditLog } from "@/lib/types";
import {
  FileText,
  Shield,
  ShieldAlert,
  Search,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Clock,
  User,
  Filter,
} from "lucide-react";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminAuditLogs({
        limit: 100,
        action_type: actionFilter === "all" ? undefined : actionFilter,
      });
      setLogs(data);
    } catch (err: any) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const filteredLogs = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      (l.user_email && l.user_email.toLowerCase().includes(q)) ||
      l.action_type.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#30363D]">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
            title="Back to Admin Console"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-[#F0F6FC]">Global System Audit Trail</h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#A371F7]/15 text-[#D2A8FF] border border-[#A371F7]/30">
                Security &amp; Operations
              </span>
            </div>
            <p className="text-xs text-[#8B949E] mt-0.5">
              Immutable chronological record of administrative interventions, user provisioning, security events, and agent executions.
            </p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-3 py-1.5 rounded-md bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#C9D1D9] text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Logs
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-[#F85149]/15 border border-[#F85149]/40 text-[#F85149] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-[#8B949E] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by user, action, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-md bg-[#161B22] border border-[#30363D] focus:border-[#58A6FF] focus:outline-none text-xs text-[#F0F6FC] placeholder-[#8B949E] transition-all font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-[#8B949E]" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-md bg-[#161B22] border border-[#30363D] text-xs text-[#C9D1D9] focus:outline-none focus:border-[#58A6FF]"
          >
            <option value="all">All Action Types</option>
            <option value="admin_user_created">User Provisioned</option>
            <option value="admin_user_updated">User Permissions Updated</option>
            <option value="admin_user_deleted">User Deleted</option>
            <option value="admin_session_revoked">Session Terminated</option>
            <option value="account_registered">Public Registration</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0D1117] border-b border-[#30363D] text-[#8B949E] font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Operator / Actor</th>
                <th className="py-3 px-4">Event Description</th>
                <th className="py-3 px-4">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#8B949E]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#1F6FEB]" />
                      Loading audit logs...
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#8B949E]">
                    No audit records matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-[#21262D]/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-[#8B949E] text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[#C9D1D9]">
                          <Clock className="w-3.5 h-3.5 text-[#8B949E]" />
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <span className="text-[10px] text-[#8B949E]">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono ${
                          log.action_type.startsWith("admin_")
                            ? "bg-[#A371F7]/15 text-[#D2A8FF] border border-[#A371F7]/30"
                            : "bg-[#1F6FEB]/15 text-[#58A6FF] border border-[#1F6FEB]/30"
                        }`}>
                          {log.action_type}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.user_email ? (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[#8B949E]" />
                            <span className="font-mono text-[#F0F6FC]">{log.user_email}</span>
                          </div>
                        ) : (
                          <span className="text-[#8B949E] font-mono">System</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-[#C9D1D9]">
                        {log.description}
                      </td>

                      <td className="py-3 px-4 font-mono text-[10px] text-[#8B949E] max-w-xs truncate">
                        {log.metadata_json ? (
                          <span title={typeof log.metadata_json === 'string' ? log.metadata_json : JSON.stringify(log.metadata_json)}>
                            {typeof log.metadata_json === 'string' ? log.metadata_json : JSON.stringify(log.metadata_json)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
