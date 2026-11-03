"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { MemoryRecord } from "@/lib/types";
import {
  Brain,
  Search,
  Plus,
  Trash2,
  Tag,
  BookOpen,
  X,
  Filter,
  CheckCircle2,
  Sparkles
} from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All Memories" },
  { id: "architecture", label: "Architecture" },
  { id: "adr", label: "ADRs (Decisions)" },
  { id: "tech_stack", label: "Tech Stack" },
  { id: "bug_fix", label: "Bug Fixes" },
  { id: "task_learning", label: "Task Learnings" },
];

export default function EngineeringMemoryPage() {
  const { activeProject } = useAuth();
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"architecture" | "adr" | "tech_stack" | "bug_fix" | "task_learning">("architecture");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMemories = async () => {
    if (!activeProject) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const cat = selectedCategory === "all" ? undefined : selectedCategory;
      const data = await api.getMemories(activeProject.id, cat);
      setMemories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, [activeProject, selectedCategory]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    if (!searchQuery.trim()) {
      loadMemories();
      return;
    }
    setLoading(true);
    try {
      const cat = selectedCategory === "all" ? undefined : selectedCategory;
      const results = await api.searchMemories({
        project_id: activeProject.id,
        query: searchQuery,
        category: cat,
      });
      setMemories(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) {
      setError("Please select or create an active project first.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      await api.createMemory({
        project_id: activeProject.id,
        category,
        title,
        content,
        summary: summary || undefined,
        tags,
      });
      setIsCreating(false);
      setTitle("");
      setContent("");
      setSummary("");
      setTagsInput("");
      loadMemories();
    } catch (err: any) {
      setError(err.message || "Failed to create memory record");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this memory record?")) return;
    try {
      await api.deleteMemory(id);
      loadMemories();
    } catch (err: any) {
      alert(err.message || "Failed to delete memory record");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-400" />
            <span>Engineering Memory</span>
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Persistent project knowledge, architectural decisions, and task lessons injected into agent prompts.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-glow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Record Memory</span>
        </button>
      </div>

      {/* Search Bar & Category Filters */}
      <div className="space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search architecture, decisions, and lessons (semantic vector + keyword retrieval)..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-charcoal-900 border border-border text-xs text-white focus:outline-none focus:border-cyan-400 font-mono placeholder-gray-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-charcoal-850 hover:bg-charcoal-800 text-xs font-mono text-cyan-400 border border-border transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors border ${
                selectedCategory === cat.id
                  ? "bg-cyan-950/60 text-cyan-300 border-cyan-500/40 font-semibold"
                  : "bg-charcoal-900 text-muted border-border hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-charcoal-900 border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCreating(false)}
              className="absolute top-4 right-4 p-1 rounded hover:bg-charcoal-800 text-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-white mb-1">Record Engineering Memory</h2>
            <p className="text-xs text-muted mb-4">Add knowledge to guide future autonomous software agent tasks.</p>

            {error && <div className="p-3 mb-4 rounded-lg bg-red-950/40 text-red-400 text-xs">{error}</div>}

            <form onSubmit={handleCreateMemory} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. ADR-004: Fast WebSocket Protocol Schema"
                  className="w-full px-3 py-2 rounded-lg bg-charcoal-850 border border-border text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-charcoal-850 border border-border text-xs text-white focus:outline-none"
                >
                  <option value="architecture">Architecture</option>
                  <option value="adr">ADR (Architecture Decision Record)</option>
                  <option value="tech_stack">Tech Stack</option>
                  <option value="bug_fix">Bug Fix & Lesson</option>
                  <option value="task_learning">Task Learning</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">Summary (1-2 sentences)</label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Concise overview for swift agent retrieval..."
                  className="w-full px-3 py-2 rounded-lg bg-charcoal-850 border border-border text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">Content / Specification</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Detailed architectural context, decisions, tradeoffs, or fix history..."
                  className="w-full px-3 py-2 rounded-lg bg-charcoal-850 border border-border text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="websocket, protocol, architecture"
                  className="w-full px-3 py-2 rounded-lg bg-charcoal-850 border border-border text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
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
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white shadow-cyanGlow"
                >
                  {submitting ? "Saving..." : "Save Memory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Memory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {memories.map((m) => (
          <div
            key={m.id}
            className="p-5 rounded-2xl bg-charcoal-900 border border-border hover:border-cyan-500/30 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded bg-charcoal-850 text-cyan-300 text-[10px] font-mono uppercase border border-border">
                  {m.category}
                </span>
                <button
                  onClick={() => handleDeleteMemory(m.id)}
                  title="Delete memory"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-charcoal-800 text-muted hover:text-red-400 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <h3 className="font-bold text-sm text-white mb-2 leading-tight">{m.title}</h3>
              <p className="text-xs text-gray-300 leading-relaxed mb-4 font-mono bg-charcoal-950 p-2.5 rounded-lg border border-border/60 max-h-36 overflow-y-auto">
                {m.content}
              </p>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted">
              <div className="flex flex-wrap gap-1">
                {m.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-gray-400">
                    #{tag}
                  </span>
                ))}
              </div>
              <span>{new Date(m.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
