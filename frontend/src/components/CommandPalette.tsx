"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { isUserAdminEmail } from "@/lib/types";
import {
  Search,
  Terminal,
  Bot,
  LayoutDashboard,
  ShieldAlert,
  Users,
  KeyRound,
  FileText,
  FolderGit2,
  FolderTree,
  ListTodo,
  GitPullRequest,
  GitBranch,
  Brain,
  Github,
  Sliders,
  Settings,
  Sparkles,
  Zap,
  ArrowRight,
  Shield,
  Layers,
  X,
  Cpu,
} from "lucide-react";

interface CommandItem {
  id: string;
  category: "ACTIONS" | "PAGES" | "ADMINISTRATION";
  title: string;
  subtitle?: string;
  icon: any;
  badge?: string;
  action: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isAdmin = isUserAdminEmail(user);

  const items: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // Quick Actions
      {
        id: "action-new-task",
        category: "ACTIONS",
        title: "Create Engineering Task",
        subtitle: "Launch autonomous plan & sandbox execution",
        icon: Bot,
        badge: "AI ENGINE",
        action: () => {
          router.push("/engineer");
          onClose();
        },
      },
      {
        id: "action-connect-github",
        category: "ACTIONS",
        title: "Connect GitHub Repository",
        subtitle: "Manage repository access and GitHub App integration",
        icon: Github,
        badge: "GITHUB",
        action: () => {
          router.push("/github");
          onClose();
        },
      },
      {
        id: "action-configure-providers",
        category: "ACTIONS",
        title: "Configure AI Provider",
        subtitle: "Setup OpenAI, Groq, Ollama, DeepSeek or OpenRouter API",
        icon: Sliders,
        badge: "MODELS",
        action: () => {
          router.push("/settings/providers");
          onClose();
        },
      },
      {
        id: "action-train-model",
        category: "ACTIONS",
        title: "Launch Model Fine-Tuning Run",
        subtitle: "Configure QLoRA/LoRA adaptation on custom codebase",
        icon: Cpu,
        badge: "AI ENGINE",
        action: () => {
          router.push("/model-factory");
          onClose();
        },
      },

