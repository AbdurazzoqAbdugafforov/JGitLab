"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, getOAuthStartUrl } from "@/lib/api";
import { AuthProvidersStatus } from "@/lib/types";
import {
  AuthSplitShell,
  GoogleLogo,
  GitHubLogo,
  OAuthSetupModal,
} from "@/components/auth/AuthSplitShell";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function RegisterPage() {
  const { user, register, login } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [oauthRedirecting, setOauthRedirecting] = useState<"google" | "github" | null>(null);
  const [providers, setProviders] = useState<AuthProvidersStatus | null>(null);
  const [setupModalProvider, setSetupModalProvider] = useState<"google" | "github" | null>(null);

  useEffect(() => {
    if (user) {
      router.replace("/onboarding");
    }
  }, [user, router]);

  useEffect(() => {
    api
      .getAuthProviders()
      .then(setProviders)
      .catch(() => {});
  }, []);

  const handleOAuthSignup = (provider: "google" | "github") => {
    setError(null);
    if (providers && ((provider === "google" && !providers.google_enabled) || (provider === "github" && !providers.github_enabled))) {
      setSetupModalProvider(provider);
      return;
    }
    setOauthRedirecting(provider);
    window.location.href = getOAuthStartUrl(provider, {
      intent: "login",
      next: "/onboarding",
    });
  };

  const handleInstantDemoLogin = async () => {
    await login("admin@jgitlab.local", "JGitLab2026!Admin");
    setSetupModalProvider(null);
    router.push("/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter a valid work or personal email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setSubmitting(true);
    try {
      await register(email.trim(), password, fullName.trim() || undefined);
      router.push("/onboarding");
    } catch (err: any) {
      setError(err.message || "Could not create account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitShell>
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Create your workspace account
          </h2>
          <p className="mt-1.5 text-sm text-gray-400">
            Start building with an autonomous AI software engineering workspace.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-md bg-red-500/[0.08] border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* OAuth Registration Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => handleOAuthSignup("google")}
            disabled={oauthRedirecting !== null || submitting}
            className="w-full h-10 px-4 rounded-md bg-[#121723] hover:bg-[#171E2E] border border-white/[0.09] hover:border-white/[0.16] text-sm font-medium text-white flex items-center justify-center gap-3 transition-all disabled:opacity-60"
          >
            {oauthRedirecting === "google" ? (
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
            ) : (
              <GoogleLogo className="w-4 h-4" />
            )}
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            onClick={() => handleOAuthSignup("github")}
            disabled={oauthRedirecting !== null || submitting}
            className="w-full h-10 px-4 rounded-md bg-[#121723] hover:bg-[#171E2E] border border-white/[0.09] hover:border-white/[0.16] text-sm font-medium text-white flex items-center justify-center gap-3 transition-all disabled:opacity-60"
          >
            {oauthRedirecting === "github" ? (
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
            ) : (
              <GitHubLogo className="w-4 h-4 text-white" />
            )}
            <span>Continue with GitHub</span>
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/[0.07]" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
            <span className="bg-[#06080D] px-3 text-gray-500 font-mono">
              Or register with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="reg-name"
              className="block text-xs font-medium text-gray-300 mb-1.5"
            >
              Full name
            </label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ada Lovelace"
              className="w-full h-10 px-3.5 rounded-md bg-[#0C1018] border border-white/[0.09] focus:border-violet-500/60 text-sm text-white placeholder:text-gray-600 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="reg-email"
              className="block text-xs font-medium text-gray-300 mb-1.5"
            >
              Work or personal email
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="engineer@company.com"
              className="w-full h-10 px-3.5 rounded-md bg-[#0C1018] border border-white/[0.09] focus:border-violet-500/60 text-sm text-white placeholder:text-gray-600 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="reg-password"
              className="block text-xs font-medium text-gray-300 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full h-10 pl-3.5 pr-10 rounded-md bg-[#0C1018] border border-white/[0.09] focus:border-violet-500/60 text-sm text-white placeholder:text-gray-600 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-500">
              <CheckCircle2
                className={`w-3.5 h-3.5 ${
                  password.length >= 8 ? "text-emerald-400" : "text-gray-600"
                }`}
              />
              <span>At least 8 characters hashed with Argon2</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || oauthRedirecting !== null}
            className="w-full h-10 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating workspace...</span>
              </>
            ) : (
              <>
                <span>Create Account &amp; Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 pt-5 border-t border-white/[0.06] text-xs text-gray-400 text-center">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>

        <OAuthSetupModal
          provider={setupModalProvider}
          nextPath="/onboarding"
          onClose={() => setSetupModalProvider(null)}
          onConfigured={(updated) => setProviders(updated)}
          onInstantDemoLogin={handleInstantDemoLogin}
        />
      </div>
    </AuthSplitShell>
  );
}
