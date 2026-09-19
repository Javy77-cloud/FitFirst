export const BUSY_AUTO_SYNC_MS = 15 * 60 * 1000;

export function shouldAutoSyncBusy(lastSyncedAt: Date | string | null | undefined, asOf = new Date()): boolean {
  if (!lastSyncedAt) return true;
  const at = lastSyncedAt instanceof Date ? lastSyncedAt : new Date(lastSyncedAt);
  if (Number.isNaN(at.getTime())) return true;
  return asOf.getTime() - at.getTime() >= BUSY_AUTO_SYNC_MS;
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
