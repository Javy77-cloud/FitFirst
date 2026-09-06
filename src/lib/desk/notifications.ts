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
