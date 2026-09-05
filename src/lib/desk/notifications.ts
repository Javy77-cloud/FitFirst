/** In-desk notification board. Internal alerts never email Javy or the agent. */

export const NOTIFICATION_BOARD_HREF = "/notifications";
export const NOTIFICATION_BOARD_LABEL = "Notification board";
export const RECENT_NOTIFICATION_LIMIT = 12;

export const NOTIFICATION_IN_APP_COPY =
  "In-app only. Nothing emails Javy or the agent.";

export const NOTIFICATION_EMPTY_PANEL =
  "No in-app notifications. Nothing emails Javy.";

export const NOTIFICATION_EMPTY_BOARD =
  "No notifications on this desk. Playbooks, asks, and work-queue pings land here. Nothing emails the agent.";

export function recentNotifications<T>(rows: readonly T[], limit = RECENT_NOTIFICATION_LIMIT): T[] {
  return rows.slice(0, limit);
}

export function unreadNotificationCount(rows: readonly { read: boolean }[]): number {
  return rows.filter((row) => !row.read).length;
}

export function notificationHref(href: string | null | undefined): string {
  return href?.trim() || NOTIFICATION_BOARD_HREF;
}

export function notificationWhen(iso: string | Date | null | undefined): string {
  if (iso == null || iso === "") return "";
  const raw = iso instanceof Date ? iso.toISOString() : String(iso);
  return raw.slice(0, 10);
}
