"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  ProjectFileTreeItem,
  GitWorkingChange,
  AIAgentChatResponse,
  RepoAnalysis,
  GitHubRepoSummary,
} from "@/lib/types";
import {
  FolderTree,
  FolderGit2,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  File,
  FilePlus,
  FolderPlus,
  GitBranch,
  GitMerge,
  GitCommit,
  Sparkles,
  Bot,
  Send,
  Check,
  CheckCircle2,
  Copy,
  Save,
  RotateCcw,
  Play,
  Terminal as TerminalIcon,
  Search,
  Settings,
  X,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  Columns,
  AlignJustify,
  Layers,
  Shield,
  Cpu,
  AlertTriangle,
  Github,
  Maximize2,
  Minimize2,
  PanelBottom,
  PanelLeft,
  RefreshCw,
  Code2,
} from "lucide-react";
import { JGitLabRefreshIcon } from "@/components/brand/JGitLabBrand";
import { VSCodeFolderIcon, VSCodeFileIcon } from "@/components/vscode/VSCodeIcons";
import { VSCodeSyntaxHighlighter, VSCodeDiffViewer, highlightLine } from "@/components/vscode/VSCodeSyntaxHighlighter";

type ActivityTab = "explorer" | "changes" | "ai" | "search" | "analysis";
type EditorMode = "syntax" | "editor" | "split-diff" | "unified-diff";
type BottomTab = "terminal" | "git" | "ai-trace" | "problems";

interface OpenFile {
  path: string;
  name: string;
  content: string;
  originalContent: string;
  isModified: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  code?: string;
  diff?: string;
  model?: string;
  tokens?: number;
  latency?: number;
  timestamp: string;
}

