"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  User,
  Shield,
  Key,
  CheckCircle2,
  Lock,
  Building,
  Mail,
  Clock
} from "lucide-react";

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-border">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <User className="w-5 h-5 text-violet-400" />
          <span>Account & Security Settings</span>
        </h1>
        <p className="text-xs text-muted mt-0.5">
          Manage your engineering credentials, organization memberships, and cryptographic session security.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Identity Card */}
        <div className="p-6 rounded-2xl bg-charcoal-900 border border-border space-y-4">
          <span className="text-xs font-mono uppercase text-muted block">Identity Profile</span>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-400 text-white font-mono font-bold text-xl flex items-center justify-center shadow-glow">
              {user.email[0].toUpperCase()}
            </div>
            <div>
              <span className="font-bold text-base text-white block">{user.full_name || "Platform Engineer"}</span>
              <span className="text-xs text-muted font-mono">{user.email}</span>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded bg-violet-950 text-violet-300 border border-violet-800/40 text-[10px] font-mono uppercase">
                  {user.role}
                </span>
                {user.is_superuser && (
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40 text-[10px] font-mono uppercase">
                    Superuser
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border space-y-2 text-xs font-mono text-muted">
            <div className="flex justify-between">
              <span>Account ID:</span>
              <span className="text-gray-300">{user.id.slice(0, 16)}...</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="text-emerald-400">Active</span>
            </div>
            <div className="flex justify-between">
              <span>Member Since:</span>
              <span className="text-gray-300">{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Security & Cryptography Card */}
        <div className="p-6 rounded-2xl bg-charcoal-900 border border-border space-y-4">
          <span className="text-xs font-mono uppercase text-muted block flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Platform Security Standards</span>
          </span>

          <div className="space-y-3 text-xs text-gray-300">
            <div className="p-3 rounded-lg bg-charcoal-850 border border-border">
              <span className="font-bold text-white block mb-0.5">Password Hashing: Argon2id</span>
              <p className="text-muted text-[11px] leading-relaxed">
                Passwords are authenticated using state-of-the-art Argon2 memory-hard key derivation.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-charcoal-850 border border-border">
              <span className="font-bold text-white block mb-0.5">Credential Encryption: Fernet AES</span>
              <p className="text-muted text-[11px] leading-relaxed">
                GitHub tokens and external AI API keys are encrypted at rest with Fernet (AES-128-CBC + HMAC-SHA256).
              </p>
            </div>

            <div className="p-3 rounded-lg bg-charcoal-850 border border-border">
              <span className="font-bold text-white block mb-0.5">Session Tokens: HttpOnly & SameSite</span>
              <p className="text-muted text-[11px] leading-relaxed">
                Protected against cross-site scripting (XSS) and client-side extraction.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
