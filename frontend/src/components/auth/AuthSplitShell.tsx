"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api, getOAuthStartUrl } from "@/lib/api";
import { AuthProvidersStatus } from "@/lib/types";
import { Loader2, KeyRound, X, Sparkles, CheckCircle2 } from "lucide-react";
import { JGitLabLogoMark, JGitLabWordmark } from "@/components/brand/JGitLabBrand";

export function GoogleLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.26-.96 2.33-2.04 3.05l3.3 2.56c1.92-1.77 3.04-4.38 3.04-7.47 0-.72-.06-1.41-.19-2.04H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.89 6.62-2.42l-3.3-2.56c-.91.61-2.08.98-3.32.98-2.55 0-4.71-1.72-5.48-4.04H3.11v2.64A9.997 9.997 0 0012 22z"
      />
      <path
        fill="#4A90E2"
        d="M6.52 13.96A5.996 5.996 0 016.2 12c0-.68.12-1.34.32-1.96V7.4H3.11A9.997 9.997 0 002 12c0 1.61.39 3.14 1.11 4.6l3.41-2.64z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.98c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.95 2.98 14.7 2 12 2 8.09 2 4.71 4.24 3.11 7.4l3.41 2.64C7.29 7.7 9.45 5.98 12 5.98z"
      />
    </svg>
  );
}

export function GitHubLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export const OAUTH_ERROR_MESSAGES: Record<string, { title: string; detail: string }> = {
  access_denied: {
    title: "Authorization cancelled",
    detail: "You cancelled the sign-in request with the identity provider. You can try again anytime.",
  },
  state_mismatch: {
    title: "Security verification failed",
    detail: "The sign-in state token did not match or expired. Please start the sign-in flow again.",
  },
  state_expired: {
    title: "Sign-in session timed out",
    detail: "The OAuth flow took longer than 10 minutes. Please initiate sign-in again.",
  },
  state_missing: {
    title: "Sign-in session expired",
    detail: "Your browser did not return the OAuth state cookie. Ensure cookies are enabled and try again.",
  },
  email_unverified: {
    title: "Verified email required",
    detail: "Your identity provider account does not have a verified primary email address.",
  },
  account_exists: {
    title: "Account already exists with this email",
    detail:
      "An account with this email already exists. Sign in with your existing method first, then link this provider under Account Settings.",
  },
  identity_in_use: {
    title: "Identity already linked",
    detail: "This external account is already linked to another JGitLab user.",
  },
  google_not_configured: {
    title: "Google OAuth not configured on server",
    detail: "Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in the backend environment (.env) to enable Google sign-in.",
  },
  github_not_configured: {
    title: "GitHub OAuth not configured on server",
    detail: "Set AUTH_GITHUB_ID and AUTH_GITHUB_SECRET in the backend environment (.env) to enable GitHub sign-in.",
  },
  session_expired: {
    title: "Your session has expired",
    detail: "Please sign in again to continue to your engineering workspace.",
  },
};

