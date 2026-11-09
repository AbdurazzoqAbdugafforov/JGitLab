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
  ExternalLink,
} from "lucide-react";
import { JGitLabRefreshIcon } from "@/components/brand/JGitLabBrand";

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
      <div className="pb-5 border-b border-[#30363D] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#F0F6FC] tracking-tight">
            Account, Integrations &amp; Security
          </h1>
          <p className="text-xs text-[#8B949E] mt-1">
            Manage your connected OAuth login providers, GitHub App repository scope, and active sessions.
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex rounded-md bg-[#0D1117] border border-[#30363D] p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
              activeTab === "account"
                ? "bg-[#1F6FEB] text-white font-medium"
                : "text-[#8B949E] hover:text-[#F0F6FC]"
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
                ? "bg-[#1F6FEB] text-white font-medium"
                : "text-[#8B949E] hover:text-[#F0F6FC]"
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
                ? "bg-[#1F6FEB] text-white font-medium"
                : "text-[#8B949E] hover:text-[#F0F6FC]"
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
              ? "bg-[#238636]/15 border-[#238636]/40 text-[#3FB950]"
              : "bg-[#F85149]/15 border-[#F85149]/40 text-[#F85149]"
          }`}
        >
          {banner.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-[#3FB950] shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#F85149] shrink-0" />
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
            className="rounded-lg bg-[#161B22] border border-[#30363D] p-5 space-y-4"
          >
            <div>
              <h2 className="text-sm font-semibold text-[#F0F6FC]">Engineer Profile</h2>
              <p className="text-xs text-[#8B949E]">
                Displayed across task approvals, activity logs, and pull request metadata.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#8B949E] mb-1 font-mono uppercase">Email address</label>
                <input
                  type="text"
                  disabled
                  value={user?.email || ""}
                  className="w-full h-9 px-3 rounded-md bg-[#0D1117] border border-[#30363D] text-xs text-[#8B949E] font-mono cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8B949E] mb-1 font-mono uppercase">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] focus:outline-none focus:border-[#58A6FF]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-[#8B949E] mb-1 font-mono uppercase">Avatar URL (Optional)</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://avatars.githubusercontent.com/..."
                  className="w-full h-9 px-3 rounded-md bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] font-mono focus:outline-none focus:border-[#58A6FF]"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="h-9 px-4 rounded-md bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-medium transition-colors shadow-sm"
              >
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>

          {/* Connected Login Providers */}
          <div className="rounded-lg bg-[#161B22] border border-[#30363D] p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-[#F0F6FC]">
                Connected Login Providers (Identity Authentication)
              </h2>
              <p className="text-xs text-[#8B949E]">
                Link Google and GitHub to sign in with either identity provider. You cannot unlink your only active login method.
              </p>
            </div>

            <div className="divide-y divide-[#30363D] border border-[#30363D] rounded-md bg-[#0D1117]">
              {/* Google Identity Row */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-[#161B22] border border-[#30363D] flex items-center justify-center">
                    <GoogleLogo className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#F0F6FC]">Google</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          googleIdentity
                            ? "bg-[#238636]/15 text-[#3FB950] border-[#238636]/30"
                            : "bg-[#21262D] text-[#8B949E] border-[#30363D]"
                        }`}
                      >
                        {googleIdentity ? "Connected" : "Not connected"}
                      </span>
                    </div>
                    <p className="text-xs text-[#8B949E] mt-0.5">
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
                    className="h-8 px-3 rounded-md bg-[#21262D] hover:bg-[#F85149]/15 border border-[#30363D] hover:border-[#F85149]/40 text-xs text-[#C9D1D9] hover:text-[#F85149] flex items-center gap-1.5 transition-colors"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Unlink</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleLinkProvider("google")}
                    className="h-8 px-3 rounded-md bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-xs text-[#F0F6FC] flex items-center gap-1.5 transition-colors"
                  >
                    <Link2 className="w-3.5 h-3.5 text-[#58A6FF]" />
                    <span>Connect Google</span>
                  </button>
                )}
              </div>

              {/* GitHub Login Row */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-[#161B22] border border-[#30363D] flex items-center justify-center">
                    <GitHubLogo className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#F0F6FC]">GitHub Login</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          githubIdentity
                            ? "bg-[#238636]/15 text-[#3FB950] border-[#238636]/30"
                            : "bg-[#21262D] text-[#8B949E] border-[#30363D]"
                        }`}
                      >
                        {githubIdentity ? "Connected" : "Not connected"}
                      </span>
                    </div>
                    <p className="text-xs text-[#8B949E] mt-0.5">
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
                    className="h-8 px-3 rounded-md bg-[#21262D] hover:bg-[#F85149]/15 border border-[#30363D] hover:border-[#F85149]/40 text-xs text-[#C9D1D9] hover:text-[#F85149] flex items-center gap-1.5 transition-colors"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Unlink</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleLinkProvider("github")}
                    className="h-8 px-3 rounded-md bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-xs text-[#F0F6FC] flex items-center gap-1.5 transition-colors"
                  >
                    <Link2 className="w-3.5 h-3.5 text-[#58A6FF]" />
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
          <div className="rounded-lg bg-[#161B22] border border-[#30363D] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[#F0F6FC]">
                  GitHub App (Repository Access)
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    activeInstallations.length > 0
                      ? "bg-[#238636]/15 text-[#3FB950] border-[#238636]/30"
                      : "bg-[#21262D] text-[#8B949E] border-[#30363D]"
                  }`}
                >
                  {activeInstallations.length > 0 ? "Installed" : "Not installed"}
                </span>
              </div>
              <p className="text-xs text-[#8B949E]">
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
              className="h-9 px-3.5 rounded-md bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-medium inline-flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
            >
              <span>Manage Repository Access</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="rounded-lg bg-[#161B22] border border-[#30363D] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[#F0F6FC]">
                  External AI API Providers
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    providers.length > 0
                      ? "bg-[#238636]/15 text-[#3FB950] border-[#238636]/30"
                      : "bg-[#D29922]/15 text-[#E3B341] border-[#D29922]/30"
                  }`}
                >
                  {providers.length > 0
                    ? `${providers.length} Configured`
                    : "Not Configured"}
                </span>
              </div>
              <p className="text-xs text-[#8B949E]">
                OpenAI-compatible inference endpoints encrypted with server-side Fernet keys.
              </p>
            </div>
            <Link
              href="/settings/providers"
              className="h-9 px-3.5 rounded-md bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#F0F6FC] text-xs font-medium inline-flex items-center gap-1.5 shrink-0 transition-colors"
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
          <div className="rounded-lg bg-[#161B22] border border-[#30363D] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[#F0F6FC]">
                  Active Sessions ({sessions.length})
                </h2>
                <p className="text-xs text-[#8B949E]">
                  Server-side HMAC-SHA256 hashed session tokens with HttpOnly cookies.
                </p>
              </div>
              {sessions.length > 1 && (
                <button
                  type="button"
                  onClick={handleRevokeOthers}
                  className="h-8 px-3 rounded-md bg-[#F85149]/10 hover:bg-[#F85149]/20 border border-[#F85149]/30 text-xs text-[#F85149] transition-colors"
                >
                  Sign out of other sessions
                </button>
              )}
            </div>

            <div className="divide-y divide-[#30363D] border border-[#30363D] rounded-md bg-[#0D1117]">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <Monitor className="w-4 h-4 text-[#58A6FF] mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#F0F6FC]">
                          {sess.auth_method ? `Signed in via ${sess.auth_method.toUpperCase()}` : "Web Session"}
                        </span>
                        {sess.is_current && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#238636]/15 text-[#3FB950] border border-[#238636]/30">
                            Current Session
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-[#8B949E] mt-0.5">
                        IP: {sess.ip_address || "127.0.0.1"} · Created:{" "}
                        {new Date(sess.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {!sess.is_current && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(sess.id)}
                      className="h-7 px-2.5 rounded bg-[#21262D] hover:bg-[#F85149]/15 border border-[#30363D] text-xs text-[#8B949E] hover:text-[#F85149] transition-colors"
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
            className="rounded-lg bg-[#161B22] border border-[#30363D] p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#58A6FF]" />
              <h2 className="text-sm font-semibold text-[#F0F6FC]">
                {user?.has_password ? "Change Password" : "Set Account Password"}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {user?.has_password && (
                <div>
                  <label className="block text-xs text-[#8B949E] mb-1 font-mono uppercase">
                    Current password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] focus:outline-none focus:border-[#58A6FF]"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-[#8B949E] mb-1 font-mono uppercase">
                  New password (min 8 chars)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] focus:outline-none focus:border-[#58A6FF]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={logout}
                className="h-9 px-3.5 rounded-md bg-[#F85149]/10 hover:bg-[#F85149]/20 border border-[#F85149]/30 text-xs text-[#F85149] flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out Current Session</span>
              </button>

              <button
                type="submit"
                disabled={savingPassword}
                className="h-9 px-4 rounded-md bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-medium transition-colors shadow-sm"
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
          <JGitLabRefreshIcon size="md" spinning={true} />
        </div>
      }
    >
      <AccountSettingsContent />
    </Suspense>
  );
}
