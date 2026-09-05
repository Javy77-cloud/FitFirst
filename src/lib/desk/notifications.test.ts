import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_BOARD_HREF,
  NOTIFICATION_BOARD_LABEL,
  NOTIFICATION_EMPTY_BOARD,
  NOTIFICATION_EMPTY_PANEL,
  NOTIFICATION_IN_APP_COPY,
  RECENT_NOTIFICATION_LIMIT,
  notificationHref,
  notificationWhen,
  recentNotifications,
  unreadNotificationCount,
} from "./notifications";

describe("notification board helpers", () => {
  it("names the board route and keeps copy in-desk", () => {
    expect(NOTIFICATION_BOARD_HREF).toBe("/notifications");
    expect(NOTIFICATION_BOARD_LABEL).toBe("Notification board");
    expect(NOTIFICATION_IN_APP_COPY).toMatch(/in-app/i);
    expect(NOTIFICATION_IN_APP_COPY).toMatch(/nothing emails/i);
    expect(NOTIFICATION_EMPTY_PANEL).toMatch(/nothing emails javy/i);
    expect(NOTIFICATION_EMPTY_BOARD).toMatch(/nothing emails/i);
  });

  it("slices recent rows and counts unread", () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({
      id: `a${i}`,
      read: i > 2,
    }));
    expect(recentNotifications(rows)).toHaveLength(RECENT_NOTIFICATION_LIMIT);
    expect(recentNotifications(rows)[0]?.id).toBe("a0");
    expect(unreadNotificationCount(rows)).toBe(3);
    expect(unreadNotificationCount([])).toBe(0);
  });

  it("deep-links when a record href exists, else the board", () => {
    expect(notificationHref("/policies/p1")).toBe("/policies/p1");
    expect(notificationHref(null)).toBe(NOTIFICATION_BOARD_HREF);
    expect(notificationHref("")).toBe(NOTIFICATION_BOARD_HREF);
  });

  it("formats a day stamp for the panel and board", () => {
    expect(notificationWhen("2026-09-05T14:00:00.000Z")).toBe("2026-09-05");
    expect(notificationWhen(new Date("2026-08-01T00:00:00.000Z"))).toBe("2026-08-01");
    expect(notificationWhen(null)).toBe("");
  });
});
