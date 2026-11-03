"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { ActivityLog } from "@/lib/types";
import {
  LayoutDashboard,
  Bot,
  FolderGit2,
  FolderTree,
  ListTodo,
  GitPullRequest,
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
} from "lucide-react";
import {
  JGitLabLogoMark,
  JGitLabSplashLoader,
  JGitLabWordmark,
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
    group: "WORKSPACE",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Projects", href: "/projects", icon: FolderGit2 },
      { label: "AI Engineer", href: "/engineer", icon: Bot, highlight: true },
      { label: "Engineering Memory", href: "/memory", icon: Brain },
    ],
  },
  {
    group: "DEVELOPMENT",
    items: [
      { label: "Repositories", href: "/repository", icon: FolderTree },
      { label: "Tasks", href: "/tasks", icon: ListTodo },
      { label: "Code Reviews", href: "/reviews", icon: GitPullRequest },
    ],
  },
  {
    group: "INTEGRATIONS",
    items: [
      { label: "GitHub", href: "/github", icon: Github },
      { label: "AI Providers", href: "/settings/providers", icon: Sliders },
    ],
  },
  {
    group: "FUTURE PRODUCTS",
    items: [
      { label: "Model Factory", href: "/model-factory", icon: Layers, badge: "Soon" },
    ],
  },
  {
    group: "SYSTEM",
    items: [
      { label: "Activity", href: "/activity", icon: History },
      { label: "Settings", href: "/settings/account", icon: Settings },
      { label: "Help", href: "/help", icon: HelpCircle },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

const BREADCRUMB_LABELS: Record<string, string> = {
  "/dashboard": "Overview",
  "/projects": "Projects",
  "/engineer": "AI Software Engineer",
  "/memory": "Engineering Memory",
  "/repository": "Repositories",
  "/tasks": "Agent Tasks",
  "/reviews": "Code Reviews",
  "/github": "GitHub Integration",
  "/settings/providers": "AI Providers",
  "/model-factory": "Model Factory",
  "/activity": "Activity Logs",
  "/settings/account": "Account Settings",
  "/help": "Help & Documentation",
  "/onboarding": "Workspace Onboarding",
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshingWorkspace, setIsRefreshingWorkspace] = useState(false);

  const [providerConfigured, setProviderConfigured] = useState<boolean | null>(null);
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setAccountMenuOpen(false);
        setProjectDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
      setGithubConnected(gh.is_connected);
    } catch {
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

  const filteredSearchItems = ALL_NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen bg-transparent text-[#F8FAFC] flex">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Floating Cosmic Studio Sidebar Dock */}
      <aside
        className={`fixed lg:sticky lg:top-2.5 lg:my-2.5 lg:ml-2.5 lg:h-[calc(100vh-20px)] lg:rounded-2xl inset-y-0 left-0 z-50 bg-[#070B18]/92 backdrop-blur-2xl border-r lg:border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col justify-between shrink-0 transition-all duration-200 overflow-visible ${
          collapsed ? "w-[72px]" : "w-[264px]"
        } ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Top Infinity Gradient Accent Bar */}
        <div className="h-[2px] w-full bg-gradient-to-r from-cyan-400 via-violet-500 to-orange-500 rounded-t-2xl shrink-0" />

        <div className="flex flex-col min-h-0 flex-1">
          {/* Top Brand + Collapse Control */}
          <div
            className={`h-16 border-b border-white/[0.07] flex items-center shrink-0 ${
              collapsed ? "justify-center px-2" : "justify-between px-3.5"
            }`}
          >
            {collapsed ? (
              <button
                type="button"
                onClick={toggleCollapse}
                aria-label="Expand sidebar"
                title="Expand JGitLab Studio"
                className="group relative w-10 h-10 rounded-xl overflow-hidden bg-[#10172E] border border-cyan-400/40 flex items-center justify-center shadow-[0_0_18px_rgba(6,182,212,0.3)] transition-all"
              >
                <img
                  src="/jgitlab-logo.jpg"
                  alt="JGitLab"
                  className="w-full h-full object-cover group-hover:opacity-20 transition-opacity"
                />
                <PanelLeftOpen className="w-4 h-4 hidden group-hover:block text-cyan-200 absolute" />
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
                    className={
                      isRefreshingWorkspace
                        ? "animate-spin"
                        : "group-hover:scale-105 transition-transform"
                    }
                  />
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <JGitLabWordmark size="md" showBrackets={false} />
                      <RefreshCw
                        className={`w-3 h-3 text-gray-500 group-hover:text-cyan-400 transition-colors ${
                          isRefreshingWorkspace ? "animate-spin text-cyan-400" : ""
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-cyan-400/80 font-mono tracking-widest block">
                      &lt;AI STUDIO OS /&gt;
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={toggleCollapse}
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                  className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Workspace / Project Switcher */}
          <div className="p-2.5 border-b border-white/[0.06] relative shrink-0">
            <button
              type="button"
              onClick={() => setProjectDropdownOpen((v) => !v)}
              className={`w-full rounded-md bg-[#0E131D] hover:bg-[#131A28] border border-white/[0.07] flex items-center justify-between text-left text-xs text-white transition-colors ${
                collapsed ? "p-2 justify-center" : "px-2.5 py-2"
              }`}
              title={activeProject ? `Active Project: ${activeProject.name}` : "Select Project"}
            >
              {collapsed ? (
                <FolderGit2 className="w-4 h-4 text-violet-400" />
              ) : (
                <>
                  <div className="truncate pr-2">
                    <span className="text-[10px] text-gray-500 uppercase font-mono block">
                      Workspace Project
                    </span>
                    <span className="font-medium truncate block text-gray-200 mt-0.5">
                      {activeProject ? activeProject.name : "Select Project"}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                </>
              )}
            </button>

            {projectDropdownOpen && (
              <div className="absolute top-full left-2.5 right-2.5 mt-1 w-60 bg-[#0E131D] border border-white/[0.1] rounded-md shadow-2xl py-1 z-50 max-h-64 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-gray-500">
                  Switch Active Project
                </div>
                {projects.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-500">No projects yet</div>
                ) : (
                  projects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setActiveProject(p);
                        setProjectDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-white/[0.04] transition-colors ${
                        activeProject?.id === p.id
                          ? "text-violet-300 font-medium bg-violet-500/[0.08]"
                          : "text-gray-300"
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      {activeProject?.id === p.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      )}
                    </button>
                  ))
                )}
                <div className="border-t border-white/[0.06] mt-1 pt-1">
                  <Link
                    href="/projects"
                    onClick={() => setProjectDropdownOpen(false)}
                    className="w-full text-left px-3 py-1.5 text-xs text-violet-400 hover:bg-white/[0.04] flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Manage Projects
                  </Link>
                  <Link
                    href="/onboarding"
                    onClick={() => setProjectDropdownOpen(false)}
                    className="w-full text-left px-3 py-1.5 text-xs text-cyan-400 hover:bg-white/[0.04] flex items-center gap-1.5"
                  >
                    <Compass className="w-3.5 h-3.5" /> Guided Setup
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Grouped Navigation */}
          <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.group}>
                {!collapsed && (
                  <div className="px-2.5 mb-1.5 text-[10px] font-mono uppercase tracking-wider text-gray-500">
                    {group.group}
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        title={collapsed ? item.label : undefined}
                        className={`relative flex items-center justify-between rounded-xl text-xs font-medium transition-all ${
                          collapsed ? "p-2.5 justify-center" : "px-3 py-2"
                        } ${
                          isActive
                            ? "bg-gradient-to-r from-cyan-500/[0.15] via-violet-500/[0.14] to-orange-500/[0.08] text-white border border-cyan-400/30 shadow-[0_0_20px_rgba(139,92,246,0.18)]"
                            : "text-gray-400 hover:text-white hover:bg-white/[0.05] border border-transparent"
                        }`}
                      >
                        {isActive && !collapsed && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gradient-to-b from-cyan-400 via-violet-500 to-orange-500" />
                        )}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? "text-cyan-400" : "text-gray-400"
                            }`}
                          />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </div>
                        {!collapsed && item.badge && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30">
                            {item.badge}
                          </span>
                        )}
                        {!collapsed && item.highlight && !item.badge && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
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
        <div className="p-2.5 border-t border-white/[0.06] bg-[#080B11] relative shrink-0">
          <div
            className={`flex items-center rounded-md bg-[#0E131D] border border-white/[0.06] ${
              collapsed ? "justify-center p-1.5" : "justify-between gap-2 p-2"
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
                  className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-200 text-xs font-mono font-semibold flex items-center justify-center shrink-0">
                  {(user.full_name || user.email)[0].toUpperCase()}
                </div>
              )}
              {!collapsed && (
                <div className="truncate">
                  <span className="text-xs font-medium text-gray-200 block truncate">
                    {user.full_name || user.email.split("@")[0]}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500 truncate block">
                    {user.email}
                  </span>
                </div>
              )}
            </button>

            {!collapsed && (
              <button
                type="button"
                onClick={logout}
                title="Sign Out"
                className="p-1.5 rounded hover:bg-white/[0.06] text-gray-500 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {accountMenuOpen && (
            <div className="absolute bottom-full left-2.5 mb-1.5 w-60 bg-[#0E131D] border border-white/[0.1] rounded-md shadow-2xl py-1.5 z-50 text-xs">
              <div className="px-3 py-1.5 border-b border-white/[0.06]">
                <p className="font-medium text-white truncate">{user.full_name || "Engineer"}</p>
                <p className="text-[11px] text-gray-500 truncate font-mono">{user.email}</p>
              </div>
              <Link
                href="/settings/account"
                onClick={() => setAccountMenuOpen(false)}
                className="block px-3 py-1.5 text-gray-300 hover:bg-white/[0.05] hover:text-white"
              >
                Account &amp; Security Settings
              </Link>
              <Link
                href="/github"
                onClick={() => setAccountMenuOpen(false)}
                className="block px-3 py-1.5 text-gray-300 hover:bg-white/[0.05] hover:text-white"
              >
                GitHub App Installations
              </Link>
              <Link
                href="/onboarding"
                onClick={() => setAccountMenuOpen(false)}
                className="block px-3 py-1.5 text-cyan-400 hover:bg-white/[0.05]"
              >
                Onboarding Checklist
              </Link>
              <div className="border-t border-white/[0.06] mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-red-500/10"
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
        {/* Floating Studio Top Command HUD */}
        <header className="h-16 lg:mt-2.5 lg:mx-3 lg:rounded-2xl border-b lg:border border-white/[0.09] bg-[#070B18]/85 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 sticky top-0 lg:top-2.5 z-30 shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
          {/* Left: Mobile toggle + Desktop expand toggle (when collapsed) + Breadcrumbs */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/[0.05]"
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
                className="hidden lg:flex p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors shrink-0"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2 text-xs min-w-0">
              <span className="text-gray-500 hidden sm:inline truncate max-w-[160px]">
                {activeProject ? activeProject.name : "Workspace"}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-600 hidden sm:inline shrink-0" />
              <span className="font-medium text-white truncate">{currentTitle}</span>
              {activeProject?.default_branch && (
                <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.07] text-[11px] font-mono text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  {activeProject.default_branch}
                </span>
              )}
            </div>
          </div>

          {/* Right: Global Search, Refresh Button, Connection Pills, Notifications, Primary CTA */}
          <div className="flex items-center gap-2.5">
            {/* JGitLab Workspace Refresh Button */}
            <button
              type="button"
              onClick={handleJGitLabRefresh}
              disabled={isRefreshingWorkspace}
              title="Refresh JGitLab Workspace"
              className="h-8 px-2.5 rounded-md bg-[#0E131D] hover:bg-[#141B29] border border-white/[0.08] text-xs text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-cyan-400 ${
                  isRefreshingWorkspace ? "animate-spin" : ""
                }`}
              />
              <span className="hidden md:inline font-mono text-[11px]">Refresh</span>
            </button>

            {/* Global Search Trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="h-8 px-2.5 rounded-md bg-[#0E131D] hover:bg-[#141B29] border border-white/[0.08] text-xs text-gray-400 flex items-center gap-2.5 transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-gray-500" />
              <span className="hidden sm:inline">Search workspace...</span>
              <kbd className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-400 border border-white/[0.06]">
                ⌘K
              </kbd>
            </button>

            {/* AI Provider Status Pill */}
            <Link
              href="/settings/providers"
              className={`hidden xl:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-mono border transition-colors ${
                providerConfigured
                  ? "bg-emerald-500/[0.07] text-emerald-300 border-emerald-500/25"
                  : "bg-amber-500/[0.07] text-amber-300 border-amber-500/25"
              }`}
            >
              {providerConfigured ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AI API Ready</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Set AI Key</span>
                </>
              )}
            </Link>

            {/* GitHub App Status Pill */}
            <Link
              href="/github"
              className={`hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-mono border transition-colors ${
                githubConnected
                  ? "bg-cyan-500/[0.08] text-cyan-300 border-cyan-500/25"
                  : "bg-[#0E131D] text-gray-400 border-white/[0.08] hover:text-white"
              }`}
            >
              <Github className="w-3.5 h-3.5" />
              <span>{githubConnected ? "GitHub Active" : "Install GitHub App"}</span>
            </Link>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((v) => !v)}
                aria-label="Recent workspace notifications"
                className="h-8 w-8 rounded-md bg-[#0E131D] hover:bg-[#141B29] border border-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white transition-colors relative"
              >
                <Bell className="w-3.5 h-3.5" />
                {recentActivity.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-400" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-1.5 w-80 bg-[#0E131D] border border-white/[0.1] rounded-md shadow-2xl py-2 z-50">
                  <div className="px-3 py-1.5 border-b border-white/[0.06] flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Recent Activity</span>
                    <Link
                      href="/activity"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[11px] text-violet-400 hover:text-violet-300"
                    >
                      View all
                    </Link>
                  </div>
                  {recentActivity.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-gray-500">
                      No recent workspace events recorded yet.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.05]">
                      {recentActivity.map((log) => (
                        <div key={log.id} className="px-3 py-2.5 text-xs">
                          <p className="text-gray-200 leading-snug">{log.description}</p>
                          <span className="text-[10px] font-mono text-gray-500 mt-1 block">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Primary Action */}
            <Link
              href="/engineer"
              className="h-9 px-3.5 rounded-xl jgitlab-btn-glow text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Start AI Task</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 sm:p-7 overflow-y-auto max-w-[1460px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Search Command Palette Modal (⌘K) */}
      {searchOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#0D111A] border border-white/[0.12] rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3.5 py-3 border-b border-white/[0.08] flex items-center gap-2.5">
              <Search className="w-4 h-4 text-violet-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Jump to workspace page, project, or integration..."
                className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-400"
              >
                ESC
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-3">
              <div>
                <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-gray-500">
                  Navigation
                </div>
                {filteredSearchItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery("");
                        router.push(item.href);
                      }}
                      className="w-full px-2.5 py-2 rounded-md text-xs text-gray-200 hover:bg-violet-500/15 hover:text-white flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-3.5 h-3.5 text-violet-400" />
                        {item.label}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">{item.href}</span>
                    </button>
                  );
                })}
              </div>

              {filteredProjects.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-gray-500">
                    Switch Active Project
                  </div>
                  {filteredProjects.map((proj) => (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => {
                        setActiveProject(proj);
                        setSearchOpen(false);
                        setSearchQuery("");
                        router.push("/dashboard");
                      }}
                      className="w-full px-2.5 py-2 rounded-md text-xs text-gray-200 hover:bg-cyan-500/15 hover:text-white flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
                        {proj.name}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">
                        {proj.default_branch}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
