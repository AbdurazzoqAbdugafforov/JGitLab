"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { GitHubConnectionStatus, GitHubRepoSummary } from "@/lib/types";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Github,
  Shield,
  Sliders,
  FolderGit2,
  Bot,
  Sparkles,
  Loader2,
  Lock,
  ExternalLink,
} from "lucide-react";

const STEPS = [
  { id: "welcome", number: 1, title: "Welcome" },
  { id: "account", number: 2, title: "Account" },
  { id: "github", number: 3, title: "GitHub Connection" },
  { id: "repositories", number: 4, title: "Repository Access" },
  { id: "provider", number: 5, title: "AI Provider" },
  { id: "first_project", number: 6, title: "First Project" },
];

export default function OnboardingPage() {
  const { user, refreshUser, activeProject, projects, refreshProjects, setActiveProject } = useAuth();
  const router = useRouter();

  const [stepIndex, setStepIndex] = useState(0);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [ghStatus, setGhStatus] = useState<GitHubConnectionStatus | null>(null);
  const [repos, setRepos] = useState<GitHubRepoSummary[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [installingApp, setInstallingApp] = useState(false);
  const [connectingRepo, setConnectingRepo] = useState(false);

  const [providerName, setProviderName] = useState("OpenAI Compatible");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("gpt-4o-mini");
  const [savingProvider, setSavingProvider] = useState(false);
  const [hasProvider, setHasProvider] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
  }, [user]);

  useEffect(() => {
    api
      .getGitHubStatus()
      .then((st) => {
        setGhStatus(st);
        if (st.is_connected) {
          api.getGitHubRepos().then(setRepos).catch(() => {});
        }
      })
      .catch(() => {});
    api
      .getProviders()
      .then((list) => setHasProvider(list.some((p) => p.is_active)))
      .catch(() => {});
  }, []);

  const markStepCompleted = async (stepId: string) => {
    try {
      await api.updateOnboarding({ completed_step: stepId });
      await refreshUser();
    } catch {}
  };

  const handleNext = async () => {
    const currentStep = STEPS[stepIndex];
    await markStepCompleted(currentStep.id);
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
      setStatusNotice(null);
    } else {
      await api.updateOnboarding({ dismissed: true });
      router.push("/dashboard");
    }
  };

  const handleSkipAll = async () => {
    try {
      await api.updateOnboarding({ dismissed: true });
    } catch {}
    router.push("/dashboard");
  };

  const handleSaveAccount = async () => {
    setSavingProfile(true);
    try {
      await api.updateProfile({ full_name: fullName });
      await markStepCompleted("account");
      setStepIndex(2);
    } catch (e: any) {
      setStatusNotice(e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleInstallGitHubApp = async () => {
    setInstallingApp(true);
    setStatusNotice(null);
    try {
      const res = await api.createGitHubAppInstallUrl("/onboarding");
      window.location.href = res.install_url;
    } catch (e: any) {
      setStatusNotice(e.message || "GitHub App is not configured yet on the backend.");
      setInstallingApp(false);
    }
  };

  const handleConnectSelectedRepo = async () => {
    if (!selectedRepo || !activeProject) return;
    setConnectingRepo(true);
    setStatusNotice(null);
    try {
      await api.selectRepo({
        project_id: activeProject.id,
        full_name: selectedRepo,
      });
      await markStepCompleted("repositories");
      setStepIndex(4);
    } catch (e: any) {
      setStatusNotice(e.message);
    } finally {
      setConnectingRepo(false);
    }
  };

  const handleSaveProvider = async () => {
    if (!apiKey.trim()) {
      await handleNext();
      return;
    }
    setSavingProvider(true);
    setStatusNotice(null);
    try {
      await api.createProvider({
        project_id: activeProject?.id,
        provider_name: providerName,
        base_url: baseUrl,
        api_key: apiKey.trim(),
        model_name: modelName,
      });
      setHasProvider(true);
      await markStepCompleted("provider");
      setStepIndex(5);
    } catch (e: any) {
      setStatusNotice(e.message);
    } finally {
      setSavingProvider(false);
    }
  };

  const handleFinishOnboarding = async () => {
    setCreatingProject(true);
    setStatusNotice(null);
    try {
      if (projectName.trim()) {
        const created = await api.createProject({
          name: projectName.trim(),
          description: projectDesc.trim() || "Autonomous AI engineering workspace project",
          tech_stack: ["Python", "TypeScript"],
        });
        await refreshProjects();
        setActiveProject(created);
      }
      await api.updateOnboarding({
        completed_step: "first_project",
        dismissed: true,
      });
      await refreshUser();
      router.push("/engineer");
    } catch (e: any) {
      setStatusNotice(e.message);
    } finally {
      setCreatingProject(false);
    }
  };

  const activeStep = STEPS[stepIndex];

  return (
    <div className="max-w-3xl mx-auto py-4">
      {/* Top Progress Bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-violet-400">
            Workspace Onboarding · Step {activeStep.number} of {STEPS.length}
          </span>
          <h1 className="text-xl font-semibold text-white mt-0.5">
            {activeStep.title}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleSkipAll}
          className="text-xs font-mono text-gray-400 hover:text-white px-3 py-1.5 rounded-md border border-white/[0.08] hover:border-white/[0.15] transition-colors"
        >
          Skip setup &amp; explore workspace →
        </button>
      </div>

      {/* Stepper Indicators */}
      <div className="grid grid-cols-6 gap-2 mb-8">
        {STEPS.map((s, idx) => {
          const isCurrent = idx === stepIndex;
          const isDone =
            idx < stepIndex || Boolean(user?.onboarding?.completed?.includes(s.id));
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStepIndex(idx)}
              className={`text-left p-2.5 rounded-md border transition-all ${
                isCurrent
                  ? "bg-violet-500/15 border-violet-500/40 text-white"
                  : isDone
                  ? "bg-[#0D111A] border-emerald-500/25 text-emerald-300"
                  : "bg-[#0A0E16] border-white/[0.06] text-gray-500 hover:text-gray-300"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                <span>0{s.number}</span>
                {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              </div>
              <div className="text-xs font-medium truncate">{s.title}</div>
            </button>
          );
        })}
      </div>

      {statusNotice && (
        <div className="mb-5 p-3.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
          {statusNotice}
        </div>
      )}

      {/* Step Card */}
      <div className="rounded-lg bg-[#0D111A] border border-white/[0.08] p-6 sm:p-8 shadow-xl">
        {/* STEP 1 — WELCOME */}
        {activeStep.id === "welcome" && (
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Engineering Platform</span>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white tracking-tight">
                Welcome to your AI engineering workspace.
              </h2>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                JGitLab combines an autonomous software engineer, least-privilege GitHub App repository integration, and persistent architectural memory in one unified platform.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <div className="p-4 rounded-md bg-[#111622] border border-white/[0.06]">
                <Github className="w-4 h-4 text-cyan-400 mb-2" />
                <h3 className="text-xs font-semibold text-white">Scoped GitHub App</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Authorize all repositories or only selected repositories under your control.
                </p>
              </div>
              <div className="p-4 rounded-md bg-[#111622] border border-white/[0.06]">
                <Bot className="w-4 h-4 text-violet-400 mb-2" />
                <h3 className="text-xs font-semibold text-white">Plan &amp; Verify Loop</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Inspect structured plans, approve execution, run sandbox tests, and review diffs.
                </p>
              </div>
              <div className="p-4 rounded-md bg-[#111622] border border-white/[0.06]">
                <Shield className="w-4 h-4 text-emerald-400 mb-2" />
                <h3 className="text-xs font-semibold text-white">Encrypted AI Gateway</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Bring your OpenAI, OpenRouter, Groq, or Ollama endpoints with Fernet key encryption.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — ACCOUNT */}
        {activeStep.id === "account" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Confirm your engineer profile</h2>
              <p className="text-xs text-gray-400 mt-1">
                Your identity is used for task approvals, audit logs, and pull request attribution.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Email address
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.email || ""}
                  className="w-full h-10 px-3.5 rounded-md bg-[#090C13] border border-white/[0.07] text-xs text-gray-400 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Display name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Lead Engineer"
                  className="w-full h-10 px-3.5 rounded-md bg-[#090C13] border border-white/[0.1] text-xs text-white focus:border-violet-500/60 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-md bg-[#111622] border border-white/[0.06] flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-white block">
                  Connected Login Identities
                </span>
                <span className="text-[11px] text-gray-400">
                  {user?.identities && user.identities.length > 0
                    ? user.identities.map((i) => i.provider.toUpperCase()).join(", ")
                    : "Email & Password"}
                </span>
              </div>
              <Link
                href="/settings/account"
                className="text-xs text-violet-400 hover:text-violet-300 font-mono"
              >
                Manage identities →
              </Link>
            </div>
          </div>
        )}

        {/* STEP 3 — GITHUB CONNECTION */}
        {activeStep.id === "github" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Connect GitHub for Repository Access
              </h2>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                JGitLab separates GitHub identity login from repository access. Install the GitHub App to grant fine-grained repository permissions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-md bg-[#111622] border border-white/[0.08]">
                <div className="text-xs font-semibold text-white mb-1">
                  Option A — All Repositories
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Authorize all current and future public/private repositories in your chosen GitHub account or organization.
                </p>
              </div>
              <div className="p-4 rounded-md bg-[#111622] border border-violet-500/30">
                <div className="text-xs font-semibold text-violet-300 mb-1">
                  Option B — Selected Repositories (Recommended)
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Explicitly pick only the individual repositories JGitLab is permitted to inspect and open pull requests on.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-md bg-[#090C13] border border-white/[0.06] text-xs space-y-2">
              <div className="flex items-center gap-2 text-gray-300 font-medium">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Minimal GitHub App Permissions Requested:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                <span className="px-2 py-1 rounded bg-white/[0.03] text-gray-300 border border-white/[0.05]">
                  metadata: read
                </span>
                <span className="px-2 py-1 rounded bg-white/[0.03] text-gray-300 border border-white/[0.05]">
                  contents: write
                </span>
                <span className="px-2 py-1 rounded bg-white/[0.03] text-gray-300 border border-white/[0.05]">
                  pull_requests: write
                </span>
                <span className="px-2 py-1 rounded bg-white/[0.03] text-gray-300 border border-white/[0.05]">
                  checks: read
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleInstallGitHubApp}
                disabled={installingApp}
                className="h-10 px-4 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium flex items-center gap-2 transition-colors"
              >
                {installingApp ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Github className="w-4 h-4" />
                )}
                <span>Install or Configure GitHub App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <Link
                href="/github"
                className="h-10 px-4 rounded-md bg-[#121723] hover:bg-[#171E2E] border border-white/[0.09] text-xs text-gray-300 flex items-center gap-2"
              >
                <span>Open Full GitHub Integration Page</span>
              </Link>
            </div>
          </div>
        )}

        {/* STEP 4 — REPOSITORY ACCESS */}
        {activeStep.id === "repositories" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Verify Authorized Repositories
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Select an authorized repository to analyze its architecture, frameworks, and file tree.
              </p>
            </div>

            {ghStatus?.is_connected ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-200 flex items-center justify-between">
                  <span>
                    Connected as <strong>@{ghStatus.github_username}</strong> ({ghStatus.connection_mode})
                  </span>
                  <span className="font-mono text-[11px]">
                    {repos.length} accessible repos
                  </span>
                </div>

                {repos.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Bind repository to {activeProject?.name || "active project"}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedRepo}
                        onChange={(e) => setSelectedRepo(e.target.value)}
                        className="flex-1 h-10 px-3 rounded-md bg-[#090C13] border border-white/[0.1] text-xs text-white"
                      >
                        <option value="">Select a repository...</option>
                        {repos.map((r) => (
                          <option key={r.id} value={r.full_name}>
                            {r.full_name} ({r.is_private ? "Private" : "Public"})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleConnectSelectedRepo}
                        disabled={!selectedRepo || connectingRepo}
                        className="h-10 px-4 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium disabled:opacity-50"
                      >
                        {connectingRepo ? "Analyzing..." : "Connect & Analyze"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 rounded-md bg-[#111622] border border-white/[0.07] text-xs text-gray-400 space-y-3">
                <p>
                  No GitHub App installation is connected yet. You can connect GitHub anytime from the{" "}
                  <Link href="/github" className="text-violet-400 underline">
                    GitHub Integration
                  </Link>{" "}
                  page or skip this step for now.
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 5 — AI PROVIDER */}
        {activeStep.id === "provider" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Configure External AI API Provider (Optional)
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Connect any OpenAI-compatible API endpoint. Keys are encrypted at rest with Fernet and never returned to the browser.
              </p>
            </div>

            {hasProvider && (
              <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>An active AI provider is already configured for your workspace.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-300 mb-1">Provider Label</label>
                <input
                  type="text"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-[#090C13] border border-white/[0.1] text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Model Identifier</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-[#090C13] border border-white/[0.1] text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">API Base URL</label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-[#090C13] border border-white/[0.1] text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  API Secret Key (Leave blank to skip)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full h-9 px-3 rounded-md bg-[#090C13] border border-white/[0.1] text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 6 — FIRST PROJECT */}
        {activeStep.id === "first_project" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Launch Your Engineering Workspace
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Use your existing project ({activeProject?.name || "Default"}) or create a new project before launching the AI Engineer.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  New Project Name (Optional)
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder={activeProject ? `Keep "${activeProject.name}"` : "Core Platform API"}
                  className="w-full h-9 px-3 rounded-md bg-[#090C13] border border-white/[0.1] text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Autonomous engineering service"
                  className="w-full h-9 px-3 rounded-md bg-[#090C13] border border-white/[0.1] text-xs text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Controls */}
        <div className="mt-8 pt-5 border-t border-white/[0.06] flex items-center justify-between">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            className="h-9 px-3.5 rounded-md border border-white/[0.08] text-xs text-gray-300 hover:text-white flex items-center gap-1.5 disabled:opacity-40"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2.5">
            {activeStep.id === "account" ? (
              <button
                type="button"
                onClick={handleSaveAccount}
                disabled={savingProfile}
                className="h-9 px-4 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium flex items-center gap-1.5"
              >
                <span>{savingProfile ? "Saving..." : "Save & Continue"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : activeStep.id === "provider" ? (
              <button
                type="button"
                onClick={handleSaveProvider}
                disabled={savingProvider}
                className="h-9 px-4 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium flex items-center gap-1.5"
              >
                <span>{apiKey.trim() ? "Save Provider & Continue" : "Skip & Continue"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : activeStep.id === "first_project" ? (
              <button
                type="button"
                onClick={handleFinishOnboarding}
                disabled={creatingProject}
                className="h-9 px-4 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium flex items-center gap-1.5"
              >
                <span>
                  {creatingProject ? "Launching..." : "Start an AI Engineering Task"}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="h-9 px-4 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium flex items-center gap-1.5"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
