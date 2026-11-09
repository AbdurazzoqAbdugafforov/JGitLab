"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, getOAuthStartUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AuthSplitShell, OAuthSetupModal, OAUTH_ERROR_MESSAGES } from "@/components/auth/AuthSplitShell";
import { JGitLabRefreshIcon } from "@/components/brand/JGitLabBrand";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Settings2,
  User as UserIcon,
  Mail,
  Lock,
  CheckCircle2,
} from "lucide-react";

function RegisterFormContent() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [providers, setProviders] = useState<{ google: boolean; github: boolean }>({
    google: false,
    github: false,
  });
  const [setupProvider, setSetupProvider] = useState<"google" | "github" | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();

  useEffect(() => {
    const authError = searchParams.get("auth_error") || searchParams.get("error");
    const authDesc = searchParams.get("auth_error_description") || searchParams.get("error_description");
    if (authError) {
      const mapped = OAUTH_ERROR_MESSAGES[authError];
      setError(mapped?.detail || authDesc || `Authentication failed (${authError}). Please try again.`);
    }
    api
      .getAuthProviders()
      .then((res) =>
        setProviders({
          google: Boolean(res.google_enabled),
          github: Boolean(res.github_enabled),
        })
      )
      .catch(() => {});
  }, [searchParams]);

  const checks = [
    { label: "10+ chars", pass: password.length >= 10 },
    { label: "Uppercase", pass: /[A-Z]/.test(password) },
    { label: "Number", pass: /[0-9]/.test(password) },
    { label: "Symbol", pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const strengthScore = checks.filter((c) => c.pass).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await register(email.trim(), password, fullName.trim());
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check your details.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuthLogin = (provider: "google" | "github") => {
    if (!providers[provider]) {
      setSetupProvider(provider);
      return;
    }
    setOauthLoading(provider);
    setError(null);
    window.location.href = getOAuthStartUrl(provider, { intent: "login", next: "/dashboard" });
  };

  return (
    <AuthSplitShell
      mode="register"
      title="Initialize Your Workspace"
      subtitle="Provision your personal organization, sandbox runner, and AI engineering agent."
      footerText="Already have a workspace?"
      footerLinkText="Sign in instead"
      footerLinkHref="/login"
    >
      <div className="space-y-5">
        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start space-x-2.5 text-red-300 text-xs"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* OAuth 2.0 Quick Provisioning */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleOAuthLogin("google")}
            disabled={oauthLoading !== null || submitting}
            className="w-full py-2.5 px-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 rounded-xl text-white text-xs font-medium flex items-center justify-between transition-all disabled:opacity-50"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>{oauthLoading === "google" ? "Redirecting..." : "Google"}</span>
            </div>
            {providers.google ? (
              <span className="w-2 h-2 rounded-full bg-[#3FB950]" />
            ) : (
              <Settings2 className="w-3.5 h-3.5 text-[#58A6FF]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleOAuthLogin("github")}
            disabled={oauthLoading !== null || submitting}
            className="w-full py-2 px-3 bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] hover:border-[#8B949E] rounded-md text-[#F0F6FC] text-xs font-medium flex items-center justify-between transition-all disabled:opacity-50"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>{oauthLoading === "github" ? "Redirecting..." : "GitHub"}</span>
            </div>
            {providers.github ? (
              <span className="w-2 h-2 rounded-full bg-[#3FB950]" />
            ) : (
              <Settings2 className="w-3.5 h-3.5 text-[#58A6FF]" />
            )}
          </button>
        </div>

        <div className="relative flex items-center py-0.5">
          <div className="flex-grow border-t border-[#30363D]" />
          <span className="flex-shrink mx-3 text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
            or register with work email
          </span>
          <div className="flex-grow border-t border-[#30363D]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="register-name"
              className="block text-[11px] font-mono uppercase tracking-wider text-[#8B949E] mb-1.5"
            >
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-[#8B949E] absolute left-3 top-2.5 pointer-events-none" />
              <input
                id="register-name"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ada Lovelace"
                className="w-full pl-9 pr-4 py-2 rounded-md bg-[#0D1117] border border-[#30363D] focus:border-[#58A6FF] focus:outline-none text-sm text-[#F0F6FC] placeholder-[#6E7681] transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="block text-[11px] font-mono uppercase tracking-wider text-[#8B949E] mb-1.5"
            >
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8B949E] absolute left-3 top-2.5 pointer-events-none" />
              <input
                id="register-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ada@analytical-engine.org"
                className="w-full pl-9 pr-4 py-2 rounded-md bg-[#0D1117] border border-[#30363D] focus:border-[#58A6FF] focus:outline-none text-sm text-[#F0F6FC] placeholder-[#6E7681] transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="register-password"
              className="block text-[11px] font-mono uppercase tracking-wider text-[#8B949E] mb-1.5"
            >
              Password (Min. 10 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8B949E] absolute left-3 top-2.5 pointer-events-none" />
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={10}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2 rounded-md bg-[#0D1117] border border-[#30363D] focus:border-[#58A6FF] focus:outline-none text-sm text-[#F0F6FC] placeholder-[#6E7681] transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-2 text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* 4-Segment Live Password Strength Bar */}
            <div className="mt-2.5 space-y-2">
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`h-1 rounded-full transition-colors ${
                      idx < strengthScore
                        ? strengthScore >= 3
                          ? "bg-[#3FB950]"
                          : "bg-[#58A6FF]"
                        : "bg-[#21262D]"
                    }`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px] font-mono">
                {checks.map((c) => (
                  <span
                    key={c.label}
                    className={`flex items-center space-x-1 ${
                      c.pass ? "text-[#3FB950]" : "text-[#6E7681]"
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>{c.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 jgitlab-btn-glow disabled:opacity-50 text-white font-semibold rounded-md flex items-center justify-center space-x-2 transition-all text-sm"
          >
            {submitting ? <JGitLabRefreshIcon size="xs" spinning={true} /> : null}
            <span>{submitting ? "Provisioning Workspace..." : "Create Account & Workspace"}</span>
            {submitting ? null : <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>

      <OAuthSetupModal
        provider={setupProvider}
        onClose={() => setSetupProvider(null)}
        onConfigured={() => {
          const target = setupProvider;
          setSetupProvider(null);
          if (target) {
            setProviders((prev) => ({ ...prev, [target]: true }));
            window.location.href = getOAuthStartUrl(target, { intent: "login", next: "/dashboard" });
          }
        }}
      />
    </AuthSplitShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090E] flex items-center justify-center">
          <JGitLabRefreshIcon size="lg" spinning={true} />
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  );
}
