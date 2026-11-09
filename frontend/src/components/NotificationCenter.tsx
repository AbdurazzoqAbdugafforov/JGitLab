"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/lib/notification-context";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Bot,
  Sparkles,
  CheckCheck,
  Trash2,
  ExternalLink,
} from "lucide-react";

function formatTimeAgo(isoString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 30) return "just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "";
  }
}

export function NotificationCenter() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredNotifications =
    filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;

  const handleNotificationClick = async (notif: (typeof notifications)[0]) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link_url) {
      router.push(notif.link_url);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className="h-8 w-8 rounded-lg bg-[#101524] hover:bg-[#161D31] border border-white/10 flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors relative"
      >
        <Bell className="w-3.5 h-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#6366F1] text-white font-mono text-[9px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(99,102,241,0.8)] border border-[#0D1117]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-[#101524] border border-white/10 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.7)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#F8FAFC]">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="text-[11px] text-[#94A3B8] hover:text-white flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-white/5"
                >
                  <CheckCheck className="w-3 h-3 text-[#6366F1]" />
                  <span>Mark read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  title="Clear all notifications"
                  className="text-[11px] text-[#64748B] hover:text-[#EF4444] transition-colors p-1 rounded hover:bg-white/5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-3.5 py-2 border-b border-white/5 flex items-center gap-2 bg-[#0B0E17]/60">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === "all"
                  ? "bg-[#161D31] text-[#F8FAFC] border border-white/10"
                  : "text-[#64748B] hover:text-[#94A3B8]"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === "unread"
                  ? "bg-[#161D31] text-[#F8FAFC] border border-white/10"
                  : "text-[#64748B] hover:text-[#94A3B8]"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
            {filteredNotifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <Bell className="w-8 h-8 text-[#64748B] mx-auto opacity-30 mb-2" />
                <p className="text-xs font-medium text-[#94A3B8]">
                  {filter === "unread"
                    ? "No unread notifications"
                    : "No notifications yet"}
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Tasks, plans, and build updates will appear here in real time.
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const isSuccess = n.type === "success";
                const isError = n.type === "error";
                const isWarning = n.type === "warning";
                const isTask = n.type === "task";

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 hover:bg-[#161D31]/80 cursor-pointer transition-colors flex items-start gap-3 relative ${
                      !n.is_read ? "bg-[#161D31]/40" : ""
                    }`}
                  >
                    {/* Unread indicator dot */}
                    {!n.is_read && (
                      <span className="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
                    )}

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

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          className={`text-xs font-semibold truncate ${
                            !n.is_read ? "text-[#F8FAFC]" : "text-[#CBD5E1]"
                          }`}
                        >
                          {n.title}
                        </h4>
                        <span className="text-[10px] font-mono text-[#64748B] shrink-0">
                          {formatTimeAgo(n.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-[#94A3B8] leading-relaxed mt-0.5 line-clamp-2">
                        {n.message}
                      </p>

                      {n.link_url && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[#6366F1] hover:text-[#818CF8]">
                          <span>Open link</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
