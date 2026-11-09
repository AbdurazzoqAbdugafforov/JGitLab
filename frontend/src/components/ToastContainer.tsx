"use client";

import React from "react";
import Link from "next/link";
import { useNotifications } from "@/lib/notification-context";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Bot,
  Sparkles,
  X,
  ArrowRight,
} from "lucide-react";

export function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((t) => {
        const isSuccess = t.type === "success";
        const isError = t.type === "error";
        const isWarning = t.type === "warning";
        const isTask = t.type === "task";

        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto p-3.5 rounded-xl bg-[#101524]/95 backdrop-blur-md border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-[#10B981]" />}
              {isError && <XCircle className="w-4 h-4 text-[#EF4444]" />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />}
              {isTask && <Bot className="w-4 h-4 text-[#38BDF8]" />}
              {!isSuccess && !isError && !isWarning && !isTask && (
                <Sparkles className="w-4 h-4 text-[#818CF8]" />
              )}
            </div>

            {/* Message Body */}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-semibold text-[#F8FAFC] leading-snug">
                {t.title}
              </h4>
              <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-relaxed line-clamp-2">
                {t.message}
              </p>

              {t.link_url && (
                <Link
                  href={t.link_url}
                  onClick={() => dismissToast(t.id)}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-[#6366F1] hover:text-[#818CF8] hover:underline"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="shrink-0 p-1 text-[#64748B] hover:text-[#F8FAFC] rounded transition-colors -mr-1 -mt-1"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
