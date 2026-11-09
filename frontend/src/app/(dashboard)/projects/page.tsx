"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Project, GitHubRepoSummary } from "@/lib/types";
import {
  FolderGit2,
  Plus,
  Trash2,
  ExternalLink,
  Bot,
  Brain,
  GitBranch,
  X,
  Search,
  FolderTree,
  Github,
  CheckCircle2,
} from "lucide-react";
import { JGitLabRefreshIcon } from "@/components/brand/JGitLabBrand";

export default function ProjectsPage() {
  const { activeProject, setActiveProject, refreshProjects } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // New Project Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gitRepoUrl, setGitRepoUrl] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [techStackInput, setTechStackInput] = useState("TypeScript, Next.js, React, NestJS, Tailwind CSS");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GitHub repos state
  const [gitHubRepos, setGitHubRepos] = useState<GitHubRepoSummary[]>([]);
  const [selectedGhRepo, setSelectedGhRepo] = useState("");

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadGitHubRepos = async () => {
    try {
      const repos = await api.getGitHubRepos();
      setGitHubRepos(repos || []);
    } catch {
      // GitHub might not be connected or error
    }
  };

  useEffect(() => {
    loadProjects();
    loadGitHubRepos();
  }, []);

  const handleSelectGitHubRepo = (repoFullName: string) => {
    setSelectedGhRepo(repoFullName);
    const repo = gitHubRepos.find((r) => r.full_name === repoFullName);
    if (!repo) return;
    setName(repo.name);
    setDescription(repo.description || `Connected GitHub repository: ${repo.full_name}`);
    setGitRepoUrl(repo.clone_url || repo.html_url || `https://github.com/${repo.full_name}`);
    if (repo.default_branch) setDefaultBranch(repo.default_branch);
    if (repo.language) {
      setTechStackInput(`${repo.language}, TypeScript, Node.js`);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const stack = techStackInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      const newProj = await api.createProject({
        name,
        description,
        git_repo_url: gitRepoUrl || undefined,
        tech_stack: stack,
      });
      await refreshProjects();
      await loadProjects();
      setActiveProject(newProj);
      setIsCreating(false);
      setName("");
      setDescription("");
      setGitRepoUrl("");
    } catch (err: any) {
      setError(err.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this project and all associated tasks?")) return;
    try {
      await api.deleteProject(projectId);
      await refreshProjects();
      await loadProjects();
    } catch (err: any) {
      alert(err.message || "Failed to delete project");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#30363D]">
        <div>
          <h1 className="text-xl font-bold text-[#F0F6FC] tracking-tight flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-[#58A6FF]" />
            <span>Project Management</span>
          </h1>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Manage your autonomous engineering workspaces, isolated repositories, and architecture memory banks.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="h-9 pl-8 pr-3 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] placeholder:text-[#8B949E] focus:outline-none focus:border-[#58A6FF]"
            />
          </div>
          <button
            type="button"
            onClick={loadProjects}
            disabled={loading}
            title="Refresh projects list"
            className="h-9 px-3 rounded-lg bg-[#161B22] hover:bg-[#21262D] text-xs font-mono text-[#8B949E] hover:text-[#F0F6FC] border border-[#30363D] flex items-center gap-1.5 transition-colors"
          >
            <JGitLabRefreshIcon size="sm" spinning={loading} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="h-9 px-4 rounded-lg bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_4px_14px_rgba(31,111,235,0.35)] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Modal: Create Project */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCreating(false)}
              className="absolute top-4 right-4 p-1 rounded hover:bg-[#21262D] text-[#8B949E] hover:text-[#F0F6FC]"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-[#F0F6FC] mb-1">Create New Engineering Project</h2>
            <p className="text-xs text-[#8B949E] mb-4">Set up an isolated project space for AI tasks and memory.</p>

            {gitHubRepos.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-[#1F6FEB]/10 border border-[#1F6FEB]/30">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[#58A6FF] flex items-center gap-1.5">
                    <Github className="w-3.5 h-3.5" />
                    <span>Quick Import from Connected GitHub ({gitHubRepos.length} repos)</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#3FB950] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3FB950] animate-pulse" />
                    Connected
                  </span>
                </div>
                <select
                  value={selectedGhRepo}
                  onChange={(e) => handleSelectGitHubRepo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] focus:outline-none focus:border-[#58A6FF] font-mono"
                >
                  <option value="">-- Choose a repository to autofill --</option>
                  {gitHubRepos.map((repo) => (
                    <option key={repo.id} value={repo.full_name}>
                      {repo.full_name} {repo.default_branch ? `(${repo.default_branch})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <div className="p-3 mb-4 rounded-lg bg-[#F85149]/10 border border-[#F85149]/40 text-[#F85149] text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[#8B949E] mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Payments Gateway Microservice"
                  className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] focus:outline-none focus:border-[#58A6FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#8B949E] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="High-level architectural purpose of this repository..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] focus:outline-none focus:border-[#58A6FF] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#8B949E] mb-1">Git Repository URL (Optional)</label>
                <input
                  type="url"
                  value={gitRepoUrl}
                  onChange={(e) => setGitRepoUrl(e.target.value)}
                  placeholder="https://github.com/organization/repo"
                  className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] focus:outline-none focus:border-[#58A6FF] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#8B949E] mb-1">Tech Stack (comma-separated)</label>
                <input
                  type="text"
                  value={techStackInput}
                  onChange={(e) => setTechStackInput(e.target.value)}
                  placeholder="Python, FastAPI, Docker, PostgreSQL"
                  className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] focus:outline-none focus:border-[#58A6FF] font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-xs text-[#8B949E] hover:text-[#F0F6FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#1F6FEB] hover:bg-[#388BFD] text-xs font-semibold text-white shadow-[0_4px_14px_rgba(31,111,235,0.35)]"
                >
                  {submitting ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects
          .filter(
            (p) =>
              !searchQuery.trim() ||
              p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
              (p.description || "").toLowerCase().includes(searchQuery.trim().toLowerCase())
          )
          .map((proj) => {
            const isActive = activeProject?.id === proj.id;
            const ghMatch = proj.git_repo_url?.match(/github\.com[/:]([^/]+\/[^/.]+?)(?:\.git)?$/i);
            const ghRepoName = ghMatch ? ghMatch[1] : null;

            return (
              <div
                key={proj.id}
                onClick={() => setActiveProject(proj)}
                className={`card-interactive p-5 rounded-2xl cursor-pointer flex flex-col justify-between relative group ${
                  isActive ? "!border-[#1F6FEB] shadow-[0_0_24px_rgba(31,111,235,0.25)] bg-[#161B22]" : ""
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isActive ? "bg-[#3FB950] animate-pulse" : "bg-[#8B949E]"
                        }`}
                      />
                      <span className="text-[10px] font-mono uppercase text-[#8B949E]">
                        {isActive ? "Active Workspace" : "Click to Activate"}
                      </span>
                      {ghRepoName && (
                        <span className="text-[10px] font-mono text-[#58A6FF] flex items-center gap-1 bg-[#1F6FEB]/10 border border-[#1F6FEB]/30 px-1.5 py-0.5 rounded">
                          <Github className="w-2.5 h-2.5" />
                          <span>{ghRepoName.split("/")[1] || ghRepoName}</span>
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(proj.id, e)}
                      title="Delete project"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#21262D] text-[#8B949E] hover:text-[#F85149] transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="font-bold text-base text-[#F0F6FC] tracking-tight mb-1">{proj.name}</h3>
                  <p className="text-xs text-[#8B949E] line-clamp-2 mb-4 leading-relaxed">
                    {proj.description || "No description provided."}
                  </p>

                  {/* Tech stack pills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {proj.tech_stack && proj.tech_stack.length > 0 ? (
                      proj.tech_stack.map((tech) => (
                        <span
                          key={tech}
                          className="px-2 py-0.5 rounded bg-[#0D1117] text-[10px] font-mono text-[#C9D1D9] border border-[#30363D]"
                        >
                          {tech}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-[#8B949E] font-mono">No stack tags</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#30363D]">
                  {/* 1-Click Tool Shortcuts */}
                  <div className="grid grid-cols-3 gap-1.5 text-[11px] font-medium">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveProject(proj);
                        router.push("/engineer");
                      }}
                      className="py-1.5 px-2 rounded-md bg-[#1F6FEB]/15 hover:bg-[#1F6FEB]/25 text-[#58A6FF] border border-[#1F6FEB]/30 flex items-center justify-center gap-1 transition-colors"
                    >
                      <Bot className="w-3 h-3" />
                      <span>Engineer</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveProject(proj);
                        if (ghRepoName) {
                          if (typeof window !== "undefined") {
                            localStorage.setItem("jgitlab_active_repo", ghRepoName);
                          }
                          router.push(`/repository?repo=${encodeURIComponent(ghRepoName)}`);
                        } else {
                          router.push("/repository");
                        }
                      }}
                      className="py-1.5 px-2 rounded-md bg-[#0D1117] hover:bg-[#21262D] text-[#C9D1D9] border border-[#30363D] flex items-center justify-center gap-1 transition-colors"
                    >
                      <FolderTree className="w-3 h-3 text-[#58A6FF]" />
                      <span>VS Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveProject(proj);
                        router.push("/memory");
                      }}
                      className="py-1.5 px-2 rounded-md bg-[#0D1117] hover:bg-[#21262D] text-[#C9D1D9] border border-[#30363D] flex items-center justify-center gap-1 transition-colors"
                    >
                      <Brain className="w-3 h-3 text-[#3FB950]" />
                      <span>Memory</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#8B949E] font-mono">
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-[#58A6FF]" />
                      <span>{proj.default_branch}</span>
                    </span>
                    {proj.git_repo_url && (
                      <a
                        href={proj.git_repo_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-[#F0F6FC] flex items-center gap-1"
                      >
                        Repo <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