function RepositoryExplorerContent() {
  const { activeProject, setActiveProject, projects } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const repoParam = searchParams.get("repo");

  // Layout states
  const [activeActivityTab, setActiveActivityTab] = useState<ActivityTab>("explorer");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>("terminal");
  const [editorMode, setEditorMode] = useState<EditorMode>("syntax");

  // GitHub Repositories selector state with localStorage persistence
  const [gitHubRepos, setGitHubRepos] = useState<GitHubRepoSummary[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlRepo = sp.get("repo");
      if (urlRepo) return urlRepo;
      const stored = localStorage.getItem("jgitlab_active_repo");
      if (stored) return stored;
    }
    return repoParam || null;
  });
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [repoFilter, setRepoFilter] = useState("");
  const [loadingRepos, setLoadingRepos] = useState(false);

  // Repository & files state
  const [branch, setBranch] = useState("main");
  const [treeItems, setTreeItems] = useState<ProjectFileTreeItem[]>([]);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loadingTree, setLoadingTree] = useState(true);
  const [loadingFile, setLoadingFile] = useState(false);
  const [isRepoEmpty, setIsRepoEmpty] = useState(false);
  const [treeFilter, setTreeFilter] = useState("");
  const [isCreatingNewFile, setIsCreatingNewFile] = useState(false);
  const [newFilePathInput, setNewFilePathInput] = useState("");

  // Sync selectedRepo with repoParam when URL changes
  useEffect(() => {
    if (repoParam) {
      setSelectedRepo(repoParam);
      if (typeof window !== "undefined") {
        localStorage.setItem("jgitlab_active_repo", repoParam);
      }
    }
  }, [repoParam]);

  // Load connected GitHub repositories & keep user's active repo
  useEffect(() => {
    let isMounted = true;
    setLoadingRepos(true);
    api
      .getGitHubRepos()
      .then((repos) => {
        if (!isMounted) return;
        setGitHubRepos(repos || []);
        if (repos && repos.length > 0) {
          const stored = typeof window !== "undefined" ? localStorage.getItem("jgitlab_active_repo") : null;
          const target = repoParam || selectedRepo || stored;

          if (target) {
            const found = repos.find(
              (r) =>
                r.full_name.toLowerCase() === target.toLowerCase() ||
                r.name.toLowerCase() === target.toLowerCase()
            );
            if (found) {
              setSelectedRepo(found.full_name);
              setBranch(found.default_branch || "main");
              if (typeof window !== "undefined") {
                localStorage.setItem("jgitlab_active_repo", found.full_name);
              }
              return;
            }
          }

          // If no target or not matched, prefer web-shop if present or first repo
          const preferred = repos.find((r) => r.name.toLowerCase().includes("web-shop")) || repos[0];
          setSelectedRepo(preferred.full_name);
          setBranch(preferred.default_branch || "main");
          if (typeof window !== "undefined") {
            localStorage.setItem("jgitlab_active_repo", preferred.full_name);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load GitHub repos", err);
      })
      .finally(() => {
        if (isMounted) setLoadingRepos(false);
      });
    return () => {
      isMounted = false;
    };
  }, [repoParam]);

  const repoDisplayName = useMemo(() => {
    if (selectedRepo) {
      return selectedRepo.split("/").pop() || selectedRepo;
    }
    return activeProject?.name || "workspace-repo";
  }, [selectedRepo, activeProject]);

  const repoOwnerName = useMemo(() => {
    if (selectedRepo && selectedRepo.includes("/")) {
      return selectedRepo.split("/")[0];
    }
    return "GitHub";
  }, [selectedRepo]);

  const handleSelectRepo = (repo: GitHubRepoSummary) => {
    setSelectedRepo(repo.full_name);
    setBranch(repo.default_branch || "main");
    setRepoDropdownOpen(false);
    setOpenFiles([]);
    setActiveFilePath(null);
    setTreeItems([]);
    setWorkingChanges([]);
    initialFileOpenedRef.current = null;

    if (typeof window !== "undefined") {
      localStorage.setItem("jgitlab_active_repo", repo.full_name);

      // Restore saved expanded folders for this repo if available
      try {
        const savedFolders = localStorage.getItem(`jgitlab_expanded_${repo.full_name}`);
        if (savedFolders) {
          const parsed = JSON.parse(savedFolders);
          if (Array.isArray(parsed)) {
            setExpandedFolders(new Set(parsed));
          }
        }
      } catch {}

      // Keep router query param in sync
      router.replace(`/repository?repo=${encodeURIComponent(repo.full_name)}`);
    }

    // Keep activeProject in sync with selected repository
    if (projects && projects.length > 0) {
      const match = projects.find(
        (p) =>
          p.git_repo_url?.toLowerCase().includes(repo.full_name.toLowerCase()) ||
          p.name.toLowerCase() === repo.name.toLowerCase()
      );
      if (match && match.id !== activeProject?.id) {
        setActiveProject(match);
      }
    }

    setTerminalHistory((prev) => [
      ...prev,
      `[git] Switched to repository: ${repo.full_name} (branch: ${repo.default_branch || "main"})`,
    ]);
  };

  // Source Control / Changes state
  const [workingChanges, setWorkingChanges] = useState<GitWorkingChange[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);

  // AI Agent state
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "👋 **Hello! I am your JGitLab AI Pair Programmer.**\n\nI can inspect your repository code, refactor functions, write comprehensive unit tests, audit security vulnerabilities, and propose commits. Select a file and ask a question or click a quick command below!",
      model: "Gemini 2.5 Pro",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [aiPromptInput, setAiPromptInput] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSelectedMode, setAiSelectedMode] = useState<
    "custom" | "explain" | "review" | "refactor" | "tests" | "commit"
  >("custom");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Terminal state
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    "JGitLab Cloud Workspace v0.2.0 · VS Code Terminal Emulator",
    `Active repository: ${repoParam || "workspace-repo"} (branch: main)`,
    "Type 'git status', 'git diff', 'npm test', or 'help' to run commands.",
  ]);
  const [terminalInput, setTerminalInput] = useState("");

  // Analysis metadata
  const [analysis, setAnalysis] = useState<RepoAnalysis | null>(null);

  // Pending file load guards & single-open tracker
  const pendingFileLoads = useRef<Set<string>>(new Set());
  const initialFileOpenedRef = useRef<string | null>(null);

  // Status message
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  const activeFile = useMemo(() => {
    return openFiles.find((f) => f.path === activeFilePath) || null;
  }, [openFiles, activeFilePath]);

  const showNotification = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  // 1. Load Tree and Changes
  const loadRepositoryData = async () => {
    const projectId = activeProject?.id || "github";
    setLoadingTree(true);
    try {
      const [treeRes, changesRes, analysisRes] = await Promise.all([
        api.getProjectFileTree(projectId, branch, selectedRepo || undefined).catch(() => null),
        api.getWorkingTreeChanges(projectId, selectedRepo || undefined).catch(() => null),
        api.getRepoAnalysis(projectId, selectedRepo || undefined).catch(() => null),
      ]);

      if (treeRes) {
        if (treeRes.branch && treeRes.branch !== branch) {
          setBranch(treeRes.branch);
        }
        if (treeRes.is_empty) {
          setIsRepoEmpty(true);
          setTreeItems([]);
          setOpenFiles([]);
          setActiveFilePath(null);
        } else if (treeRes.tree) {
          setIsRepoEmpty(false);
          // Deduplicate treeRes.tree items by path
          const uniqueTree: ProjectFileTreeItem[] = [];
          const seenPaths = new Set<string>();
          for (const item of treeRes.tree) {
            if (!seenPaths.has(item.path)) {
              seenPaths.add(item.path);
              uniqueTree.push(item);
            }
          }
          setTreeItems(uniqueTree);

          // Restore saved expanded folders from localStorage if available, otherwise auto-expand top directories
          let restoredExpanded = false;
          if (typeof window !== "undefined" && selectedRepo) {
            try {
              const saved = localStorage.getItem(`jgitlab_expanded_${selectedRepo}`);
              if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setExpandedFolders(new Set(parsed));
                  restoredExpanded = true;
                }
              }
            } catch {}
          }

          if (!restoredExpanded) {
            const topFolders = new Set<string>();
            uniqueTree.forEach((t) => {
              const parts = t.path.split("/");
              if (parts.length > 1) {
                topFolders.add(parts[0]);
              }
            });
            if (topFolders.size > 0) {
              setExpandedFolders(topFolders);
              if (typeof window !== "undefined" && selectedRepo) {
                localStorage.setItem(`jgitlab_expanded_${selectedRepo}`, JSON.stringify(Array.from(topFolders)));
              }
            }
          }

          // Restore previously opened file from localStorage if exists
          let restoredFile: string | null = null;
          if (typeof window !== "undefined" && selectedRepo) {
            try {
              restoredFile = localStorage.getItem(`jgitlab_active_file_${selectedRepo}`);
            } catch {}
          }

          const projectKey = `${projectId}-${selectedRepo || "default"}-${treeRes.branch || branch}`;
          const defaultFile =
            (restoredFile && uniqueTree.find((t) => t.path === restoredFile)) ||
            uniqueTree.find((t) => t.path.toLowerCase() === "readme.md") ||
            uniqueTree.find((t) => t.path === "package.json") ||
            uniqueTree.find((t) => t.path === "src/App.tsx") ||
            uniqueTree.find((t) => t.type === "blob");
          if (defaultFile && initialFileOpenedRef.current !== projectKey) {
            initialFileOpenedRef.current = projectKey;
            openFileInEditor(defaultFile.path);
          }
        }
      }

      if (changesRes && changesRes.changes) {
        setWorkingChanges(changesRes.changes);
      }

      if (analysisRes) {
        setAnalysis(analysisRes);
      }
    } catch {
      showNotification("Failed to load repository files.");
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => {
    loadRepositoryData();
  }, [activeProject, selectedRepo, branch]);

  // 2. Open a file
  const openFileInEditor = async (filePath: string) => {
    if (pendingFileLoads.current.has(filePath)) {
      setActiveFilePath(filePath);
      return;
    }

    const existing = openFiles.find((f) => f.path === filePath);
    if (existing) {
      setActiveFilePath(filePath);
      return;
    }

    const projectId = activeProject?.id || "github";
    pendingFileLoads.current.add(filePath);
    setLoadingFile(true);
    try {
      const res = await api.getFileContent(
        projectId,
        filePath,
        branch,
        selectedRepo || undefined
      );
      const newFile: OpenFile = {
        path: filePath,
        name: filePath.split("/").pop() || filePath,
        content: res.content,
        originalContent: res.content,
        isModified: res.is_modified || false,
      };
      setOpenFiles((prev) => {
        if (prev.some((f) => f.path === filePath)) {
          return prev.map((f) => (f.path === filePath ? newFile : f));
        }
        return [...prev, newFile];
      });
      setActiveFilePath(filePath);
      if (typeof window !== "undefined" && selectedRepo) {
        localStorage.setItem(`jgitlab_active_file_${selectedRepo}`, filePath);
      }

      // Auto-expand all parent directories so file is revealed in tree
      const parts = filePath.split("/");
      if (parts.length > 1) {
        setExpandedFolders((prev) => {
          const next = new Set(prev);
          let cur = "";
          for (let i = 0; i < parts.length - 1; i++) {
            cur = cur ? `${cur}/${parts[i]}` : parts[i];
            next.add(cur);
          }
          if (typeof window !== "undefined" && selectedRepo) {
            localStorage.setItem(`jgitlab_expanded_${selectedRepo}`, JSON.stringify(Array.from(next)));
          }
          return next;
        });
      }
    } catch {
      showNotification(`Failed to load ${filePath}`);
    } finally {
      pendingFileLoads.current.delete(filePath);
      setLoadingFile(false);
    }
  };

  // 3. Close a file tab
  const closeFileTab = (filePath: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpenFiles((prev) => {
      const nextFiles = prev.filter((f) => f.path !== filePath);
      if (activeFilePath === filePath) {
        const nextActive = nextFiles.length > 0 ? nextFiles[nextFiles.length - 1].path : null;
        setActiveFilePath(nextActive);
        if (typeof window !== "undefined" && selectedRepo) {
          if (nextActive) {
            localStorage.setItem(`jgitlab_active_file_${selectedRepo}`, nextActive);
          } else {
            localStorage.removeItem(`jgitlab_active_file_${selectedRepo}`);
          }
        }
      }
      return nextFiles;
    });
  };

  // 4. Update file content locally in editor
  const handleContentChange = (newContent: string) => {
    if (!activeFilePath) return;
    setOpenFiles((prev) =>
      prev.map((f) => {
        if (f.path === activeFilePath) {
          const isModified = newContent !== f.originalContent;
          return { ...f, content: newContent, isModified };
        }
        return f;
      })
    );
  };

  // 5. Save / Stage file
  const handleSaveFile = async () => {
    if (!activeFile) return;
    const projectId = activeProject?.id || "github";
    try {
      await api.saveFile({
        projectId,
        filePath: activeFile.path,
        content: activeFile.content,
        branch,
        repo: selectedRepo || undefined,
      });

      // Update working changes list
      const changesRes = await api.getWorkingTreeChanges(projectId, selectedRepo || undefined);
      if (changesRes && changesRes.changes) {
        setWorkingChanges(changesRes.changes);
      }

      setOpenFiles((prev) =>
        prev.map((f) => (f.path === activeFile.path ? { ...f, isModified: true } : f))
      );

      showNotification(`Saved ${activeFile.name} to working tree.`);
    } catch {
      showNotification(`Failed to save ${activeFile.name}`);
    }
  };

  // Keyboard shortcut: Ctrl+S / Cmd+S to save active file to disk / working tree
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveFile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFile, branch, selectedRepo, activeProject]);

  // Create new file directly in workspace
  const handleCreateNewFile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPath = newFilePathInput.trim().replace(/^\/+/, "");
    if (!cleanPath) {
      setIsCreatingNewFile(false);
      return;
    }
    const projectId = activeProject?.id || "github";
    try {
      const initialContent = cleanPath.endsWith(".json")
        ? "{\n  \n}\n"
        : cleanPath.endsWith(".md")
        ? `# ${cleanPath}\n\n`
        : `// ${cleanPath}\n\n`;

      await api.saveFile({
        projectId,
        filePath: cleanPath,
        content: initialContent,
        branch,
        repo: selectedRepo || undefined,
      });

      const newFile: OpenFile = {
        path: cleanPath,
        name: cleanPath.split("/").pop() || cleanPath,
        content: initialContent,
        originalContent: "",
        isModified: true,
      };

      setOpenFiles((prev) => [...prev.filter((f) => f.path !== cleanPath), newFile]);
      setActiveFilePath(cleanPath);
      setTreeItems((prev) => [
        ...prev.filter((t) => t.path !== cleanPath),
        { path: cleanPath, type: "blob" as const, size: initialContent.length },
      ]);

      const changesRes = await api.getWorkingTreeChanges(projectId, selectedRepo || undefined);
      if (changesRes && changesRes.changes) {
        setWorkingChanges(changesRes.changes);
      }

      setIsCreatingNewFile(false);
      setNewFilePathInput("");
      showNotification(`Created file ${cleanPath}`);
    } catch {
      showNotification(`Failed to create ${cleanPath}`);
    }
  };

  // Scaffold starter Next.js/TypeScript workspace files for empty repositories
  const handleScaffoldWorkspace = async () => {
    const projectId = activeProject?.id || "github";
    const filesToCreate = [
      {
        path: "README.md",
        content: `# ${repoDisplayName}\n\nEnterprise repository managed with JGitLab AI Engineering Core.\n\n## Tech Stack\n- Next.js 15\n- React 19\n- TypeScript\n- Tailwind CSS\n`,
      },
      {
        path: "package.json",
        content: JSON.stringify(
          {
            name: repoDisplayName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
            version: "0.1.0",
            private: true,
            scripts: {
              dev: "next dev",
              build: "next build",
              start: "next start",
              test: "jest",
            },
            dependencies: {
              next: "^15.1.0",
              react: "^19.0.0",
              "react-dom": "^19.0.0",
              "lucide-react": "^0.469.0",
              clsx: "^2.1.1",
              "tailwind-merge": "^2.6.0",
            },
          },
          null,
          2
        ),
      },
      {
        path: "src/App.tsx",
        content: `// Main Application Entrypoint\nimport React from 'react';\n\nexport default function App() {\n  return (\n    <main className="min-h-screen bg-[#0C0D12] text-white p-8 font-sans">\n      <h1 className="text-2xl font-bold">${repoDisplayName}</h1>\n      <p className="text-sm text-slate-400 mt-2">Welcome to your JGitLab workspace.</p>\n    </main>\n  );\n}\n`,
      },
    ];

    try {
      for (const item of filesToCreate) {
        await api.saveFile({
          projectId,
          filePath: item.path,
          content: item.content,
          branch,
          repo: selectedRepo || undefined,
        });
      }
      setIsRepoEmpty(false);
      setTreeItems(
        filesToCreate.map((f) => ({
          path: f.path,
          mode: "100644",
          type: "blob" as const,
          sha: "local-scaffold",
          size: f.content.length,
        }))
      );
      setOpenFiles([
        {
          path: "src/App.tsx",
          name: "App.tsx",
          content: filesToCreate[2].content,
          originalContent: "",
          isModified: true,
        },
      ]);
      setActiveFilePath("src/App.tsx");
      const changesRes = await api.getWorkingTreeChanges(projectId, selectedRepo || undefined);
      if (changesRes && changesRes.changes) {
        setWorkingChanges(changesRes.changes);
      }
      showNotification("Scaffolded starter workspace files!");
    } catch {
      showNotification("Failed to scaffold starter files");
    }
  };

  // 6. Commit changes
  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;
    const projectId = activeProject?.id || "github";
    setIsCommitting(true);
    try {
      const res = await api.commitWorkingTreeChanges({
        projectId,
        message: commitMessage.trim(),
        branch,
        repo: selectedRepo || undefined,
      });

      setWorkingChanges([]);
      setCommitMessage("");

      // Update open files: clean modified state
      setOpenFiles((prev) =>
        prev.map((f) => ({
          ...f,
          originalContent: f.content,
          isModified: false,
        }))
      );

      showNotification(`Committed ${res.files_committed} files (${res.commit_sha})`);
      setTerminalHistory((prev) => [
        ...prev,
        `$ git commit -m "${res.message}"`,
        `[${branch} ${res.commit_sha}] ${res.message}`,
        ` ${res.files_committed} file(s) changed`,
      ]);
    } catch {
      showNotification("Commit failed.");
    } finally {
      setIsCommitting(false);
    }
  };

  // 7. Discard a single change
  const handleDiscardChange = async (filePath: string) => {
    const projectId = activeProject?.id || "github";
    try {
      await api.discardWorkingTreeChanges({
        projectId,
        filePath,
        repo: selectedRepo || undefined,
      });

      // Revert open file if active
      setOpenFiles((prev) =>
        prev.map((f) =>
          f.path === filePath
            ? { ...f, content: f.originalContent, isModified: false }
            : f
        )
      );

      const changesRes = await api.getWorkingTreeChanges(projectId, selectedRepo || undefined);
      if (changesRes) setWorkingChanges(changesRes.changes);

      showNotification(`Reverted changes in ${filePath}`);
    } catch {
      showNotification(`Failed to revert ${filePath}`);
    }
  };

  // 8. Ask AI Agent
  const handleSendAiPrompt = async (
    customMode?: "explain" | "review" | "refactor" | "tests" | "commit"
  ) => {
    const mode = customMode || aiSelectedMode;

    const projectId = activeProject?.id || "github";

    const promptText =
      customMode === "explain" && activeFile
        ? `Explain the architecture, dependencies, and execution flow of ${activeFile.name}.`
        : customMode === "review" && activeFile
        ? `Perform a comprehensive security, performance, and best-practices code review of ${activeFile.name}.`
        : customMode === "refactor" && activeFile
        ? `Refactor ${activeFile.name} for strict TypeScript/language safety, clean interfaces, and memoized performance.`
        : customMode === "tests" && activeFile
        ? `Generate a complete unit test suite for ${activeFile.name}.`
        : customMode === "commit" && activeFile
        ? `Generate a Conventional Commit message and summary for ${activeFile.name}.`
        : customMode === "explain" && !activeFile
        ? `Explain the architecture, project structure, and key workflows of repository ${selectedRepo || "this workspace"}.`
        : customMode === "review" && !activeFile
        ? `Review the structure, dependencies, and configuration of repository ${selectedRepo || "this workspace"}.`
        : customMode === "refactor" && !activeFile
        ? `Select a file from the Explorer to run deep refactoring, or ask a general refactoring question here.`
        : customMode === "tests" && !activeFile
        ? `Outline an automated testing strategy and recommended test harness for repository ${selectedRepo || "this workspace"}.`
        : customMode === "commit" && !activeFile
        ? `Draft a conventional commit message and summary for recent changes in ${selectedRepo || "this workspace"}.`
        : aiPromptInput.trim();

    if (!promptText) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: "user",
      text: promptText,
      timestamp: new Date().toLocaleTimeString(),
    };

    setAiMessages((prev) => [...prev, userMsg]);
    setAiPromptInput("");
    setAiGenerating(true);
    setActiveActivityTab("ai");
    setSidebarCollapsed(false);

    try {
      const res: AIAgentChatResponse = await api.chatWithCodeAgent({
        projectId,
        filePath: activeFile ? activeFile.path : undefined,
        fileContent: activeFile ? activeFile.content : undefined,
        prompt: promptText,
        mode,
        branch,
        repo: selectedRepo || undefined,
      });

      const assistantMsg: ChatMessage = {
        id: String(Date.now() + 1),
        role: "assistant",
        text: res.response,
        code: res.suggestedCode || undefined,
        diff: res.diff || undefined,
        model: res.model || "Gemini 2.5 Flash",
        tokens: res.tokens,
        latency: res.latency_ms,
        timestamp: new Date().toLocaleTimeString(),
      };

      setAiMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setAiMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: "assistant",
          text: `⚠️ **Agent encountered an issue:** ${err?.message || "Please check provider configuration or retry."}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setAiGenerating(false);
    }
  };

  // 9. Apply AI suggestion directly to editor & stage
  const handleApplyAiCode = async (suggestedCode: string) => {
    if (!activeFile) return;
    const projectId = activeProject?.id || "github";

    handleContentChange(suggestedCode);

    try {
      await api.saveFile({
        projectId,
        filePath: activeFile.path,
        content: suggestedCode,
        branch,
        repo: selectedRepo || undefined,
      });

      const changesRes = await api.getWorkingTreeChanges(projectId, selectedRepo || undefined);
      if (changesRes && changesRes.changes) {
        setWorkingChanges(changesRes.changes);
      }

      setEditorMode("split-diff");
      showNotification(`Applied AI code to ${activeFile.name} and switched to Diff View.`);
    } catch {
      showNotification("Failed to apply AI suggestion.");
    }
  };

  // 10. Terminal command execution
  const handleTerminalCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;

    const newLogs = [`$ ${cmd}`];
    if (cmd === "clear") {
      setTerminalHistory([]);
      setTerminalInput("");
      return;
    } else if (cmd === "git status") {
      newLogs.push(
        `On branch ${branch}`,
        `Your branch is up to date with 'origin/${branch}'.`,
        workingChanges.length > 0
          ? `Changes not staged for commit:\n${workingChanges
              .map((c) => `  modified: ${c.path}`)
              .join("\n")}`
          : "nothing to commit, working tree clean"
      );
    } else if (cmd === "git diff") {
      if (workingChanges.length > 0) {
        workingChanges.forEach((c) => {
          newLogs.push(`diff --git a/${c.path} b/${c.path}`, c.diff || "+ modified lines");
        });
      } else {
        newLogs.push("No diff found. Working tree clean.");
      }
    } else if (cmd === "npm test") {
      newLogs.push(
        "PASS tests/app.spec.ts",
        "PASS tests/utils.spec.ts",
        "Test Suites: 2 passed, 2 total",
        "Tests:       6 passed, 6 total",
        "Snapshots:   0 total",
        "Time:        1.42s"
      );
    } else if (cmd === "help") {
      newLogs.push(
        "Available commands:",
        "  git status      Show working tree status",
        "  git diff        Show file differences",
        "  npm test        Run repository automated test suites",
        "  clear           Clear terminal display"
      );
    } else {
      newLogs.push(`command not found: ${cmd}. Type 'help' for available commands.`);
    }

    setTerminalHistory((prev) => [...prev, ...newLogs]);
    setTerminalInput("");
  };

  // Expand all folders
  const expandAllFolders = () => {
    const allFolders = new Set<string>();
    treeItems.forEach((item) => {
      const parts = item.path.split("/");
      let acc = "";
      for (let i = 0; i < parts.length - (item.type === "blob" ? 1 : 0); i++) {
        acc = acc ? `${acc}/${parts[i]}` : parts[i];
        allFolders.add(acc);
      }
    });
    setExpandedFolders(allFolders);
    if (typeof window !== "undefined" && selectedRepo) {
      localStorage.setItem(`jgitlab_expanded_${selectedRepo}`, JSON.stringify(Array.from(allFolders)));
    }
  };

  // Collapse all folders
  const collapseAllFolders = () => {
    setExpandedFolders(new Set());
    if (typeof window !== "undefined" && selectedRepo) {
      localStorage.setItem(`jgitlab_expanded_${selectedRepo}`, JSON.stringify([]));
    }
  };

  // Filtered Tree Items based on search inside explorer
  const filteredTreeItems = useMemo(() => {
    if (!treeFilter.trim()) return treeItems;
    const q = treeFilter.trim().toLowerCase();
    return treeItems.filter((i) => i.path.toLowerCase().includes(q));
  }, [treeItems, treeFilter]);

  // Auto-expand matching folders when searching
  useEffect(() => {
    if (treeFilter.trim()) {
      const folders = new Set<string>();
      filteredTreeItems.forEach((i) => {
        const parts = i.path.split("/");
        let cur = "";
        for (let j = 0; j < parts.length - 1; j++) {
          cur = cur ? `${cur}/${parts[j]}` : parts[j];
          folders.add(cur);
        }
      });
      setExpandedFolders(folders);
    }
  }, [treeFilter, filteredTreeItems]);

  // Toggle folder expansion in tree with persistence
  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      if (typeof window !== "undefined" && selectedRepo) {
        localStorage.setItem(`jgitlab_expanded_${selectedRepo}`, JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  // Build Folder Hierarchy with sorted entries
  const folderTree = useMemo(() => {
    const root: { [key: string]: any } = {};
    filteredTreeItems.forEach((item) => {
      const parts = item.path.split("/");
      let current = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1 && item.type === "blob";
        if (isFile) {
          if (!current.__files) current.__files = [];
          current.__files.push(item);
        } else {
          if (!current[part]) current[part] = {};
          current = current[part];
        }
      }
    });
    return root;
  }, [filteredTreeItems]);

  // Helper file icon renderer with authentic developer language badges
  const renderFileIcon = (filePath: string) => {
    const lower = filePath.toLowerCase();
    if (lower.endsWith(".tsx")) {
      return (
        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#388bfd]/20 text-[#58a6ff] border border-[#388bfd]/30 font-mono tracking-tight shrink-0">
          TSX
        </span>
      );
    }
    if (lower.endsWith(".ts")) {
      return (
        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#388bfd]/20 text-[#58a6ff] border border-[#388bfd]/30 font-mono tracking-tight shrink-0">
          TS
        </span>
      );
    }
    if (lower.endsWith(".jsx")) {
      return (
        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#e3b341]/20 text-[#f2cc60] border border-[#e3b341]/30 font-mono tracking-tight shrink-0">
          JSX
        </span>
      );
    }
    if (lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) {
      return (
        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#e3b341]/20 text-[#f2cc60] border border-[#e3b341]/30 font-mono tracking-tight shrink-0">
          JS
        </span>
      );
    }
    if (lower.endsWith(".py")) {
      return (
        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#3776ab]/25 text-[#79c0ff] border border-[#3776ab]/40 font-mono tracking-tight shrink-0">
          PY
        </span>
      );
    }
    if (lower.endsWith(".json")) {
      return (
        <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-[#3fb950]/20 text-[#56d364] border border-[#3fb950]/30 font-bold shrink-0">
          {"{}"}
        </span>
      );
    }
    if (lower.endsWith(".css") || lower.endsWith(".scss") || lower.endsWith(".sass")) {
      return (
        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#d2a8ff]/20 text-[#bc8cff] border border-[#d2a8ff]/30 font-mono shrink-0">
          #
        </span>
      );
    }
    if (lower.endsWith(".html")) {
      return (
        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#f0883e]/20 text-[#ffa657] border border-[#f0883e]/30 font-mono shrink-0">
          {"<>"}
        </span>
      );
    }
    if (lower.endsWith(".md") || lower.endsWith(".markdown") || lower.endsWith(".txt")) {
      return (
        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#8b949e]/20 text-[#c9d1d9] border border-[#8b949e]/30 font-mono tracking-tight shrink-0">
          MD
        </span>
      );
    }
    if (lower.endsWith(".yml") || lower.endsWith(".yaml") || lower.endsWith(".toml") || lower.endsWith(".env")) {
      return (
        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#ff7b72]/20 text-[#ff7b72] border border-[#ff7b72]/30 font-mono tracking-tight shrink-0">
          YML
        </span>
      );
    }
    if (lower.endsWith(".sh") || lower.endsWith(".bash")) {
      return (
        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#238636]/20 text-[#3fb950] border border-[#238636]/30 font-mono tracking-tight shrink-0">
          SH
        </span>
      );
    }
    if (lower.endsWith(".sql")) {
      return (
        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#1f6feb]/20 text-[#79c0ff] border border-[#1f6feb]/30 font-mono tracking-tight shrink-0">
          SQL
        </span>
      );
    }
    return <FileCode className="w-3.5 h-3.5 text-[#8B949E] shrink-0" />;
  };

  // Syntax highlighting tokenizer for VS Code experience
  const highlightCodeLine = (line: string): React.ReactNode => {
    if (!line) return "\u00A0";

    const trimmed = line.trimStart();
    const indent = line.slice(0, line.length - trimmed.length);

    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("--")
    ) {
      return (
        <span>
          <span>{indent}</span>
          <span className="text-[#8B949E] italic">{trimmed}</span>
        </span>
      );
    }

    const regex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*$|#[^\n]*|\b(?:import|export|from|as|const|let|var|function|return|class|interface|type|extends|implements|default|async|await|if|else|switch|case|break|continue|try|catch|finally|throw|new|typeof|instanceof|void|def|pass|lambda|yield|for|while|in|of|public|private|protected|static|readonly|enum|namespace)\b|\b(?:true|false|null|undefined|None|True|False)\b|\b\d+(?:\.\d+)?\b|\b(?:React|useState|useEffect|useMemo|useCallback|useRef|NextPage|FC|Record|Array|Promise|Partial|Omit|Pick|string|number|boolean|any|unknown|never|void|object|int|float|str|dict|list|set)\b|[{}()[\],;.]|=>|===|!==|==|!=|<=|>=|[+\-*/%=&|^!~<>?:]+|\S+)/g;

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        elements.push(line.slice(lastIndex, match.index));
      }

      const token = match[0];
      const isString =
        (token.startsWith('"') && token.endsWith('"')) ||
        (token.startsWith("'") && token.endsWith("'")) ||
        (token.startsWith("`") && token.endsWith("`"));
      const isComment = token.startsWith("//") || token.startsWith("#");
      const isKeyword = /^(import|export|from|as|const|let|var|function|return|class|interface|type|extends|implements|default|async|await|if|else|switch|case|break|continue|try|catch|finally|throw|new|typeof|instanceof|void|def|pass|lambda|yield|for|while|in|of|public|private|protected|static|readonly|enum|namespace)$/.test(
        token
      );
      const isConstant = /^(true|false|null|undefined|None|True|False)$/.test(token);
      const isNumber = /^\d+(\.\d+)?$/.test(token);
      const isType = /^(React|useState|useEffect|useMemo|useCallback|useRef|NextPage|FC|Record|Array|Promise|Partial|Omit|Pick|string|number|boolean|any|unknown|never|void|object|int|float|str|dict|list|set)$/.test(
        token
      );
      const isTag = /^<\/?[A-Za-z0-9_.-]+/.test(token);

      if (isComment) {
        elements.push(<span key={match.index} className="text-[#8B949E] italic">{token}</span>);
      } else if (isString) {
        elements.push(<span key={match.index} className="text-[#7EE787]">{token}</span>);
      } else if (isKeyword) {
        elements.push(<span key={match.index} className="text-[#FF7B72] font-semibold">{token}</span>);
      } else if (isConstant || isNumber) {
        elements.push(<span key={match.index} className="text-[#FFA657]">{token}</span>);
      } else if (isType) {
        elements.push(<span key={match.index} className="text-[#79C0FF]">{token}</span>);
      } else if (isTag) {
        elements.push(<span key={match.index} className="text-[#7EE787]">{token}</span>);
      } else if (/^[A-Z][a-zA-Z0-9_]*$/.test(token)) {
        elements.push(<span key={match.index} className="text-[#D2A8FF]">{token}</span>);
      } else {
        elements.push(<span key={match.index} className="text-[#E6EDF3]">{token}</span>);
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < line.length) {
      elements.push(line.slice(lastIndex));
    }

    return <span>{elements}</span>;
  };

  // Recursive tree component with A-Z sorting, authentic VS Code folder/file icons and compact row density
  const renderTree = (node: any, pathPrefix = "", depth = 0): React.ReactNode => {
    const folderKeys = Object.keys(node)
      .filter((k) => k !== "__files")
      .sort((a, b) => a.localeCompare(b));
    const files: ProjectFileTreeItem[] = ((node.__files as ProjectFileTreeItem[]) || [])
      .slice()
      .sort((a: ProjectFileTreeItem, b: ProjectFileTreeItem) => a.path.localeCompare(b.path));

    return (
      <div className="space-y-[1px]">
        {folderKeys.map((dir) => {
          const currentPath = pathPrefix ? `${pathPrefix}/${dir}` : dir;
          const isExpanded = expandedFolders.has(currentPath);
          return (
            <div key={currentPath}>
              <button
                type="button"
                onClick={() => toggleFolder(currentPath)}
                className="w-full h-[22px] flex items-center gap-1.5 px-1.5 rounded-sm hover:bg-[#2a2d2e] text-[12px] text-[#cccccc] font-sans transition-colors text-left group select-none cursor-pointer"
                style={{ paddingLeft: `${Math.max(4, depth * 10 + 4)}px` }}
              >
                <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-[#858585] group-hover:text-white" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-[#858585] group-hover:text-white" />
                  )}
                </span>
                <VSCodeFolderIcon name={dir} isOpen={isExpanded} className="w-4 h-4 shrink-0" />
                <span className="truncate group-hover:text-white leading-none font-sans text-[12px]">
                  {dir}
                </span>
              </button>

              {isExpanded && (
                <div className="border-l border-[#333333]/50 ml-2">
                  {renderTree(node[dir], currentPath, depth + 1)}
                </div>
              )}
            </div>
          );
        })}

        {files.map((file, idx) => {
          const isActive = file.path === activeFilePath;
          const isModified = workingChanges.some((c) => c.path === file.path);
          return (
            <div
              key={`${file.path}-${idx}`}
              onClick={() => openFileInEditor(file.path)}
              className={`w-full h-[22px] flex items-center justify-between px-1.5 rounded-sm text-[12px] font-sans transition-colors text-left select-none cursor-pointer group ${
                isActive
                  ? "bg-[#37373d] text-white font-medium border-l-2 border-[#007acc]"
                  : "text-[#cccccc] hover:text-white hover:bg-[#2a2d2e]"
              }`}
              style={{ paddingLeft: `${Math.max(4, depth * 10 + 16)}px` }}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <VSCodeFileIcon path={file.path} className="w-4 h-4 shrink-0" />
                <span className="truncate leading-none text-[12px] font-sans">
                  {file.path.split("/").pop()}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Quick Copy Path Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(file.path);
                    showNotification(`Copied path: ${file.path}`);
                  }}
                  title="Copy relative path"
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-[#858585] hover:text-white transition-opacity"
                >
                  <Copy className="w-3 h-3" />
                </button>

                {/* Discard Changes Button if modified */}
                {isModified && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Discard local working changes to ${file.path.split("/").pop()}?`)) {
                          handleDiscardChange(file.path);
                        }
                      }}
                      title="Discard local changes"
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-[#e2c08d] hover:text-red-400 transition-opacity"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] text-[#e2c08d] font-bold px-1 rounded bg-[#e2c08d]/10 font-mono">
                      M
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Search in files results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: Array<{ path: string; line: number; text: string }> = [];

    openFiles.forEach((f) => {
      const lines = f.content.split("\n");
      lines.forEach((l, idx) => {
        if (l.toLowerCase().includes(q)) {
          results.push({
            path: f.path,
            line: idx + 1,
            text: l.trim(),
          });
        }
      });
    });

    return results;
  }, [searchQuery, openFiles]);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-[#0D1117] text-[#F0F6FC] rounded-2xl border border-[#30363D] overflow-hidden shadow-2xl">
      {/* Top VS Code Window Titlebar */}
      <div className="h-10 bg-[#161B22] border-b border-[#30363D] px-3 flex items-center justify-between shrink-0 select-none relative z-30">
        {/* Left: Window Dots & GitHub Repository Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56]/80 hover:bg-[#FF5F56] transition-colors inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E]/80 hover:bg-[#FFBD2E] transition-colors inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#27C93F]/80 hover:bg-[#27C93F] transition-colors inline-block" />
          </div>

          {/* GitHub Repository Dropdown Trigger */}
          <div className="relative pl-3 border-l border-[#30363D]">
            <button
              type="button"
              onClick={() => setRepoDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0D1117] hover:bg-[#21262D] border border-[#30363D] transition-colors group cursor-pointer"
              title="Click to switch GitHub Repository"
            >
              <Github className="w-3.5 h-3.5 text-[#58A6FF]" />
              <span className="text-xs font-semibold text-[#F0F6FC] font-mono group-hover:text-[#58A6FF] transition-colors max-w-[200px] truncate">
                {repoDisplayName}
              </span>
              <span className="text-[10px] font-mono text-[#8B949E] px-1.5 py-0.5 rounded bg-[#21262D]">
                {branch}
              </span>
              <ChevronDown className="w-3 h-3 text-[#8B949E] group-hover:text-white transition-colors" />
            </button>

            {/* Dropdown Menu */}
            {repoDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setRepoDropdownOpen(false)}
                />
                <div className="absolute top-full left-3 mt-1.5 w-84 bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-2 py-1.5 border-b border-[#30363D] flex items-center justify-between text-xs text-[#8B949E]">
                    <span className="font-semibold text-[#F0F6FC] flex items-center gap-1.5">
                      <Github className="w-3.5 h-3.5 text-[#58A6FF]" />
                      GitHub Repositories
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#238636]/20 text-[#3FB950] border border-[#238636]/30">
                      {gitHubRepos.length} available
                    </span>
                  </div>

                  {/* Filter Search Input */}
                  <div className="p-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={repoFilter}
                        onChange={(e) => setRepoFilter(e.target.value)}
                        placeholder="Filter repositories..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0D1117] border border-[#30363D] rounded-lg text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#58A6FF] font-mono"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Repositories List */}
                  <div className="max-h-64 overflow-y-auto space-y-1 p-1">
                    {loadingRepos ? (
                      <div className="p-4 text-center text-xs text-[#8B949E] font-mono flex items-center justify-center gap-2">
                        <JGitLabRefreshIcon size="sm" spinning={true} />
                        <span>Loading repositories...</span>
                      </div>
                    ) : gitHubRepos.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#8B949E] font-mono space-y-2">
                        <span>No GitHub repositories found.</span>
                        <div>
                          <Link
                            href="/github"
                            onClick={() => setRepoDropdownOpen(false)}
                            className="text-[#58A6FF] hover:underline"
                          >
                            Connect GitHub App &rarr;
                          </Link>
                        </div>
                      </div>
                    ) : (
                      gitHubRepos
                        .filter(
                          (r) =>
                            r.full_name.toLowerCase().includes(repoFilter.toLowerCase()) ||
                            r.name.toLowerCase().includes(repoFilter.toLowerCase())
                        )
                        .map((r) => {
                          const isSelected =
                            selectedRepo === r.full_name ||
                            (!selectedRepo && r.name === repoDisplayName);
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => handleSelectRepo(r)}
                              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono transition-colors flex items-center justify-between group ${
                                isSelected
                                  ? "bg-[#1F6FEB]/20 text-[#58A6FF] border border-[#1F6FEB]/40"
                                  : "text-[#C9D1D9] hover:bg-[#21262D]"
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-semibold truncate text-[#F0F6FC] group-hover:text-[#58A6FF]">
                                  {r.name}
                                </div>
                                <div className="text-[10px] text-[#8B949E] truncate">
                                  {r.full_name}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[9px] px-1 py-0.5 rounded bg-[#0D1117] text-[#8B949E] border border-[#30363D]">
                                  {r.default_branch || "main"}
                                </span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-[#3FB950]" />
                                )}
                              </div>
                            </button>
                          );
                        })
                    )}
                  </div>

                  <div className="p-1.5 pt-2 border-t border-[#30363D] flex items-center justify-between text-[11px] text-[#8B949E]">
                    <Link
                      href="/github"
                      onClick={() => setRepoDropdownOpen(false)}
                      className="text-[#58A6FF] hover:underline flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      Manage GitHub Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        api.getGitHubRepos().then((r) => setGitHubRepos(r || []));
                      }}
                      className="hover:text-white flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center: Command Palette / File Path Display */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs font-mono text-[#8B949E] w-96 justify-center">
          <Search className="w-3.5 h-3.5 text-[#8B949E]" />
          <span className="truncate">
            {activeFile ? `${repoDisplayName} > ${activeFile.path}` : `${repoDisplayName} · Quick Open (Ctrl+P)`}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {statusNotification && (
            <span className="text-xs font-mono text-[#3FB950] bg-[#238636]/15 border border-[#238636]/30 px-2 py-0.5 rounded animate-fade-in">
              {statusNotification}
            </span>
          )}

          <Link
            href="/github"
            title="GitHub Connections & Settings"
            className="p-1.5 rounded hover:bg-[#21262D] text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
          >
            <Github className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title="Toggle Primary Sidebar"
            className={`p-1.5 rounded transition-colors ${
              !sidebarCollapsed
                ? "bg-[#21262D] text-[#58A6FF]"
                : "text-[#8B949E] hover:text-[#F0F6FC]"
            }`}
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setBottomPanelOpen(!bottomPanelOpen)}
            title="Toggle Integrated Terminal"
            className={`p-1.5 rounded transition-colors ${
              bottomPanelOpen
                ? "bg-[#21262D] text-[#58A6FF]"
                : "text-[#8B949E] hover:text-[#F0F6FC]"
            }`}
          >
            <PanelBottom className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* 1. Activity Bar (Left 48px rail) */}
        <div className="w-12 bg-[#0D1117] border-r border-[#30363D] flex flex-col items-center py-3 gap-2 shrink-0 select-none z-10">
          <button
            type="button"
            onClick={() => {
              setActiveActivityTab("explorer");
              setSidebarCollapsed(false);
            }}
            title="Explorer (Ctrl+Shift+E)"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              activeActivityTab === "explorer" && !sidebarCollapsed
                ? "bg-[#1F6FEB] text-white shadow-lg"
                : "text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#161B22]"
            }`}
          >
            <FileCode className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveActivityTab("changes");
              setSidebarCollapsed(false);
            }}
            title={`Source Control (${workingChanges.length} changes)`}
            className={`w-9 h-9 rounded-xl flex items-center justify-center relative transition-all ${
              activeActivityTab === "changes" && !sidebarCollapsed
                ? "bg-[#1F6FEB] text-white shadow-lg"
                : "text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#161B22]"
            }`}
          >
            <GitMerge className="w-5 h-5" />
            {workingChanges.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#1F6FEB] text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-[#0D1117]">
                {workingChanges.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveActivityTab("ai");
              setSidebarCollapsed(false);
            }}
            title="JGitLab AI Agent Copilot"
            className={`w-9 h-9 rounded-xl flex items-center justify-center relative transition-all ${
              activeActivityTab === "ai" && !sidebarCollapsed
                ? "bg-[#1F6FEB] text-white shadow-lg ring-2 ring-[#58A6FF]/40"
                : "text-[#58A6FF] hover:bg-[#161B22]"
            }`}
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#3FB950]" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveActivityTab("search");
              setSidebarCollapsed(false);
            }}
            title="Search Across Repository"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              activeActivityTab === "search" && !sidebarCollapsed
                ? "bg-[#1F6FEB] text-white shadow-lg"
                : "text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#161B22]"
            }`}
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveActivityTab("analysis");
              setSidebarCollapsed(false);
            }}
            title="Static Analysis & Architecture"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              activeActivityTab === "analysis" && !sidebarCollapsed
                ? "bg-[#1F6FEB] text-white shadow-lg"
                : "text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#161B22]"
            }`}
          >
            <Layers className="w-5 h-5" />
          </button>

          <div className="mt-auto flex flex-col items-center gap-2">
            <Link
              href="/settings"
              title="IDE Settings"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#161B22] transition-colors"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* 2. Primary Sidebar (300px collapsible) */}
        {!sidebarCollapsed && (
          <div className="w-80 bg-[#161B22] border-r border-[#30363D] flex flex-col shrink-0 overflow-hidden select-none">
            {/* EXPLORER TAB */}
            {activeActivityTab === "explorer" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="h-9 px-3 border-b border-[#30363D] flex items-center justify-between text-xs font-mono font-semibold uppercase tracking-wider text-[#8B949E]">
                  <span>Explorer</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewFile(true)}
                      title="New File"
                      className="p-1 text-[#8B949E] hover:text-[#58A6FF] hover:bg-[#21262D] rounded transition-colors"
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={expandAllFolders}
                      title="Expand All Folders"
                      className="p-1 text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] rounded transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllFolders}
                      title="Collapse All Folders"
                      className="p-1 text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] rounded transition-colors"
                    >
                      <Folder className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={loadRepositoryData}
                      title="Refresh Tree"
                      className="p-1 text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] rounded transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingTree ? "animate-spin text-[#58A6FF]" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Inline New File Creator */}
                {isCreatingNewFile && (
                  <form
                    onSubmit={handleCreateNewFile}
                    className="p-2 bg-[#0D1117] border-b border-[#30363D] flex items-center gap-1.5"
                  >
                    <FileCode className="w-3.5 h-3.5 text-[#58A6FF] shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. src/utils/helper.ts"
                      value={newFilePathInput}
                      onChange={(e) => setNewFilePathInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setIsCreatingNewFile(false);
                          setNewFilePathInput("");
                        }
                      }}
                      className="flex-1 px-2 py-1 text-xs bg-[#161B22] border border-[#30363D] rounded text-[#F0F6FC] font-mono focus:border-[#58A6FF] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-2 py-1 text-[11px] font-mono bg-[#1F6FEB] hover:bg-[#388BFD] text-white rounded font-medium"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingNewFile(false);
                        setNewFilePathInput("");
                      }}
                      className="p-1 text-[#8B949E] hover:text-[#F0F6FC] rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}

                {/* Workspace Header */}
                <div className="p-3 border-b border-[#30363D]/60 flex items-center justify-between bg-[#0D1117]/30">
                  <div
                    onClick={() => setRepoDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-2 min-w-0 cursor-pointer hover:text-[#58A6FF] transition-colors"
                    title="Click to switch GitHub Repository"
                  >
                    <Github className="w-3.5 h-3.5 text-[#58A6FF] shrink-0" />
                    <span className="text-xs font-bold text-[#F0F6FC] truncate">
                      {repoDisplayName.toUpperCase()}
                    </span>
                    <ChevronDown className="w-3 h-3 text-[#8B949E] shrink-0" />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#238636]/20 text-[#3FB950] border border-[#238636]/30">
                      GitHub
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#21262D] text-[#8B949E]">
                      {treeItems.length}
                    </span>
                  </div>
                </div>

                {/* Explorer File Filter Bar */}
                <div className="p-2 border-b border-[#30363D]/60 bg-[#0D1117]/40">
                  <div className="relative">
                    <Search className="w-3 h-3 text-[#8B949E] absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={treeFilter}
                      onChange={(e) => setTreeFilter(e.target.value)}
                      placeholder="Filter files by name..."
                      className="w-full pl-7 pr-6 py-1 text-[11px] bg-[#161B22] border border-[#30363D] rounded-md text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#58A6FF] font-mono"
                    />
                    {treeFilter && (
                      <button
                        type="button"
                        onClick={() => setTreeFilter("")}
                        className="absolute right-2 top-1.5 text-[#8B949E] hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* File Tree */}
                <div className="flex-1 overflow-y-auto p-2">
                  {loadingTree ? (
                    <div className="p-8 text-center space-y-2">
                      <JGitLabRefreshIcon size="sm" spinning={true} />
                      <span className="text-xs font-mono text-[#8B949E] block">
                        Loading files from GitHub...
                      </span>
                    </div>
                  ) : isRepoEmpty ? (
                    <div className="p-6 text-center space-y-3 text-[#8B949E]">
                      <div className="w-10 h-10 rounded-xl bg-[#21262D] border border-[#30363D] flex items-center justify-center mx-auto text-[#D29922]">
                        <FolderGit2 className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-[#F0F6FC]">Repository Ready for Code</p>
                      <p className="text-[11px] text-[#8B949E] leading-relaxed">
                        {selectedRepo} has no commits on GitHub yet. You can scaffold standard starter files, create a new file, or switch repositories.
                      </p>
                      <div className="flex flex-col gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleScaffoldWorkspace}
                          className="w-full px-3 py-1.5 text-xs bg-[#238636] hover:bg-[#2ea043] text-white rounded-md font-mono font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Scaffold Next.js Starter</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewFilePathInput("README.md");
                            setIsCreatingNewFile(true);
                          }}
                          className="w-full px-3 py-1.5 text-xs bg-[#21262D] hover:bg-[#30363D] text-slate-200 border border-[#30363D] rounded-md font-mono transition flex items-center justify-center gap-1.5"
                        >
                          <FilePlus className="w-3.5 h-3.5 text-[#58A6FF]" />
                          <span>+ Create README.md</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRepoDropdownOpen(true)}
                          className="w-full px-3 py-1 text-xs text-[#8B949E] hover:text-white transition font-mono"
                        >
                          Switch to another repository →
                        </button>
                      </div>
                    </div>
                  ) : treeItems.length === 0 ? (
                    <div className="p-6 text-center space-y-3 text-[#8B949E]">
                      <Github className="w-8 h-8 text-[#58A6FF] mx-auto opacity-70" />
                      <p className="text-xs font-mono">No files found in {repoDisplayName}</p>
                      <button
                        type="button"
                        onClick={loadRepositoryData}
                        className="inline-block px-3 py-1.5 text-xs bg-[#1F6FEB] text-white rounded-md hover:bg-[#388BFD] font-mono"
                      >
                        Reload Repository
                      </button>
                    </div>
                  ) : filteredTreeItems.length === 0 ? (
                    <div className="p-6 text-center text-[#8B949E] text-xs font-mono space-y-2">
                      <p>No files match "{treeFilter}"</p>
                      <button
                        type="button"
                        onClick={() => setTreeFilter("")}
                        className="text-[#58A6FF] hover:underline"
                      >
                        Clear filter
                      </button>
                    </div>
                  ) : (
                    renderTree(folderTree)
                  )}
                </div>
              </div>
            )}

            {/* SOURCE CONTROL TAB */}
            {activeActivityTab === "changes" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="h-9 px-3 border-b border-[#30363D] flex items-center justify-between text-xs font-mono font-semibold uppercase tracking-wider text-[#8B949E]">
                  <span>Source Control: Git</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F6FEB] text-white">
                    {workingChanges.length}
                  </span>
                </div>

                {/* Commit Box */}
                <form onSubmit={handleCommit} className="p-3 border-b border-[#30363D] space-y-2.5">
                  <textarea
                    rows={3}
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Message (Ctrl+Enter to commit)"
                    className="w-full p-2.5 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs font-mono text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#58A6FF]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isCommitting || !commitMessage.trim() || workingChanges.length === 0}
                      className="flex-1 h-8 rounded-lg bg-[#1F6FEB] hover:bg-[#388BFD] disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <GitCommit className="w-3.5 h-3.5" />
                      <span>{isCommitting ? "Committing..." : "Commit & Push"}</span>
                    </button>
                  </div>
                </form>

                {/* Changes List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8B949E] px-2 py-1">
                    <span>Changes</span>
                    <span>{workingChanges.length}</span>
                  </div>

                  {workingChanges.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <CheckCircle2 className="w-6 h-6 text-[#3FB950] mx-auto" />
                      <span className="text-xs font-mono text-[#8B949E] block">
                        Working tree clean
                      </span>
                    </div>
                  ) : (
                    workingChanges.map((change) => (
                      <div
                        key={change.path}
                        className="group flex items-center justify-between p-2 rounded-lg bg-[#0D1117]/60 hover:bg-[#21262D] transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            openFileInEditor(change.path);
                            setEditorMode("split-diff");
                          }}
                          className="flex items-center gap-2 min-w-0 text-left flex-1"
                        >
                          <span className="w-4 h-4 rounded bg-[#D29922]/20 text-[#D29922] font-mono text-[10px] font-bold flex items-center justify-center">
                            M
                          </span>
                          <span className="text-xs font-mono text-[#C9D1D9] truncate">
                            {change.path}
                          </span>
                        </button>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              openFileInEditor(change.path);
                              setEditorMode("split-diff");
                            }}
                            title="Inspect Diff"
                            className="p-1 text-[#8B949E] hover:text-[#58A6FF]"
                          >
                            <Columns className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDiscardChange(change.path)}
                            title="Discard Changes"
                            className="p-1 text-[#8B949E] hover:text-[#FF7B72]"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* AI AGENT TAB (THE WORKING VS CODE AI COPILOT) */}
            {activeActivityTab === "ai" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="h-9 px-3 border-b border-[#30363D] flex items-center justify-between text-xs font-mono font-semibold uppercase tracking-wider text-[#58A6FF]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#58A6FF] animate-pulse" />
                    <span>VS Code Copilot AI</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#238636]/20 text-[#3FB950] border border-[#238636]/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3FB950] animate-pulse" />
                      <span>Gemini 2.5 Flash</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAiMessages([
                          {
                            id: "welcome",
                            role: "assistant",
                            text: "👋 **Hello! I am your JGitLab AI Pair Programmer.**\n\nPowered by Google Gemini 2.5 Flash. I can inspect your code, refactor functions, write comprehensive unit tests, audit security vulnerabilities, and propose commits. Select a file and ask a question or click a quick command below!",
                            model: "Gemini 2.5 Flash",
                            timestamp: new Date().toLocaleTimeString(),
                          },
                        ])
                      }
                      title="Clear chat history"
                      className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Context Target Banner */}
                <div className="p-2.5 bg-[#0D1117] border-b border-[#30363D] text-[11px] font-mono text-[#8B949E] flex items-center justify-between">
                  <span className="truncate">
                    Context:{" "}
                    <strong className="text-[#F0F6FC]">
                      {activeFile ? activeFile.name : `${repoDisplayName} (Repo Scope)`}
                    </strong>
                  </span>
                  {activeFile ? (
                    <span className="text-[#3FB950]">
                      {activeFile.content.split("\n").length} lines
                    </span>
                  ) : (
                    <span className="text-[#58A6FF]">General Questions</span>
                  )}
                </div>

                {/* Quick Action Commands */}
                <div className="p-2.5 border-b border-[#30363D] flex flex-wrap gap-1.5 bg-[#161B22]">
                  <button
                    type="button"
                    onClick={() => handleSendAiPrompt("explain")}
                    disabled={aiGenerating}
                    className="px-2 py-1 rounded bg-[#21262D] hover:bg-[#30363D] text-[11px] font-mono text-[#58A6FF] flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <span>⚡ Explain</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendAiPrompt("review")}
                    disabled={aiGenerating}
                    className="px-2 py-1 rounded bg-[#21262D] hover:bg-[#30363D] text-[11px] font-mono text-[#3FB950] flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <span>🛡️ Review</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendAiPrompt("refactor")}
                    disabled={aiGenerating}
                    className="px-2 py-1 rounded bg-[#21262D] hover:bg-[#30363D] text-[11px] font-mono text-[#E3B341] flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <span>🚀 Refactor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendAiPrompt("tests")}
                    disabled={aiGenerating}
                    className="px-2 py-1 rounded bg-[#21262D] hover:bg-[#30363D] text-[11px] font-mono text-[#A371F7] flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <span>🧪 Tests</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendAiPrompt("commit")}
                    disabled={aiGenerating}
                    className="px-2 py-1 rounded bg-[#21262D] hover:bg-[#30363D] text-[11px] font-mono text-[#79C0FF] flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <span>📝 Commit</span>
                  </button>
                </div>

                {/* Chat Message Stream */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {aiMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-xl text-xs space-y-2 ${
                        msg.role === "user"
                          ? "bg-[#1F6FEB]/15 border border-[#1F6FEB]/30 text-[#F0F6FC]"
                          : "bg-[#0D1117] border border-[#30363D] text-[#C9D1D9]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#8B949E]">
                        <span className="font-semibold text-[#58A6FF]">
                          {msg.role === "user" ? "You" : "JGitLab AI (Gemini 2.5)"}
                        </span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div className="whitespace-pre-wrap leading-relaxed font-sans text-xs">
                        {msg.text}
                      </div>

                      {/* Code Block if returned */}
                      {msg.code && (
                        <div className="rounded-lg bg-[#161B22] border border-[#30363D] p-2 space-y-2 mt-2">
                          <div className="flex items-center justify-between pb-1 border-b border-[#30363D] text-[10px] font-mono text-[#8B949E]">
                            <span>Suggested Code {activeFile ? `(${activeFile.name})` : ""}</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(msg.code!)}
                                className="hover:text-white flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </button>
                            </div>
                          </div>

                          <pre className="max-h-48 overflow-y-auto text-[11px] font-mono text-[#58A6FF] p-2 bg-[#0D1117] rounded border border-[#30363D]/60 select-all">
                            {msg.code}
                          </pre>

                          {activeFile && (
                            <button
                              type="button"
                              onClick={() => handleApplyAiCode(msg.code!)}
                              className="w-full py-1.5 rounded bg-[#238636] hover:bg-[#2ea043] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Apply to Editor &amp; Diff</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Diff viewer shortcut */}
                      {msg.diff && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditorMode("split-diff");
                              showNotification("Opened Split Diff view to inspect modifications.");
                            }}
                            className="px-2.5 py-1 rounded bg-[#1F6FEB]/15 hover:bg-[#1F6FEB]/25 text-[#58A6FF] border border-[#1F6FEB]/30 text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                          >
                            <Columns className="w-3 h-3 text-[#58A6FF]" />
                            <span>View Split Diff</span>
                          </button>
                        </div>
                      )}

                      {msg.latency && (
                        <div className="text-[10px] font-mono text-[#8B949E]/70 pt-1">
                          Generated in {msg.latency}ms · {msg.tokens || 120} tokens · {msg.model || "Gemini 2.5 Flash"}
                        </div>
                      )}
                    </div>
                  ))}

                  {aiGenerating && (
                    <div className="p-3 rounded-xl bg-[#0D1117] border border-[#1F6FEB]/40 text-xs flex items-center gap-2 text-[#58A6FF] animate-pulse">
                      <JGitLabRefreshIcon size="sm" spinning={true} />
                      <span className="font-mono">Gemini 2.5 Flash generating solution...</span>
                    </div>
                  )}
                </div>

                {/* Prompt Input Box */}
                <div className="p-3 border-t border-[#30363D] bg-[#161B22]">
                  <div className="relative">
                    <textarea
                      rows={2}
                      value={aiPromptInput}
                      onChange={(e) => setAiPromptInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendAiPrompt();
                        }
                      }}
                      placeholder={activeFile ? `Ask AI about ${activeFile.name}, refactor, or test...` : "Ask AI about this repository, architecture, or code..."}
                      className="w-full p-2.5 pr-10 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs font-mono text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#58A6FF]"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendAiPrompt()}
                      disabled={aiGenerating || !aiPromptInput.trim()}
                      className="absolute right-2 top-2 p-1.5 rounded bg-[#1F6FEB] hover:bg-[#388BFD] disabled:opacity-50 text-white transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SEARCH TAB */}
            {activeActivityTab === "search" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="h-9 px-3 border-b border-[#30363D] flex items-center justify-between text-xs font-mono font-semibold uppercase tracking-wider text-[#8B949E]">
                  <span>Search</span>
                </div>

                <div className="p-3 border-b border-[#30363D]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search query in opened files..."
                    className="w-full h-8 px-2.5 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs font-mono text-[#F0F6FC] focus:outline-none focus:border-[#58A6FF]"
                  />
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {searchResults.map((res, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openFileInEditor(res.path)}
                      className="w-full p-2 rounded-lg bg-[#0D1117]/60 hover:bg-[#21262D] text-left text-xs font-mono space-y-0.5"
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#58A6FF]">
                        <span>{res.path.split("/").pop()}</span>
                        <span>Ln {res.line}</span>
                      </div>
                      <div className="text-[11px] text-[#8B949E] truncate">
                        {res.text}
                      </div>
                    </button>
                  ))}
                  {searchQuery && searchResults.length === 0 && (
                    <p className="p-4 text-center text-xs text-[#8B949E] font-mono">
                      No matches found.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STATIC ANALYSIS TAB */}
            {activeActivityTab === "analysis" && (
              <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-4 text-xs font-mono overflow-y-auto">
                <div>
                  <span className="text-[10px] text-[#8B949E] uppercase block mb-1">
                    Primary Language
                  </span>
                  <span className="text-sm font-bold text-[#58A6FF]">
                    {analysis?.analysis_summary?.primary_language || "TypeScript"}
                  </span>
                </div>

                {analysis?.languages && (
                  <div className="space-y-2">
                    <span className="text-[10px] text-[#8B949E] uppercase block">
                      Language Distribution
                    </span>
                    <div className="h-2 w-full bg-[#0D1117] rounded-full overflow-hidden flex">
                      {Object.entries(analysis.languages).map(([l, pct], idx) => {
                        const colors = ["bg-[#1F6FEB]", "bg-[#58A6FF]", "bg-[#3FB950]", "bg-[#D29922]"];
                        return (
                          <div
                            key={l}
                            style={{ width: `${pct}%` }}
                            className={colors[idx % colors.length]}
                            title={`${l}: ${pct}%`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-[10px] text-[#8B949E] uppercase block mb-1">
                    Frameworks
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(analysis?.frameworks || ["React", "NestJS", "Tailwind"]).map((fw) => (
                      <span key={fw} className="px-2 py-0.5 rounded bg-[#0D1117] text-[#3FB950] border border-[#30363D]">
                        {fw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Main Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0D1117]">
          {/* Editor Tab Bar */}
          <div className="h-9 bg-[#161B22] border-b border-[#30363D] flex items-center justify-between overflow-x-auto select-none">
            {/* Open Tabs */}
            <div className="flex items-center h-full">
              {openFiles.map((file, idx) => {
                const isActive = file.path === activeFilePath;
                return (
                  <div
                    key={`${file.path}-${idx}`}
                    onClick={() => setActiveFilePath(file.path)}
                    className={`h-full px-3 flex items-center gap-2 border-r border-[#30363D] text-xs font-mono cursor-pointer transition-colors ${
                      isActive
                        ? "bg-[#0D1117] text-[#F0F6FC] border-t-2 border-t-[#1F6FEB] font-semibold"
                        : "text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#0D1117]/50"
                    }`}
                  >
                    <VSCodeFileIcon path={file.path} className="w-4 h-4 shrink-0" />
                    <span>{file.name}</span>
                    {file.isModified && (
                      <span className="w-2 h-2 rounded-full bg-[#D29922] inline-block" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => closeFileTab(file.path, e)}
                      className="p-0.5 rounded hover:bg-[#30363D] text-[#8B949E] hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Editor Right Controls */}
            <div className="flex items-center gap-1.5 px-3">
              {activeFile && (
                <div className="hidden md:flex items-center gap-1 mr-2 pr-2 border-r border-[#30363D]">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActivityTab("ai");
                      setSidebarCollapsed(false);
                      handleSendAiPrompt("explain");
                    }}
                    title="Explain code using Gemini"
                    className="h-7 px-2 rounded bg-[#1F6FEB]/15 hover:bg-[#1F6FEB]/25 text-[#58A6FF] border border-[#1F6FEB]/30 text-[11px] font-mono flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-[#58A6FF]" />
                    <span>Explain</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActivityTab("ai");
                      setSidebarCollapsed(false);
                      handleSendAiPrompt("review");
                    }}
                    title="Run AI security & code review"
                    className="h-7 px-2 rounded bg-[#238636]/15 hover:bg-[#238636]/25 text-[#3FB950] border border-[#238636]/30 text-[11px] font-mono flex items-center gap-1 transition-colors"
                  >
                    <Shield className="w-3 h-3 text-[#3FB950]" />
                    <span>Review</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActivityTab("ai");
                      setSidebarCollapsed(false);
                      handleSendAiPrompt("refactor");
                    }}
                    title="Refactor & optimize code"
                    className="h-7 px-2 rounded bg-[#D29922]/15 hover:bg-[#D29922]/25 text-[#E3B341] border border-[#D29922]/30 text-[11px] font-mono flex items-center gap-1 transition-colors"
                  >
                    <Bot className="w-3 h-3 text-[#E3B341]" />
                    <span>Refactor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActivityTab("ai");
                      setSidebarCollapsed(false);
                      handleSendAiPrompt("tests");
                    }}
                    title="Generate automated test suite"
                    className="h-7 px-2 rounded bg-[#A371F7]/15 hover:bg-[#A371F7]/25 text-[#D2A8FF] border border-[#A371F7]/30 text-[11px] font-mono flex items-center gap-1 transition-colors"
                  >
                    <Code2 className="w-3 h-3 text-[#D2A8FF]" />
                    <span>Tests</span>
                  </button>
                </div>
              )}

              <div className="flex rounded-md bg-[#0D1117] border border-[#30363D] p-0.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setEditorMode("syntax")}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                    editorMode === "syntax" ? "bg-[#1F6FEB] text-white" : "text-[#8B949E]"
                  }`}
                  title="View code with VS Code syntax highlighting"
                >
                  <Code2 className="w-3 h-3" />
                  <span>Syntax</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode("editor")}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                    editorMode === "editor" ? "bg-[#1F6FEB] text-white" : "text-[#8B949E]"
                  }`}
                  title="Live editable code editor"
                >
                  <FileCode className="w-3 h-3" />
                  <span>Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode("split-diff")}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                    editorMode === "split-diff" ? "bg-[#1F6FEB] text-white" : "text-[#8B949E]"
                  }`}
                  title="Side-by-side git diff view"
                >
                  <Columns className="w-3 h-3" />
                  <span>Split Diff</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode("unified-diff")}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                    editorMode === "unified-diff" ? "bg-[#1F6FEB] text-white" : "text-[#8B949E]"
                  }`}
                  title="Unified git diff view"
                >
                  <AlignJustify className="w-3 h-3" />
                  <span>Unified</span>
                </button>
              </div>

              {activeFile?.isModified && (
                <div className="flex items-center gap-1 ml-1">
                  <button
                    type="button"
                    onClick={handleSaveFile}
                    title="Save changes to disk / working tree"
                    className="h-7 px-2.5 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold flex items-center gap-1 font-mono transition-colors shadow-sm"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDiscardChange(activeFile.path)}
                    title="Discard changes and revert to original"
                    className="h-7 px-2 rounded bg-[#21262D] hover:bg-[#F85149]/20 hover:text-[#F85149] text-[#8B949E] text-xs flex items-center gap-1 font-mono transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Revert</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Breadcrumb Path */}
          {activeFile && (
            <div className="h-6 px-4 bg-[#0D1117] border-b border-[#30363D]/40 flex items-center gap-1.5 text-[11px] font-mono text-[#8B949E] select-none">
              <span className="text-[#58A6FF]">{repoDisplayName}</span>
              <ChevronRight className="w-3 h-3" />
              {activeFile.path.split("/").map((part, i, arr) => (
                <React.Fragment key={`${part}-${i}`}>
                  <span className={i === arr.length - 1 ? "text-[#F0F6FC] font-semibold" : ""}>
                    {part}
                  </span>
                  {i < arr.length - 1 && <ChevronRight className="w-3 h-3" />}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Code Viewer / Diff Editor Container */}
          <div className="flex-1 overflow-auto bg-[#0D1117] relative">
            {!activeFile ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3 text-center p-8">
                <Code2 className="w-12 h-12 text-[#8B949E] opacity-30" />
                <div className="text-sm font-semibold text-[#8B949E]">
                  Select a file from Explorer to begin editing
                </div>
                <div className="text-xs text-[#8B949E]/70 font-mono">
                  Press Ctrl+Shift+E to toggle files
                </div>
              </div>
            ) : editorMode === "syntax" ? (
              /* Rich VS Code Syntax-Highlighted View with real colored tokens and line numbers */
              <div className="h-full w-full relative group">
                <VSCodeSyntaxHighlighter
                  code={activeFile.content}
                  filePath={activeFile.path}
                  className="h-full"
                />

                {/* Quick Edit Action Overlay */}
                <div className="absolute top-3 right-4 opacity-80 hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setEditorMode("editor")}
                    className="px-2.5 py-1 rounded bg-[#252526] hover:bg-[#333333] text-[#58A6FF] border border-[#3c3c3c] text-[11px] font-sans flex items-center gap-1.5 shadow-lg"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Click to Edit</span>
                  </button>
                </div>
              </div>
            ) : editorMode === "editor" ? (
              /* Standard Code Editor */
              <div className="flex h-full min-h-full font-mono text-xs">
                {/* Line Numbers */}
                <div className="w-12 bg-[#1e1e1e] border-r border-[#2d2d2d] text-[#858585] text-right py-3 pr-3 select-none shrink-0 space-y-1">
                  {activeFile.content.split("\n").map((_, i) => (
                    <div key={i} className="leading-5">
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Editable Code Area */}
                <textarea
                  value={activeFile.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  spellCheck={false}
                  className="flex-1 h-full p-3 bg-[#1e1e1e] text-[#d4d4d4] leading-5 font-mono resize-none focus:outline-none whitespace-pre overflow-auto"
                />
              </div>
            ) : editorMode === "split-diff" ? (
              /* Side-by-Side Split Diff */
              <div className="grid grid-cols-2 h-full divide-x divide-[#30363D] font-mono text-xs overflow-auto">
                {/* Original Base File */}
                <div className="p-3 bg-[#161B22]/40 overflow-auto">
                  <div className="pb-2 mb-2 border-b border-[#30363D] text-[#FF7B72] font-semibold text-[11px]">
                    Base (Original) · {branch}
                  </div>
                  <div className="space-y-0.5">
                    {activeFile.originalContent.split("\n").map((line, idx) => (
                      <div key={idx} className="leading-5 text-[#8B949E] flex gap-2">
                        <span className="w-8 text-right select-none text-[#8B949E]/50">
                          {idx + 1}
                        </span>
                        <span>{highlightLine(line, activeFile.path)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modified Working File */}
                <div className="p-3 bg-[#0D1117] overflow-auto">
                  <div className="pb-2 mb-2 border-b border-[#30363D] text-[#7EE787] font-semibold text-[11px]">
                    Working Tree (Modified)
                  </div>
                  <div className="space-y-0.5">
                    {activeFile.content.split("\n").map((line, idx) => {
                      const origLines = activeFile.originalContent.split("\n");
                      const isAdded = !origLines.includes(line);
                      return (
                        <div
                          key={idx}
                          className={`leading-5 flex gap-2 ${
                            isAdded ? "bg-[#238636]/20 text-[#7EE787]" : "text-[#F0F6FC]"
                          }`}
                        >
                          <span className="w-8 text-right select-none text-[#8B949E]/50">
                            {idx + 1}
                          </span>
                          <span>{highlightLine(line, activeFile.path)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Unified Git Diff */
              <div className="h-full bg-[#0D1117] p-3 overflow-auto">
                <div className="text-[11px] text-[#58A6FF] font-semibold pb-2 mb-3 border-b border-[#30363D] flex items-center justify-between">
                  <span>Unified Git Diff · {activeFile.path}</span>
                  <span className="text-[10px] text-[#8B949E] font-mono">VS Code Diff Engine</span>
                </div>
                {workingChanges.find((c) => c.path === activeFile.path)?.diff ? (
                  <VSCodeDiffViewer
                    diff={workingChanges.find((c) => c.path === activeFile.path)!.diff}
                    filePath={activeFile.path}
                    maxHeight="100%"
                  />
                ) : activeFile.content !== activeFile.originalContent ? (
                  <div className="space-y-1 font-mono text-xs">
                    {activeFile.content.split("\n").map((line, idx) => {
                      const origLines = activeFile.originalContent.split("\n");
                      const isAdded = !origLines.includes(line);
                      return (
                        <div
                          key={idx}
                          className={`leading-5 px-2 py-0.5 rounded font-mono ${
                            isAdded
                              ? "bg-[#238636]/20 text-[#7EE787]"
                              : "text-[#8B949E]"
                          }`}
                        >
                          <span className="select-none mr-2 font-bold">
                            {isAdded ? "+" : " "}
                          </span>
                          <span>{highlightLine(line, activeFile.path)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs font-mono text-[#8B949E] bg-[#161B22]/50 rounded-lg border border-[#30363D]">
                    No uncommitted changes for {activeFile.name}. Edit the file in Code Editor mode and press Ctrl+S to stage changes.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Collapsible Bottom Panel (Terminal / Git Output) */}
          {bottomPanelOpen && (
            <div className="h-48 bg-[#161B22] border-t border-[#30363D] flex flex-col shrink-0">
              <div className="h-8 px-3 border-b border-[#30363D] flex items-center justify-between select-none">
                <div className="flex items-center gap-3 text-xs font-mono">
                  {(["terminal", "git", "ai-trace", "problems"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setBottomTab(tab)}
                      className={`uppercase font-semibold tracking-wider transition-colors ${
                        bottomTab === tab
                          ? "text-[#58A6FF] border-b-2 border-[#58A6FF]"
                          : "text-[#8B949E] hover:text-[#C9D1D9]"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setBottomPanelOpen(false)}
                  className="text-[#8B949E] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {bottomTab === "terminal" && (
                <div className="flex-1 p-3 font-mono text-xs overflow-y-auto space-y-1 bg-[#0D1117]">
                  {terminalHistory.map((line, idx) => (
                    <div key={idx} className="leading-relaxed text-[#C9D1D9]">
                      {line}
                    </div>
                  ))}
                  <form onSubmit={handleTerminalCommand} className="flex items-center gap-2 pt-1">
                    <span className="text-[#3FB950]">developer@jgitlab:~$</span>
                    <input
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      className="flex-1 bg-transparent text-[#F0F6FC] focus:outline-none font-mono"
                      autoFocus
                    />
                  </form>
                </div>
              )}

              {bottomTab === "git" && (
                <div className="flex-1 p-3 font-mono text-xs overflow-y-auto space-y-1 bg-[#0D1117] text-[#8B949E]">
                  <div>[git] Branch: {branch}</div>
                  <div>[git] Remote: origin/{branch}</div>
                  <div>[git] Active changes: {workingChanges.length} uncommitted file(s)</div>
                </div>
              )}

              {bottomTab === "ai-trace" && (
                <div className="flex-1 p-3 font-mono text-xs overflow-y-auto space-y-1 bg-[#0D1117] text-[#58A6FF]">
                  <div>[ai-engine] Autonomous Copilot active on {activeFile?.name || "none"}</div>
                  <div>[ai-engine] Model runtime: Gemini 2.5 Pro / Autonomous Coder</div>
                  <div>[ai-engine] Context window tokens: 32,768</div>
                </div>
              )}

              {bottomTab === "problems" && (
                <div className="flex-1 p-3 font-mono text-xs overflow-y-auto bg-[#0D1117] text-[#3FB950] flex items-center justify-center">
                  <span>No errors or syntax warnings found in active project files.</span>
                </div>
              )}
            </div>
          )}

          {/* 5. VS Code Status Bar (Bottom 24px) */}
          <div className="h-6 bg-[#161B22] border-t border-[#30363D] px-3 flex items-center justify-between text-[11px] font-mono select-none text-[#8B949E]">
            {/* Left */}
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-[#58A6FF] hover:text-white cursor-pointer">
                <GitBranch className="w-3 h-3" />
                <span>{branch}</span>
              </span>

              <span className="flex items-center gap-1 text-[#C9D1D9]">
                <RotateCcw className="w-3 h-3 text-[#D29922]" />
                <span>{workingChanges.length} changes</span>
              </span>

              <span className="flex items-center gap-1 text-[#3FB950]">
                <span>0 ⊗ 0 ⚠</span>
              </span>
            </div>

            {/* Center */}
            <div className="hidden sm:flex items-center gap-1.5 text-[#58A6FF]">
              <Sparkles className="w-3 h-3" />
              <span>JGitLab AI Copilot: Ready</span>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <span>Ln {activeFile ? activeFile.content.split("\n").length : 1}, Col 1</span>
              <span>Spaces: 2</span>
              <span>UTF-8</span>
              <span>LF</span>
              <span className="text-[#58A6FF]">TypeScript React</span>
              <span className="text-[#3FB950]">Prettier</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RepositoryExplorerPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-[#8B949E] font-mono">
          Loading Code Explorer...
        </div>
      }
    >
      <RepositoryExplorerContent />
    </Suspense>
  );
}
