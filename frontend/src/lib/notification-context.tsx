"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { AppNotification } from "./types";
import { api } from "./api";
import { useGlobalWebSocket, WSEvent } from "./use-websocket";
import { useAuth } from "./auth-context";

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "task";
  link_url?: string | null;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  toasts: ToastItem[];
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  showToast: (toast: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  toasts: [],
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  clearAll: async () => {},
  refreshNotifications: async () => {},
  showToast: () => {},
  dismissToast: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const knownNotificationIds = useRef<Set<string>>(new Set());
  const initialFetchDone = useRef<boolean>(false);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { ...toast, id };
      setToasts((prev) => [newToast, ...prev.slice(0, 3)]); // At most 4 toasts visible

      // Auto dismiss after 4.5 seconds
      setTimeout(() => {
        dismissToast(id);
      }, 4500);
    },
    [dismissToast]
  );

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const res = await api.getNotifications();
      const notifs = res.notifications || [];
      const count =
        typeof res.unread_count === "number"
          ? res.unread_count
          : notifs.filter((n) => !n.is_read).length;

      // If initial fetch is already done, check for new unread notifications to trigger toast
      if (initialFetchDone.current) {
        for (const n of notifs) {
          if (!knownNotificationIds.current.has(n.id) && !n.is_read) {
            showToast({
              title: n.title,
              message: n.message,
              type: n.type,
              link_url: n.link_url,
            });
          }
        }
      }

      // Update known ids
      notifs.forEach((n) => knownNotificationIds.current.add(n.id));
      initialFetchDone.current = true;

      setNotifications(notifs);
      setUnreadCount(count);
    } catch (err) {
      // Quiet fail on network hiccups
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  // Initial fetch and user change
  useEffect(() => {
    if (user) {
      initialFetchDone.current = false;
      knownNotificationIds.current.clear();
      setLoading(true);
      fetchNotifications();

      // Poll every 10s as a fallback
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setToasts([]);
    }
  }, [user, fetchNotifications]);

  // Handle incoming WebSocket events
  useGlobalWebSocket((evt: WSEvent) => {
    if (evt.type === "notification" && evt.data) {
      const notif: AppNotification = evt.data;
      if (notif.user_id && user && notif.user_id !== user.id) {
        return; // Belongs to another user
      }

      setNotifications((prev) => {
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });

      if (!notif.is_read) {
        setUnreadCount((prev) => prev + 1);
      }

      knownNotificationIds.current.add(notif.id);

      // Trigger floating in-app toast
      showToast({
        title: notif.title,
        message: notif.message,
        type: notif.type,
        link_url: notif.link_url,
      });
    }
  });

  const markAsRead = async (notificationId: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await api.markNotificationRead(notificationId);
    } catch {
      // Revert if error
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await api.markAllNotificationsRead();
    } catch {
      fetchNotifications();
    }
  };

  const clearAll = async () => {
    setNotifications([]);
    setUnreadCount(0);

    try {
      await api.clearNotifications();
    } catch {
      fetchNotifications();
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        toasts,
        markAsRead,
        markAllAsRead,
        clearAll,
        refreshNotifications: fetchNotifications,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
