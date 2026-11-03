"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  Bot,
  FolderGit2,
  FolderTree,
  ListTodo,
  Brain,
  Github,
  Sliders,
  History,
  User,
  LogOut,
  ChevronDown,
  Plus,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ExternalLink
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Software Engineer", href: "/engineer", icon: Bot, highlight: true },
  { label: "Projects", href: "/projects", icon: FolderGit2 },
  { label: "Repository Explorer", href: "/repository", icon: FolderTree },
  { label: "Agent Task Workspace", href: "/tasks", icon: ListTodo },
  { label: "Engineering Memory", href: "/memory", icon: Brain },
  { label: "GitHub Integration", href: "/github", icon: Github },
  { label: "AI Provider Settings", href: "/settings/providers", icon: Sliders },
  { label: "Activity Logs", href: "/activity", icon: History },
  { label: "Account Settings", href: "/settings/account", icon: User },
  { label: "Model Factory", href: "/model-factory", icon: Layers, badge: "Soon" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, activeProject, setActiveProject, projects, refreshProjects } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [providerConfigured, setProviderConfigured] = useState<boolean | null>(null);
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function checkStatus() {
      if (user) {
        try {
          const provs = await api.getProviders();
          setProviderConfigured(provs.some((p) => p.is_active));
        } catch {
          setProviderConfigured(false);
        }
        try {
          const gh = await api.getGitHubStatus();
          setGithubConnected(gh.is_connected);
        } catch {
          setGithubConnected(false);
        }
      }
    }
    checkStatus();
  }, [user, activeProject]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal-950 text-foreground flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-charcoal-900 border-r border-border flex flex-col justify-between shrink-0">
        <div>
          {/* Logo & Brand */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-400 flex items-center justify-center text-white font-mono font-bold text-base shadow-glow">
                J
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  JGitLab
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </span>
                <span className="text-[10px] text-muted font-mono tracking-wider">AI ENGINEERING</span>
              </div>
            </Link>
          </div>

          {/* Project Switcher */}
          <div className="p-3 border-b border-border relative">
            <button
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className="w-full px-3 py-2 rounded-lg bg-charcoal-850 hover:bg-charcoal-800 border border-border flex items-center justify-between text-left text-xs text-white transition-colors"
            >
              <div className="truncate pr-2">
                <span className="text-[10px] text-muted uppercase font-mono block">Active Project</span>
                <span className="font-semibold truncate block">
                  {activeProject ? activeProject.name : "Select Project"}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {projectDropdownOpen && (
              <div className="absolute top-full left-3 right-3 mt-1 bg-charcoal-900 border border-border rounded-lg shadow-2xl py-1 z-50 max-h-60 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-muted">Projects</div>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveProject(p);
                      setProjectDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-charcoal-800 transition-colors ${
                      activeProject?.id === p.id ? "text-violet-400 font-semibold bg-violet-950/20" : "text-gray-300"
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {activeProject?.id === p.id && <CheckCircle2 className="w-3 h-3 text-violet-400 shrink-0" />}
                  </button>
                ))}
                <div className="border-t border-border mt-1 pt-1">
                  <Link
                    href="/projects"
                    onClick={() => setProjectDropdownOpen(false)}
                    className="w-full text-left px-3 py-2 text-xs text-violet-400 hover:bg-charcoal-800 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Manage All Projects
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-violet-600/15 text-violet-300 border border-violet-500/30 font-semibold"
                      : "text-muted hover:text-white hover:bg-charcoal-850"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-violet-400" : "text-gray-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-charcoal-800 text-cyan-400 border border-cyan-800/40">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && !item.badge && (
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-border bg-charcoal-900/50">
          <div className="flex items-center justify-between p-2 rounded-lg bg-charcoal-850 border border-border">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-7 h-7 rounded-full bg-violet-900 text-violet-200 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                {user.email[0].toUpperCase()}
              </div>
              <div className="truncate">
                <span className="text-xs font-medium text-white block truncate">
                  {user.full_name || user.email.split("@")[0]}
                </span>
                <span className="text-[10px] font-mono text-muted uppercase block">{user.role}</span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded hover:bg-charcoal-700 text-muted hover:text-red-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 border-b border-border bg-charcoal-900/80 backdrop-blur px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-white">
              {activeProject ? activeProject.name : "Platform Overview"}
            </span>
            {activeProject?.default_branch && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-charcoal-850 border border-border text-[11px] font-mono text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                {activeProject.default_branch}
              </span>
            )}
          </div>

          {/* Quick System Indicators */}
          <div className="flex items-center gap-3">
            {/* AI Provider Status */}
            <Link
              href="/settings/providers"
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-colors ${
                providerConfigured
                  ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-950/40 text-amber-400 border-amber-500/30"
              }`}
            >
              {providerConfigured ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>AI API Active</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>Configure AI API</span>
                </>
              )}
            </Link>

            {/* GitHub Status */}
            <Link
              href="/github"
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-colors ${
                githubConnected
                  ? "bg-cyan-950/40 text-cyan-400 border-cyan-500/30"
                  : "bg-charcoal-850 text-muted border-border"
              }`}
            >
              <Github className="w-3 h-3" />
              <span>{githubConnected ? "GitHub Connected" : "Connect GitHub"}</span>
            </Link>

            {/* New Task Action Button */}
            <Link
              href="/engineer"
              className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-glow transition-all"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>New AI Task</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
