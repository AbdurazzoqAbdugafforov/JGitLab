"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AdminOverview } from "@/lib/types";
import {
  ShieldAlert,
  Users,
  Activity,
  KeyRound,
  FileText,
  Server,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  ListTodo,
  Brain,
  ArrowRight,
  ShieldCheck,
  Lock,
  RefreshCw,
} from "lucide-react";

export default function AdminConsolePage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminOverview();
      setOverview(data);
    } catch (err: any) {
      setError(err.message || "Failed to load admin telemetry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  if (loading && !overview) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-[#21262D] rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-[#161B22] border border-[#30363D] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#30363D]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#A371F7]/15 border border-[#A371F7]/40 flex items-center justify-center text-[#A371F7]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-[#F0F6FC]">Admin Console &amp; System Telemetry</h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#A371F7]/20 text-[#D2A8FF] border border-[#A371F7]/30">
                  Lead Architect
                </span>
              </div>
              <p className="text-xs text-[#8B949E] mt-0.5">
                Global platform administration, user provisioning, active sessions, and security governance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="px-3 py-1.5 rounded-md bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#C9D1D9] text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Telemetry
          </button>
          <Link
            href="/admin/users"
            className="px-3 py-1.5 rounded-md bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Users className="w-3.5 h-3.5" /> Manage Users
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-[#F85149]/10 border border-[#F85149]/30 text-[#F85149] text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Primary KPI Grid */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#161B22] border border-[#30363D] hover:border-[#58A6FF]/40 transition-all">
            <div className="flex items-center justify-between text-[#8B949E] mb-2">
              <span className="text-xs font-medium">Platform Users</span>
              <Users className="w-4 h-4 text-[#58A6FF]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#F0F6FC]">{overview.stats.total_users}</span>
              <span className="text-xs text-[#3FB950] font-mono">({overview.stats.active_users} active)</span>
            </div>
            <div className="text-[11px] text-[#8B949E] mt-2 font-mono flex items-center gap-3">
              <span>{overview.stats.admin_users} Admins</span>
              <span>•</span>
              <span>{overview.stats.engineer_users} Engineers</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#161B22] border border-[#30363D] hover:border-[#3FB950]/40 transition-all">
            <div className="flex items-center justify-between text-[#8B949E] mb-2">
              <span className="text-xs font-medium">Active Sessions</span>
              <KeyRound className="w-4 h-4 text-[#3FB950]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#F0F6FC]">{overview.stats.active_sessions}</span>
              <span className="text-xs text-[#8B949E]">live tokens</span>
            </div>
            <Link
              href="/admin/sessions"
              className="text-[11px] text-[#58A6FF] hover:underline mt-2 inline-flex items-center gap-1 font-mono"
            >
              Inspect active sessions <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-4 rounded-xl bg-[#161B22] border border-[#30363D] hover:border-[#A371F7]/40 transition-all">
            <div className="flex items-center justify-between text-[#8B949E] mb-2">
              <span className="text-xs font-medium">Projects &amp; Workspaces</span>
              <FolderGit2 className="w-4 h-4 text-[#A371F7]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#F0F6FC]">{overview.stats.total_projects}</span>
              <span className="text-xs text-[#8B949E]">repositories mapped</span>
            </div>
            <div className="text-[11px] text-[#8B949E] mt-2 font-mono">
              Full cross-workspace visibility
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#161B22] border border-[#30363D] hover:border-[#F0883E]/40 transition-all">
            <div className="flex items-center justify-between text-[#8B949E] mb-2">
              <span className="text-xs font-medium">Agent Tasks</span>
              <ListTodo className="w-4 h-4 text-[#F0883E]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#F0F6FC]">{overview.stats.total_tasks}</span>
              <span className="text-xs text-[#3FB950] font-mono">
                ({overview.stats.completed_tasks} completed)
              </span>
            </div>
            <div className="text-[11px] text-[#8B949E] mt-2 font-mono flex items-center gap-3">
              <span>{overview.stats.in_progress_tasks} Running</span>
              <span>•</span>
              <span>{overview.stats.failed_tasks} Failed</span>
            </div>
          </div>
        </div>
      )}

      {/* Role Comparison Architecture Explainer (Human-Engineered) */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="w-5 h-5 text-[#3FB950]" />
          <div>
            <h2 className="text-base font-semibold text-[#F0F6FC]">
              Role Architecture: Lead Architect (Admin) vs Platform Engineer
            </h2>
            <p className="text-xs text-[#8B949E]">
              Clear boundary enforcement between system administration and autonomous software engineering.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-[#0D1117] border border-[#A371F7]/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#D2A8FF] flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#A371F7]" /> Lead Architect (Admin Profile)
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#A371F7]/15 text-[#D2A8FF]">
                Superuser: true
              </span>
            </div>
            <p className="text-[#8B949E] leading-relaxed">
              Designed for system owners and team leads who configure the infrastructure, provision accounts, and audit operations:
            </p>
            <ul className="space-y-1.5 text-[#C9D1D9]">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3FB950] mt-0.5 shrink-0" />
                <span><strong>Cross-Organization Access:</strong> Bypass organization barriers to inspect any project or repository.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3FB950] mt-0.5 shrink-0" />
                <span><strong>User Provisioning:</strong> Create users directly, assign roles, suspend rogue accounts, and trigger password resets.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3FB950] mt-0.5 shrink-0" />
                <span><strong>Session Invalidation:</strong> Inspect active tokens across the system and immediately terminate compromised sessions.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3FB950] mt-0.5 shrink-0" />
                <span><strong>Runtime Security &amp; OAuth Config:</strong> Control server secrets, double-submit CSRF, and AI provider configurations.</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-[#0D1117] border border-[#58A6FF]/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#58A6FF] flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[#58A6FF]" /> Platform Engineer (Engineer Profile)
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#58A6FF]/15 text-[#58A6FF]">
                Superuser: false
              </span>
            </div>
            <p className="text-[#8B949E] leading-relaxed">
              Designed for day-to-day software development, AI task planning, code reviews, and pull requests:
            </p>
            <ul className="space-y-1.5 text-[#C9D1D9]">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#58A6FF] mt-0.5 shrink-0" />
                <span><strong>Scoped Workspace Isolation:</strong> Only permitted to view and modify projects within organizations they belong to.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#58A6FF] mt-0.5 shrink-0" />
                <span><strong>Autonomous Task Execution:</strong> Run AI plans, verify code changes with isolated tests, and open GitHub PRs.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#58A6FF] mt-0.5 shrink-0" />
                <span><strong>Project Memory:</strong> Author and search architectural notes (ADRs), tech stack lessons, and bug fix learnings.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#F85149] mt-0.5 shrink-0" />
                <span><strong>Admin Restricted:</strong> Cannot access admin routes, cannot view other users’ sessions, cannot modify system secrets.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* System Telemetry & Security Engine */}
      {overview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Server Runtime */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-[#58A6FF]" />
              <h3 className="text-sm font-semibold text-[#F0F6FC]">Node.js &amp; Server Telemetry</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#0D1117] border border-[#30363D]">
                <span className="text-[#8B949E] block mb-1">Server Status</span>
                <div className="flex items-center gap-1.5 text-[#3FB950] font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#3FB950] animate-pulse" />
                  Healthy (Operational)
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0D1117] border border-[#30363D]">
                <span className="text-[#8B949E] block mb-1">Process Uptime</span>
                <span className="text-[#F0F6FC] font-mono">{formatUptime(overview.uptime_seconds)}</span>
              </div>

              <div className="p-3 rounded-lg bg-[#0D1117] border border-[#30363D]">
                <span className="text-[#8B949E] block mb-1">Node Runtime</span>
                <span className="text-[#F0F6FC] font-mono">{overview.node_version} ({overview.platform})</span>
              </div>

              <div className="p-3 rounded-lg bg-[#0D1117] border border-[#30363D]">
                <span className="text-[#8B949E] block mb-1">Heap Memory Usage</span>
                <span className="text-[#F0F6FC] font-mono">
                  {overview.memory.heap_used_mb} MB / {overview.memory.heap_total_mb} MB
                </span>
              </div>
            </div>
          </div>

          {/* Security Controls Status */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#3FB950]" />
              <h3 className="text-sm font-semibold text-[#F0F6FC]">Platform Security Posture</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D1117] border border-[#30363D]">
                <span className="text-[#C9D1D9]">Double-Submit Cookie CSRF Protection</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#3FB950]/15 text-[#3FB950] border border-[#3FB950]/30">
                  Enforced
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D1117] border border-[#30363D]">
                <span className="text-[#C9D1D9]">Rate Limiting (Sliding Window per IP &amp; Route)</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#3FB950]/15 text-[#3FB950] border border-[#3FB950]/30">
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D1117] border border-[#30363D]">
                <span className="text-[#C9D1D9]">Sandbox Environment Secret Sanitization</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#3FB950]/15 text-[#3FB950] border border-[#3FB950]/30">
                  Sanitized
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D1117] border border-[#30363D]">
                <span className="text-[#C9D1D9]">Authenticated Real-time WebSockets</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#3FB950]/15 text-[#3FB950] border border-[#3FB950]/30">
                  Verified
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Sub-navigation Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <Link
          href="/admin/users"
          className="p-4 rounded-xl bg-[#161B22] border border-[#30363D] hover:border-[#1F6FEB] transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1F6FEB]/15 text-[#58A6FF] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[#F0F6FC] group-hover:text-[#58A6FF] transition-colors">
                User Management
              </h4>
              <p className="text-[11px] text-[#8B949E]">Provision users, promote roles, suspend accounts</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8B949E] group-hover:text-[#58A6FF] group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/admin/sessions"
          className="p-4 rounded-xl bg-[#161B22] border border-[#30363D] hover:border-[#3FB950] transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#3FB950]/15 text-[#3FB950] flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[#F0F6FC] group-hover:text-[#3FB950] transition-colors">
                Live Active Sessions
              </h4>
              <p className="text-[11px] text-[#8B949E]">View active logins and revoke tokens</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8B949E] group-hover:text-[#3FB950] group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/admin/audit-logs"
          className="p-4 rounded-xl bg-[#161B22] border border-[#30363D] hover:border-[#A371F7] transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#A371F7]/15 text-[#A371F7] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[#F0F6FC] group-hover:text-[#A371F7] transition-colors">
                System Audit Trail
              </h4>
              <p className="text-[11px] text-[#8B949E]">Inspect administrative and security events</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8B949E] group-hover:text-[#A371F7] group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>
    </div>
  );
}
