import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-200 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
      <div className="max-w-md w-full space-y-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 mx-auto font-mono font-bold text-lg">
          404
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Sahifa topilmadi
        </h1>
        <p className="text-xs text-slate-400">
          Siz qidirayotgan sahifa mavjud emas yoki boshqa manzilga ko‘chirilgan bo‘lishi mumkin.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-sm"
          >
            ← Bosh Dashboardga qaytish
          </Link>
        </div>
      </div>
    </div>
  );
}
