import { ne, sql, type SQL } from "drizzle-orm";
import { alerts } from "@/lib/db/schema";
import { COVERAGE_GAP_ALERT_KIND } from "@/lib/coverage/notices";

/**
 * Coverage-gap notifications (the "Coverage gap · …" pings) stay off until
 * cross-selling is designed. Default OFF. Set COVERAGE_GAP_NOTIFICATIONS_ENABLED
 * to 1 / true / yes / on to emit them again. Gap detection on the contact
 * page is separate and does not read this flag.
 */
export const COVERAGE_GAP_NOTIFICATIONS_ENABLED = false;

const ON = new Set(["1", "true", "yes", "on"]);

export function coverageGapNotificationsEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const raw = String(env.COVERAGE_GAP_NOTIFICATIONS_ENABLED ?? "").trim().toLowerCase();
  if (!raw) return COVERAGE_GAP_NOTIFICATIONS_ENABLED;
  return ON.has(raw);
}

export function isCoverageGapNotificationKind(kind: string | null | undefined): boolean {
  return kind === COVERAGE_GAP_ALERT_KIND;
}

/**
 * Read-time hide for lists, unread counts, and badges.
 * Does not delete or update rows. Other kinds pass through unchanged.
 */
export function filterNotificationRows<T extends { kind?: string | null }>(
  rows: readonly T[],
  enabled = coverageGapNotificationsEnabled(),
): T[] {
  if (enabled) return [...rows];
  return rows.filter((row) => !isCoverageGapNotificationKind(row.kind));
}

/** SQL fragment for alert reads. Undefined while the flag is on. */
export function coverageGapAlertsHiddenWhere(
  enabled = coverageGapNotificationsEnabled(),
): SQL | undefined {
  if (enabled) return undefined;
  return ne(alerts.kind, COVERAGE_GAP_ALERT_KIND);
}

/** Raw-SQL unread count exclusion. Empty while the flag is on. */
export function coverageGapUnreadCountExclusion(
  enabled = coverageGapNotificationsEnabled(),
): SQL {
  if (enabled) return sql``;
  return sql` and kind <> ${COVERAGE_GAP_ALERT_KIND}`;
}
