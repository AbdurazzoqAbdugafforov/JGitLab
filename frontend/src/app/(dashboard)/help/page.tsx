"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Github,
  KeyRound,
  Lock,
  Terminal,
  BookOpen,
  ArrowRight,
} from "lucide-react";

export default function HelpDocumentationPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 text-xs font-mono text-violet-400 mb-1">
          <BookOpen className="w-3.5 h-3.5" />
          <span>PLATFORM DOCUMENTATION &amp; SECURITY GUIDE</span>
        </div>
        <h1 className="text-xl font-semibold text-white tracking-tight">
          Authentication, GitHub App &amp; AI Provider Setup
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Reference guide for configuring Google OAuth, GitHub OAuth login, the GitHub App for repository access, and external AI providers.
        </p>
      </div>

      {/* Section 1: Google & GitHub Identity Login */}
      <div className="rounded-lg bg-[#0D111A] border border-white/[0.07] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white">
            1. Configuring Google &amp; GitHub OAuth Login
          </h2>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          JGitLab uses genuine OAuth 2.0 / OpenID Connect with PKCE S256 and signed CSRF state verification. Identity login never requests broad repository permissions.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-md bg-[#090C13] border border-white/[0.06] space-y-2">
            <div className="font-semibold text-white">Google Cloud Console (OIDC)</div>
            <p className="text-gray-400">
              Scopes: <code className="text-cyan-300">openid email profile</code>
            </p>
            <p className="text-gray-400">
              Authorized Redirect URI:
              <br />
              <code className="text-violet-300 break-all">
                http://localhost:3000/api/v1/auth/oauth/google/callback
              </code>
            </p>
          </div>
          <div className="p-4 rounded-md bg-[#090C13] border border-white/[0.06] space-y-2">
            <div className="font-semibold text-white">GitHub OAuth App (Identity Only)</div>
            <p className="text-gray-400">
              Scopes: <code className="text-cyan-300">read:user user:email</code>
            </p>
            <p className="text-gray-400">
              Authorization Callback URL:
              <br />
              <code className="text-violet-300 break-all">
                http://localhost:3000/api/v1/auth/oauth/github/callback
              </code>
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: GitHub App Repository Access */}
      <div className="rounded-lg bg-[#0D111A] border border-white/[0.07] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Github className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">
            2. Registering the GitHub App for Repository Access
          </h2>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Repository access is managed through a dedicated GitHub App so users can choose{" "}
          <strong className="text-white">All Repositories</strong> or{" "}
          <strong className="text-white">Selected Repositories</strong> directly on GitHub.
        </p>
        <div className="p-4 rounded-md bg-[#090C13] border border-white/[0.06] text-xs space-y-2 font-mono">
          <div className="text-gray-300">
            Setup URL (Post-installation):{" "}
            <span className="text-violet-300">
              http://localhost:3000/api/v1/github/app/callback
            </span>
          </div>
          <div className="text-gray-300">
            Callback URL:{" "}
            <span className="text-violet-300">
              http://localhost:3000/api/v1/github/app/callback
            </span>
          </div>
          <div className="text-gray-400 pt-1">
            Permissions: metadata: read, contents: write, pull_requests: write, checks: read
          </div>
        </div>
      </div>

      {/* Section 3: Security & Privacy */}
      <div id="privacy" className="rounded-lg bg-[#0D111A] border border-white/[0.07] p-6 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">
            3. Security Architecture, Privacy &amp; Terms
          </h2>
        </div>
        <ul className="text-xs text-gray-400 space-y-1.5 list-disc list-inside leading-relaxed">
          <li>
            Session tokens are stored as HMAC-SHA256 digests in the database and delivered via{" "}
            <code className="text-gray-200">HttpOnly</code>, <code className="text-gray-200">SameSite=Lax</code> cookies.
          </li>
          <li>
            External AI API keys and GitHub credentials are encrypted at rest with Fernet and never returned in API responses or logs.
          </li>
          <li>
            Every project, task, memory record, and repository endpoint enforces strict server-side workspace ownership checks.
          </li>
        </ul>
        <div id="terms" className="pt-2 flex items-center gap-4">
          <Link
            href="/settings/account"
            className="text-xs text-violet-400 hover:text-violet-300 inline-flex items-center gap-1"
          >
            <span>Open Account Security</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          <Link
            href="/github"
            className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
          >
            <span>Configure GitHub App</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
