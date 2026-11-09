"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Terminal,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Cpu,
  GitBranch,
  Lock,
  X,
  Key,
  ExternalLink,
  Copy,
  Check,
  GitPullRequest,
  Code2,
  Layers,
  Activity,
} from "lucide-react";
import { api } from "@/lib/api";
import { JGitLabLogoMark, JGitLabWordmark } from "@/components/brand/JGitLabBrand";

export const OAUTH_ERROR_MESSAGES: Record<string, { title: string; detail: string }> = {
  // Config errors
  google_not_configured: {
    title: "Google OAuth Not Configured",
    detail: "Google Cloud OAuth 2.0 credentials are not configured on the server. Please provide Client ID and Client Secret in Settings or .env.",
  },
  github_not_configured: {
    title: "GitHub OAuth Not Configured",
    detail: "GitHub OAuth App credentials are not configured on the server. Please provide Client ID and Client Secret in Settings or .env.",
  },
  oauth_provider_not_configured: {
    title: "Provider Not Configured",
    detail: "This OAuth provider is not configured on the server yet.",
  },

  // State & session errors
  state_mismatch: {
    title: "Security Verification Failed",
    detail: "State verification mismatch. This can happen if the sign-in session was interrupted. Please try again.",
  },
  state_expired: {
    title: "Sign-In Timed Out",
    detail: "The authentication session timed out. Please initiate sign-in again.",
  },
  state_invalid: {
    title: "Invalid Sign-In State",
    detail: "The authentication request could not be cryptographically validated. Please try again.",
  },
  state_missing: {
    title: "Session Expired",
    detail: "Your sign-in session expired or browser cookies were cleared. Please try again.",
  },
  oauth_state_invalid: {
    title: "Session Expired",
    detail: "Your sign-in session expired or became invalid. Please try again.",
  },

  // Code exchange & tokens
  token_exchange_failed: {
    title: "Token Exchange Failed",
    detail: "The provider rejected the authorization code. Please verify Client ID and Secret match the developer console.",
  },
  token_invalid: {
    title: "Identity Token Invalid",
    detail: "The ID token returned by the provider could not be validated.",
  },
  oauth_exchange_failed: {
    title: "OAuth Handshake Failed",
    detail: "Unable to complete OAuth sign-in with the provider. Please try again.",
  },
  oauth_code_missing: {
    title: "Authorization Code Missing",
    detail: "The identity provider did not return an authorization code.",
  },

  // Provider cancellations & errors
  access_denied: {
    title: "Sign-In Cancelled",
    detail: "You cancelled the sign-in authorization request on the provider page.",
  },
  provider_error: {
    title: "Provider Error",
    detail: "The authentication provider encountered an error while processing your request.",
  },
  profile_failed: {
    title: "Profile Inaccessible",
    detail: "Could not read user profile and email from the provider. Ensure email permissions are granted.",
  },

  // User identity & accounts
  email_unverified: {
    title: "Email Not Verified",
    detail: "Your account on the external provider does not have a verified primary email address.",
  },
  account_disabled: {
    title: "Account Deactivated",
    detail: "This JGitLab account has been deactivated. Please contact your system administrator.",
  },
  oauth_account_inactive: {
    title: "Account Deactivated",
    detail: "This user account has been deactivated.",
  },
  account_exists: {
    title: "Account Already Exists",
    detail: "An account with this email already exists. Sign in with your password to link your external provider.",
  },
  email_conflict: {
    title: "Email Already Registered",
    detail: "An account with this email already exists. Sign in with password first, then link the provider in Account Settings.",
  },
  identity_in_use: {
    title: "Identity Already Linked",
    detail: "This external account is already linked to another JGitLab engineer profile.",
  },
  oauth_already_linked: {
    title: "Identity Already Linked",
    detail: "This external account is already linked to another JGitLab user.",
  },
  link_requires_session: {
    title: "Authentication Required",
    detail: "Please sign in before linking another identity provider.",
  },
  oauth_failed: {
    title: "Authentication Failed",
    detail: "Could not complete external authentication. Please try again.",
  },
};