export function OAuthSetupModal({
  provider,
  nextPath = "/dashboard",
  onClose,
  onConfigured,
  onInstantDemoLogin,
}: {
  provider: "google" | "github" | null;
  nextPath?: string;
  onClose: () => void;
  onConfigured: (status: AuthProvidersStatus) => void;
  onInstantDemoLogin: () => Promise<void>;
}) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!provider) return null;

  const isGoogle = provider === "google";
  const label = isGoogle ? "Google" : "GitHub";
  const callbackUrl = `http://localhost:8000/api/v1/auth/oauth/${provider}/callback`;

  const handleSaveAndContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!clientId.trim() || !clientSecret.trim()) {
      setErr(`Please enter both your ${label} OAuth Client ID and Client Secret.`);
      return;
    }
    setSaving(true);
    try {
      const updated = await api.saveOAuthConfig(
        isGoogle
          ? { google_client_id: clientId.trim(), google_client_secret: clientSecret.trim() }
          : { github_client_id: clientId.trim(), github_client_secret: clientSecret.trim() }
      );
      onConfigured(updated);
      window.location.href = getOAuthStartUrl(provider, { intent: "login", next: nextPath });
    } catch (error: any) {
      setErr(error.message || "Failed to save OAuth configuration.");
      setSaving(false);
    }
  };

  const handleDemo = async () => {
    setErr(null);
    setDemoLoading(true);
    try {
      await onInstantDemoLogin();
    } catch (error: any) {
      setErr(error.message || "Demo sign-in failed.");
      setDemoLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-white/[0.1] bg-[#0B0F17] p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
              {isGoogle ? <GoogleLogo className="w-4 h-4" /> : <GitHubLogo className="w-4 h-4 text-white" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {label} OAuth Credentials Required
              </h3>
              <p className="text-[11px] text-gray-400">
                Connect real {label} OAuth credentials or sign in with the local architect account.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Instant 1-Click Local Evaluation Option */}
        <div className="p-3.5 rounded-md bg-violet-500/[0.08] border border-violet-500/25 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-violet-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Evaluating locally without OAuth keys?
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Instant
            </span>
          </div>
          <p className="text-[11px] text-gray-300 leading-relaxed">
            Sign in immediately as the pre-provisioned Lead Architect (<code className="text-violet-300">admin@jgitlab.local</code>) with full workspace &amp; repository access.
          </p>
          <button
            type="button"
            onClick={handleDemo}
            disabled={demoLoading || saving}
            className="w-full h-9 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {demoLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Instant Sign-In as Lead Architect</span>
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/[0.07]" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
            <span className="bg-[#0B0F17] px-2.5 text-gray-500 font-mono">
              Or configure {label} OAuth App
            </span>
          </div>
        </div>

        {err && (
          <div className="p-2.5 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-200">
            {err}
          </div>
        )}

        <form onSubmit={handleSaveAndContinue} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">
              Authorized Redirect URI (Callback URL)
            </label>
            <input
              type="text"
              readOnly
              value={callbackUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="w-full h-8 px-2.5 rounded bg-[#06080D] border border-white/[0.07] text-[11px] font-mono text-cyan-300 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-300 mb-1">
              {label} Client ID (<code className="text-gray-400">{isGoogle ? "AUTH_GOOGLE_ID" : "AUTH_GITHUB_ID"}</code>)
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder={isGoogle ? "xxxx.apps.googleusercontent.com" : "Iv1.xxxxxxxxxxxx"}
              className="w-full h-9 px-3 rounded-md bg-[#06080D] border border-white/[0.1] text-xs text-white font-mono focus:border-violet-500/60 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-300 mb-1">
              {label} Client Secret (<code className="text-gray-400">{isGoogle ? "AUTH_GOOGLE_SECRET" : "AUTH_GITHUB_SECRET"}</code>)
            </label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="••••••••••••••••••••••••"
              className="w-full h-9 px-3 rounded-md bg-[#06080D] border border-white/[0.1] text-xs text-white font-mono focus:border-violet-500/60 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-xs text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || demoLoading}
              className="h-9 px-3.5 rounded-md bg-[#161D2E] hover:bg-[#1E273D] border border-white/[0.14] text-xs font-medium text-white flex items-center gap-1.5 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5 text-cyan-400" />}
              <span>Save &amp; Continue with {label}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AuthSplitShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#04060E] bg-hero-glow text-[#F8FAFC] grid grid-cols-1 lg:grid-cols-12 selection:bg-violet-500/30">
      {/* LEFT SECTION — Brand identity, headline, positioning, and engineering architecture visual */}
      <div className="hidden lg:flex lg:col-span-7 relative flex-col justify-between p-12 xl:p-16 border-r border-white/[0.08] bg-[#060916]/80 backdrop-blur-xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 via-violet-500 to-orange-500" />
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-engineering-grid opacity-60 pointer-events-none" />
        <div
          className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, rgba(139,92,246,0.08) 45%, transparent 70%)",
          }}
        />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <JGitLabLogoMark size="md" />
            <JGitLabWordmark size="lg" showBrackets />
            <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              AI Studio OS
            </span>
          </Link>
          <span className="text-xs font-mono text-gray-400">v2.5 · API-First Runtime</span>
        </div>

        {/* Center Headline + Abstract Engineering Network Visualization */}
        <div className="relative z-10 max-w-xl my-auto py-8">
          <div className="flex items-center gap-4 mb-6">
            <JGitLabLogoMark size="xl" />
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/[0.12] border border-violet-500/30 text-violet-200 text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                Autonomous Software Engineering Infrastructure
              </div>
              <p className="text-xs font-mono text-orange-300/90 mt-1.5">
                &lt;Plan · Sandbox · Test · Diff · Pull Request /&gt;
              </p>
            </div>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-[1.16]">
            Your next engineering breakthrough starts here.
          </h1>
          <p className="mt-3.5 text-base text-gray-300 leading-relaxed">
            Build, understand, and evolve software with an intelligent engineering platform.
          </p>

          {/* Subtle Animated Engineering Architecture SVG */}
          <div className="mt-10 rounded-lg border border-white/[0.07] bg-[#0B0F17]/90 p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                  Execution Topology · Plan → Sandbox → Diff → PR
                </span>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">Least-Privilege GitHub App</span>
            </div>

            <svg className="w-full h-44" viewBox="0 0 560 170" fill="none" aria-label="AI Engineering Architecture Diagram">
              <defs>
                <linearGradient id="edgeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.65" />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.65" />
                </linearGradient>
              </defs>

              {/* Connecting lines */}
              <path d="M125 48 L215 48" stroke="url(#edgeGrad)" strokeWidth="1.5" strokeDasharray="3 3" />
              <path d="M345 48 L430 48" stroke="url(#edgeGrad)" strokeWidth="1.5" />
              <path d="M280 76 L280 112" stroke="#8B5CF6" strokeOpacity="0.45" strokeWidth="1.5" />
              <path d="M125 132 L215 132" stroke="#06B6D4" strokeOpacity="0.4" strokeWidth="1.2" />
              <path d="M345 132 L430 132" stroke="#8B5CF6" strokeOpacity="0.4" strokeWidth="1.2" />

              {/* Node 1: GitHub App Repository Scope */}
              <rect x="12" y="22" width="113" height="52" rx="6" fill="#0F1420" stroke="rgba(255,255,255,0.1)" />
              <circle cx="28" cy="38" r="3.5" fill="#8B5CF6" />
              <text x="38" y="41" fill="#F3F4F6" fontSize="10" fontFamily="monospace" fontWeight="600">
                GitHub App
              </text>
              <text x="24" y="59" fill="#9CA3AF" fontSize="9" fontFamily="monospace">
                Scoped Repos
              </text>

              {/* Node 2: Autonomous Planner & Agent */}
              <rect x="215" y="18" width="130" height="58" rx="6" fill="#131929" stroke="rgba(139,92,246,0.55)" strokeWidth="1.4" />
              <circle cx="232" cy="36" r="3.5" fill="#06B6D4" />
              <text x="242" y="39" fill="#FFFFFF" fontSize="10.5" fontFamily="monospace" fontWeight="600">
                AI Engineer
              </text>
              <text x="228" y="55" fill="#C4B5FD" fontSize="9" fontFamily="monospace">
                Plan · Execute · Test
              </text>
              <text x="228" y="67" fill="#6B7280" fontSize="8" fontFamily="monospace">
                Human approval gate
              </text>

              {/* Node 3: Verified Diff & PR */}
              <rect x="430" y="22" width="118" height="52" rx="6" fill="#0F1420" stroke="rgba(6,182,212,0.35)" />
              <circle cx="446" cy="38" r="3.5" fill="#10B981" />
              <text x="456" y="41" fill="#F3F4F6" fontSize="10" fontFamily="monospace" fontWeight="600">
                Diff &amp; PR
              </text>
              <text x="442" y="59" fill="#9CA3AF" fontSize="9" fontFamily="monospace">
                Branch verified
              </text>

              {/* Node 4: Isolated Sandbox */}
              <rect x="12" y="108" width="113" height="48" rx="6" fill="#0F1420" stroke="rgba(255,255,255,0.08)" />
              <text x="24" y="128" fill="#E5E7EB" fontSize="9.5" fontFamily="monospace" fontWeight="600">
                Sandbox Runner
              </text>
              <text x="24" y="143" fill="#6B7280" fontSize="8.5" fontFamily="monospace">
                Path-isolated
              </text>

              {/* Node 5: Engineering Memory */}
              <rect x="215" y="108" width="130" height="48" rx="6" fill="#0F1420" stroke="rgba(255,255,255,0.1)" />
              <text x="228" y="128" fill="#E5E7EB" fontSize="9.5" fontFamily="monospace" fontWeight="600">
                Persistent Memory
              </text>
              <text x="228" y="143" fill="#9CA3AF" fontSize="8.5" fontFamily="monospace">
                ADRs · Stack · Fixes
              </text>

              {/* Node 6: External AI APIs */}
              <rect x="430" y="108" width="118" height="48" rx="6" fill="#0F1420" stroke="rgba(255,255,255,0.08)" />
              <text x="442" y="128" fill="#E5E7EB" fontSize="9.5" fontFamily="monospace" fontWeight="600">
                AI Gateway
              </text>
              <text x="442" y="143" fill="#6B7280" fontSize="8.5" fontFamily="monospace">
                Fernet Encrypted
              </text>
            </svg>
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-gray-500 pt-6 border-t border-white/[0.05]">
          <div className="flex items-center gap-6">
            <span>Zero-trust session cookies</span>
            <span>·</span>
            <span>User-scoped GitHub App permissions</span>
          </div>
          <span className="font-mono text-gray-600">SOC2-ready audit logging</span>
        </div>
      </div>

      {/* RIGHT SECTION — Authentication Panel */}
      <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-10 xl:p-12 bg-transparent">
        <div className="flex items-center justify-between lg:hidden mb-6">
          <div className="flex items-center gap-2.5">
            <JGitLabLogoMark size="sm" />
            <JGitLabWordmark size="md" showBrackets />
          </div>
          <span className="text-[11px] font-mono text-gray-400">AI Studio OS</span>
        </div>

        <div className="w-full max-w-[420px] mx-auto my-auto studio-panel rounded-2xl p-6 sm:p-8">
          {children}
        </div>

        <div className="mt-8 pt-6 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-gray-500 max-w-[390px] w-full mx-auto">
          <span>© {new Date().getFullYear()} JGitLab Inc.</span>
          <div className="flex items-center gap-4">
            <Link href="/help" className="hover:text-gray-300 transition-colors">
              Security &amp; Docs
            </Link>
            <Link href="/help#privacy" className="hover:text-gray-300 transition-colors">
              Privacy
            </Link>
            <Link href="/help#terms" className="hover:text-gray-300 transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
