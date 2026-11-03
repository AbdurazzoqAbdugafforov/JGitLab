"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Project } from "@/lib/types";
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
} from "lucide-react";

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
  const [techStackInput, setTechStackInput] = useState("Python, FastAPI, TypeScript, Next.js");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    loadProjects();
  }, []);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-violet-400" />
            <span>Project Management</span>
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Manage your autonomous engineering workspaces, isolated repositories, and architecture memory banks.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="h-9 pl-8 pr-3 rounded-lg bg-[#0B0F19] border border-white/[0.09] text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500/60"
            />
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-glow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Modal: Create Project */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-charcoal-900 border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCreating(false)}
              className="absolute top-4 right-4 p-1 rounded hover:bg-charcoal-800 text-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-white mb-1">Create New Engineering Project</h2>
            <p className="text-xs text-muted mb-4">Set up an isolated project space for AI tasks and memory.</p>

            {error && (
              <div className="p-3 mb-4 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Payments Gateway Microservice"
                  className="w-full px-3 py-2 rounded-lg bg-charcoal-850 border border-border text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="High-level architectural purpose of this repository..."
                  className="w-full px-3 py-2 rounded-lg bg-charcoal-850 border border-border text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">Git Repository URL (Optional)</label>
                <input
                  type="url"
                  value={gitRepoUrl}
                  onChange={(e) => setGitRepoUrl(e.target.value)}
                  placeholder="https://github.com/organization/repo"
                  className="w-full px-3 py-2 rounded-lg bg-charcoal-850 border border-border text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">Tech Stack (comma-separated)</label>
                <input
                  type="text"
                  value={techStackInput}
                  onChange={(e) => setTechStackInput(e.target.value)}
                  placeholder="Python, FastAPI, Docker, PostgreSQL"
                  className="w-full px-3 py-2 rounded-lg bg-charcoal-850 border border-border text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-lg bg-charcoal-850 hover:bg-charcoal-800 text-xs text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-glow"
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
            return (
              <div
                key={proj.id}
                onClick={() => setActiveProject(proj)}
                className={`card-interactive p-5 rounded-2xl cursor-pointer flex flex-col justify-between relative group ${
                  isActive ? "!border-violet-500/60 shadow-[0_0_24px_rgba(139,92,246,0.2)]" : ""
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isActive ? "bg-emerald-400 animate-pulse" : "bg-gray-600"
                        }`}
                      />
                      <span className="text-[10px] font-mono uppercase text-gray-400">
                        {isActive ? "Active Workspace" : "Click to Activate"}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(proj.id, e)}
                      title="Delete project"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/[0.06] text-gray-500 hover:text-red-400 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="font-bold text-base text-white tracking-tight mb-1">{proj.name}</h3>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-4 leading-relaxed">
                    {proj.description || "No description provided."}
                  </p>

                  {/* Tech stack pills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {proj.tech_stack && proj.tech_stack.length > 0 ? (
                      proj.tech_stack.map((tech) => (
                        <span
                          key={tech}
                          className="px-2 py-0.5 rounded bg-white/[0.04] text-[10px] font-mono text-gray-300 border border-white/[0.07]"
                        >
                          {tech}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-gray-500 font-mono">No stack tags</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/[0.07]">
                  {/* 1-Click Tool Shortcuts */}
                  <div className="grid grid-cols-3 gap-1.5 text-[11px] font-medium">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveProject(proj);
                        router.push("/engineer");
                      }}
                      className="py-1.5 px-2 rounded-md bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/25 flex items-center justify-center gap-1 transition-colors"
                    >
                      <Bot className="w-3 h-3" />
                      <span>Engineer</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveProject(proj);
                        router.push("/repository");
                      }}
                      className="py-1.5 px-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/[0.06] flex items-center justify-center gap-1 transition-colors"
                    >
                      <FolderTree className="w-3 h-3 text-cyan-400" />
                      <span>Repo</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveProject(proj);
                        router.push("/memory");
                      }}
                      className="py-1.5 px-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/[0.06] flex items-center justify-center gap-1 transition-colors"
                    >
                      <Brain className="w-3 h-3 text-emerald-400" />
                      <span>Memory</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-cyan-400" />
                      <span>{proj.default_branch}</span>
                    </span>
                    {proj.git_repo_url && (
                      <a
                        href={proj.git_repo_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-white flex items-center gap-1"
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
