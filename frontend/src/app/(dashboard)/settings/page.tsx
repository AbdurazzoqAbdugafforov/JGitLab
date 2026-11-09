"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { GitHubConnectionStatus } from "@/lib/types";
import {
  Settings,
  ShieldCheck,
  Cpu,
  Github,
  Users,
  KeyRound,
  ExternalLink,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Lock,
  Database,
  Radio,
} from "lucide-react";

export default function SettingsHubPage() {
  const { user, activeProject } = useAuth();
  const isAdmin = user?.role === "admin" || user?.is_superuser;
  const [ghStatus, setGhStatus] = useState<GitHubConnectionStatus | null>(null);

  useEffect(() => {
    api.getGitHubStatus().then(setGhStatus).catch(() => {});
  }, []);

  const SETTINGS_SECTIONS = [
    {
      title: "Account & Authentication",
      description: "Manage your profile, password, active browser sessions, and linked Google & GitHub OAuth identities.",
      href: "/settings/account",
      icon: Lock,
      badge: "User Scope",
      color: "text-[#58A6FF]",
      borderHover: "hover:border-[#58A6FF]/60",
    },
    {
      title: "AI Model Providers & Gateways",
      description: "Configure Gemini 2.5 Pro, OpenAI GPT-4o, Anthropic Claude 3.5, Groq, DeepSeek, or local Ollama LLMs.",
      href: "/settings/providers",
      icon: Cpu,
      badge: "LLM Gateway",
      color: "text-[#3FB950]",
      borderHover: "hover:border-[#3FB950]/60",
    },
    {
      title: "GitHub App & Repository Scope",
      description: "Manage GitHub App installations, OAuth personal access tokens, HMAC-SHA256 webhook secrets, and repo scopes.",
      href: "/github",
      icon: Github,
      badge: "VCS Integration",
      color: "text-[#F0F6FC]",
      borderHover: "hover:border-[#F0F6FC]/60",
    },
    {
      title: "Guided Onboarding & Verification",
      description: "Step-by-step walkthrough to verify your environment, connect tools, and initialize autonomous workflows.",
      href: "/onboarding",
      icon: Sliders,
      badge: "Setup Checklist",
      color: "text-[#E3B341]",
      borderHover: "hover:border-[#E3B341]/60",
    },
  ];

  const ADMIN_SECTIONS = [
    {
      title: "User Management & RBAC",
      description: "Provision team members, configure engineer vs. admin roles, and enforce security policies.",
      href: "/admin/users",
      icon: Users,
      badge: "Admin Only",
      color: "text-[#A371F7]",
      borderHover: "hover:border-[#A371F7]/60",
    },
    {
      title: "Active Enterprise Sessions",
      description: "Monitor authenticated user sessions, inspect client IPs and user-agent strings, and perform remote revocations.",
      href: "/admin/sessions",
      icon: ShieldCheck,
      badge: "Security Telemetry",
      color: "text-[#79C0FF]",
      borderHover: "hover:border-[#79C0FF]/60",
    },
    {
      title: "System Audit Logs",
      description: "Immutable audit trail of Git commits, OAuth authorizations, pull request merges, and AI actions.",
      href: "/admin/audit-logs",
      icon: Database,
      badge: "Compliance",
      color: "text-[#7EE787]",
      borderHover: "hover:border-[#7EE787]/60",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#161B22] border border-[#30363D] relative overflow-hidden shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-[#F0F6FC] tracking-tight flex items-center gap-2.5">
              <Settings className="w-5 h-5 text-[#58A6FF]" />
              <span>Workspace Settings &amp; Configuration</span>
            </h1>
            <p className="text-xs text-[#8B949E]">
              Configure platform security, AI model backends, repository authorizations, and team governance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-3 py-1 rounded-lg bg-[#21262D] border border-[#30363D] text-[#8B949E] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3FB950]" />
              <span>Role: <strong className="text-[#F0F6FC]">{user?.role || "Engineer"}</strong></span>
            </span>
          </div>
        </div>
      </div>

      {/* Core Configuration Sections */}
      <div className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
          Platform Preferences &amp; Integrations
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SETTINGS_SECTIONS.map((sec) => {
            const Icon = sec.icon;
            return (
              <Link
                key={sec.title}
                href={sec.href}
                className={`p-5 rounded-2xl bg-[#161B22] border border-[#30363D] transition-all group flex flex-col justify-between gap-4 ${sec.borderHover} hover:shadow-lg`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-[#21262D] border border-[#30363D] flex items-center justify-center shrink-0">
                      <Icon className={`w-5 h-5 ${sec.color}`} />
                    </div>
                    <div className="flex items-center gap-2">
                      {sec.href === "/github" && ghStatus && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 ${
                          ghStatus.is_connected
                            ? "bg-[#238636]/15 text-[#3FB950] border border-[#238636]/30"
                            : "bg-[#21262D] text-[#8B949E]"
                        }`}>
                          {ghStatus.is_connected && <span className="w-1.5 h-1.5 rounded-full bg-[#3FB950] animate-pulse" />}
                          {ghStatus.is_connected ? `${ghStatus.repository_count || 0} Repos Connected` : "Not Connected"}
                        </span>
                      )}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#21262D] text-[#8B949E]">
                        {sec.badge}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-[#F0F6FC] group-hover:text-[#58A6FF] transition-colors">
                    {sec.title}
                  </h3>
                  <p className="text-xs text-[#8B949E] leading-relaxed">
                    {sec.description}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#58A6FF] pt-2 border-t border-[#30363D]/60 group-hover:translate-x-1 transition-transform">
                  <span>Manage Preferences</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Administration Sections (if Admin) */}
      {isAdmin && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#A371F7] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Enterprise Governance &amp; Administration</span>
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#A371F7]/15 text-[#A371F7] border border-[#A371F7]/30">
              Admin Access Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ADMIN_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              return (
                <Link
                  key={sec.title}
                  href={sec.href}
                  className={`p-5 rounded-2xl bg-[#161B22] border border-[#30363D] transition-all group flex flex-col justify-between gap-4 ${sec.borderHover} hover:shadow-lg`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-[#21262D] border border-[#30363D] flex items-center justify-center shrink-0">
                        <Icon className={`w-5 h-5 ${sec.color}`} />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#21262D] text-[#8B949E]">
                        {sec.badge}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#F0F6FC] group-hover:text-[#58A6FF] transition-colors">
                      {sec.title}
                    </h3>
                    <p className="text-xs text-[#8B949E] leading-relaxed">
                      {sec.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#A371F7] pt-2 border-t border-[#30363D]/60 group-hover:translate-x-1 transition-transform">
                    <span>Admin Controls</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
