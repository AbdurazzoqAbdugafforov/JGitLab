"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Github,
  KeyRound,
  Lock,
  Terminal,
  BookOpen,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Sliders,
  Cpu,
  Layers,
  HelpCircle,
  Command,
} from "lucide-react";
import { GoogleLogo, GitHubLogo } from "@/components/auth/AuthSplitShell";

export default function HelpDocumentationPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="pb-5 border-b border-[#30363D]">
        <div className="flex items-center gap-2 text-xs font-mono text-[#58A6FF] mb-1">
          <BookOpen className="w-3.5 h-3.5" />
          <span>PLATFORM DOCUMENTATION &amp; INTEGRATION GUIDE</span>
        </div>
        <h1 className="text-2xl font-bold text-[#F0F6FC] tracking-tight">
          OAuth 2.0, GitHub App &amp; AI Engine Configuration
        </h1>
        <p className="text-xs text-[#8B949E] mt-1 max-w-2xl leading-relaxed">
          Comprehensive reference guide for configuring Google Cloud OAuth 2.0, GitHub OAuth login, the least-privilege GitHub App integration, external AI providers, and local dev setups.
        </p>
      </div>

      {/* Quick Setup Summary Matrix */}
      <div className="p-4 rounded-xl bg-[#161B22] border border-[#30363D] shadow-lg">
        <h3 className="text-xs font-mono uppercase text-[#8B949E] mb-3 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#58A6FF]" />
          <span>Quick Callback URL Reference Table</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#0D1117] border border-white/[0.08] space-y-1.5">
            <span className="text-[11px] font-semibold text-emerald-400 block">Google OAuth Callback</span>
            <div className="font-mono text-[10px] text-[#C9D1D9] break-all bg-black/40 p-2 rounded border border-white/5">
              http://localhost:3000/api/v1/auth/oauth/google/callback
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard("http://localhost:3000/api/v1/auth/oauth/google/callback", "tbl-google")}
              className="text-[11px] text-[#58A6FF] hover:text-[#79B8FF] flex items-center gap-1 font-mono pt-0.5"
            >
              {copiedKey === "tbl-google" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === "tbl-google" ? "Copied" : "Copy URL"}</span>
            </button>
          </div>

          <div className="p-3 rounded-lg bg-[#0D1117] border border-white/[0.08] space-y-1.5">
            <span className="text-[11px] font-semibold text-purple-400 block">GitHub OAuth Callback</span>
            <div className="font-mono text-[10px] text-[#C9D1D9] break-all bg-black/40 p-2 rounded border border-white/5">
              http://localhost:3000/api/v1/auth/oauth/github/callback
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard("http://localhost:3000/api/v1/auth/oauth/github/callback", "tbl-github")}
              className="text-[11px] text-[#58A6FF] hover:text-[#79B8FF] flex items-center gap-1 font-mono pt-0.5"
            >
              {copiedKey === "tbl-github" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === "tbl-github" ? "Copied" : "Copy URL"}</span>
            </button>
          </div>

          <div className="p-3 rounded-lg bg-[#0D1117] border border-white/[0.08] space-y-1.5">
            <span className="text-[11px] font-semibold text-cyan-400 block">GitHub App Callback</span>
            <div className="font-mono text-[10px] text-[#C9D1D9] break-all bg-black/40 p-2 rounded border border-white/5">
              http://localhost:3000/api/v1/github/app/callback
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard("http://localhost:3000/api/v1/github/app/callback", "tbl-ghapp")}
              className="text-[11px] text-[#58A6FF] hover:text-[#79B8FF] flex items-center gap-1 font-mono pt-0.5"
            >
              {copiedKey === "tbl-ghapp" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === "tbl-ghapp" ? "Copied" : "Copy URL"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Google Cloud Console OAuth 2.0 / OIDC */}
      <div className="rounded-xl bg-[#161B22] border border-[#30363D] p-6 space-y-4 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <GoogleLogo className="w-5 h-5 shrink-0" />
            <h2 className="text-base font-semibold text-[#F0F6FC]">
              1. Configuring Google OAuth 2.0 (OpenID Connect)
            </h2>
          </div>
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#58A6FF] hover:text-[#79B8FF] flex items-center gap-1 font-mono"
          >
            <span>Open Google Cloud Credentials</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <p className="text-xs text-[#8B949E] leading-relaxed">
          Google authentication in JGitLab requests only minimal OpenID Connect identity scopes (<code className="text-cyan-300 font-mono">openid email profile</code>) with PKCE S256 verification and automatic verified-email account linking.
        </p>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-lg bg-[#0D1117] border border-white/[0.06] space-y-2">
            <div className="font-semibold text-white">Authorized JavaScript Origins</div>
            <p className="text-[11px] text-gray-400">Add both the localhost and loopback IP origins to your Google Web Client configuration:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 rounded border border-white/5">
                <span className="text-[#C9D1D9]">http://localhost:3000</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard("http://localhost:3000", "g-origin-1")}
                  className="text-[#58A6FF] hover:text-white"
                >
                  {copiedKey === "g-origin-1" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 rounded border border-white/5">
                <span className="text-[#C9D1D9]">http://127.0.0.1:3000</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard("http://127.0.0.1:3000", "g-origin-2")}
                  className="text-[#58A6FF] hover:text-white"
                >
                  {copiedKey === "g-origin-2" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0D1117] border border-white/[0.06] space-y-2">
            <div className="font-semibold text-white">Authorized Redirect URIs (Required)</div>
            <p className="text-[11px] text-gray-400">Enter these exact URI patterns into Google Cloud Console under "Authorized redirect URIs":</p>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded border border-white/5">
                <span className="text-[#58A6FF] truncate mr-2">http://localhost:3000/api/v1/auth/oauth/google/callback</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard("http://localhost:3000/api/v1/auth/oauth/google/callback", "g-cb-1")}
                  className="text-[#58A6FF] hover:text-white flex items-center gap-1 shrink-0 text-xs"
                >
                  {copiedKey === "g-cb-1" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === "g-cb-1" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded border border-white/5">
                <span className="text-[#58A6FF] truncate mr-2">http://127.0.0.1:3000/api/v1/auth/oauth/google/callback</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard("http://127.0.0.1:3000/api/v1/auth/oauth/google/callback", "g-cb-2")}
                  className="text-[#58A6FF] hover:text-white flex items-center gap-1 shrink-0 text-xs"
                >
                  {copiedKey === "g-cb-2" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === "g-cb-2" ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: GitHub OAuth App */}
      <div className="rounded-xl bg-[#161B22] border border-[#30363D] p-6 space-y-4 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <GitHubLogo className="w-5 h-5 shrink-0 text-white" />
            <h2 className="text-base font-semibold text-[#F0F6FC]">
              2. Configuring GitHub OAuth App (Identity Login Only)
            </h2>
          </div>
          <a
            href="https://github.com/settings/developers"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#58A6FF] hover:text-[#79B8FF] flex items-center gap-1 font-mono"
          >
            <span>Open GitHub Developer Settings</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <p className="text-xs text-[#8B949E] leading-relaxed">
          The GitHub OAuth App is used solely to authenticate your developer identity (<code className="text-cyan-300 font-mono">read:user user:email</code>). It does not request repository permissions; repository read/write access is handled separately via the GitHub App below.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-lg bg-[#0D1117] border border-white/[0.06] space-y-1">
            <div className="font-semibold text-white">Homepage URL</div>
            <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 rounded border border-white/5 font-mono text-[11px] mt-1">
              <span className="text-[#C9D1D9]">http://localhost:3000</span>
              <button
                type="button"
                onClick={() => copyToClipboard("http://localhost:3000", "gh-home")}
                className="text-[#58A6FF] hover:text-white"
              >
                {copiedKey === "gh-home" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0D1117] border border-white/[0.06] space-y-1">
            <div className="font-semibold text-white">Authorization Callback URL</div>
            <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 rounded border border-white/5 font-mono text-[11px] mt-1">
              <span className="text-[#58A6FF] truncate mr-2">http://localhost:3000/api/v1/auth/oauth/github/callback</span>
              <button
                type="button"
                onClick={() => copyToClipboard("http://localhost:3000/api/v1/auth/oauth/github/callback", "gh-cb")}
                className="text-[#58A6FF] hover:text-white shrink-0"
              >
                {copiedKey === "gh-cb" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: GitHub App (Repository Access) */}
      <div className="rounded-xl bg-[#161B22] border border-[#30363D] p-6 space-y-4 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#1F6FEB]/20 text-[#58A6FF] flex items-center justify-center">
              <Github className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-[#F0F6FC]">
              3. Registering the GitHub App for Repository Access
            </h2>
          </div>
          <Link
            href="/github"
            className="text-xs text-[#58A6FF] hover:text-[#79B8FF] flex items-center gap-1 font-mono"
          >
            <span>Open GitHub App Suite</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <p className="text-xs text-[#8B949E] leading-relaxed">
          Repository authorization is strictly governed through a dedicated GitHub App. Users choose between <strong className="text-white">All Repositories</strong> and <strong className="text-white">Selected Repositories</strong> directly inside GitHub's interface.
        </p>

        <div className="p-4 rounded-lg bg-[#0D1117] border border-white/[0.06] text-xs space-y-3 font-mono">
          <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded border border-white/5">
            <div>
              <span className="text-[#8B949E] block text-[10px]">Setup URL (Post-Installation)</span>
              <span className="text-[#58A6FF] text-[11px]">http://localhost:3000/api/v1/github/app/callback</span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard("http://localhost:3000/api/v1/github/app/callback", "app-setup")}
              className="text-[#58A6FF] hover:text-white"
            >
              {copiedKey === "app-setup" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded border border-white/5">
            <div>
              <span className="text-[#8B949E] block text-[10px]">Callback URL</span>
              <span className="text-[#58A6FF] text-[11px]">http://localhost:3000/api/v1/github/app/callback</span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard("http://localhost:3000/api/v1/github/app/callback", "app-cb")}
              className="text-[#58A6FF] hover:text-white"
            >
              {copiedKey === "app-cb" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded border border-white/5">
            <div>
              <span className="text-[#8B949E] block text-[10px]">Webhook Payload URL</span>
              <span className="text-emerald-400 text-[11px]">http://localhost:3000/api/v1/github/webhook</span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard("http://localhost:3000/api/v1/github/webhook", "app-wh")}
              className="text-[#58A6FF] hover:text-white"
            >
              {copiedKey === "app-wh" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="text-[11px] text-gray-400 pt-1 space-y-1">
            <div><strong className="text-white">Minimal Permissions:</strong> metadata: read, contents: write, pull_requests: write, checks: read</div>
            <div><strong className="text-white">Events Subscribed:</strong> Push, Pull Request, Issues, Issue Comment, Installation</div>
          </div>
        </div>
      </div>

      {/* Section 4: AI Providers & Intelligence Engine */}
      <div className="rounded-xl bg-[#161B22] border border-[#30363D] p-6 space-y-4 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#6366F1]/20 text-[#818CF8] flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-[#F0F6FC]">
              4. External AI Providers &amp; Sandbox Runner
            </h2>
          </div>
          <Link
            href="/settings/providers"
            className="text-xs text-[#58A6FF] hover:text-[#79B8FF] flex items-center gap-1 font-mono"
          >
            <span>Configure AI Providers</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <p className="text-xs text-[#8B949E] leading-relaxed">
          JGitLab supports plug-and-play OpenAI-compatible endpoints with real-time test connection verification and encrypted secret storage:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#0D1117] border border-white/[0.06] space-y-1">
            <span className="text-[#58A6FF] font-semibold">Groq Cloud (Fastest)</span>
            <p className="text-[10px] text-[#8B949E]">https://api.groq.com/openai/v1</p>
            <p className="text-[10px] text-[#C9D1D9]">Model: llama-3.3-70b-versatile</p>
          </div>

          <div className="p-3 rounded-lg bg-[#0D1117] border border-white/[0.06] space-y-1">
            <span className="text-emerald-400 font-semibold">Google Gemini</span>
            <p className="text-[10px] text-[#8B949E]">generativelanguage.googleapis.com</p>
            <p className="text-[10px] text-[#C9D1D9]">Model: gemini-1.5-flash / pro</p>
          </div>

          <div className="p-3 rounded-lg bg-[#0D1117] border border-white/[0.06] space-y-1">
            <span className="text-purple-400 font-semibold">Local Ollama / vLLM</span>
            <p className="text-[10px] text-[#8B949E]">http://localhost:11434/v1</p>
            <p className="text-[10px] text-[#C9D1D9]">Model: qwen2.5-coder:14b</p>
          </div>
        </div>
      </div>

      {/* Section 5: Keyboard Shortcuts HUD */}
      <div className="rounded-xl bg-[#161B22] border border-[#30363D] p-6 space-y-3 shadow-md">
        <div className="flex items-center gap-2">
          <Command className="w-4 h-4 text-[#58A6FF]" />
          <h2 className="text-base font-semibold text-[#F0F6FC]">
            5. Keyboard Shortcuts &amp; Studio Navigation
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="p-2.5 rounded-lg bg-[#0D1117] border border-white/[0.06] flex items-center justify-between">
            <span className="text-[#8B949E]">Command Palette</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-[#F0F6FC]">Ctrl+K</kbd>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0D1117] border border-white/[0.06] flex items-center justify-between">
            <span className="text-[#8B949E]">New Task</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-[#F0F6FC]">Ctrl+N</kbd>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0D1117] border border-white/[0.06] flex items-center justify-between">
            <span className="text-[#8B949E]">Close Modals</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-[#F0F6FC]">Esc</kbd>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0D1117] border border-white/[0.06] flex items-center justify-between">
            <span className="text-[#8B949E]">Refresh Workspace</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-[#F0F6FC]">Logo Click</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
