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
import { JGitLabRefreshIcon } from "@/components/brand/JGitLabBrand";

const PRESET_ENDPOINTS = [
  { name: "Groq Cloud (Fast & Free Tier)", url: "https://api.groq.com/openai/v1", defaultModel: "llama-3.3-70b-versatile", provider: "openai-compatible", defaultKey: "" },
  { name: "Google Gemini (OpenAI Compat)", url: "https://generativelanguage.googleapis.com/v1beta/openai/", defaultModel: "gemini-1.5-flash", provider: "openai-compatible", defaultKey: "" },
  { name: "OpenAI Official", url: "https://api.openai.com/v1", defaultModel: "gpt-4o", provider: "openai-compatible", defaultKey: "" },
  { name: "DeepSeek API", url: "https://api.deepseek.com/v1", defaultModel: "deepseek-chat", provider: "openai-compatible", defaultKey: "" },
  { name: "OpenRouter Gateway", url: "https://openrouter.ai/api/v1", defaultModel: "anthropic/claude-3.5-sonnet", provider: "openai-compatible", defaultKey: "" },
  { name: "Local Ollama / vLLM", url: "http://localhost:11434/v1", defaultModel: "qwen2.5-coder:14b", provider: "openai-compatible", defaultKey: "ollama" },
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#30363D]">
        <div>
          <h1 className="text-xl font-bold text-[#F0F6FC] tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#58A6FF]" />
            <span>AI API Provider Settings</span>
          </h1>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Configure external AI model endpoints. Credentials are encrypted on the backend and never exposed to the client.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#F85149]/10 border border-[#F85149]/30 text-[#F85149] text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {validationResult?.success && (
        <div className="p-4 rounded-xl bg-[#238636]/15 border border-[#238636]/40 text-[#3FB950] text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#3FB950]" />
          <div>
            <span className="font-semibold block mb-0.5">
              Live Connection Verified ({validationResult.latency_ms}ms)
            </span>
            <span className="text-xs text-[#3FB950]/90">{validationResult.message}</span>
            {validationResult.models_available.length > 0 && (
              <div className="mt-2 text-[11px] font-mono text-[#3FB950]/80">
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
          <div className="p-6 rounded-2xl bg-[#161B22] border border-[#30363D] shadow-lg space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#8B949E] flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[#58A6FF]" />
                <span>Configure OpenAI-Compatible Endpoint</span>
              </span>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[11px] font-mono text-[#8B949E] uppercase block mb-1.5">Quick Presets</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRESET_ENDPOINTS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setBaseUrl(preset.url);
                      setModelName(preset.defaultModel);
                      setProviderName(preset.provider);
                      if (preset.defaultKey) setApiKey(preset.defaultKey);
                    }}
                    className={`p-2 rounded-lg border text-left text-xs transition-colors truncate ${
                      baseUrl === preset.url
                        ? "bg-[#1F6FEB]/15 border-[#1F6FEB]/50 text-[#F0F6FC]"
                        : "bg-[#0D1117] hover:bg-[#21262D] border-[#30363D] text-[#C9D1D9]"
                    }`}
                  >
                    <span className="font-semibold block truncate text-[#F0F6FC]">{preset.name}</span>
                    <span className="text-[10px] text-[#8B949E] font-mono truncate block">{preset.defaultModel}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[#8B949E] mb-1">API Base URL</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-[#8B949E] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] focus:outline-none focus:border-[#58A6FF] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#8B949E] mb-1">
                  API Key (Stored Encrypted with AES-Fernet)
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-[#8B949E] absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] focus:outline-none focus:border-[#58A6FF] font-mono"
                  />
                </div>
                <span className="block text-[11px] text-[#8B949E] mt-1">
                  Keys are never returned in cleartext or logged.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-mono uppercase text-[#8B949E] mb-1">Model Name</label>
                  <input
                    type="text"
                    required
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="gpt-4o"
                    className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] focus:outline-none focus:border-[#58A6FF] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-[#8B949E] mb-1">Temperature</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="2"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] focus:outline-none focus:border-[#58A6FF] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-[#8B949E] mb-1">Max Tokens</label>
                  <input
                    type="number"
                    step="256"
                    min="256"
                    max="32768"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] focus:outline-none focus:border-[#58A6FF] font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={validating || !apiKey}
                  onClick={handleTestConnection}
                  className="px-4 py-2 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#58A6FF] border border-[#30363D] text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {validating ? <JGitLabRefreshIcon size="xs" spinning={true} /> : <Zap className="w-3.5 h-3.5" />}
                  <span>Validate Connection (Live Ping)</span>
                </button>

                <button
                  type="submit"
                  disabled={saving || !apiKey}
                  className="px-5 py-2 rounded-lg bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_4px_14px_rgba(31,111,235,0.35)] transition-all disabled:opacity-50"
                >
                  {saving ? <JGitLabRefreshIcon size="xs" spinning={true} /> : <Lock className="w-3.5 h-3.5" />}
                  <span>Save & Encrypt Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (5 cols): Saved Provider Configs */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#8B949E]">Configured AI Providers ({configs.length})</span>
          </div>

          {configs.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-[#161B22] border border-[#30363D] text-xs text-[#8B949E]">
              No AI provider configured yet. Fill out the form to connect your OpenAI-compatible API key.
            </div>
          ) : (
            <div className="space-y-3">
              {configs.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-[#161B22] border border-[#30363D] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#3FB950]" />
                      <span className="font-bold text-xs text-[#F0F6FC]">{c.model_name}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1 rounded text-[#8B949E] hover:text-[#F85149] hover:bg-[#21262D]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1 font-mono text-xs text-[#8B949E] bg-[#0D1117] p-2.5 rounded-lg border border-[#30363D]">
                    <div>
                      <span className="text-[#8B949E]">Endpoint:</span> <span className="text-[#C9D1D9]">{c.base_url}</span>
                    </div>
                    <div>
                      <span className="text-[#8B949E]">Key:</span>{" "}
                      <span className="text-[#58A6FF]">{c.api_key_masked}</span>
                    </div>
                    <div>
                      <span className="text-[#8B949E]">Params:</span>{" "}
                      <span className="text-[#C9D1D9]">
                        temp={c.temperature}, max={c.max_output_tokens}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8B949E] pt-1">
                    <span>
                      Status:{" "}
                      <span className={c.validation_status === "success" ? "text-[#3FB950]" : "text-[#D29922]"}>
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
