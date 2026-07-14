"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Bell, CheckCheck } from "lucide-react";
import {
  getNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationDto,
} from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 60_000;

export function NotificationBell() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getNotificationsAction();
        if (!cancelled) {
          setNotifications(data.items);
          setUnreadCount(data.unreadCount);
        }
      } catch {
        // silencieux — la cloche n'est pas une fonctionnalité critique
      }
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(notification: NotificationDto) {
    if (!notification.isRead) {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      markNotificationReadAction(notification.id).catch(() => {});
    }
    setOpen(false);
    if (notification.link) router.push(notification.link);
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    markAllNotificationsReadAction().catch(() => {});
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        aria-label={t("title")}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 block w-2 h-2 rounded-full bg-red-500" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">{t("title")}</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {t("markAllRead")}
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">{t("empty")}</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-slate-50">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    onClick={() => handleSelect(notification)}
                    className="flex flex-col items-start gap-0.5 w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 w-full">
                      {!notification.isRead && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                      <span
                        className={cn(
                          "text-sm",
                          notification.isRead ? "font-normal text-slate-600" : "font-semibold text-slate-900"
                        )}
                      >
                        {notification.title}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 line-clamp-2 pl-3.5">{notification.message}</span>
                    <span className="text-[11px] text-slate-400 pl-3.5">{formatDate(notification.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
