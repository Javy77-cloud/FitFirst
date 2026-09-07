import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NotificationBell } from "@/components/desk/notification-bell";
import type { HeaderAlert } from "@/lib/desk/header-alerts";
import {
  notificationBellBadge,
  notificationBellHighlighted,
  unreadNotificationCount,
} from "./notifications";

function source(file: string) {
  return readFileSync(file, "utf8");
}

function alert(partial: Partial<HeaderAlert> & Pick<HeaderAlert, "id" | "read">): HeaderAlert {
  return {
    title: "Ask Maya",
    body: "Status on HO3-ELENA-2026",
    severity: "info",
    kind: "ask",
    href: "/policies/p1",
    createdAt: "Sep 7, 4:00 PM",
    ...partial,
  };
}

describe("notification bell unread highlight", () => {
  it("turns the highlight on when any notification is unread", () => {
    const unread = 3;
    expect(notificationBellHighlighted(unread)).toBe(true);
    const html = renderToStaticMarkup(
      createElement(NotificationBell, {
        unread,
        alerts: [
          alert({ id: "a1", read: false }),
          alert({ id: "a2", read: false }),
          alert({ id: "a3", read: true }),
        ],
      }),
    );
    expect(html).toContain('data-ff-bell-highlight="on"');
    expect(html).toContain('data-unread-highlight="true"');
    expect(html).toContain('data-unread-count="3"');
    expect(html).toContain('data-testid="notification-bell-unread"');
    expect(html).toContain(notificationBellBadge(unread));
    expect(html).toContain("Notifications, 3 unread");
    expect(html).toContain("ring-2");
    expect(html).toContain("fill-[#c2410c]");
  });

  it("turns the highlight off when every notification is read", () => {
    const rows = [alert({ id: "a1", read: true }), alert({ id: "a2", read: true })];
    expect(unreadNotificationCount(rows)).toBe(0);
    expect(notificationBellHighlighted(0)).toBe(false);
    const html = renderToStaticMarkup(
      createElement(NotificationBell, {
        unread: 0,
        alerts: rows,
      }),
    );
    expect(html).toContain('data-ff-bell-highlight="off"');
    expect(html).toContain('data-unread-highlight="false"');
    expect(html).toContain('data-unread-count="0"');
    expect(html).not.toContain('data-testid="notification-bell-unread"');
    expect(html).not.toContain("Notifications,");
    expect(html).not.toContain("fill-[#c2410c]");
  });

  it("stays in the global header next to profile and does not email", () => {
    const bell = source("src/components/desk/notification-bell.tsx");
    const header = source("src/components/desk-header.tsx");
    const shell = source("src/components/app-shell.tsx");
    const checklist = source("src/components/desk/notification-checklist.tsx");
    expect(header).toMatch(/HeaderRecordActions[\s\S]*NotificationBell/);
    expect(header).toMatch(/<NotificationBell unread=\{unread\} alerts=\{alerts\} \/>/);
    expect(header).toMatch(/ProfileMenu/);
    expect(shell).toMatch(/alertRows\.filter\(\(row\) => !row\.readAt\)\.length/);
    expect(shell).toMatch(/unread=\{unread\}/);
    expect(bell).toMatch(/notificationBellHighlighted\(displayUnread\)/);
    expect(bell).toMatch(/data-ff-bell-highlight/);
    expect(bell).toMatch(/data-unread-highlight/);
    expect(checklist).toMatch(/markAlertRead|markSelectedAlertsRead/);
    expect(checklist).toMatch(/onMarkedRead/);
    expect(checklist).toMatch(/router\.refresh\(\)/);
    expect(bell).toMatch(/onMarkedRead=\{\(ids\) => setLocalUnread/);
    expect(bell).toMatch(/NOTIFICATION_IN_APP_COPY/);
    expect(bell).not.toMatch(/mailto:/);
  });
});
