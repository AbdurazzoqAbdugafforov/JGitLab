"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AdminSession } from "@/lib/types";
import {
  KeyRound,
  Shield,
  ShieldAlert,
  Search,
  CheckCircle2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Laptop,
  Globe,
  Clock,
  X,
} from "lucide-react";

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminSessions();
      setSessions(data);
    } catch (err: any) {
      setError(err.message || "Failed to load active sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevokeSession = async (sessionId: string, userEmail: string) => {
    setRevokingId(sessionId);
    setError(null);
    try {
      await api.revokeAdminSession(sessionId);
      setActionSuccess(`Terminated session for ${userEmail}.`);
      fetchSessions();
    } catch (err: any) {
      setError(err.message || "Failed to terminate session");
    } finally {
      setRevokingId(null);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.user_email.toLowerCase().includes(q) ||
      s.ip_address.toLowerCase().includes(q) ||
      s.auth_method.toLowerCase().includes(q)
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
              <h1 className="text-xl font-bold text-[#F0F6FC]">Live Platform Sessions</h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#3FB950]/15 text-[#3FB950] border border-[#3FB950]/30">
                {sessions.length} Active Sessions
              </span>
            </div>
            <p className="text-xs text-[#8B949E] mt-0.5">
              Inspect active bearer tokens across all developer accounts and terminate unauthorized or stale logins.
            </p>
          </div>
        </div>

        <button
          onClick={fetchSessions}
          disabled={loading}
          className="px-3 py-1.5 rounded-md bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#C9D1D9] text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Sessions
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-lg bg-[#3FB950]/15 border border-[#3FB950]/40 text-[#3FB950] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-[#3FB950] hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg bg-[#F85149]/15 border border-[#F85149]/40 text-[#F85149] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-[#F85149] hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8B949E] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter sessions by email, IP, or method..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-md bg-[#161B22] border border-[#30363D] focus:border-[#58A6FF] focus:outline-none text-xs text-[#F0F6FC] placeholder-[#8B949E] transition-all font-mono"
          />
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0D1117] border-b border-[#30363D] text-[#8B949E] font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Auth Method</th>
                <th className="py-3 px-4">Network IP &amp; Client</th>
                <th className="py-3 px-4">Session Created</th>
                <th className="py-3 px-4 text-right">Revocation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#8B949E]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#1F6FEB]" />
                      Loading live sessions...
                    </div>
                  </td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#8B949E]">
                    No active sessions found matching &quot;{search}&quot;.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => {
                  const isAdmin = s.user_role === "admin";

                  return (
                    <tr key={s.id} className="hover:bg-[#21262D]/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#F0F6FC]">{s.user_name}</div>
                        <span className="text-[11px] font-mono text-[#8B949E] block">{s.user_email}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#A371F7]/15 text-[#D2A8FF]">
                            <ShieldAlert className="w-3 h-3" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#58A6FF]/10 text-[#58A6FF]">
                            <Shield className="w-3 h-3" /> Engineer
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#C9D1D9]">
                        <span className="px-2 py-0.5 rounded bg-[#0D1117] border border-[#30363D] uppercase text-[10px]">
                          {s.auth_method}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-[#C9D1D9] font-mono">
                          <Globe className="w-3.5 h-3.5 text-[#8B949E]" />
                          <span>{s.ip_address}</span>
                        </div>
                        <span className="text-[10px] text-[#8B949E] truncate block max-w-xs mt-0.5" title={s.user_agent}>
                          {s.user_agent.slice(0, 45)}...
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#8B949E] text-[11px]">
                        <div className="flex items-center gap-1 text-[#C9D1D9]">
                          <Clock className="w-3 h-3 text-[#8B949E]" />
                          <span>{new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <span className="text-[10px] text-[#8B949E] block">
                          {new Date(s.created_at).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleRevokeSession(s.id, s.user_email)}
                          disabled={revokingId === s.id}
                          className="px-2.5 py-1 rounded bg-[#F85149]/10 hover:bg-[#F85149]/25 text-[#F85149] border border-[#F85149]/30 text-xs font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          title="Terminate this session immediately"
                        >
                          <Trash2 className="w-3 h-3" />
                          {revokingId === s.id ? "Terminating..." : "Terminate"}
                        </button>
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
