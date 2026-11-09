"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { isUserAdminEmail } from "@/lib/types";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Lock, ShieldCheck } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-7 w-7 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const isAdmin = isUserAdminEmail(user);

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="bg-[#12151d] border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-5 text-red-400">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Administrator Access Required (.env Whitelist)
          </h2>
          <p className="text-xs text-slate-400 mb-6 max-w-md mx-auto leading-relaxed">
            Sizning hisobingiz (<span className="font-mono text-white">{user?.email}</span>) administratorlar ro‘yxatida mavjud emas. Admin Panel faqat <code className="font-mono px-1 rounded bg-black/40 text-indigo-300">.env</code> faylida ko‘rsatilgan maxsus email manzillariga ruxsat etiladi.
          </p>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Boshqaruv Markaziga Qaytish
          </Link>
        </div>
      </div>
    );
  }

  return <div>{children}</div>;
}
