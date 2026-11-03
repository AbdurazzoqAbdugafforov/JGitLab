"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  GitHubConnectionStatus,
  GitHubRepoSummary,
  GitHubInstallation,
} from "@/lib/types";
import {
  Github,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Search,
  FolderGit2,
  Trash2,
  KeyRound,
  Loader2,
  Building2,
  User as UserIcon,
} from "lucide-react";

function GitHubPageContent() {
  const { activeProject, refreshProjects } = useAuth();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<GitHubConnectionStatus | null>(null);
  const [repos, setRepos] = useState<GitHubRepoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [reposLoading, setReposLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [analyzingRepo, setAnalyzingRepo] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [showPatFallback, setShowPatFallback] = useState(false);
  const [patInput, setPatInput] = useState("");
  const [patSubmitting, setPatSubmitting] = useState(false);

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [appSlugInput, setAppSlugInput] = useState("");
  const [appIdInput, setAppIdInput] = useState("");
  const [appPemInput, setAppPemInput] = useState("");
  const [savingAppConfig, setSavingAppConfig] = useState(false);

  const [feedback, setFeedback] = useState<{ type: "success" | "warning" | "error"; text: string } | null>(null);

  const loadGitHubData = async () => {
    setLoading(true);
    try {
      const st = await api.getGitHubStatus();
      setStatus(st);
      if (st.is_connected) {
        setReposLoading(true);
        try {
          const repoList = await api.getGitHubRepos();
          setRepos(repoList);
        } catch {
          setRepos([]);
        } finally {
          setReposLoading(false);
        }
      } else {
        setRepos([]);
      }
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message || "Failed to load GitHub status." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGitHubData();
  }, []);

  useEffect(() => {
    const installStatus = searchParams.get("install_status");
    const ghError = searchParams.get("gh_error");
    const ghErrorDesc = searchParams.get("gh_error_description");

    if (installStatus === "active") {
      setFeedback({
        type: "success",
        text: "GitHub App installation verified and synchronized with your workspace.",
      });
    } else if (installStatus === "pending_approval") {
      setFeedback({
        type: "warning",
        text: "Organization installation request submitted. Waiting for an organization owner on GitHub to approve.",
      });
    } else if (installStatus === "error") {
      setFeedback({
        type: "error",
        text: "GitHub App installation recorded, but server-side App credentials (GITHUB_APP_PRIVATE_KEY) need to be configured.",
      });
    } else if (ghError) {
      setFeedback({
        type: "error",
        text: ghErrorDesc || `GitHub App callback error: ${ghError}`,
      });
    }
  }, [searchParams]);

  const handleInstallGitHubApp = async () => {
    setFeedback(null);
    if (status && !status.app_configured) {
      setShowSetupModal(true);
      setShowPatFallback(true);
      return;
    }
    setInstalling(true);
    try {
      const res = await api.createGitHubAppInstallUrl("/github");
      window.location.href = res.install_url;
    } catch {
      setShowSetupModal(true);
      setShowPatFallback(true);
      setInstalling(false);
    }
  };

  const handleSaveAppConfigAndInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appSlugInput.trim()) {
      setFeedback({ type: "error", text: "Please enter your GitHub App slug (GITHUB_APP_NAME)." });
      return;
    }
    setSavingAppConfig(true);
    setFeedback(null);
    try {
      await api.saveOAuthConfig({
        github_app_name: appSlugInput.trim(),
        github_app_id: appIdInput.trim() || undefined,
        github_app_private_key: appPemInput.trim() || undefined,
      });
      const res = await api.createGitHubAppInstallUrl("/github");
      window.location.href = res.install_url;
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message || "Failed to save GitHub App configuration." });
      setSavingAppConfig(false);
    }
  };

  const handleSyncInstallation = async (inst: GitHubInstallation) => {
    setSyncingId(inst.id);
    setFeedback(null);
    try {
      await api.syncGitHubInstallation(inst.id);
      await loadGitHubData();
      setFeedback({
        type: "success",
        text: `Synchronized installation @${inst.account_login || inst.installation_id} with GitHub.`,
      });
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message });
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnectInstallation = async (inst: GitHubInstallation) => {
    try {
      await api.disconnectGitHubInstallation(inst.id);
      await loadGitHubData();
      setFeedback({
        type: "success",
        text: "GitHub App installation disconnected from your workspace.",
      });
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message });
    }
  };

  const handleConnectPAT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patInput.trim()) return;
    setPatSubmitting(true);
    setFeedback(null);
    try {
      await api.connectGitHubPAT({ personal_access_token: patInput.trim() });
      setPatInput("");
      setShowPatFallback(false);
      await loadGitHubData();
      setFeedback({
        type: "success",
        text: "Connected GitHub token and loaded accessible repositories.",
      });
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message });
    } finally {
      setPatSubmitting(false);
    }
  };

  const handleDisconnectAll = async () => {
    try {
      await api.disconnectGitHub();
      await loadGitHubData();
      setFeedback({ type: "success", text: "Disconnected GitHub integration." });
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message });
    }
  };

  const handleSelectRepo = async (repo: GitHubRepoSummary) => {
    if (!activeProject) {
      setFeedback({
        type: "warning",
        text: "Please create or select an active project first.",
      });
      return;
    }
    setAnalyzingRepo(repo.full_name);
    setFeedback(null);
    try {
      await api.selectRepo({
        project_id: activeProject.id,
        full_name: repo.full_name,
        clone_url: repo.clone_url,
        default_branch: repo.default_branch,
      });
      await refreshProjects();
      setFeedback({
        type: "success",
        text: `Connected and analyzed ${repo.full_name} for project "${activeProject.name}".`,
      });
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message });
    } finally {
      setAnalyzingRepo(null);
    }
  };

  const filteredRepos = repos.filter((r) => {
    const matchesSearch =
      r.full_name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (r.description || "").toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchesVis =
      visibilityFilter === "all" ||
      (visibilityFilter === "private" && r.is_private) ||
      (visibilityFilter === "public" && !r.is_private);
    return matchesSearch && matchesVis;
  });

  const installations = status?.installations || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-white tracking-tight">
              GitHub Integration &amp; Repository Access
            </h1>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                status?.is_connected
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-white/[0.04] text-gray-400 border-white/[0.08]"
              }`}
            >
              {status?.is_connected ? "Connected" : "Not Connected"}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Install the GitHub App to grant user-controlled access to all repositories or selected repositories.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleInstallGitHubApp}
            disabled={installing}
            className="h-9 px-3.5 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            {installing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Github className="w-3.5 h-3.5" />
            )}
            <span>
              {installations.length > 0
                ? "Add or Configure GitHub App"
                : "Install GitHub App"}
            </span>
            <ExternalLink className="w-3 h-3" />
          </button>

          {status?.is_connected && (
            <button
              type="button"
              onClick={loadGitHubData}
              className="h-9 px-3 rounded-md bg-[#0E131D] hover:bg-[#141B29] border border-white/[0.08] text-xs text-gray-300 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-md border text-xs flex items-start gap-2.5 ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
              : feedback.type === "warning"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
              : "bg-red-500/10 border-red-500/30 text-red-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Architecture & Permission Model Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-[#0D111A] border border-white/[0.07]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white">
              Option A · All Repositories
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-400">
              Account-wide
            </span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Grants JGitLab access to all current and future public and private repositories in the selected GitHub user or organization account.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#0D111A] border border-violet-500/25">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-violet-300">
              Option B · Selected Repositories
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300">
              Recommended
            </span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Restricts JGitLab strictly to the specific repositories you choose during GitHub App installation. Enforced on every API request.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#0D111A] border border-white/[0.07]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white mb-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Least-Privilege Scope</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-gray-300">
            <span className="px-2 py-1 rounded bg-[#090C13] border border-white/[0.05]">
              metadata: read
            </span>
            <span className="px-2 py-1 rounded bg-[#090C13] border border-white/[0.05]">
              contents: write
            </span>
            <span className="px-2 py-1 rounded bg-[#090C13] border border-white/[0.05]">
              pull_requests: write
            </span>
            <span className="px-2 py-1 rounded bg-[#090C13] border border-white/[0.05]">
              checks: read
            </span>
          </div>
        </div>
      </div>

      {/* Active & Pending GitHub App Installations */}
      <div className="rounded-lg bg-[#0D111A] border border-white/[0.07] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">
              GitHub App Installations ({installations.length})
            </h2>
            <p className="text-xs text-gray-400">
              Short-lived installation tokens are minted on the backend and never exposed to the browser.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPatFallback((v) => !v)}
            className="text-xs font-mono text-gray-400 hover:text-violet-300 flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{showPatFallback ? "Hide PAT Fallback" : "Use Fine-Grained Token (Dev)"}</span>
          </button>
        </div>

        {showPatFallback && (
          <form
            onSubmit={handleConnectPAT}
            className="p-4 bg-[#090C13] border-b border-white/[0.06] flex flex-col sm:flex-row gap-3 items-start sm:items-end"
          >
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Fine-Grained Personal Access Token (Encrypted at rest with Fernet)
              </label>
              <input
                type="password"
                value={patInput}
                onChange={(e) => setPatInput(e.target.value)}
                placeholder="github_pat_... or ghp_..."
                className="w-full h-9 px-3 rounded-md bg-[#0D111A] border border-white/[0.1] text-xs text-white font-mono focus:outline-none focus:border-violet-500/60"
              />
            </div>
            <button
              type="submit"
              disabled={patSubmitting || !patInput.trim()}
              className="h-9 px-4 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium disabled:opacity-50"
            >
              {patSubmitting ? "Verifying..." : "Verify & Save Token"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
          </div>
        ) : installations.length === 0 && status?.connection_mode !== "pat" ? (
          <div className="p-8 text-center space-y-3">
            <Github className="w-8 h-8 text-gray-600 mx-auto" />
            <div className="text-sm font-medium text-white">
              No GitHub App installation connected yet
            </div>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Install the JGitLab GitHub App on your personal account or organization to select which repositories the AI Software Engineer can access.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {installations.map((inst) => (
              <div
                key={inst.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-md bg-[#131926] border border-white/[0.08] flex items-center justify-center shrink-0">
                    {inst.account_type === "Organization" ? (
                      <Building2 className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <UserIcon className="w-4 h-4 text-violet-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">
                        {inst.account_login || `Installation #${inst.installation_id || "Pending"}`}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-gray-300">
                        {inst.account_type || "Account"}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          inst.status === "active"
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            : inst.status === "pending_approval"
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                            : "bg-red-500/10 text-red-300 border-red-500/30"
                        }`}
                      >
                        {inst.status.replace("_", " ").toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                        {inst.repository_selection === "all"
                          ? "All Repositories"
                          : `Selected Repositories (${inst.repository_count})`}
                      </span>
                    </div>
                    {inst.status_message && (
                      <p className="text-xs text-amber-300/90 mt-1">{inst.status_message}</p>
                    )}
                    <p className="text-[11px] font-mono text-gray-500 mt-1">
                      Installation ID: {inst.installation_id || "Awaiting Org Approval"} · Last synced:{" "}
                      {inst.last_synced_at
                        ? new Date(inst.last_synced_at).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {inst.installation_id && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSyncInstallation(inst)}
                        disabled={syncingId === inst.id}
                        className="h-8 px-2.5 rounded-md bg-[#121723] hover:bg-[#171E2E] border border-white/[0.08] text-xs text-gray-300 flex items-center gap-1.5"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            syncingId === inst.id ? "animate-spin text-violet-400" : ""
                          }`}
                        />
                        <span>Sync</span>
                      </button>

                      <a
                        href={`https://github.com/settings/installations/${inst.installation_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="h-8 px-2.5 rounded-md bg-[#121723] hover:bg-[#171E2E] border border-white/[0.08] text-xs text-gray-300 flex items-center gap-1.5"
                      >
                        <span>Manage Scope</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDisconnectInstallation(inst)}
                    className="h-8 px-2.5 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-xs text-red-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
            ))}

            {status?.connection_mode === "pat" && (
              <div className="p-4 sm:px-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="text-sm font-medium text-white">
                      Connected via Fine-Grained Token (@{status.github_username})
                    </span>
                    <p className="text-xs text-gray-500">
                      Encrypted token fallback active
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnectAll}
                  className="h-8 px-3 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-xs text-red-300"
                >
                  Disconnect Token
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Authorized Repository Selector */}
      {status?.is_connected && (
        <div className="rounded-lg bg-[#0D111A] border border-white/[0.07] overflow-hidden">
          <div className="p-4 sm:px-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Authorized Repositories ({filteredRepos.length})
              </h2>
              <p className="text-xs text-gray-400">
                Bind a repository to active project{" "}
                <strong className="text-white">
                  {activeProject ? activeProject.name : "None selected"}
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter repositories..."
                  className="h-8 pl-8 pr-3 rounded-md bg-[#090C13] border border-white/[0.09] text-xs text-white focus:outline-none focus:border-violet-500/60"
                />
              </div>

              <div className="flex rounded-md bg-[#090C13] border border-white/[0.08] p-0.5 text-[11px]">
                {(["all", "private", "public"] as const).map((vis) => (
                  <button
                    key={vis}
                    type="button"
                    onClick={() => setVisibilityFilter(vis)}
                    className={`px-2.5 py-1 rounded capitalize ${
                      visibilityFilter === vis
                        ? "bg-violet-600 text-white font-medium"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {vis}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {reposLoading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No repositories match your current filter.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05] max-h-[460px] overflow-y-auto">
              {filteredRepos.map((repo) => (
                <div
                  key={repo.id}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.015] transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FolderGit2 className="w-4 h-4 text-violet-400 shrink-0" />
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-white hover:text-violet-300 font-mono truncate"
                      >
                        {repo.full_name}
                      </a>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          repo.is_private
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                            : "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                        }`}
                      >
                        {repo.is_private ? (
                          <Lock className="w-2.5 h-2.5" />
                        ) : (
                          <Unlock className="w-2.5 h-2.5" />
                        )}
                        {repo.is_private ? "Private" : "Public"}
                      </span>
                      {repo.language && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-400">
                          {repo.language}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-gray-500">
                        branch: {repo.default_branch}
                      </span>
                    </div>
                    {repo.description && (
                      <p className="text-xs text-gray-400 truncate">{repo.description}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectRepo(repo)}
                    disabled={analyzingRepo === repo.full_name}
                    className="h-8 px-3 rounded-md bg-violet-600/90 hover:bg-violet-500 text-white text-xs font-medium shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {analyzingRepo === repo.full_name ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <span>Connect to Project</span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Interactive Setup Modal when GitHub App is not yet configured in .env */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg border border-white/[0.1] bg-[#0B0F17] p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                  <Github className="w-4 h-4 text-violet-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Connect GitHub Repositories
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Connect immediately with a Fine-Grained Token or configure your GitHub App credentials.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="text-xs text-gray-400 hover:text-white px-2 py-1"
              >
                Close
              </button>
            </div>

            {/* Option 1: Fine-Grained Token (Immediate Connection) */}
            <form
              onSubmit={async (e) => {
                await handleConnectPAT(e);
                setShowSetupModal(false);
              }}
              className="p-4 rounded-md bg-violet-500/[0.07] border border-violet-500/25 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-violet-200 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-violet-400" />
                  Option 1 · Connect via Fine-Grained Personal Access Token
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  Fastest for Local Dev
                </span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                Paste a GitHub Fine-Grained Token (<code className="text-violet-300">github_pat_...</code> or <code className="text-violet-300">ghp_...</code>) scoped to all or selected repositories. Encrypted on the backend with Fernet.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={patInput}
                  onChange={(e) => setPatInput(e.target.value)}
                  placeholder="github_pat_... or ghp_..."
                  className="flex-1 h-9 px-3 rounded-md bg-[#06080D] border border-white/[0.1] text-xs text-white font-mono focus:outline-none focus:border-violet-500/60"
                />
                <button
                  type="submit"
                  disabled={patSubmitting || !patInput.trim()}
                  className="h-9 px-4 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium disabled:opacity-50"
                >
                  {patSubmitting ? "Verifying..." : "Connect Token"}
                </button>
              </div>
            </form>

            {/* Option 2: Configure GitHub App */}
            <form onSubmit={handleSaveAppConfigAndInstall} className="space-y-3 pt-2 border-t border-white/[0.07]">
              <div className="text-xs font-semibold text-white">
                Option 2 · Configure GitHub App Installation Flow
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    GitHub App Slug (<code className="text-gray-300">GITHUB_APP_NAME</code>)
                  </label>
                  <input
                    type="text"
                    value={appSlugInput}
                    onChange={(e) => setAppSlugInput(e.target.value)}
                    placeholder="e.g. jgitlab-ai-engineer"
                    className="w-full h-9 px-3 rounded-md bg-[#06080D] border border-white/[0.1] text-xs text-white font-mono focus:outline-none focus:border-violet-500/60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    App ID (<code className="text-gray-300">GITHUB_APP_ID</code>)
                  </label>
                  <input
                    type="text"
                    value={appIdInput}
                    onChange={(e) => setAppIdInput(e.target.value)}
                    placeholder="e.g. 984210"
                    className="w-full h-9 px-3 rounded-md bg-[#06080D] border border-white/[0.1] text-xs text-white font-mono focus:outline-none focus:border-violet-500/60"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  Private Key PEM (<code className="text-gray-300">GITHUB_APP_PRIVATE_KEY</code>, optional for initial redirect)
                </label>
                <textarea
                  rows={2}
                  value={appPemInput}
                  onChange={(e) => setAppPemInput(e.target.value)}
                  placeholder="-----BEGIN RSA PRIVATE KEY----- ..."
                  className="w-full p-2.5 rounded-md bg-[#06080D] border border-white/[0.1] text-[11px] text-white font-mono focus:outline-none focus:border-violet-500/60"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="h-9 px-3 rounded-md bg-white/[0.05] hover:bg-white/[0.09] text-xs text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAppConfig || !appSlugInput.trim()}
                  className="h-9 px-4 rounded-md bg-[#161D2E] hover:bg-[#1E273D] border border-white/[0.14] text-xs font-medium text-white flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingAppConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />}
                  <span>Save &amp; Install on GitHub</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GitHubIntegrationPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
        </div>
      }
    >
      <GitHubPageContent />
    </Suspense>
  );
}
