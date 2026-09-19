"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { markAlertRead, markAllAlertsRead, markSelectedAlertsRead } from "@/app/actions/alerts";
import { Button } from "@/components/ui/button";
import {
  canRunNotificationBulk,
  emptyNotificationSelection,
  selectAllNotifications,
  selectedNotificationIds,
  toggleNotificationSelection,
} from "@/lib/desk/notification-selection";
import { coldChaseOpenLabel } from "@/lib/deals/cold-chase";
import {
  applyLocalNotificationReads,
  notificationRowUnread,
  parseFollowUpNotification,
} from "@/lib/desk/notifications";
import { cn } from "@/lib/utils";

export type ChecklistAlert = {
  id: string;
  title: string;
  body: string;
  kind?: string;
  read: boolean;
  href: string;
  when?: string;
};

export function NotificationChecklist({
  alerts,
  empty,
  resetKey,
  onMarkedRead,
  onMarkedAllRead,
}: {
  alerts: ChecklistAlert[];
  empty: string;
  resetKey: string | number | boolean;
  onMarkedRead?: (ids: string[]) => void;
  onMarkedAllRead?: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(() => emptyNotificationSelection());
  const [locallyRead, setLocallyRead] = useState<string[]>([]);
  const rows = applyLocalNotificationReads(alerts, locallyRead);
  const ids = rows.map((alert) => alert.id);
  const checked = selectedNotificationIds(selected, ids);
  const allOn = ids.length > 0 && ids.every((id) => checked.includes(id));
  const bulkEnabled = canRunNotificationBulk(checked);

  useEffect(() => {
    setSelected(emptyNotificationSelection());
  }, [resetKey]);

  async function markOne(id: string) {
    const form = new FormData();
    form.set("alertId", id);
    await markAlertRead(form);
    const wasUnread = rows.some((alert) => alert.id === id && !alert.read);
    if (wasUnread) {
      setLocallyRead((prev) => [...prev, id]);
      onMarkedRead?.([id]);
    }
    router.refresh();
  }

  async function markChecked() {
    if (!bulkEnabled) return;
    const unreadIds = rows.filter((alert) => checked.includes(alert.id) && !alert.read).map((alert) => alert.id);
    const form = new FormData();
    form.set("alertIds", checked.join(","));
    await markSelectedAlertsRead(form);
    setSelected(emptyNotificationSelection());
    if (unreadIds.length) {
      setLocallyRead((prev) => [...prev, ...unreadIds]);
      onMarkedRead?.(unreadIds);
    }
    router.refresh();
  }

  async function markAll() {
    const unreadIds = rows.filter((alert) => !alert.read).map((alert) => alert.id);
    await markAllAlertsRead();
    setSelected(emptyNotificationSelection());
    if (unreadIds.length) {
      setLocallyRead((prev) => [...prev, ...unreadIds]);
      onMarkedRead?.(unreadIds);
    }
    onMarkedAllRead?.();
    router.refresh();
  }

  return (
    <div data-testid="notification-checklist">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <label className="flex items-center gap-2 text-xs text-navy">
          <input
            type="checkbox"
            checked={allOn}
            onChange={() => setSelected(selectAllNotifications(ids, !allOn))}
            aria-label="Select all notifications"
            data-testid="notification-select-all"
          />
          Select all
        </label>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={!rows.some((alert) => !alert.read)}
            onClick={() => void markAll()}
            data-testid="notification-mark-all-read"
          >
            Mark All as Read
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={!bulkEnabled}
            onClick={() => void markChecked()}
            data-testid="notification-bulk-read"
          >
            Mark selected as read
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-3 py-6 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul>
          {rows.map((alert) => {
            const copy = parseFollowUpNotification(alert);
            const isChecked = checked.includes(alert.id);
            const unread = notificationRowUnread(alert.read);
            return (
              <li
                key={alert.id}
                className={cn(
                  "flex items-start gap-2 border-b border-border px-3 py-2 last:border-b-0",
                  unread && "bg-[#ffedd5]",
                )}
                data-testid="notification-row"
                data-unread-row={unread ? "true" : "false"}
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={isChecked}
                  onChange={() => setSelected(toggleNotificationSelection(selected, alert.id))}
                  aria-label={`Select ${copy.action}`}
                  data-testid="notification-select"
                />
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm text-navy", unread && "font-semibold")}>{copy.action}</p>
                  <p className="mt-0.5 truncate text-sm text-navy/80">{copy.leadName}</p>
                  {alert.when ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{alert.when}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                      href={alert.href}
                      className="text-xs font-medium text-primary hover:underline"
                      data-testid="notification-open"
                    >
                      {coldChaseOpenLabel(alert.kind)}
                    </Link>
                    <button
                      type="button"
                      className="text-xs font-medium text-navy hover:underline disabled:text-muted-foreground"
                      disabled={alert.read}
                      onClick={() => void markOne(alert.id)}
                      data-testid="notification-mark-read"
                    >
                      Mark as read
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