      // Core Pages
      {
        id: "nav-overview",
        category: "PAGES",
        title: "Workspace Overview",
        subtitle: "Dashboard metrics, recent tasks and telemetry",
        icon: LayoutDashboard,
        action: () => {
          router.push("/dashboard");
          onClose();
        },
      },
      {
        id: "nav-engineer",
        category: "PAGES",
        title: "AI Software Engineer Studio",
        subtitle: "Natural language autonomous coding workspace",
        icon: Bot,
        action: () => {
          router.push("/engineer");
          onClose();
        },
      },
      {
        id: "nav-tasks",
        category: "PAGES",
        title: "Task Queue & Execution History",
        subtitle: "Track live and completed autonomous agents",
        icon: ListTodo,
        action: () => {
          router.push("/tasks");
          onClose();
        },
      },
      {
        id: "nav-reviews",
        category: "PAGES",
        title: "Unified Git Diff Reviews",
        subtitle: "Inspect code modifications and approval gates",
        icon: GitPullRequest,
        action: () => {
          router.push("/reviews");
          onClose();
        },
      },
      {
        id: "nav-pipelines",
        category: "PAGES",
        title: "CI/CD Pipelines & Test Automation",
        subtitle: "Multi-stage automated test and code verification",
        icon: GitBranch,
        badge: "CI/CD",
        action: () => {
          router.push("/pipelines");
          onClose();
        },
      },
      {
        id: "nav-memory",
        category: "PAGES",
        title: "Persistent Engineering Memory",
        subtitle: "Architectural decisions (ADRs) and bug learnings",
        icon: Brain,
        action: () => {
          router.push("/memory");
          onClose();
        },
      },
      {
        id: "nav-model-factory",
        category: "PAGES",
        title: "Model Factory & Fine-Tuning Studio",
        subtitle: "Train, evaluate & deploy custom domain code models",
        icon: Cpu,
        action: () => {
          router.push("/model-factory");
          onClose();
        },
      },
      {
        id: "nav-repository",
        category: "PAGES",
        title: "VS Code Repository & Explorer",
        subtitle: "Multi-tab code editor, Git working tree diffs & AI Copilot",
        icon: FolderTree,
        badge: "IDE",
        action: () => {
          const saved = typeof window !== "undefined" ? localStorage.getItem("jgitlab_active_repo") : null;
          router.push(saved ? `/repository?repo=${encodeURIComponent(saved)}` : "/repository");
          onClose();
        },
      },
      {
        id: "nav-github",
        category: "PAGES",
        title: "GitHub App & Repositories",
        subtitle: "Scoped repository installation & synchronization",
        icon: Github,
        action: () => {
          router.push("/github");
          onClose();
        },
      },
      {
        id: "nav-providers",
        category: "PAGES",
        title: "AI Providers Configuration",
        subtitle: "Gemini, OpenAI, Anthropic, Ollama, DeepSeek",
        icon: Sliders,
        action: () => {
          router.push("/settings/providers");
          onClose();
        },
      },
      {
        id: "nav-settings",
        category: "PAGES",
        title: "Account Security & Credentials",
        subtitle: "Linked identities, password and personal sessions",
        icon: Settings,
        action: () => {
          router.push("/settings/account");
          onClose();
        },
      },
      {
        id: "nav-onboarding",
        category: "PAGES",
        title: "Guided Setup & Onboarding",
        subtitle: "Interactive checklist to configure workspace and providers",
        icon: Sparkles,
        badge: "SETUP",
        action: () => {
          router.push("/onboarding");
          onClose();
        },
      },
      {
        id: "nav-help",
        category: "PAGES",
        title: "Documentation & Setup Guides",
        subtitle: "Google OAuth, GitHub OAuth, and GitHub App configuration",
        icon: Terminal,
        badge: "DOCS",
        action: () => {
          router.push("/help");
          onClose();
        },
      },
    ];

    // Admin routes
    if (isAdmin) {
      list.push(
        {
          id: "admin-console",
          category: "ADMINISTRATION",
          title: "Admin Console & Telemetry",
          subtitle: "System health, Node.js memory, operational gauges",
          icon: ShieldAlert,
          badge: "ADMIN",
          action: () => {
            router.push("/admin");
            onClose();
          },
        },
        {
          id: "admin-users",
          category: "ADMINISTRATION",
          title: "User Management & Provisioning",
          subtitle: "Create accounts, toggle roles and suspend users",
          icon: Users,
          badge: "ADMIN",
          action: () => {
            router.push("/admin/users");
            onClose();
          },
        },
        {
          id: "admin-sessions",
          category: "ADMINISTRATION",
          title: "Live Active Sessions",
          subtitle: "Inspect bearer tokens and invalidate sessions",
          icon: KeyRound,
          badge: "ADMIN",
          action: () => {
            router.push("/admin/sessions");
            onClose();
          },
        },
        {
          id: "admin-audit",
          category: "ADMINISTRATION",
          title: "Global Audit Trail",
          subtitle: "Chronological security and administrative log",
          icon: FileText,
          badge: "ADMIN",
          action: () => {
            router.push("/admin/audit-logs");
            onClose();
          },
        }
      );
    }

    return list;
  }, [isAdmin, router, onClose]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  // Group filtered items
  const categories = Array.from(new Set(filtered.map((i) => i.category)));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#0F1424] border border-[#6366F1]/30 rounded-2xl shadow-[0_0_50px_-10px_rgba(99,102,241,0.25)] overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#0B0F19]">
          <Search className="w-5 h-5 text-[#818CF8] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, jump to a page, or search actions..."
            className="w-full bg-transparent text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none font-mono"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-[#94A3B8]">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 rounded text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#94A3B8] font-mono">
              No matching commands or missions found for &quot;{query}&quot;.
            </div>
          ) : (
            categories.map((cat) => {
              const catItems = filtered.filter((i) => i.category === cat);
              return (
                <div key={cat} className="space-y-1">
                  <div className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#6366F1] font-semibold">
                    {cat}
                  </div>
                  {catItems.map((item) => {
                    const globalIdx = filtered.indexOf(item);
                    const isSelected = globalIdx === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all ${
                          isSelected
                            ? "bg-[#6366F1]/18 border border-[#6366F1]/40 text-[#F8FAFC] shadow-sm translate-x-1"
                            : "hover:bg-white/5 border border-transparent text-[#CBD5E1]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-[#6366F1] text-white shadow-[0_0_12px_rgba(99,102,241,0.6)]"
                                : "bg-white/5 text-[#94A3B8]"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <span className="text-xs font-semibold block truncate">
                              {item.title}
                            </span>
                            {item.subtitle && (
                              <span className="text-[11px] text-[#94A3B8] block truncate font-mono mt-0.5">
                                {item.subtitle}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                item.badge === "AI ENGINE" || item.badge === "MODELS"
                                  ? "bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/40"
                                  : item.badge === "ADMIN"
                                  ? "bg-[#A855F7]/20 text-[#D8B4FE] border border-[#A855F7]/40"
                                  : "bg-white/5 text-[#94A3B8] border border-white/10"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          <ArrowRight
                            className={`w-3.5 h-3.5 transition-transform ${
                              isSelected ? "text-[#818CF8] translate-x-0.5" : "text-transparent"
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 border-t border-white/10 bg-[#0B0F19] flex items-center justify-between text-[11px] text-[#94A3B8] font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>esc to close</span>
          </div>
          <span className="text-[#818CF8]">JGitLab Command Center</span>
        </div>
      </div>
    </div>
  );
}
