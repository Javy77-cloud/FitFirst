import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NotificationBell } from "@/components/desk/notification-bell";
import type { HeaderAlert } from "@/lib/desk/header-alerts";
import {
  notificationBellBadge,
  notificationBellHasUnread,
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

describe("notification bell unread badge", () => {
  it("shows a number badge when any notification is unread and leaves the icon unemphasized", () => {
    const unread = 3;
    expect(notificationBellHasUnread(unread)).toBe(true);
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
    expect(html).toContain('data-unread-count="3"');
    expect(html).toContain('data-testid="notification-bell-unread"');
    expect(html).toContain(notificationBellBadge(unread));
    expect(html).toContain("Notifications, 3 unread");
    expect(html).not.toContain("data-ff-bell-highlight");
    expect(html).not.toContain("data-unread-highlight");
    expect(html).not.toContain("ring-2");
    expect(html).not.toContain("fill-[#c2410c]");
  });

  it("hides the badge when every notification is read", () => {
    const rows = [alert({ id: "a1", read: true }), alert({ id: "a2", read: true })];
    expect(unreadNotificationCount(rows)).toBe(0);
    expect(notificationBellHasUnread(0)).toBe(false);
    const html = renderToStaticMarkup(
      createElement(NotificationBell, {
        unread: 0,
        alerts: rows,
      }),
    );
    expect(html).toContain('data-unread-count="0"');
    expect(html).not.toContain('data-testid="notification-bell-unread"');
    expect(html).not.toContain("Notifications,");
    expect(html).not.toContain("fill-[#c2410c]");
    expect(html).not.toContain("ring-2");
  });

  it("highlights unread rows in the panel, not the bell icon", () => {
    const bell = source("src/components/desk/notification-bell.tsx");
    const header = source("src/components/desk-header.tsx");
    const shell = source("src/components/app-shell.tsx");
    const checklist = source("src/components/desk/notification-checklist.tsx");
    expect(header).toMatch(/HeaderRecordActions[\s\S]*NotificationBell/);
    expect(header).toMatch(/<NotificationBell unread=\{unread\} alerts=\{alerts\} \/>/);
    expect(header).toMatch(/ProfileMenu/);
    expect(shell).toMatch(/unread=\{header\.unread\}/);
    expect(source("src/lib/db/header-alerts.ts")).toMatch(/isNull\(alerts\.readAt\)/);
    expect(bell).toMatch(/notificationBellBadge\(displayUnread\)/);
    expect(bell).toMatch(/data-unread-count=\{displayUnread\}/);
    expect(bell).not.toMatch(/data-ff-bell-highlight/);
    expect(bell).not.toMatch(/data-unread-highlight/);
    expect(bell).not.toMatch(/fill-\[#c2410c\]/);
    expect(bell).not.toMatch(/ring-2 ring-\[#c2410c\]/);
    expect(checklist).toMatch(/notificationRowUnread/);
    expect(checklist).toMatch(/data-unread-row/);
    expect(checklist).toMatch(/bg-\[#ffedd5\]/);
    expect(checklist).toMatch(/markAlertRead|markSelectedAlertsRead/);
    expect(checklist).toMatch(/onMarkedRead/);
    expect(checklist).toMatch(/router\.refresh\(\)/);
    expect(bell).toMatch(/NOTIFICATION_IN_APP_COPY/);
    expect(bell).not.toMatch(/mailto:/);
  });
});
