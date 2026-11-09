"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { ActivityLog, GitHubConnectionStatus, isUserAdminEmail } from "@/lib/types";
import {
  LayoutDashboard,
  Bot,
  FolderGit2,
  FolderTree,
  ListTodo,
  GitPullRequest,
  GitBranch,
  Brain,
  Github,
  Sliders,
  History,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  ChevronRight,
  Plus,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Search,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Compass,
  Menu,
  X,
  RefreshCw,
  ShieldAlert,
  Users,
  KeyRound,
  FileText,
  Shield,
  Sparkles,
  Command,
  Cpu,
  Activity,
} from "lucide-react";
import { CommandPalette } from "@/components/CommandPalette";
import { NotificationProvider } from "@/lib/notification-context";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ToastContainer } from "@/components/ToastContainer";
import {
  JGitLabLogoMark,
  JGitLabSplashLoader,
  JGitLabWordmark,
  JGitLabRefreshIcon,
} from "@/components/brand/JGitLabBrand";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  highlight?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: "CORE",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "AI Engineer", href: "/engineer", icon: Bot, badge: "AGENT" },
      { label: "Tasks", href: "/tasks", icon: ListTodo },
      { label: "Code Reviews", href: "/reviews", icon: GitPullRequest },
      { label: "CI/CD Pipelines", href: "/pipelines", icon: GitBranch, badge: "CI/CD" },
    ],
  },
  {
    group: "AI & INTELLIGENCE",
    items: [
      { label: "Model Factory", href: "/model-factory", icon: Cpu, badge: "TRAIN" },
      { label: "Engineering Memory", href: "/memory", icon: Brain },
      { label: "AI Providers", href: "/settings/providers", icon: Sliders },
    ],
  },
  {
    group: "REPOSITORY & CODE",
    items: [
      { label: "Projects", href: "/projects", icon: FolderGit2 },
      { label: "Code Explorer", href: "/repository", icon: FolderTree, badge: "IDE" },
      { label: "GitHub App", href: "/github", icon: Github },
    ],
  },
  {
    group: "PLATFORM & DOCS",
    items: [
      { label: "Activity Logs", href: "/activity", icon: Activity },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Guided Setup", href: "/onboarding", icon: Compass, badge: "SETUP" },
      { label: "Documentation & Help", href: "/help", icon: HelpCircle },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

const BREADCRUMB_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/engineer": "AI Software Engineer",
  "/memory": "Engineering Memory",
  "/repository": "Code Explorer (VS Code)",
  "/tasks": "Tasks",
  "/reviews": "Code Reviews",
  "/pipelines": "CI/CD Pipelines",
  "/github": "GitHub App & Repositories",
  "/settings": "Workspace Settings",
  "/settings/providers": "AI Model Providers",
  "/model-factory": "Model Factory",
  "/activity": "Activity Logs",
  "/settings/account": "Account & Security",
  "/help": "Help & Docs",
  "/onboarding": "Guided Setup",
  "/admin": "Admin Console",
  "/admin/users": "User Management",
  "/admin/sessions": "Active Sessions",
  "/admin/audit-logs": "System Audit Trail",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const {
    user,
    loading,
    logout,
    activeProject,
    setActiveProject,
    projects,
    refreshProjects,
    refreshUser,
  } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshingWorkspace, setIsRefreshingWorkspace] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [activeSavedRepo, setActiveSavedRepo] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("jgitlab_active_repo");
      if (stored) setActiveSavedRepo(stored);
    }
  }, [pathname, activeProject]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        setAccountMenuOpen(false);
        setProjectDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [providerConfigured, setProviderConfigured] = useState<boolean | null>(null);
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);
  const [githubStatus, setGithubStatus] = useState<GitHubConnectionStatus | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);

  const isAdmin = isUserAdminEmail(user);

  const currentNavGroups = React.useMemo(() => {
    const baseGroups = isAdmin
      ? [
          ...NAV_GROUPS,
          {
            group: "ADMINISTRATION",
            items: [
              { label: "Admin Console", href: "/admin", icon: ShieldAlert },
              { label: "User Management", href: "/admin/users", icon: Users },
              { label: "Active Sessions", href: "/admin/sessions", icon: KeyRound },
              { label: "Audit Trail", href: "/admin/audit-logs", icon: FileText },
            ],
          },
        ]
      : NAV_GROUPS;

    return baseGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        if (item.href === "/github" && githubStatus?.is_connected) {
          const repoCount =
            githubStatus.repository_count ||
            githubStatus.installations?.reduce(
              (acc, i) => acc + (i.repository_count || 0),
              0
            ) ||
            35;
          return {
            ...item,
            badge: `${repoCount} REPOS`,
            highlight: true,
          };
        }
        return item;
      }),
    }));
  }, [isAdmin, githubStatus]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("jgitlab_sidebar_collapsed");
      if (saved === "1") setCollapsed(true);
    }
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("jgitlab_sidebar_collapsed", next ? "1" : "0");
      }
      return next;
    });
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
    }
  }, [user, loading, router, pathname]);

  const checkStatus = async () => {
    if (!user) return;
    try {
      const provs = await api.getProviders();
      setProviderConfigured(provs.some((p) => p.is_active));
    } catch {
      setProviderConfigured(false);
    }
    try {
      const gh = await api.getGitHubStatus();
      setGithubStatus(gh);
      setGithubConnected(gh.is_connected);
    } catch {
      setGithubStatus(null);
      setGithubConnected(false);
    }
    try {
      const logs = await api.getActivityLogs(activeProject?.id);
      setRecentActivity(logs.slice(0, 6));
    } catch {}
  };

  useEffect(() => {
    checkStatus();
  }, [user, activeProject, pathname]);

  const handleJGitLabRefresh = async () => {
    setIsRefreshingWorkspace(true);
    try {
      await Promise.all([refreshUser(), refreshProjects(), checkStatus()]);
      router.refresh();
    } finally {
      setTimeout(() => setIsRefreshingWorkspace(false), 450);
    }
  };

  if (loading || !user) {
    return <JGitLabSplashLoader label="Loading JGitLab Workspace..." fullScreen />;
  }

  const currentTitle = BREADCRUMB_LABELS[pathname] || "Workspace";

  const isSovereignStudio = pathname === "/dashboard" || pathname === "/engineer";

  if (isSovereignStudio) {
    return (
      <NotificationProvider>
        <div className="min-h-screen bg-[#08090D] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
          {children}
          <ToastContainer />
          <CommandPalette
            isOpen={commandPaletteOpen || searchOpen}
            onClose={() => {
              setCommandPaletteOpen(false);
              setSearchOpen(false);
            }}
          />
        </div>
      </NotificationProvider>
    );
  }

  const filteredSearchItems = ALL_NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-[#0A0D14] text-[#F0F6FC] flex">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* GitHub & Stripe Deep Slate Navigation Dock */}
      <aside
        className={`fixed lg:sticky lg:top-2 lg:my-2 lg:ml-2 lg:h-[calc(100vh-16px)] lg:rounded-xl inset-y-0 left-0 z-50 bg-[#0D1117] border-r lg:border border-[#30363D] shadow-2xl flex flex-col justify-between shrink-0 transition-all duration-200 overflow-visible ${
          collapsed ? "w-[68px]" : "w-[260px]"
        } ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Top Royal Blue Highlight Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-[#1F6FEB] via-[#388BFD]/50 to-transparent rounded-t-xl shrink-0" />

        <div className="flex flex-col min-h-0 flex-1">
          {/* Top Brand + Collapse Control */}
          <div
            className={`h-14 border-b border-[#30363D] flex items-center shrink-0 ${
              collapsed ? "justify-center px-2" : "justify-between px-3.5"
            }`}
          >
            {collapsed ? (
              <button
                type="button"
                onClick={toggleCollapse}
                aria-label="Expand sidebar"
                title="Expand JGitLab Studio"
                className="group relative w-9 h-9 rounded-lg overflow-hidden bg-[#161B22] border border-[#30363D] hover:border-[#58A6FF] flex items-center justify-center transition-all"
              >
                <img
                  src="/jgitlab-logo.jpg"
                  alt="JGitLab"
                  className="w-full h-full object-cover group-hover:opacity-20 transition-opacity"
                />
                <PanelLeftOpen className="w-4 h-4 hidden group-hover:block text-[#58A6FF] absolute" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (pathname !== "/dashboard") {
                      router.push("/dashboard");
                    }
                    handleJGitLabRefresh();
                  }}
                  className="flex items-center gap-2.5 min-w-0 text-left group"
                  title="JGitLab — Click to refresh studio"
                >
                  <JGitLabLogoMark
                    size="md"
                    spinning={isRefreshingWorkspace}
                    glow
                    className={
                      isRefreshingWorkspace
                        ? ""
                        : "group-hover:scale-105 transition-transform"
                    }
                  />
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <JGitLabWordmark size="md" showBrackets={false} />
                      <JGitLabRefreshIcon
                        size="xs"
                        spinning={isRefreshingWorkspace}
                      />
                    </div>
                    <span className="text-[10px] text-[#58A6FF] font-mono tracking-wider block">
                      &lt;ENTERPRISE OS /&gt;
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={toggleCollapse}
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                  className="hidden lg:flex p-1.5 rounded-md text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#161B22] transition-colors shrink-0"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-md text-[#8B949E] hover:text-[#F0F6FC]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Workspace / Project Switcher */}
          <div className="p-2.5 border-b border-[#30363D] relative shrink-0">
            <button
              type="button"
              onClick={() => setProjectDropdownOpen((v) => !v)}
              className={`w-full rounded-md bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] flex items-center justify-between text-left text-xs text-[#F0F6FC] transition-colors ${
                collapsed ? "p-2 justify-center" : "px-2.5 py-1.5"
              }`}
              title={activeProject ? `Active Project: ${activeProject.name}` : "Select Project"}
            >
              {collapsed ? (
                <FolderGit2 className="w-4 h-4 text-[#58A6FF]" />
              ) : (
                <>
                  <div className="truncate pr-2">
                    <span className="text-[10px] text-[#8B949E] uppercase font-mono block">
                      Repository Scope
                    </span>
                    <span className="font-medium truncate block text-[#F0F6FC] mt-0.5">
                      {activeProject ? activeProject.name : "Select Project"}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#8B949E] shrink-0" />
                </>
              )}
            </button>

            {projectDropdownOpen && (
              <div className="absolute top-full left-2.5 right-2.5 mt-1 w-60 bg-[#161B22] border border-[#30363D] rounded-lg shadow-2xl py-1 z-50 max-h-64 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-[#8B949E]">
                  Switch Project
                </div>
                {projects.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-[#8B949E]">No projects yet</div>
                ) : (
                  projects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setActiveProject(p);
                        setProjectDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#21262D] transition-colors ${
                        activeProject?.id === p.id
                          ? "text-[#58A6FF] font-medium bg-[#1F6FEB]/15"
                          : "text-[#C9D1D9]"
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      {activeProject?.id === p.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#58A6FF] shrink-0" />
                      )}
                    </button>
                  ))
                )}
                <div className="border-t border-[#30363D] mt-1 pt-1">
                  <Link
                    href="/projects"
                    onClick={() => setProjectDropdownOpen(false)}
                    className="w-full text-left px-3 py-1.5 text-xs text-[#58A6FF] hover:bg-[#21262D] flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Manage Projects
                  </Link>
                  <Link
                    href="/onboarding"
                    onClick={() => setProjectDropdownOpen(false)}
                    className="w-full text-left px-3 py-1.5 text-xs text-[#C9D1D9] hover:bg-[#21262D] flex items-center gap-1.5"
                  >
                    <Compass className="w-3.5 h-3.5" /> Guided Setup
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Grouped Navigation */}
          <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3.5">
            {currentNavGroups.map((group) => (
              <div key={group.group}>
                {!collapsed && (
                  <div className="px-2.5 mb-1.5 text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
                    {group.group}
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    const repoToUse = activeSavedRepo || (typeof window !== "undefined" ? localStorage.getItem("jgitlab_active_repo") : null);
                    const targetHref =
                      item.href === "/repository" && repoToUse
                        ? `/repository?repo=${encodeURIComponent(repoToUse)}`
                        : item.href;
                    return (
                      <Link
                        key={item.href}
                        href={targetHref}
                        onClick={() => setMobileMenuOpen(false)}
                        title={collapsed ? item.label : undefined}
                        className={`relative flex items-center justify-between rounded-md text-xs font-medium transition-all ${
                          collapsed ? "p-2 justify-center" : "px-3 py-1.5"
                        } ${
                          isActive
                            ? "bg-[#1F6FEB]/12 text-[#F0F6FC] border border-[#1F6FEB]/35 shadow-sm"
                            : "text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#161B22] border border-transparent"
                        }`}
                      >
                        {isActive && !collapsed && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-sm bg-[#1F6FEB]" />
                        )}
                        <div className="flex items-center gap-2.5 min-w-0 relative">
                          <div className="relative shrink-0">
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                isActive ? "text-[#58A6FF]" : "text-[#8B949E]"
                              }`}
                            />
                            {collapsed && item.href === "/github" && githubStatus?.is_connected && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#3FB950] ring-2 ring-[#0D1117] animate-pulse" />
                            )}
                          </div>
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </div>
                        {!collapsed && item.badge && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              item.href === "/github" && githubStatus?.is_connected
                                ? "bg-[#238636]/20 text-[#3FB950] border-[#238636]/40 font-semibold"
                                : "bg-[#21262D] text-[#8B949E] border-[#30363D]"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {!collapsed && item.highlight && !item.badge && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1F6FEB] shadow-[0_0_6px_#1f6feb]" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom User Profile & Account Menu */}
        <div className="p-2 border-t border-[#30363D] bg-[#0D1117] relative shrink-0">
          <div
            className={`flex items-center rounded-md bg-[#161B22] border border-[#30363D] ${
              collapsed ? "justify-center p-1.5" : "justify-between gap-2 p-1.5"
            }`}
          >
            <button
              type="button"
              onClick={() => setAccountMenuOpen((v) => !v)}
              className={`flex items-center min-w-0 ${
                collapsed ? "justify-center" : "gap-2.5 flex-1 text-left"
              }`}
              title={user.email}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || user.email}
                  className="w-7 h-7 rounded-md object-cover border border-[#30363D] shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-md bg-[#1F6FEB]/20 border border-[#1F6FEB]/40 text-[#58A6FF] text-xs font-mono font-bold flex items-center justify-center shrink-0">
                  {(user.full_name || user.email)[0].toUpperCase()}
                </div>
              )}
              {!collapsed && (
                <div className="truncate flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-[#F0F6FC] truncate">
                      {user.full_name || user.email.split("@")[0]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {isAdmin ? (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#A371F7]/20 text-[#D2A8FF] border border-[#A371F7]/30">
                        Admin
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#1F6FEB]/20 text-[#58A6FF] border border-[#1F6FEB]/30">
                        Engineer
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-[#8B949E] truncate">
                      {user.email}
                    </span>
                  </div>
                </div>
              )}
            </button>

            {!collapsed && (
              <button
                type="button"
                onClick={logout}
                title="Sign Out"
                className="p-1.5 rounded text-[#8B949E] hover:text-[#F85149] hover:bg-[#21262D] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {accountMenuOpen && (
            <div className="absolute bottom-full left-2 mb-1.5 w-60 bg-[#161B22] border border-[#30363D] rounded-lg shadow-2xl py-1.5 z-50 text-xs">
              <div className="px-3 py-1.5 border-b border-[#30363D]">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[#F0F6FC] truncate">{user.full_name || "Developer"}</p>
                  {isAdmin ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#A371F7]/20 text-[#D2A8FF] border border-[#A371F7]/30">
                      Admin
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1F6FEB]/20 text-[#58A6FF] border border-[#1F6FEB]/30">
                      Engineer
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#8B949E] truncate font-mono mt-0.5">{user.email}</p>
              </div>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setAccountMenuOpen(false)}
                  className="block px-3 py-1.5 text-[#D2A8FF] hover:bg-[#21262D] font-medium flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-[#A371F7]" /> Admin Console
                </Link>
              )}
              <Link
                href="/settings"
                onClick={() => setAccountMenuOpen(false)}
                className="block px-3 py-1.5 text-[#C9D1D9] hover:bg-[#21262D] hover:text-white"
              >
                Workspace &amp; Account Settings
              </Link>
              <Link
                href="/github"
                onClick={() => setAccountMenuOpen(false)}
                className="block px-3 py-1.5 text-[#C9D1D9] hover:bg-[#21262D] hover:text-white"
              >
                GitHub App Scope
              </Link>
              <Link
                href="/onboarding"
                onClick={() => setAccountMenuOpen(false)}
                className="block px-3 py-1.5 text-[#58A6FF] hover:bg-[#21262D]"
              >
                Onboarding Checklist
              </Link>
              <div className="border-t border-[#30363D] mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-1.5 text-[#F85149] hover:bg-[#DA3633]/15"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Command HUD */}
        <header className="h-14 lg:mt-2 lg:mx-2.5 lg:rounded-xl border-b lg:border border-[#30363D] bg-[#0D1117]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 sticky top-0 lg:top-2 z-30 shadow-md">
          {/* Left: Mobile toggle + Desktop expand toggle (when collapsed) + Breadcrumbs */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#161B22]"
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>

            {collapsed && (
              <button
                type="button"
                onClick={toggleCollapse}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                className="hidden lg:flex p-1.5 rounded-md text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#161B22] transition-colors shrink-0"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2 text-xs min-w-0">
              <span className="text-[#8B949E] hidden sm:inline truncate max-w-[160px]">
                {activeProject ? activeProject.name : "Workspace"}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#6E7681] hidden sm:inline shrink-0" />
              <span className="font-semibold text-[#F0F6FC] truncate">{currentTitle}</span>
              {isAdmin ? (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#A371F7]/15 text-[#D2A8FF] border border-[#A371F7]/30">
                  <ShieldAlert className="w-3 h-3 text-[#A371F7]" /> Admin
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#1F6FEB]/15 text-[#58A6FF] border border-[#1F6FEB]/30">
                  <Shield className="w-3 h-3 text-[#58A6FF]" /> Engineer
                </span>
              )}
              {activeProject?.default_branch && (
                <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#161B22] border border-[#30363D] text-[11px] font-mono text-[#8B949E]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F6FEB]" />
                  {activeProject.default_branch}
                </span>
              )}

              {/* Universal GitHub Connection Status Indicator */}
              {githubStatus?.is_connected ? (
                <Link
                  href="/github"
                  title={`GitHub App connected as @${githubStatus.github_username || 'account'}`}
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#238636]/15 hover:bg-[#238636]/25 border border-[#238636]/35 text-[11px] font-mono text-[#3FB950] transition-colors group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3FB950] animate-pulse" />
                  <Github className="w-3.5 h-3.5 text-[#58A6FF] group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-[#F0F6FC] truncate max-w-[120px]">
                    @{githubStatus.github_username || "connected"}
                  </span>
                  <span className="text-[#8B949E]">
                    ({githubStatus.repository_count || 35} repos)
                  </span>
                </Link>
              ) : (
                <Link
                  href="/github"
                  title="Connect GitHub App"
                  className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[11px] font-mono text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
                >
                  <Github className="w-3.5 h-3.5 text-[#8B949E]" />
                  <span>Connect GitHub</span>
                </Link>
              )}
            </div>
          </div>

          {/* Right: Search Command Bar & Primary Action */}
          <div className="flex items-center gap-3">
            {/* Command Palette Trigger (Ctrl+K / ⌘K) */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="h-8 px-3 rounded-lg bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] text-xs text-[#8B949E] hover:text-[#F0F6FC] flex items-center gap-2.5 transition-all shadow-sm"
            >
              <Search className="w-3.5 h-3.5 text-[#58A6FF]" />
              <span className="hidden sm:inline font-mono text-[11px]">Search commands...</span>
              <kbd className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#21262D] text-[#8B949E] border border-[#30363D]">
                ⌘K
              </kbd>
            </button>

            {/* Notifications Dropdown */}
            <NotificationCenter />

            {/* Quick Switch to AI Engineer Studio */}
            <Link
              href="/engineer"
              className="h-8 px-3 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 hover:opacity-90 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
              title="Launch AI Engineer Studio"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Engineer Studio</span>
            </Link>

            {/* Return to Environment Selector Gateway */}
            <Link
              href="/dashboard"
              className="h-8 px-2.5 rounded-lg bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] text-xs text-[#8B949E] hover:text-white flex items-center gap-1.5 transition"
              title="Switch Environment Gateway"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#58A6FF]" />
              <span className="hidden sm:inline">Switch Studio</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 sm:p-7 overflow-y-auto max-w-[1460px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Command Palette (Ctrl+K / ⌘K) */}
      <CommandPalette
        isOpen={commandPaletteOpen || searchOpen}
        onClose={() => {
          setCommandPaletteOpen(false);
          setSearchOpen(false);
        }}
      />

      {/* Floating In-App Toast Notifications */}
      <ToastContainer />
    </div>
    </NotificationProvider>
  );
}
