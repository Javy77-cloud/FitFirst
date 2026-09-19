import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_BOARD_HREF,
  NOTIFICATION_BOARD_LABEL,
  NOTIFICATION_EMPTY_BOARD,
  NOTIFICATION_EMPTY_PANEL,
  NOTIFICATION_IN_APP_COPY,
  RECENT_NOTIFICATION_LIMIT,
  followUpLeadHref,
  followUpMethodFromTitle,
  followUpNotificationTitle,
  isFollowUpPopupKind,
  applyLocalNotificationReads,
  notificationBellBadge,
  notificationBellHasUnread,
  notificationBellUnreadLabel,
  notificationRowUnread,
  notificationHref,
  notificationWhen,
  parseFollowUpNotification,
  recentNotifications,
  unreadNotificationCount,
} from "./notifications";

describe("notification board helpers", () => {
  it("names the board route and keeps copy in-desk", () => {
    expect(NOTIFICATION_BOARD_HREF).toBe("/notifications");
    expect(NOTIFICATION_BOARD_LABEL).toBe("Notifications");
    expect(NOTIFICATION_IN_APP_COPY).toMatch(/in-app/i);
    expect(NOTIFICATION_IN_APP_COPY).toMatch(/nothing emails/i);
    expect(NOTIFICATION_EMPTY_PANEL).toMatch(/system caught/i);
    expect(NOTIFICATION_EMPTY_BOARD).toMatch(/keep shopping/i);
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
    expect(notificationBellHasUnread(unreadNotificationCount(rows))).toBe(true);
    expect(notificationBellHasUnread(unreadNotificationCount([]))).toBe(false);
  });

  it("prefers unread rows in the bell panel over newer read noise", () => {
    const rows = [
      { id: "new-read", read: true },
      { id: "new-read-2", read: true },
      { id: "old-unread", read: false },
      { id: "old-unread-2", read: false },
    ];
    const recent = recentNotifications(rows, 3);
    expect(recent.map((row) => row.id)).toEqual(["old-unread", "old-unread-2", "new-read"]);
  });

  it("shows a bell badge only while unread count is above zero", () => {
    expect(notificationBellHasUnread(1)).toBe(true);
    expect(notificationBellHasUnread(3)).toBe(true);
    expect(notificationBellHasUnread(12)).toBe(true);
    expect(notificationBellHasUnread(0)).toBe(false);
    expect(notificationBellBadge(4)).toBe("4");
    expect(notificationBellBadge(12)).toBe("9+");
    expect(notificationBellBadge(0)).toBeNull();
    expect(notificationBellUnreadLabel(2)).toBe("Notifications, 2 unread");
    expect(notificationBellUnreadLabel(0)).toBe("Notifications");
  });

  it("highlights unread panel rows and drops that highlight after mark as read", () => {
    expect(notificationRowUnread(false)).toBe(true);
    expect(notificationRowUnread(true)).toBe(false);
    const rows = [
      { id: "a1", read: false },
      { id: "a2", read: false },
      { id: "a3", read: true },
    ];
    expect(unreadNotificationCount(rows)).toBe(2);
    const afterOne = applyLocalNotificationReads(rows, ["a1"]);
    expect(afterOne.find((row) => row.id === "a1")?.read).toBe(true);
    expect(notificationRowUnread(afterOne.find((row) => row.id === "a1")!.read)).toBe(false);
    expect(notificationRowUnread(afterOne.find((row) => row.id === "a2")!.read)).toBe(true);
    expect(unreadNotificationCount(afterOne)).toBe(1);
    expect(notificationBellBadge(unreadNotificationCount(afterOne))).toBe("1");
    const afterAll = applyLocalNotificationReads(afterOne, ["a2"]);
    expect(unreadNotificationCount(afterAll)).toBe(0);
    expect(notificationBellBadge(0)).toBeNull();
    expect(afterAll.every((row) => !notificationRowUnread(row.read))).toBe(true);
  });

  it("deep-links when a record href exists, else the board", () => {
    expect(notificationHref("/policies/p1")).toBe("/policies/p1");
    expect(notificationHref(null)).toBe(NOTIFICATION_BOARD_HREF);
    expect(notificationHref("")).toBe(NOTIFICATION_BOARD_HREF);
  });

  it("formats a timestamp for the panel and board", () => {
    expect(notificationWhen("2026-09-05T14:00:00.000Z")).toMatch(/Sep 5/);
    expect(notificationWhen(new Date("2026-08-01T00:00:00.000Z"))).toMatch(/Aug 1/);
    expect(notificationWhen(null)).toBe("");
  });

  it("builds follow-up copy and opens that lead", () => {
    expect(followUpNotificationTitle("call", "Vazquez, Edmerson")).toBe(
      "Follow-up: Call Vazquez, Edmerson — due now.",
    );
    expect(followUpLeadHref("lead-1")).toBe("/leads/lead-1");
    expect(followUpMethodFromTitle("Follow-up: Call Vazquez, Edmerson — due now.")).toBe("call");
    expect(followUpMethodFromTitle("Follow-up: SMS Ruiz, Elena — due now.")).toBe("text");
    expect(isFollowUpPopupKind("lead_follow_up")).toBe(true);
    expect(isFollowUpPopupKind("playbook")).toBe(false);
    expect(
      parseFollowUpNotification({
        title: "Follow-up: Call Vazquez, Edmerson — due now.",
        body: "Vazquez, Edmerson",
        kind: "lead_follow_up",
      }),
    ).toEqual({
      action: "Follow-up: Call — due now.",
      leadName: "Vazquez, Edmerson",
    });
    expect(
      parseFollowUpNotification({
        title: "Follow-up due · text · Ruiz, Elena",
        body: "old body",
        kind: "lead_follow_up",
      }),
    ).toEqual({
      action: "Follow-up: SMS — due now.",
      leadName: "Ruiz, Elena",
    });
  });
});
