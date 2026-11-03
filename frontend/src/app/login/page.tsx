"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, getOAuthStartUrl } from "@/lib/api";
import { AuthProvidersStatus } from "@/lib/types";
import {
  AuthSplitShell,
  GoogleLogo,
  GitHubLogo,
  OAUTH_ERROR_MESSAGES,
  OAuthSetupModal,
} from "@/components/auth/AuthSplitShell";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
  Mail,
  ShieldCheck,
} from "lucide-react";

function LoginContent() {
  const { user, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [oauthRedirecting, setOauthRedirecting] = useState<"google" | "github" | null>(null);
  const [providers, setProviders] = useState<AuthProvidersStatus | null>(null);
  const [setupModalProvider, setSetupModalProvider] = useState<"google" | "github" | null>(null);

  const nextPath = searchParams.get("next") || "/dashboard";

  useEffect(() => {
    if (user) {
      router.replace(nextPath);
    }
  }, [user, router, nextPath]);

  useEffect(() => {
    api
      .getAuthProviders()
      .then(setProviders)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const authError = searchParams.get("auth_error") || searchParams.get("error");
    const authDesc = searchParams.get("auth_error_description");
    if (authError === "google_not_configured") {
      setSetupModalProvider("google");
    } else if (authError === "github_not_configured") {
      setSetupModalProvider("github");
    } else if (authError) {
      const mapped = OAUTH_ERROR_MESSAGES[authError];
      setErrorTitle(mapped?.title || "Authentication Error");
      setError(mapped?.detail || authDesc || "Unable to complete sign-in. Please try again.");
    }
  }, [searchParams]);

  const handleOAuthLogin = (provider: "google" | "github") => {
    setError(null);
    setErrorTitle(null);
    if (providers && ((provider === "google" && !providers.google_enabled) || (provider === "github" && !providers.github_enabled))) {
      setSetupModalProvider(provider);
      return;
    }
    setOauthRedirecting(provider);
    window.location.href = getOAuthStartUrl(provider, {
      intent: "login",
      next: nextPath,
    });
  };

  const handleInstantDemoLogin = async () => {
    await login("admin@jgitlab.local", "JGitLab2026!Admin");
    setSetupModalProvider(null);
    router.push(nextPath);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorTitle(null);

    if (!email.trim() || !password) {
      setError("Please enter both your email address and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.push(nextPath);
    } catch (err: any) {
      setErrorTitle("Sign-in failed");
      setError(err.message || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoCredentials = () => {
    setShowEmailForm(true);
    setEmail("admin@jgitlab.local");
    setPassword("JGitLab2026!Admin");
    setError(null);
    setErrorTitle(null);
  };

  return (
    <AuthSplitShell>
      <div>
        <div className="mb-7">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Sign in to JGitLab
          </h2>
          <p className="mt-1.5 text-sm text-gray-400">
            Authenticate with your identity provider or workspace credentials.
          </p>
        </div>

        {/* Error / Status Banner */}
        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-md bg-red-500/[0.08] border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {errorTitle && <p className="font-semibold text-red-300">{errorTitle}</p>}
              <p className="text-red-200/90 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Required OAuth Authentication Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => handleOAuthLogin("google")}
            disabled={oauthRedirecting !== null || submitting}
            className="w-full h-10 px-4 rounded-md bg-[#121723] hover:bg-[#171E2E] border border-white/[0.09] hover:border-white/[0.16] text-sm font-medium text-white flex items-center justify-center gap-3 transition-all disabled:opacity-60"
          >
            {oauthRedirecting === "google" ? (
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
            ) : (
              <GoogleLogo className="w-4 h-4" />
            )}
            <span>Continue with Google</span>
            {providers && !providers.google_enabled && (
              <span className="ml-auto text-[10px] font-mono text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                Setup Needed
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleOAuthLogin("github")}
            disabled={oauthRedirecting !== null || submitting}
            className="w-full h-10 px-4 rounded-md bg-[#121723] hover:bg-[#171E2E] border border-white/[0.09] hover:border-white/[0.16] text-sm font-medium text-white flex items-center justify-center gap-3 transition-all disabled:opacity-60"
          >
            {oauthRedirecting === "github" ? (
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
            ) : (
              <GitHubLogo className="w-4 h-4 text-white" />
            )}
            <span>Continue with GitHub</span>
            {providers && !providers.github_enabled && (
              <span className="ml-auto text-[10px] font-mono text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                Setup Needed
              </span>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/[0.07]" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setShowEmailForm((v) => !v)}
              className="bg-[#06080D] px-3 text-gray-500 hover:text-gray-300 font-mono flex items-center gap-1.5 transition-colors"
            >
              <Mail className="w-3 h-3" />
              <span>Continue with Email</span>
            </button>
          </div>
        </div>

        {/* Email & Password Form */}
        {showEmailForm && (
          <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-gray-300 mb-1.5"
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full h-10 px-3.5 rounded-md bg-[#0C1018] border border-white/[0.09] focus:border-violet-500/60 text-sm text-white placeholder:text-gray-600 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-medium text-gray-300"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="text-[11px] font-mono text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Use Demo Architect Account
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
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
            </div>

            <button
              type="submit"
              disabled={submitting || oauthRedirecting !== null}
              className="w-full h-10 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign in with Email</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Security Note & Registration Link */}
        <div className="mt-6 pt-5 border-t border-white/[0.06] space-y-3">
          <div className="flex items-start gap-2 text-[11px] text-gray-500 leading-relaxed">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              Signing in with GitHub authenticates your identity only. Repository access is configured separately via the GitHub App.
            </span>
          </div>

          <p className="text-xs text-gray-400 text-center pt-1">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              Create an engineering account
            </Link>
          </p>
        </div>

        <OAuthSetupModal
          provider={setupModalProvider}
          nextPath={nextPath}
          onClose={() => setSetupModalProvider(null)}
          onConfigured={(updated) => setProviders(updated)}
          onInstantDemoLogin={handleInstantDemoLogin}
        />
      </div>
    </AuthSplitShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#06080D] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
