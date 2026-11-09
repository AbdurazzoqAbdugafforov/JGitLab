"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  GitHubConnectionStatus,
  GitHubRepoSummary,
  GitHubInstallation,
  GitHubWebhookConfig,
} from "@/lib/types";
import {
  Github,
  ShieldCheck,
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
  Webhook,
  Copy,
  Send,
  Code2,
  Sparkles,
  GitBranch,
  Star,
  GitFork,
  ArrowRight,
  Sliders,
  Radio,
  Layers,
  Check,
  RefreshCw,
} from "lucide-react";
import { JGitLabRefreshIcon } from "@/components/brand/JGitLabBrand";

type TabKey = "repos" | "installations" | "webhooks" | "pat";

function GitHubPageContent() {
  const { activeProject, setActiveProject, projects, refreshProjects } = useAuth();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabKey>("repos");
  const [status, setStatus] = useState<GitHubConnectionStatus | null>(null);
  const [repos, setRepos] = useState<GitHubRepoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [reposLoading, setReposLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [analyzingRepo, setAnalyzingRepo] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [patInput, setPatInput] = useState("");
  const [patSubmitting, setPatSubmitting] = useState(false);

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [appSlugInput, setAppSlugInput] = useState("");
  const [appIdInput, setAppIdInput] = useState("");
  const [appPemInput, setAppPemInput] = useState("");
  const [savingAppConfig, setSavingAppConfig] = useState(false);

  const [webhookConfig, setWebhookConfig] = useState<GitHubWebhookConfig | null>(null);
  const [webhookSecretInput, setWebhookSecretInput] = useState("");
  const [savingWebhookSecret, setSavingWebhookSecret] = useState(false);
  const [testingWebhookEvent, setTestingWebhookEvent] = useState<string | null>(null);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);

  const [feedback, setFeedback] = useState<{ type: "success" | "warning" | "error"; text: string } | null>(null);

  const loadGitHubData = async () => {
    setLoading(true);
    try {
      const [st, wh] = await Promise.all([
        api.getGitHubStatus(),
        api.getGitHubWebhookConfig().catch(() => null),
      ]);
      setStatus(st);
      if (wh) setWebhookConfig(wh);
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
      setActiveTab("repos");
    } else if (installStatus === "pending_approval") {
      setFeedback({
        type: "warning",
        text: "Organization installation request submitted. Waiting for an organization owner on GitHub to approve.",
      });
      setActiveTab("installations");
    } else if (installStatus === "error") {
      setFeedback({
        type: "error",
        text: "GitHub App installation recorded, but server-side App credentials need configuration.",
      });
      setActiveTab("installations");
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
      return;
    }
    setInstalling(true);
    try {
      const res = await api.createGitHubAppInstallUrl("/github");
      window.location.href = res.install_url;
    } catch {
      setShowSetupModal(true);
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

  const handleSyncAllFromGitHub = async () => {
    setSyncingAll(true);
    setFeedback(null);
    try {
      const res = await api.syncAllGitHubInstallations();
      await loadGitHubData();
      setFeedback({
        type: "success",
        text: res.message || "Successfully synchronized GitHub installations & repositories.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Failed to sync with GitHub API.",
      });
    } finally {
      setSyncingAll(false);
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
      await loadGitHubData();
      setActiveTab("repos");
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

  const handleSaveWebhookSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookSecretInput.trim()) return;
    setSavingWebhookSecret(true);
    setFeedback(null);
    try {
      await api.saveOAuthConfig({
        github_app_webhook_secret: webhookSecretInput.trim(),
      });
      setWebhookSecretInput("");
      const wh = await api.getGitHubWebhookConfig();
      setWebhookConfig(wh);
      setFeedback({
        type: "success",
        text: "GitHub Webhook HMAC-SHA256 secret saved.",
      });
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message || "Failed to save webhook secret." });
    } finally {
      setSavingWebhookSecret(false);
    }
  };

  const handleTestWebhook = async (eventType: "ping" | "push" | "pull_request") => {
    setTestingWebhookEvent(eventType);
    setFeedback(null);
    try {
      const res = await api.sendTestGitHubWebhook({ event: eventType });
      const wh = await api.getGitHubWebhookConfig();
      setWebhookConfig(wh);
      setFeedback({
        type: "success",
        text: res.description || `Webhook '${eventType}' test event delivered (${res.delivery_id}).`,
      });
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message || "Webhook test failed." });
    } finally {
      setTestingWebhookEvent(null);
    }
  };

  const handleCopyWebhookUrl = () => {
    if (!webhookConfig?.webhook_url) return;
    navigator.clipboard.writeText(webhookConfig.webhook_url);
    setCopiedWebhookUrl(true);
    setTimeout(() => setCopiedWebhookUrl(false), 2000);
  };

  const handleSelectRepo = async (repo: GitHubRepoSummary) => {
    setAnalyzingRepo(repo.full_name);
    setFeedback(null);
    try {
      // Find if an existing project is already bound to this repo
      const existingProject = projects.find(
        (p) =>
          p.git_repo_url?.toLowerCase().includes(repo.full_name.toLowerCase()) ||
          p.name.toLowerCase() === repo.name.toLowerCase()
      );

      let targetProject = existingProject || activeProject;

      if (!targetProject) {
        // Automatically create a workspace project for this repository
        targetProject = await api.createProject({
          name: repo.name,
          description: repo.description || `Workspace connected to ${repo.full_name}`,
          git_repo_url: repo.html_url || `https://github.com/${repo.full_name}`,
          tech_stack: repo.language ? [repo.language] : ["TypeScript", "Next.js"],
        });
      }

      await api.selectRepo({
        project_id: targetProject.id,
        full_name: repo.full_name,
        clone_url: repo.clone_url,
        default_branch: repo.default_branch,
      });

      await refreshProjects();
      setActiveProject(targetProject);

      if (typeof window !== "undefined") {
        localStorage.setItem("jgitlab_active_repo", repo.full_name);
        localStorage.setItem("jgitlab_active_project_id", targetProject.id);
      }

      setFeedback({
        type: "success",
        text: `Connected and bound ${repo.full_name} to workspace project "${targetProject.name}".`,
      });
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message || "Failed to select repository" });
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Hero */}
      <div className="p-6 rounded-2xl bg-[#161B22] border border-[#30363D] relative overflow-hidden shadow-xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#1F6FEB]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-[#21262D] border border-[#30363D] flex items-center justify-center text-white shadow-inner">
                <Github className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#F0F6FC] tracking-tight flex items-center gap-2.5">
                  <span>GitHub Repository &amp; App Hub</span>
                  <span
                    className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                      status?.is_connected
                        ? "bg-[#238636]/20 text-[#3FB950] border-[#238636]/40"
                        : "bg-[#30363D]/50 text-[#8B949E] border-[#30363D]"
                    }`}
                  >
                    {status?.is_connected ? "● Connected & Synchronized" : "○ Not Connected"}
                  </span>
                </h1>
                <p className="text-xs text-[#8B949E] mt-0.5">
                  Connect GitHub App or Personal Tokens to explore code in the VS Code editor, trigger autonomous AI reviews, and sync branches.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleSyncAllFromGitHub}
              disabled={syncingAll}
              title="Synchronize all installations & repositories directly from GitHub API"
              className="h-9 px-3.5 rounded-xl bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#F0F6FC] text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
            >
              {syncingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#58A6FF]" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-[#58A6FF]" />
              )}
              <span>{syncingAll ? "Syncing Repos..." : "Sync from GitHub"}</span>
            </button>

            <button
              type="button"
              onClick={handleInstallGitHubApp}
              disabled={installing}
              className="h-9 px-4 rounded-xl bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold flex items-center gap-2 shadow-[0_4px_14px_rgba(46,160,67,0.3)] transition-all"
            >
              {installing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Github className="w-3.5 h-3.5" />
              )}
              <span>
                {installations.length > 0 ? "Configure / Add Installations" : "Install GitHub App"}
              </span>
              <ExternalLink className="w-3 h-3 opacity-75" />
            </button>

            <Link
              href="/repository"
              className="h-9 px-4 rounded-xl bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-semibold flex items-center gap-2 shadow-[0_4px_14px_rgba(31,111,235,0.3)] transition-all"
            >
              <Code2 className="w-4 h-4" />
              <span>Open VS Code Explorer</span>
            </Link>

            <button
              type="button"
              onClick={loadGitHubData}
              disabled={loading}
              title="Refresh status & repositories"
              className="h-9 w-9 rounded-xl bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#C9D1D9] hover:text-white flex items-center justify-center transition-colors"
            >
              <JGitLabRefreshIcon size="sm" spinning={loading} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#30363D] overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("repos")}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === "repos"
                ? "bg-[#1F6FEB] text-white shadow-sm font-semibold"
                : "text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]"
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Repositories</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
              {repos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("installations")}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === "installations"
                ? "bg-[#1F6FEB] text-white shadow-sm font-semibold"
                : "text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>GitHub App &amp; Access</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
              {installations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("webhooks")}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === "webhooks"
                ? "bg-[#1F6FEB] text-white shadow-sm font-semibold"
                : "text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]"
            }`}
          >
            <Webhook className="w-3.5 h-3.5" />
            <span>Webhooks &amp; Events</span>
            <span
              className={`w-2 h-2 rounded-full ${
                webhookConfig?.secret_configured ? "bg-[#3FB950]" : "bg-[#D29922]"
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pat")}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === "pat"
                ? "bg-[#1F6FEB] text-white shadow-sm font-semibold"
                : "text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Personal Access Token</span>
            {status?.connection_mode === "pat" && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                Active
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-md ${
            feedback.type === "success"
              ? "bg-[#238636]/10 border-[#238636]/30 text-[#7EE787]"
              : feedback.type === "warning"
              ? "bg-[#D29922]/10 border-[#D29922]/30 text-[#E3B341]"
              : "bg-[#F85149]/10 border-[#F85149]/30 text-[#FF7B72]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#3FB950]" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span className="font-mono">{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-75 hover:opacity-100 font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: REPOSITORIES */}
      {activeTab === "repos" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-4 rounded-xl bg-[#161B22] border border-[#30363D] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8B949E] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search repositories by name or description..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#58A6FF]"
                />
              </div>

              <div className="flex items-center rounded-lg bg-[#0D1117] border border-[#30363D] p-0.5 text-xs">
                {(["all", "public", "private"] as const).map((vis) => (
                  <button
                    key={vis}
                    type="button"
                    onClick={() => setVisibilityFilter(vis)}
                    className={`px-3 py-1 rounded-md capitalize font-mono text-[11px] transition-all ${
                      visibilityFilter === vis
                        ? "bg-[#1F6FEB] text-white font-semibold"
                        : "text-[#8B949E] hover:text-[#F0F6FC]"
                    }`}
                  >
                    {vis}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#8B949E]">
              <span>Active Project:</span>
              <span className="font-semibold text-[#F0F6FC] px-2.5 py-1 rounded-md bg-[#21262D] border border-[#30363D] font-mono">
                {activeProject ? activeProject.name : "None selected"}
              </span>
            </div>
          </div>

          {/* Repositories Cards Grid */}
          {reposLoading ? (
            <div className="p-16 text-center rounded-2xl bg-[#161B22] border border-[#30363D] space-y-3">
              <JGitLabRefreshIcon size="lg" spinning={true} />
              <div className="text-sm font-semibold text-[#F0F6FC]">
                Querying authorized GitHub repositories...
              </div>
              <p className="text-xs text-[#8B949E]">
                Fetching repository tree and permissions via GitHub App installation.
              </p>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="p-16 text-center rounded-2xl bg-[#161B22] border border-[#30363D] space-y-4">
              <FolderGit2 className="w-12 h-12 text-[#8B949E] mx-auto opacity-40" />
              <div className="text-base font-semibold text-[#F0F6FC]">
                {status?.is_connected ? "No repositories matched your filters" : "GitHub is not connected"}
              </div>
              <p className="text-xs text-[#8B949E] max-w-md mx-auto leading-relaxed">
                {status?.is_connected
                  ? "Try searching for a different keyword or adjusting your public/private visibility filters."
                  : "Install the GitHub App or connect your Personal Access Token to grant JGitLab access to your code repositories."}
              </p>
              {!status?.is_connected && (
                <button
                  type="button"
                  onClick={handleInstallGitHubApp}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-semibold shadow-md"
                >
                  <Github className="w-4 h-4" />
                  <span>Connect GitHub</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRepos.map((repo) => {
                const isSelectedForActive =
                  activeProject?.git_repo_url &&
                  (activeProject.git_repo_url.includes(repo.full_name) ||
                    activeProject.git_repo_url.includes(repo.name));

                return (
                  <div
                    key={repo.id}
                    className={`p-5 rounded-2xl bg-[#161B22] border transition-all flex flex-col justify-between gap-4 hover:border-[#58A6FF]/60 hover:shadow-lg ${
                      isSelectedForActive
                        ? "border-[#1F6FEB] ring-1 ring-[#1F6FEB]/30"
                        : "border-[#30363D]"
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Repo Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#21262D] border border-[#30363D] flex items-center justify-center shrink-0">
                            {repo.is_private ? (
                              <Lock className="w-4 h-4 text-[#D29922]" />
                            ) : (
                              <Unlock className="w-4 h-4 text-[#58A6FF]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <a
                              href={repo.html_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-bold text-[#F0F6FC] hover:text-[#58A6FF] font-mono truncate block"
                            >
                              {repo.full_name}
                            </a>
                            <span className="text-[11px] font-mono text-[#8B949E] flex items-center gap-1">
                              <GitBranch className="w-3 h-3 text-[#58A6FF]" />
                              {repo.default_branch || "main"}
                            </span>
                          </div>
                        </div>

                        {isSelectedForActive && (
                          <span className="px-2 py-0.5 rounded-full bg-[#238636]/20 border border-[#238636]/40 text-[#3FB950] text-[10px] font-mono font-semibold shrink-0">
                            Active Project Repo
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[#8B949E] line-clamp-2 min-h-[32px]">
                        {repo.description || "No repository description provided on GitHub."}
                      </p>

                      {/* Meta badges */}
                      <div className="flex items-center gap-4 text-xs font-mono text-[#8B949E] pt-1">
                        {repo.language && (
                          <span className="flex items-center gap-1.5 text-[#C9D1D9]">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#388BFD]" />
                            <span>{repo.language}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-[#E3B341]" />
                          <span>{repo.stargazers_count || 0}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork className="w-3.5 h-3.5" />
                          <span>{repo.forks_count || 0}</span>
                        </span>
                        <span className="text-[11px] text-[#8B949E]/70 truncate">
                          Updated {repo.pushed_at ? new Date(repo.pushed_at).toLocaleDateString() : "recently"}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#30363D]">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/repository?repo=${encodeURIComponent(repo.full_name)}`}
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              localStorage.setItem("jgitlab_active_repo", repo.full_name);
                            }
                          }}
                          className="h-8 px-3 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#F0F6FC] text-xs font-semibold flex items-center gap-1.5 border border-[#30363D] transition-colors"
                        >
                          <Code2 className="w-3.5 h-3.5 text-[#58A6FF]" />
                          <span>VS Code</span>
                        </Link>

                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="h-8 w-8 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-white flex items-center justify-center border border-[#30363D] transition-colors"
                          title="Open on GitHub"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectRepo(repo)}
                        disabled={analyzingRepo === repo.full_name}
                        className={`h-8 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isSelectedForActive
                            ? "bg-[#238636] hover:bg-[#2ea043] text-white"
                            : "bg-[#1F6FEB] hover:bg-[#388BFD] text-white"
                        }`}
                      >
                        {analyzingRepo === repo.full_name ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isSelectedForActive ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {analyzingRepo === repo.full_name
                            ? "Analyzing Tree..."
                            : isSelectedForActive
                            ? "Re-Analyze Repo"
                            : "Connect to Project"}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GITHUB APP & INSTALLATIONS */}
      {activeTab === "installations" && (
        <div className="space-y-6">
          {/* Permission Architecture Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-[#161B22] border border-[#30363D] space-y-2">
              <span className="text-[10px] font-mono uppercase text-[#8B949E] block">App Security</span>
              <h3 className="text-sm font-bold text-[#F0F6FC] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#3FB950]" />
                <span>Short-Lived JWT Tokens</span>
              </h3>
              <p className="text-xs text-[#8B949E] leading-relaxed">
                Tokens are minted server-side using RSA-256 private key and expire automatically in 60 minutes.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#161B22] border border-[#1F6FEB]/40 space-y-2">
              <span className="text-[10px] font-mono uppercase text-[#58A6FF] block">Repository Scope</span>
              <h3 className="text-sm font-bold text-[#58A6FF] flex items-center gap-1.5">
                <FolderGit2 className="w-4 h-4" />
                <span>Selected Repositories</span>
              </h3>
              <p className="text-xs text-[#8B949E] leading-relaxed">
                Granular control: restrict access strictly to only the repositories you explicitly grant.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#161B22] border border-[#30363D] space-y-2">
              <span className="text-[10px] font-mono uppercase text-[#8B949E] block">Real-time Webhooks</span>
              <h3 className="text-sm font-bold text-[#F0F6FC] flex items-center gap-1.5">
                <Webhook className="w-4 h-4 text-[#D29922]" />
                <span>HMAC-SHA256 Signed</span>
              </h3>
              <p className="text-xs text-[#8B949E] leading-relaxed">
                Push, pull request, and review events trigger instant AI review workflows and CI/CD pipelines.
              </p>
            </div>
          </div>

          {/* Connected Installations List */}
          <div className="rounded-2xl bg-[#161B22] border border-[#30363D] overflow-hidden">
            <div className="p-5 border-b border-[#30363D] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#F0F6FC]">
                  Active GitHub App Installations ({installations.length})
                </h3>
                <p className="text-xs text-[#8B949E]">
                  Installations authorized on your GitHub personal or organization accounts.
                </p>
              </div>

              <button
                type="button"
                onClick={handleInstallGitHubApp}
                className="h-8 px-3 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Github className="w-3.5 h-3.5" />
                <span>Add Installation</span>
              </button>
            </div>

            {installations.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Building2 className="w-8 h-8 text-[#8B949E] mx-auto opacity-40" />
                <div className="text-sm font-semibold text-[#F0F6FC]">No installations detected</div>
                <p className="text-xs text-[#8B949E] max-w-sm mx-auto">
                  Click &quot;Install GitHub App&quot; above to connect your account or organization to JGitLab.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#30363D]">
                {installations.map((inst) => (
                  <div
                    key={inst.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#21262D] border border-[#30363D] flex items-center justify-center shrink-0">
                        {inst.account_type === "Organization" ? (
                          <Building2 className="w-5 h-5 text-[#58A6FF]" />
                        ) : (
                          <UserIcon className="w-5 h-5 text-[#3FB950]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-[#F0F6FC]">
                            @{inst.account_login || inst.installation_id}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#21262D] text-[#8B949E]">
                            {inst.account_type}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                              inst.status === "active"
                                ? "bg-[#238636]/20 text-[#3FB950] border-[#238636]/40"
                                : "bg-[#D29922]/20 text-[#E3B341] border-[#D29922]/40"
                            }`}
                          >
                            {inst.status.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1F6FEB]/15 text-[#58A6FF] border border-[#1F6FEB]/30">
                            {inst.repository_selection === "all"
                              ? "All Repositories"
                              : `Selected (${inst.repository_count})`}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-[#8B949E] mt-1">
                          Installation ID: {inst.installation_id} · Last sync:{" "}
                          {inst.last_synced_at
                            ? new Date(inst.last_synced_at).toLocaleString()
                            : "Never"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSyncInstallation(inst)}
                        disabled={syncingId === inst.id}
                        className="h-8 px-3 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#F0F6FC] text-xs font-semibold flex items-center gap-1.5 border border-[#30363D]"
                      >
                        <JGitLabRefreshIcon size="xs" spinning={syncingId === inst.id} />
                        <span>Sync</span>
                      </button>

                      <a
                        href={`https://github.com/settings/installations/${inst.installation_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="h-8 px-3 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#F0F6FC] text-xs font-semibold flex items-center gap-1.5 border border-[#30363D]"
                      >
                        <span>Manage Scope</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDisconnectInstallation(inst)}
                        className="h-8 px-3 rounded-lg bg-[#F85149]/10 hover:bg-[#F85149]/20 text-[#FF7B72] text-xs font-semibold border border-[#F85149]/30 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: WEBHOOKS & EVENTS */}
      {activeTab === "webhooks" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#161B22] border border-[#30363D] space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#F0F6FC] flex items-center gap-2">
                <Webhook className="w-4 h-4 text-[#58A6FF]" />
                <span>GitHub Webhook Delivery Endpoint</span>
              </h3>
              <p className="text-xs text-[#8B949E] mt-0.5">
                Configure this URL in your GitHub App settings under &quot;Webhook URL&quot;.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookConfig?.webhook_url || "http://localhost:3000/api/v1/github/webhook"}
                className="flex-1 h-9 px-3 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs font-mono text-[#58A6FF] select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyWebhookUrl}
                className="h-9 px-4 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#F0F6FC] text-xs font-semibold border border-[#30363D] flex items-center gap-1.5 transition-colors"
              >
                {copiedWebhookUrl ? (
                  <Check className="w-3.5 h-3.5 text-[#3FB950]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedWebhookUrl ? "Copied" : "Copy URL"}</span>
              </button>
            </div>

            {/* Test Event Buttons */}
            <div className="pt-4 border-t border-[#30363D] space-y-2">
              <span className="text-xs font-mono uppercase text-[#8B949E] block">
                Trigger Test Webhook Deliveries:
              </span>
              <div className="flex items-center gap-3 flex-wrap">
                {(["ping", "push", "pull_request"] as const).map((evt) => (
                  <button
                    key={evt}
                    type="button"
                    onClick={() => handleTestWebhook(evt)}
                    disabled={testingWebhookEvent === evt}
                    className="h-8 px-3 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#F0F6FC] text-xs font-mono border border-[#30363D] flex items-center gap-1.5"
                  >
                    {testingWebhookEvent === evt ? (
                      <Loader2 className="w-3 h-3 animate-spin text-[#58A6FF]" />
                    ) : (
                      <Send className="w-3 h-3 text-[#58A6FF]" />
                    )}
                    <span>Simulate {evt.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PERSONAL ACCESS TOKEN */}
      {activeTab === "pat" && (
        <div className="p-6 rounded-2xl bg-[#161B22] border border-[#30363D] space-y-5 max-w-2xl">
          <div>
            <h3 className="text-sm font-bold text-[#F0F6FC] flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#58A6FF]" />
              <span>Connect via Personal Access Token (PAT)</span>
            </h3>
            <p className="text-xs text-[#8B949E] mt-0.5">
              Ideal for private testing or if you do not have permission to install GitHub Apps on the target organization.
            </p>
          </div>

          <form onSubmit={handleConnectPAT} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-[#8B949E] mb-1">
                Personal Access Token (classic or fine-grained)
              </label>
              <input
                type="password"
                value={patInput}
                onChange={(e) => setPatInput(e.target.value)}
                placeholder="github_pat_... or ghp_..."
                className="w-full h-9 px-3 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs font-mono text-[#F0F6FC] focus:outline-none focus:border-[#58A6FF]"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={patSubmitting || !patInput.trim()}
                className="h-9 px-4 rounded-lg bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {patSubmitting ? "Validating Token..." : "Connect Token"}
              </button>

              {status?.connection_mode === "pat" && (
                <button
                  type="button"
                  onClick={handleDisconnectAll}
                  className="h-9 px-3 rounded-lg bg-[#F85149]/10 hover:bg-[#F85149]/20 text-[#FF7B72] text-xs font-semibold border border-[#F85149]/30"
                >
                  Disconnect Token
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* GitHub App Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363D]">
              <h3 className="text-sm font-bold text-[#F0F6FC] flex items-center gap-2">
                <Github className="w-4 h-4 text-[#58A6FF]" />
                <span>Configure GitHub App Credentials</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="text-[#8B949E] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAppConfigAndInstall} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#8B949E] mb-1">
                  GitHub App Slug (Name) *
                </label>
                <input
                  type="text"
                  value={appSlugInput}
                  onChange={(e) => setAppSlugInput(e.target.value)}
                  placeholder="e.g. jgitlab-ai-engine"
                  className="w-full h-8 px-3 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs font-mono text-[#F0F6FC]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#8B949E] mb-1">
                  GitHub App ID
                </label>
                <input
                  type="text"
                  value={appIdInput}
                  onChange={(e) => setAppIdInput(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full h-8 px-3 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs font-mono text-[#F0F6FC]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#8B949E] mb-1">
                  Private Key (.pem)
                </label>
                <textarea
                  rows={4}
                  value={appPemInput}
                  onChange={(e) => setAppPemInput(e.target.value)}
                  placeholder="-----BEGIN RSA PRIVATE KEY-----..."
                  className="w-full p-2.5 rounded-lg bg-[#0D1117] border border-[#30363D] text-[11px] font-mono text-[#F0F6FC]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#30363D]">
                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs text-[#8B949E] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAppConfig}
                  className="px-4 py-1.5 rounded-lg bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-semibold"
                >
                  {savingAppConfig ? "Saving & Redirecting..." : "Save & Proceed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GitHubPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-[#8B949E] font-mono">
          Loading GitHub integration...
        </div>
      }
    >
      <GitHubPageContent />
    </Suspense>
  );
}
