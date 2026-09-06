"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { markAlertRead, markAllAlertsRead } from "@/app/actions/alerts";
import { Button } from "@/components/ui/button";
import type { HeaderAlert } from "@/lib/desk/header-alerts";
import {
  NOTIFICATION_BOARD_HREF,
  NOTIFICATION_BOARD_LABEL,
  NOTIFICATION_EMPTY_PANEL,
  NOTIFICATION_IN_APP_COPY,
  notificationHref,
  parseFollowUpNotification,
  recentNotifications,
} from "@/lib/desk/notifications";
import { cn } from "@/lib/utils";

export function NotificationBell({
  unread,
  alerts,
  triggerClassName,
}: {
  unread: number;
  alerts: HeaderAlert[];
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const recent = recentNotifications(alerts);
  const unreadInPanel = recent.some((alert) => !alert.read) || unread > 0;

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markOne(id: string) {
    const form = new FormData();
    form.set("alertId", id);
    await markAlertRead(form);
    router.refresh();
  }

  async function markAll() {
    await markAllAlertsRead();
    router.refresh();
  }

  async function openItem(alert: HeaderAlert) {
    if (!alert.read) await markOne(alert.id);
    setOpen(false);
    router.push(notificationHref(alert.href));
  }

  return (
    <div className="relative" ref={rootRef} data-testid="notification-bell">
      <button
        type="button"
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "relative inline-flex size-10 items-center justify-center rounded-md text-[#c2410c] hover:bg-[#ffedd5]",
          open && "bg-[#ffedd5]",
          triggerClassName,
        )}
      >
        <Bell className="size-6" strokeWidth={2.25} />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-sm bg-fit-flag px-1 text-[10px] font-semibold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          data-testid="notification-panel"
          className="absolute right-0 z-50 mt-1 flex w-[min(24rem,calc(100vw-1.5rem))] max-h-[min(28rem,70vh)] flex-col overflow-hidden rounded-lg bg-card shadow-md ring-1 ring-foreground/10"
        >
          <Link
            href={NOTIFICATION_BOARD_HREF}
            data-testid="notification-board-link"
            onClick={() => setOpen(false)}
            className="shrink-0 border-b border-border px-3 py-2.5 text-sm font-semibold text-navy hover:bg-secondary"
          >
            {NOTIFICATION_BOARD_LABEL}
          </Link>

          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">{NOTIFICATION_IN_APP_COPY}</p>
            {unreadInPanel ? (
              <Button type="button" size="xs" variant="ghost" onClick={() => void markAll()}>
                Mark all as read
              </Button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted-foreground">{NOTIFICATION_EMPTY_PANEL}</p>
            ) : (
              <ul>
                {recent.map((alert) => {
                  const copy = parseFollowUpNotification(alert);
                  return (
                    <li
                      key={alert.id}
                      className="flex items-start gap-2 border-b border-border px-3 py-2 last:border-b-0"
                      data-testid="notification-row"
                    >
                      <button
                        type="button"
                        aria-label={alert.read ? "Read" : "Mark as read"}
                        disabled={alert.read}
                        onClick={() => void markOne(alert.id)}
                        className={cn(
                          "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-sm border",
                          alert.read
                            ? "border-fit-red/30 text-fit-red/40"
                            : "border-fit-red text-fit-red hover:bg-fit-red-bg",
                        )}
                      >
                        <Check className="size-4" strokeWidth={3} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void openItem(alert)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span
                          className={cn(
                            "block truncate text-sm text-navy",
                            !alert.read && "font-semibold",
                          )}
                        >
                          {copy.action}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-navy/80">
                          {copy.leadName}
                        </span>
                        {alert.createdAt ? (
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {alert.createdAt}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
