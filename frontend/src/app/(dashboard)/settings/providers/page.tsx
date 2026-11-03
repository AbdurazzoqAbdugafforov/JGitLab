"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { AIProviderConfig } from "@/lib/types";
import {
  Sliders,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Trash2,
  RefreshCw,
  Sparkles,
  Zap,
  Globe,
  Lock
} from "lucide-react";

const PRESET_ENDPOINTS = [
  { name: "OpenAI Official", url: "https://api.openai.com/v1", defaultModel: "gpt-4o" },
  { name: "OpenRouter Gateway", url: "https://openrouter.ai/api/v1", defaultModel: "anthropic/claude-3.5-sonnet" },
  { name: "Groq Cloud (Fast)", url: "https://api.groq.com/openai/v1", defaultModel: "llama-3.3-70b-versatile" },
  { name: "Local Ollama / vLLM", url: "http://localhost:11434/v1", defaultModel: "qwen2.5-coder:14b" },
];

export default function AIProviderSettingsPage() {
  const { activeProject } = useAuth();
  const [configs, setConfigs] = useState<AIProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [providerName, setProviderName] = useState("openai-compatible");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("gpt-4o");
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(4096);

  // Validation State
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    latency_ms: number;
    message: string;
    models_available: string[];
  } | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const data = await api.getProviders();
      setConfigs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, [activeProject]);

  const handleTestConnection = async () => {
    if (!baseUrl || !apiKey) {
      setError("Please provide both an API Base URL and an API Key to test connection.");
      return;
    }
    setValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      const res = await api.validateProvider({
        base_url: baseUrl,
        api_key: apiKey,
        model_name: modelName,
      });
      setValidationResult(res);
      if (!res.success) {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || "Connection validation failed.");
      setValidationResult({
        success: false,
        latency_ms: 0,
        message: err.message || "Connection failed.",
        models_available: [],
      });
    } finally {
      setValidating(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      setError("API Key is required.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      await api.createProvider({
        project_id: activeProject?.id,
        provider_name: providerName,
        base_url: baseUrl,
        api_key: apiKey,
        model_name: modelName,
        temperature,
        max_output_tokens: maxTokens,
      });
      setApiKey("");
      setValidationResult(null);
      await loadConfigs();
    } catch (err: any) {
      setError(err.message || "Failed to save provider configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this provider configuration?")) return;
    try {
      await api.deleteProvider(id);
      loadConfigs();
    } catch (err: any) {
      alert(err.message || "Failed to remove provider");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-violet-400" />
            <span>AI API Provider Settings</span>
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Configure external AI model endpoints. Credentials are encrypted on the backend and never exposed to the client.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {validationResult?.success && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
          <div>
            <span className="font-semibold block mb-0.5">
              Live Connection Verified ({validationResult.latency_ms}ms)
            </span>
            <span className="text-xs text-emerald-400/90">{validationResult.message}</span>
            {validationResult.models_available.length > 0 && (
              <div className="mt-2 text-[11px] font-mono text-emerald-300/80">
                Found {validationResult.models_available.length} models:{" "}
                {validationResult.models_available.slice(0, 5).join(", ")}...
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Configuration Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-charcoal-900 border border-border shadow-lg space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-muted flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-violet-400" />
                <span>Configure OpenAI-Compatible Endpoint</span>
              </span>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[11px] font-mono text-muted uppercase block mb-1.5">Quick Presets</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_ENDPOINTS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setBaseUrl(preset.url);
                      setModelName(preset.defaultModel);
                    }}
                    className="p-2 rounded-lg bg-charcoal-850 hover:bg-charcoal-800 border border-border text-left text-xs text-gray-300 transition-colors truncate"
                  >
                    <span className="font-semibold block truncate text-white">{preset.name}</span>
                    <span className="text-[10px] text-muted font-mono truncate block">{preset.defaultModel}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">API Base URL</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-muted absolute left-3.5 top-3" />
                  <input
                    type="url"
                    required
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-charcoal-850 border border-border text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">
                  API Key (Stored Encrypted with AES-Fernet)
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-muted absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-charcoal-850 border border-border text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
                <span className="block text-[11px] text-muted mt-1">
                  Keys are never returned in cleartext or logged.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-mono uppercase text-muted mb-1">Model Name</label>
                  <input
                    type="text"
                    required
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="gpt-4o"
                    className="w-full px-3 py-2 rounded-lg bg-charcoal-850 border border-border text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-muted mb-1">Temperature</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="2"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-charcoal-850 border border-border text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-muted mb-1">Max Tokens</label>
                  <input
                    type="number"
                    step="256"
                    min="256"
                    max="32768"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-charcoal-850 border border-border text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={validating || !apiKey}
                  onClick={handleTestConnection}
                  className="px-4 py-2 rounded-lg bg-charcoal-800 hover:bg-charcoal-700 text-cyan-400 border border-cyan-800/40 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {validating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>Validate Connection (Live Ping)</span>
                </button>

                <button
                  type="submit"
                  disabled={saving || !apiKey}
                  className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-glow transition-all disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>Save & Encrypt Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (5 cols): Saved Provider Configs */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-muted">Configured AI Providers ({configs.length})</span>
          </div>

          {configs.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-charcoal-900 border border-border text-xs text-muted">
              No AI provider configured yet. Fill out the form to connect your OpenAI-compatible API key.
            </div>
          ) : (
            <div className="space-y-3">
              {configs.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-charcoal-900 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="font-bold text-xs text-white">{c.model_name}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1 rounded text-muted hover:text-red-400 hover:bg-charcoal-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1 font-mono text-xs text-muted bg-charcoal-950 p-2.5 rounded-lg border border-border">
                    <div>
                      <span className="text-gray-500">Endpoint:</span> <span className="text-gray-300">{c.base_url}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Key:</span>{" "}
                      <span className="text-cyan-400">{c.api_key_masked}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Params:</span>{" "}
                      <span className="text-gray-300">
                        temp={c.temperature}, max={c.max_output_tokens}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-muted pt-1">
                    <span>
                      Status:{" "}
                      <span className={c.validation_status === "success" ? "text-emerald-400" : "text-amber-400"}>
                        {c.validation_status}
                      </span>
                    </span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
