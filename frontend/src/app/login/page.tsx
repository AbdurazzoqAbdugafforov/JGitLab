"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { ArrowRight, Lock, Mail, AlertCircle, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-charcoal-950 flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-400 flex items-center justify-center text-white font-mono font-bold text-2xl shadow-glow mb-4">
            J
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Sign in to JGitLab</h1>
          <p className="text-sm text-muted mt-1">Autonomous AI Software Engineering Platform</p>
        </div>

        {/* Card */}
        <div className="bg-charcoal-900 border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider mb-2 font-mono">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@jgitlab.io"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-charcoal-850 border border-border focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm text-white placeholder-gray-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider mb-2 font-mono">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-charcoal-850 border border-border focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm text-white placeholder-gray-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-glow hover:shadow-violet-600/50"
            >
              {loading ? "Authenticating..." : "Sign In"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Seed demo account quick fill */}
          <div className="mt-6 pt-6 border-t border-border">
            <span className="block text-xs font-mono text-muted mb-2">Pre-seeded developer accounts:</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemo("admin@jgitlab.local", "JGitLab2026!Admin")}
                className="p-2 rounded bg-charcoal-850 hover:bg-charcoal-800 text-left border border-border text-gray-300 font-mono transition-colors"
              >
                <span className="font-semibold text-violet-400 block">Lead Architect</span>
                admin@jgitlab.local
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("engineer@jgitlab.local", "JGitLab2026!Dev")}
                className="p-2 rounded bg-charcoal-850 hover:bg-charcoal-800 text-left border border-border text-gray-300 font-mono transition-colors"
              >
                <span className="font-semibold text-cyan-400 block">AI Engineer</span>
                engineer@jgitlab.local
              </button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-violet-400 hover:text-violet-300 font-medium">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