export function GoogleLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function GitHubLogo({ className = "w-4 h-4 fill-current" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

interface OAuthSetupModalProps {
  provider: "google" | "github" | null;
  onClose: () => void;
  onConfigured: () => void;
}

export function OAuthSetupModal({ provider, onClose, onConfigured }: OAuthSetupModalProps) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLocalhost, setCopiedLocalhost] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);

  if (!provider) return null;

  const isGoogle = provider === "google";
  const title = isGoogle ? "Configure Google OAuth 2.0 (OIDC)" : "Configure GitHub OAuth App";
  const consoleUrl = isGoogle
    ? "https://console.cloud.google.com/apis/credentials"
    : "https://github.com/settings/developers";
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const callbackUrlLocalhost = `http://localhost:3000/api/v1/auth/oauth/${provider}/callback`;
  const callbackUrlIp = `http://127.0.0.1:3000/api/v1/auth/oauth/${provider}/callback`;

  const copyLocalhost = () => {
    navigator.clipboard.writeText(callbackUrlLocalhost);
    setCopiedLocalhost(true);
    setTimeout(() => setCopiedLocalhost(false), 1800);
  };

  const copyIp = () => {
    navigator.clipboard.writeText(callbackUrlIp);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 1800);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.saveOAuthConfig(
        isGoogle
          ? { google_client_id: clientId.trim(), google_client_secret: clientSecret.trim() }
          : { github_client_id: clientId.trim(), github_client_secret: clientSecret.trim() }
      );
      onConfigured();
    } catch (err: any) {
      setError(err.message || "Failed to save OAuth credentials.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#0D0F14] border border-white/15 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#13161D]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="text-[11px] text-slate-400">PKCE S256 &amp; Strict State Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-slate-300 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-indigo-300">1. Setup OAuth Application</span>
              <a
                href={consoleUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 underline font-mono text-[11px]"
              >
                <span>Open {isGoogle ? "Google Cloud Console" : "GitHub Developer Settings"}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="text-[11px] text-slate-300">
              {isGoogle ? (
                <span>
                  In Google Console, set Authorized JavaScript Origins to <code className="text-cyan-300 font-mono">http://localhost:3000</code> and add the following Authorized Redirect URIs:
                </span>
              ) : (
                <span>
                  In GitHub OAuth Apps, set Homepage URL to <code className="text-cyan-300 font-mono">http://localhost:3000</code> and Authorization Callback URL:
                </span>
              )}
            </div>

            {/* Primary callback URL */}
            <div className="flex items-center justify-between bg-[#08090C] px-3 py-2 rounded-lg border border-white/10 font-mono text-[11px] text-slate-300">
              <div className="truncate mr-2">
                <span className="text-slate-500 mr-2">[localhost]</span>
                <span>{callbackUrlLocalhost}</span>
              </div>
              <button
                type="button"
                onClick={copyLocalhost}
                className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 shrink-0"
              >
                {copiedLocalhost ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLocalhost ? "Copied" : "Copy"}</span>
              </button>
            </div>

            {/* Secondary IP callback URL */}
            <div className="flex items-center justify-between bg-[#08090C] px-3 py-2 rounded-lg border border-white/10 font-mono text-[11px] text-slate-300">
              <div className="truncate mr-2">
                <span className="text-slate-500 mr-2">[127.0.0.1]</span>
                <span>{callbackUrlIp}</span>
              </div>
              <button
                type="button"
                onClick={copyIp}
                className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 shrink-0"
              >
                {copiedIp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIp ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="text-[10px] text-slate-400 font-mono">
              Scopes requested: <span className="text-cyan-300">{isGoogle ? "openid email profile" : "read:user user:email"}</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
              {isGoogle ? "Google Client ID" : "GitHub Client ID"}
            </label>
            <input
              type="text"
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder={isGoogle ? "1234567890-abc.apps.googleusercontent.com" : "Iv1.a1b2c3d4e5f6g7h8"}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#08090C] border border-white/10 focus:border-indigo-500 focus:outline-none text-sm text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
              {isGoogle ? "Google Client Secret" : "GitHub Client Secret"}
            </label>
            <input
              type="password"
              required
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#08090C] border border-white/10 focus:border-indigo-500 focus:outline-none text-sm text-white font-mono"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all"
            >
              {saving ? "Saving & Connecting..." : `Save & Continue with ${isGoogle ? "Google" : "GitHub"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AuthSplitShellProps {
  mode: "login" | "register";
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerText: string;
  footerLinkText: string;
  footerLinkHref: string;
}

const PIPELINE_STAGES = [
  {
    id: "plan",
    step: "01",
    label: "Architectural Plan",
    badge: "AST + Memory RAG",
    icon: Layers,
    terminalTitle: "planner_engine.py — Structured Plan Synthesis",
    lines: [
      { prefix: "$", text: "jgitlab agent plan --task 'Add HMAC-SHA256 Webhook Guard'", color: "text-slate-300" },
      { prefix: "✓", text: "Loaded 4 Architectural Decision Records (ADR-001..004)", color: "text-emerald-400" },
      { prefix: "→", text: "Step 1: Verify X-Hub-Signature-256 via hmac.compare_digest", color: "text-indigo-300" },
      { prefix: "→", text: "Step 2: Synthesize pytest suite & sandbox diff verification", color: "text-indigo-200" },
    ],
  },
  {
    id: "sandbox",
    step: "02",
    label: "Sandbox Execution",
    badge: "Zero-Host Isolation",
    icon: Code2,
    terminalTitle: "sandbox_runner.py — Isolated Workspace Execution",
    lines: [
      { prefix: "$", text: "pytest tests/test_github_app_and_authz.py -v", color: "text-slate-300" },
      { prefix: "✓", text: "test_github_webhook_hmac_verification PASSED [14ms]", color: "text-emerald-400" },
      { prefix: "✓", text: "test_cross_tenant_idor_blocked PASSED [11ms]", color: "text-emerald-400" },
      { prefix: "★", text: "18 passed in 1.42s • 0 security regressions detected", color: "text-amber-300" },
    ],
  },
  {
    id: "pr",
    step: "03",
    label: "Unified Diff & PR",
    badge: "GitHub App JWT",
    icon: GitPullRequest,
    terminalTitle: "github_app.py — Automated Pull Request Delivery",
    lines: [
      { prefix: "$", text: "jgitlab github publish-pr --branch feat/webhook-hmac", color: "text-slate-300" },
      { prefix: "+", text: "Signed RS256 App JWT (App ID #5609995 • jgitlab-project)", color: "text-indigo-300" },
      { prefix: "✓", text: "Committed 3 files (+184 -12 lines) to feat/webhook-hmac", color: "text-emerald-400" },
      { prefix: "⚡", text: "Opened PR #42 → main (Checks: Passing • Ready for Review)", color: "text-indigo-300" },
    ],
  },
];

export function AuthSplitShell({
  mode,
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerLinkHref,
}: AuthSplitShellProps) {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % PIPELINE_STAGES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const stage = PIPELINE_STAGES[activeStage];

  return (
    <div className="min-h-screen bg-[#0A0D14] text-[#F0F6FC] flex flex-col lg:flex-row selection:bg-[#1F6FEB] selection:text-white overflow-x-hidden">
      {/* Left Interactive Engineering Showcase (Desktop) */}
      <div className="hidden lg:flex lg:w-[50%] xl:w-[52%] relative overflow-hidden bg-[#0D1117] border-r border-[#30363D] p-10 xl:p-14 flex-col justify-between">
        {/* Subtle Engineering Grid */}
        <div
          className="absolute inset-0 opacity-[0.25] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(48, 54, 61, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(48, 54, 61, 0.4) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-[#1F6FEB]/10 blur-[130px] pointer-events-none" />

        {/* Top Brand Bar */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <JGitLabLogoMark size="lg" glow />
            <div>
              <div className="flex items-center space-x-2">
                <JGitLabWordmark size="lg" />
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-[#1F6FEB]/15 text-[#58A6FF] border border-[#1F6FEB]/30 rounded-full">
                  Enterprise OS
                </span>
              </div>
              <p className="text-xs text-[#8B949E] font-mono">Autonomous AI Software Engineering Runtime</p>
            </div>
          </Link>

          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-[#238636]/15 border border-[#238636]/40 text-[#3FB950] text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#3FB950] animate-pulse" />
            <span>SANDBOX READY</span>
          </div>
        </div>

        {/* Center Hero + Interactive Pipeline Preview */}
        <div className="relative z-10 my-auto py-8 space-y-6 max-w-xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#161B22] border border-[#30363D] text-[#58A6FF] text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#58A6FF]" />
            <span>Plan • Isolated Sandbox • Unified Diff • Verified PR</span>
          </div>

          <div className="space-y-2.5">
            <h1 className="text-3xl xl:text-4xl font-bold tracking-tight leading-[1.18] text-[#F0F6FC]">
              Autonomous engineering with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#58A6FF] via-[#79C0FF] to-[#F0F6FC]">
                human-in-the-loop
              </span>{" "}
              precision.
            </h1>
            <p className="text-[#8B949E] text-sm leading-relaxed">
              Every task is decomposed into an inspectable architectural plan, executed inside a path-guarded sandbox, and verified with unified diffs before touching your GitHub branches.
            </p>
          </div>

          {/* Interactive 3-Stage Selector */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {PIPELINE_STAGES.map((item, idx) => {
                const Icon = item.icon;
                const isActive = idx === activeStage;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveStage(idx)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isActive
                        ? "bg-[#1F6FEB]/15 border-[#1F6FEB]/60 shadow-sm"
                        : "bg-[#161B22] border-[#30363D] hover:border-[#8B949E]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-[#58A6FF] font-bold">STEP {item.step}</span>
                      <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#58A6FF]" : "text-[#8B949E]"}`} />
                    </div>
                    <p className="text-xs font-semibold text-[#F0F6FC] truncate">{item.label}</p>
                    <p className="text-[10px] font-mono text-[#8B949E] truncate mt-0.5">{item.badge}</p>
                  </button>
                );
              })}
            </div>

            {/* Live Terminal Simulation Window */}
            <div className="rounded-xl bg-[#0A0D14] border border-[#30363D] shadow-xl overflow-hidden">
              <div className="px-4 py-2 bg-[#161B22] border-b border-[#30363D] flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F85149]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D29922]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3FB950]" />
                  <span className="ml-2 text-[11px] font-mono text-[#8B949E]">{stage.terminalTitle}</span>
                </div>
                <span className="text-[10px] font-mono text-[#58A6FF] uppercase tracking-wider">Live Telemetry</span>
              </div>
              <div className="p-4 space-y-2 font-mono text-xs">
                {stage.lines.map((line, i) => (
                  <div key={i} className="flex items-start space-x-2 leading-relaxed">
                    <span className="text-[#58A6FF] select-none shrink-0">{line.prefix}</span>
                    <span className={line.color}>{line.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Security Telemetry Bar */}
        <div className="relative z-10 pt-4 border-t border-[#30363D] flex flex-wrap items-center justify-between gap-3 text-xs text-[#8B949E]">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-[#3FB950]" />
              <span>Argon2id + CSRF Guard</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-[#58A6FF]" />
              <span>Fernet AES-128 Key Vault</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-[#388BFD]" />
              <span>HMAC-SHA256 Webhooks</span>
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#8B949E]">PKCE S256 OAuth 2.0</span>
        </div>
      </div>

      {/* Right Authentication Studio Column */}
      <div className="flex-1 flex flex-col justify-center items-center p-5 sm:p-8 lg:p-12 relative">
        <div className="w-full max-w-[440px] relative z-10">
          {/* Mobile Header */}
          <div className="flex lg:hidden items-center justify-between mb-6">
            <Link href="/" className="flex items-center space-x-3">
              <JGitLabLogoMark size="md" glow />
              <div>
                <JGitLabWordmark size="md" />
                <span className="block text-[10px] font-mono text-[#58A6FF] uppercase">AI Engineering OS</span>
              </div>
            </Link>
            <span className="px-2.5 py-1 rounded-full bg-[#238636]/15 border border-[#238636]/40 text-[#3FB950] text-[10px] font-mono">
              Online
            </span>
          </div>

          {/* Main GitHub/Stripe Style Auth Card */}
          <div className="rounded-xl bg-[#161B22] border border-[#30363D] shadow-2xl overflow-hidden">
            {/* Segmented Mode Switcher Header */}
            <div className="p-1.5 bg-[#0D1117] border-b border-[#30363D] grid grid-cols-2 gap-1">
              <Link
                href="/login"
                className={`py-2 px-3 rounded-md text-xs font-semibold text-center transition-all ${
                  mode === "login"
                    ? "bg-[#1F6FEB] text-white shadow-sm"
                    : "text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#161B22]"
                }`}
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className={`py-2 px-3 rounded-md text-xs font-semibold text-center transition-all ${
                  mode === "register"
                    ? "bg-[#1F6FEB] text-white shadow-sm"
                    : "text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#161B22]"
                }`}
              >
                Create Account
              </Link>
            </div>

            <div className="p-6 sm:p-7">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-[#F0F6FC] tracking-tight">{title}</h2>
                <p className="text-xs text-[#8B949E] mt-1">{subtitle}</p>
              </div>

              {children}

              <div className="mt-5 pt-4 border-t border-[#30363D] flex items-center justify-between text-xs text-[#8B949E]">
                <span>{footerText}</span>
                <Link
                  href={footerLinkHref}
                  className="text-[#58A6FF] hover:underline font-medium transition-colors"
                >
                  {footerLinkText} →
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Trust Footnote */}
          <div className="mt-4 flex items-center justify-center space-x-3 text-[11px] text-[#8B949E] font-mono">
            <span className="flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#3FB950]" />
              <span>HttpOnly Session</span>
            </span>
            <span>•</span>
            <span>Zero-Trust Sandbox</span>
            <span>•</span>
            <span>RBAC Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
