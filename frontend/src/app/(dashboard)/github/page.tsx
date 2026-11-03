"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { GitHubConnectionStatus, GitHubRepoSummary } from "@/lib/types";
import {
  Github,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  FolderTree,
  Lock,
  ArrowRight
} from "lucide-react";

export default function GitHubIntegrationPage() {
  const { activeProject } = useAuth();
  const [status, setStatus] = useState<GitHubConnectionStatus | null>(null);
  const [repos, setRepos] = useState<GitHubRepoSummary[]>([]);
  const [patToken, setPatToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [analyzingRepo, setAnalyzingRepo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadStatusAndRepos = async () => {
    setLoading(true);
    try {
      const st = await api.getGitHubStatus();
      setStatus(st);
      if (st.is_connected) {
        const repoList = await api.getGitHubRepos();
        setRepos(repoList);
      } else {
        setRepos([]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatusAndRepos();
  }, []);

  const handleConnectPAT = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.connectGitHubPAT({ personal_access_token: patToken });
      setStatus(res);
      setSuccessMsg(`Successfully connected to GitHub as @${res.github_username}!`);
      setPatToken("");
      await loadStatusAndRepos();
    } catch (err: any) {
      setError(err.message || "Failed to authenticate GitHub token.");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect your GitHub account?")) return;
    try {
      await api.disconnectGitHub();
      setStatus({ is_connected: false });
      setRepos([]);
    } catch (err: any) {
      setError(err.message || "Failed to disconnect");
    }
  };

  const handleSelectRepo = async (repo: GitHubRepoSummary) => {
    if (!activeProject) {
      setError("Please select an active project first.");
      return;
    }
    setAnalyzingRepo(repo.full_name);
    setError(null);
    try {
      await api.selectRepo({
        project_id: activeProject.id,
        full_name: repo.full_name,
        clone_url: repo.clone_url,
        default_branch: repo.default_branch,
      });
      setSuccessMsg(`Repository ${repo.full_name} linked to project and static analysis completed!`);
    } catch (err: any) {
      setError(err.message || "Failed to link and analyze repository.");
    } finally {
      setAnalyzingRepo(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Github className="w-5 h-5 text-white" />
            <span>GitHub Integration</span>
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Connect repositories for autonomous file inspection, working branch creation, and verified Pull Request submission.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Connection Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-charcoal-900 border border-border space-y-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-muted">Authentication Status</span>
              {status?.is_connected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/40 text-xs font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-charcoal-800 text-muted border border-border text-xs font-mono">
                  Not Connected
                </span>
              )}
            </div>

            {status?.is_connected ? (
              <div className="p-4 rounded-xl bg-charcoal-850 border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {status.avatar_url ? (
                    <img src={status.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-violet-900 flex items-center justify-center text-white font-bold">
                      GH
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-sm text-white block">@{status.github_username}</span>
                    <span className="text-[11px] font-mono text-muted">Token: Encrypted AES-Fernet</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 rounded bg-charcoal-800 hover:bg-charcoal-700 text-xs text-red-400 border border-border transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <form onSubmit={handleConnectPAT} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-muted mb-1.5">
                    GitHub Personal Access Token (PAT)
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-muted absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={patToken}
                      onChange={(e) => setPatToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-charcoal-850 border border-border text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                    />
                  </div>
                  <span className="block text-[11px] text-muted mt-1.5 leading-snug">
                    Generate a token on GitHub with <code className="text-violet-400">repo</code> and <code className="text-violet-400">read:user</code> scopes.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={connecting}
                  className="w-full py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-glow transition-all"
                >
                  {connecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />}
                  <span>Connect GitHub Token</span>
                </button>
              </form>
            )}

            {/* Security Guarantee */}
            <div className="p-3.5 rounded-xl bg-charcoal-850 border border-border/60 text-xs text-muted flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                Tokens are encrypted server-side using Fernet AES-128/256 and never logged or exposed in client JavaScript.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Repositories List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-muted flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-violet-400" />
              <span>Available GitHub Repositories ({repos.length})</span>
            </span>
            {status?.is_connected && (
              <button
                onClick={loadStatusAndRepos}
                className="text-xs font-mono text-muted hover:text-white flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            )}
          </div>

          {!status?.is_connected ? (
            <div className="p-12 text-center rounded-xl bg-charcoal-900 border border-border text-xs text-muted">
              Connect your GitHub account on the left to list and attach repositories.
            </div>
          ) : repos.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-charcoal-900 border border-border text-xs text-muted">
              No repositories found for this account.
            </div>
          ) : (
            <div className="bg-charcoal-900 border border-border rounded-xl divide-y divide-border max-h-[560px] overflow-y-auto">
              {repos.map((repo) => (
                <div key={repo.id} className="p-4 flex items-center justify-between hover:bg-charcoal-850/50 transition-colors">
                  <div className="truncate pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-xs text-white font-mono truncate">{repo.full_name}</span>
                      {repo.is_private && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-charcoal-800 text-amber-400 border border-amber-800/40">
                          Private
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted block truncate">{repo.description || "No description"}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded hover:bg-charcoal-800 text-muted hover:text-white"
                      title="Open on GitHub"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      disabled={analyzingRepo === repo.full_name}
                      onClick={() => handleSelectRepo(repo)}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1 shadow-glow"
                    >
                      {analyzingRepo === repo.full_name ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <span>Attach to {activeProject?.name || "Project"}</span>
                          <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
