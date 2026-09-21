export const BUSY_AUTO_SYNC_MS = 15 * 60 * 1000;
export const EVENT_AUTO_SYNC_MS = 2 * 60 * 1000;

function isStaleSync(lastSyncedAt: Date | string | null | undefined, maxAgeMs: number, asOf: Date): boolean {
  if (!lastSyncedAt) return true;
  const at = lastSyncedAt instanceof Date ? lastSyncedAt : new Date(lastSyncedAt);
  if (Number.isNaN(at.getTime())) return true;
  return asOf.getTime() - at.getTime() >= maxAgeMs;
}

export function shouldAutoSyncBusy(lastSyncedAt: Date | string | null | undefined, asOf = new Date()): boolean {
  return isStaleSync(lastSyncedAt, BUSY_AUTO_SYNC_MS, asOf);
}

export function shouldAutoSyncEvents(
  lastSyncedAt: Date | string | null | undefined,
  hasImportedEvents: boolean,
  asOf = new Date(),
): boolean {
  if (!hasImportedEvents) return true;
  return isStaleSync(lastSyncedAt, EVENT_AUTO_SYNC_MS, asOf);
}

export function formatBusySyncedAt(lastSyncedAt: Date | string | null | undefined): string {
  if (!lastSyncedAt) return "Never synced";
  const at = lastSyncedAt instanceof Date ? lastSyncedAt : new Date(lastSyncedAt);
  if (Number.isNaN(at.getTime())) return "Never synced";
  return at.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function calendarBusyVendorLabel(provider: string | null | undefined): string {
  if (provider === "outlook_calendar") return "Outlook";
  if (provider === "google_event") return "Google";
  return "Google";
}

export function isByoBusyConnection(
  row: { connected?: boolean | null; connectMode?: string | null } | null | undefined,
): boolean {
  return Boolean(row?.connected && row.connectMode === "byo");
}

/** NEXT_REDIRECT is a successful navigation, not a vendor failure. */
export function displayBusySyncError(message: string | null | undefined): string | null {
  const text = message?.trim() ?? "";
  if (!text || text.includes("NEXT_REDIRECT")) return null;
  return text;
}

export function googleCalendarHttpError(
  data: {
    error?: {
      message?: string;
      status?: string;
      errors?: { reason?: string; message?: string }[];
    };
  },
  status: number,
  verb = "FreeBusy",
): string {
  const raw =
    data.error?.message ||
    data.error?.errors?.[0]?.message ||
    `Google ${verb} failed (${status}).`;
  const reason = `${data.error?.status ?? ""} ${data.error?.errors?.[0]?.reason ?? ""} ${raw}`;
  if (/has not been used in project|is disabled|accessNotConfigured/i.test(reason)) {
    return "Google Calendar API is disabled on this Cloud project. Enable Calendar API, then Sync now.";
  }
  if (/insufficient.?permission|ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficientPermissions/i.test(reason)) {
    return "Google Calendar permission is missing. Reconnect Google Calendar in Settings.";
  }
  return raw;
}

export function busySlotsFromFreeBusy(
  calendars:
    | Record<string, { busy?: { start?: string; end?: string }[]; errors?: { message?: string }[] }>
    | null
    | undefined,
): { start?: string; end?: string }[] {
  if (!calendars) return [];
  return Object.values(calendars).flatMap((calendar) => calendar.busy ?? []);
}
