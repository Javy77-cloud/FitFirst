"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { NotificationChecklist } from "@/components/desk/notification-checklist";
import type { HeaderAlert } from "@/lib/desk/header-alerts";
import {
  NOTIFICATION_BOARD_HREF,
  NOTIFICATION_BOARD_LABEL,
  NOTIFICATION_EMPTY_PANEL,
  NOTIFICATION_IN_APP_COPY,
  notificationHref,
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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const recent = recentNotifications(alerts);

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
          <p className="shrink-0 border-b border-border px-3 py-2 text-xs text-muted-foreground">
            {NOTIFICATION_IN_APP_COPY}
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <NotificationChecklist
              resetKey={open}
              empty={NOTIFICATION_EMPTY_PANEL}
              alerts={recent.map((alert) => ({
                id: alert.id,
                title: alert.title,
                body: alert.body,
                kind: alert.kind,
                read: alert.read,
                href: notificationHref(alert.href),
                when: alert.createdAt,
              }))}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
