/** In-desk notification board. Internal alerts never email Javy or the agent. */

export const NOTIFICATION_BOARD_HREF = "/notifications";
export const NOTIFICATION_BOARD_LABEL = "Notifications";
export const RECENT_NOTIFICATION_LIMIT = 12;

export const NOTIFICATION_IN_APP_COPY =
  "In-app only. Nothing emails Javy or the agent.";

export const NOTIFICATION_EMPTY_PANEL =
  "Nothing the system caught. Overnight misses land on the Notifications board.";

export const NOTIFICATION_EMPTY_BOARD =
  "Nothing the system caught — keep shopping. Overnight declines, quiet renewals, and stale docs land here.";

/** Prefer unread rows so the bell panel can clear the badge, then fill with recent read. */
export function recentNotifications<T extends { read: boolean }>(
  rows: readonly T[],
  limit = RECENT_NOTIFICATION_LIMIT,
): T[] {
  const unread = rows.filter((row) => !row.read);
  if (unread.length >= limit) return unread.slice(0, limit);
  const unreadIds = new Set(unread.map((row) => (row as { id?: string }).id).filter(Boolean));
  const readFill = rows.filter((row) => row.read && !unreadIds.has((row as { id?: string }).id));
  return [...unread, ...readFill].slice(0, limit);
}

export function unreadNotificationCount(rows: readonly { read: boolean }[]): number {
  return rows.filter((row) => !row.read).length;
}

/** Badge on the header bell — not a filled/ringed icon — while any in-app notification is unread. */
export function notificationBellHasUnread(unread: number): boolean {
  return unread > 0;
}

export function notificationBellUnreadLabel(unread: number): string {
  if (!notificationBellHasUnread(unread)) return "Notifications";
  const shown = unread > 9 ? "9+" : String(unread);
  return `Notifications, ${shown} unread`;
}

export function notificationBellBadge(unread: number): string | null {
  if (!notificationBellHasUnread(unread)) return null;
  return unread > 9 ? "9+" : String(unread);
}

/** Panel / board rows: unread is highlighted; read is not. */
export function notificationRowUnread(read: boolean): boolean {
  return !read;
}

export function applyLocalNotificationReads<T extends { id: string; read: boolean }>(
  rows: readonly T[],
  locallyRead: readonly string[],
): T[] {
  if (locallyRead.length === 0) return [...rows];
  const cleared = new Set(locallyRead);
  return rows.map((row) => (cleared.has(row.id) ? { ...row, read: true } : row));
}

export function notificationHref(href: string | null | undefined): string {
  return href?.trim() || NOTIFICATION_BOARD_HREF;
}

export function notificationWhen(iso: string | Date | null | undefined): string {
  if (iso == null || iso === "") return "";
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) {
    const raw = iso instanceof Date ? iso.toISOString() : String(iso);
    return raw.slice(0, 10);
  }
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const FOLLOW_UP_METHOD_LABELS: Record<string, string> = {
  call: "Call",
  text: "SMS",
  sms: "SMS",
  email: "Email",
  skip: "Skip",
};

export function followUpMethodLabel(method: string): string {
  return FOLLOW_UP_METHOD_LABELS[method.trim().toLowerCase()] ?? method;
}

/** Stored title: `Follow-up: Call Vazquez, Edmerson — due now.` */
export function followUpNotificationTitle(method: string, leadName: string): string {
  const name = leadName.trim() || "Lead";
  return `Follow-up: ${followUpMethodLabel(method)} ${name} — due now.`;
}

export function parseFollowUpNotification(alert: {
  title: string;
  body: string;
  kind?: string;
}): { action: string; leadName: string } {
  const named = alert.title.match(/^Follow-up:\s+(\S+)\s+(.+?)\s+—\s+due now\.$/);
  if (named) {
    return {
      action: `Follow-up: ${named[1]} — due now.`,
      leadName: named[2],
    };
  }
  const legacy = alert.title.match(/^Follow-up due · (.+?) · (.+)$/);
  if (legacy) {
    return {
      action: `Follow-up: ${followUpMethodLabel(legacy[1])} — due now.`,
      leadName: legacy[2],
    };
  }
  return { action: alert.title, leadName: alert.body };
}

export function followUpLeadHref(entityId?: string | null): string | null {
  return entityId?.trim() ? `/leads/${entityId}` : null;
}

export function followUpMethodFromTitle(title: string): "call" | "text" | "email" {
  const parsed = parseFollowUpNotification({ title, body: "" });
  const word = parsed.action.match(/^Follow-up:\s+(\S+)/)?.[1]?.toLowerCase() ?? "";
  if (word === "sms" || word === "text") return "text";
  if (word === "email" || word === "e-mail") return "email";
  return "call";
}

export function isFollowUpPopupKind(kind: string | null | undefined): boolean {
  return kind === "lead_follow_up";
}
