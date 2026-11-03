"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, getOAuthStartUrl } from "@/lib/api";
import {
  IdentityAccount,
  UserSession,
  GitHubConnectionStatus,
  AIProviderConfig,
} from "@/lib/types";
import {
  GoogleLogo,
  GitHubLogo,
  OAUTH_ERROR_MESSAGES,
} from "@/components/auth/AuthSplitShell";
import {
  User as UserIcon,
  Shield,
  Plug,
  CheckCircle2,
  AlertTriangle,
  Link2,
  Unlink,
  Monitor,
  KeyRound,
  LogOut,
  Loader2,
  ExternalLink,
} from "lucide-react";

function AccountSettingsContent() {
  const { user, refreshUser, logout } = useAuth();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"account" | "integrations" | "security">("account");
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [identities, setIdentities] = useState<IdentityAccount[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [ghStatus, setGhStatus] = useState<GitHubConnectionStatus | null>(null);
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadAccountData = async () => {
    try {
      const [idList, sessList, gh, provs] = await Promise.all([
        api.getIdentities().catch(() => []),
        api.getSessions().catch(() => []),
        api.getGitHubStatus().catch(() => null),
        api.getProviders().catch(() => []),
      ]);
      setIdentities(idList);
      setSessions(sessList);
      setGhStatus(gh);
      setProviders(provs);
    } catch {}
  };

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setAvatarUrl(user.avatar_url || "");
    }
    loadAccountData();
  }, [user]);

  useEffect(() => {
    const linked = searchParams.get("linked");
    const authError = searchParams.get("auth_error");
    const authDesc = searchParams.get("auth_error_description");
    if (linked) {
      setBanner({
        type: "success",
        text: `Successfully linked ${linked.toUpperCase()} sign-in to your account.`,
      });
      refreshUser();
      loadAccountData();
    } else if (authError) {
      const mapped = OAUTH_ERROR_MESSAGES[authError];
      setBanner({
        type: "error",
        text: mapped?.detail || authDesc || `Could not link provider (${authError}).`,
      });
    }
  }, [searchParams, refreshUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setBanner(null);
    try {
      await api.updateProfile({ full_name: fullName, avatar_url: avatarUrl });
      await refreshUser();
      setBanner({ type: "success", text: "Account profile updated." });
    } catch (err: any) {
      setBanner({ type: "error", text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLinkProvider = (provider: "google" | "github") => {
    window.location.href = getOAuthStartUrl(provider, {
      intent: "link",
      next: "/settings/account",
    });
  };

  const handleUnlinkProvider = async (provider: "google" | "github") => {
    setBanner(null);
    try {
      const res = await api.unlinkIdentity(provider);
      await refreshUser();
      await loadAccountData();
      setBanner({ type: "success", text: res.message });
    } catch (err: any) {
      setBanner({ type: "error", text: err.message });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setBanner({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    setSavingPassword(true);
    setBanner(null);
    try {
      await api.updateProfile({
        current_password: currentPassword || undefined,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      await refreshUser();
      await loadAccountData();
      setBanner({
        type: "success",
        text: "Password updated and other sessions have been revoked.",
      });
    } catch (err: any) {
      setBanner({ type: "error", text: err.message });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.revokeSession(sessionId);
      await loadAccountData();
      setBanner({ type: "success", text: "Session revoked." });
    } catch (err: any) {
      setBanner({ type: "error", text: err.message });
    }
  };

  const handleRevokeOthers = async () => {
    try {
      const res = await api.revokeOtherSessions();
      await loadAccountData();
      setBanner({
        type: "success",
        text: `Signed out of ${res.revoked_count} other active session(s).`,
      });
    } catch (err: any) {
      setBanner({ type: "error", text: err.message });
    }
  };

  const googleIdentity = identities.find((i) => i.provider === "google");
  const githubIdentity = identities.find((i) => i.provider === "github");
  const activeInstallations =
    ghStatus?.installations?.filter((i) => i.status === "active") || [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="pb-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Account, Integrations &amp; Security
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage your connected OAuth login providers, GitHub App repository scope, and active sessions.
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex rounded-md bg-[#0D111A] border border-white/[0.08] p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
              activeTab === "account"
                ? "bg-violet-600 text-white font-medium"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>ACCOUNT</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("integrations")}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
              activeTab === "integrations"
                ? "bg-violet-600 text-white font-medium"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Plug className="w-3.5 h-3.5" />
            <span>INTEGRATIONS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
              activeTab === "security"
                ? "bg-violet-600 text-white font-medium"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>SECURITY</span>
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`p-3.5 rounded-md border text-xs flex items-center gap-2.5 ${
            banner.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
              : "bg-red-500/10 border-red-500/30 text-red-200"
          }`}
        >
          {banner.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {/* TAB 1: ACCOUNT */}
      {activeTab === "account" && (
        <div className="space-y-6">
          {/* Profile Form */}
          <form
            onSubmit={handleSaveProfile}
            className="rounded-lg bg-[#0D111A] border border-white/[0.07] p-5 space-y-4"
          >
            <div>
              <h2 className="text-sm font-semibold text-white">Engineer Profile</h2>
              <p className="text-xs text-gray-400">
                Displayed across task approvals, activity logs, and pull request metadata.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-300 mb-1">Email address</label>
                <input
                  type="text"
                  disabled
                  value={user?.email || ""}
                  className="w-full h-9 px-3 rounded-md bg-[#090C13] border border-white/[0.07] text-xs text-gray-400 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-[#090C13] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-violet-500/60"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-300 mb-1">Avatar URL (Optional)</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://avatars.githubusercontent.com/..."
                  className="w-full h-9 px-3 rounded-md bg-[#090C13] border border-white/[0.1] text-xs text-white font-mono focus:outline-none focus:border-violet-500/60"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="h-9 px-4 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium"
              >
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>

          {/* Connected Login Providers */}
          <div className="rounded-lg bg-[#0D111A] border border-white/[0.07] p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Connected Login Providers (Identity Authentication)
              </h2>
              <p className="text-xs text-gray-400">
                Link Google and GitHub to sign in with either identity provider. You cannot unlink your only active login method.
              </p>
            </div>

            <div className="divide-y divide-white/[0.06] border border-white/[0.06] rounded-md bg-[#090C13]">
              {/* Google Identity Row */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-[#121723] border border-white/[0.08] flex items-center justify-center">
                    <GoogleLogo className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">Google</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          googleIdentity
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            : "bg-white/[0.04] text-gray-400 border-white/[0.08]"
                        }`}
                      >
                        {googleIdentity ? "Connected" : "Not connected"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {googleIdentity
                        ? `${googleIdentity.email || googleIdentity.provider_subject}`
                        : "OpenID Connect (openid, email, profile)"}
                    </p>
                  </div>
                </div>

                {googleIdentity ? (
                  <button
                    type="button"
                    onClick={() => handleUnlinkProvider("google")}
                    className="h-8 px-3 rounded-md bg-white/[0.04] hover:bg-red-500/15 border border-white/[0.08] hover:border-red-500/30 text-xs text-gray-300 hover:text-red-300 flex items-center gap-1.5 transition-colors"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Unlink</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleLinkProvider("google")}
                    className="h-8 px-3 rounded-md bg-[#121723] hover:bg-[#171E2E] border border-white/[0.1] text-xs text-white flex items-center gap-1.5"
                  >
                    <Link2 className="w-3.5 h-3.5 text-violet-400" />
                    <span>Connect Google</span>
                  </button>
                )}
              </div>

              {/* GitHub Login Row */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-[#121723] border border-white/[0.08] flex items-center justify-center">
                    <GitHubLogo className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">GitHub Login</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          githubIdentity
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            : "bg-white/[0.04] text-gray-400 border-white/[0.08]"
                        }`}
                      >
                        {githubIdentity ? "Connected" : "Not connected"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {githubIdentity
                        ? `@${githubIdentity.username || githubIdentity.email} (Identity sign-in only)`
                        : "OAuth 2.0 identity login (read:user, user:email)"}
                    </p>
                  </div>
                </div>

                {githubIdentity ? (
                  <button
                    type="button"
                    onClick={() => handleUnlinkProvider("github")}
                    className="h-8 px-3 rounded-md bg-white/[0.04] hover:bg-red-500/15 border border-white/[0.08] hover:border-red-500/30 text-xs text-gray-300 hover:text-red-300 flex items-center gap-1.5 transition-colors"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Unlink</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleLinkProvider("github")}
                    className="h-8 px-3 rounded-md bg-[#121723] hover:bg-[#171E2E] border border-white/[0.1] text-xs text-white flex items-center gap-1.5"
                  >
                    <Link2 className="w-3.5 h-3.5 text-violet-400" />
                    <span>Connect GitHub Login</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTEGRATIONS */}
      {activeTab === "integrations" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-[#0D111A] border border-white/[0.07] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">
                  GitHub App (Repository Access)
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    activeInstallations.length > 0
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : "bg-white/[0.04] text-gray-400 border-white/[0.08]"
                  }`}
                >
                  {activeInstallations.length > 0 ? "Installed" : "Not installed"}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {activeInstallations.length > 0
                  ? `${activeInstallations.length} active installation(s) — ${activeInstallations
                      .map(
                        (i) =>
                          `${i.account_login || i.installation_id} (${
                            i.repository_selection === "all"
                              ? "All repositories"
                              : `${i.repository_count} selected`
                          })`
                      )
                      .join(", ")}`
                  : "Controls which repositories JGitLab can analyze, branch, and open pull requests on."}
              </p>
            </div>
            <Link
              href="/github"
              className="h-9 px-3.5 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium inline-flex items-center gap-1.5 shrink-0"
            >
              <span>Manage Repository Access</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="rounded-lg bg-[#0D111A] border border-white/[0.07] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">
                  External AI API Providers
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    providers.length > 0
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  }`}
                >
                  {providers.length > 0
                    ? `${providers.length} Configured`
                    : "Not Configured"}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                OpenAI-compatible inference endpoints encrypted with server-side Fernet keys.
              </p>
            </div>
            <Link
              href="/settings/providers"
              className="h-9 px-3.5 rounded-md bg-[#121723] hover:bg-[#171E2E] border border-white/[0.1] text-white text-xs font-medium inline-flex items-center gap-1.5 shrink-0"
            >
              <span>Configure AI Providers</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Active Sessions */}
          <div className="rounded-lg bg-[#0D111A] border border-white/[0.07] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Active Sessions ({sessions.length})
                </h2>
                <p className="text-xs text-gray-400">
                  Server-side HMAC-SHA256 hashed session tokens with HttpOnly cookies.
                </p>
              </div>
              {sessions.length > 1 && (
                <button
                  type="button"
                  onClick={handleRevokeOthers}
                  className="h-8 px-3 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-xs text-red-300"
                >
                  Sign out of other sessions
                </button>
              )}
            </div>

            <div className="divide-y divide-white/[0.06] border border-white/[0.06] rounded-md bg-[#090C13]">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <Monitor className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white">
                          {sess.auth_method ? `Signed in via ${sess.auth_method.toUpperCase()}` : "Web Session"}
                        </span>
                        {sess.is_current && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Current Session
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-gray-500 mt-0.5">
                        IP: {sess.ip_address || "127.0.0.1"} · Created:{" "}
                        {new Date(sess.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {!sess.is_current && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(sess.id)}
                      className="h-7 px-2.5 rounded bg-white/[0.04] hover:bg-red-500/15 border border-white/[0.08] text-xs text-gray-300 hover:text-red-300"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Password Update */}
          <form
            onSubmit={handleUpdatePassword}
            className="rounded-lg bg-[#0D111A] border border-white/[0.07] p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">
                {user?.has_password ? "Change Password" : "Set Account Password"}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {user?.has_password && (
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Current password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-[#090C13] border border-white/[0.1] text-xs text-white"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  New password (min 8 chars)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-[#090C13] border border-white/[0.1] text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={logout}
                className="h-9 px-3.5 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-xs text-red-300 flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out Current Session</span>
              </button>

              <button
                type="submit"
                disabled={savingPassword}
                className="h-9 px-4 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium"
              >
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function AccountSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
        </div>
      }
    >
      <AccountSettingsContent />
    </Suspense>
  );
}
