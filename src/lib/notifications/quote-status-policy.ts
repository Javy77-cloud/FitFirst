import { notInArray, sql, type SQL } from "drizzle-orm";
import { alerts } from "@/lib/db/schema";

/**
 * Standing rule: quote declines, approvals, API returns, and other quote-status
 * changes stay on the Quotes tab. They do not enqueue a user notification.
 * Newly bound policies, new leads, and exceptions that need a person still do.
 */
export const QUOTE_STATUS_ALERT_KINDS = [
  "quote_declined",
  "quote_approved",
  "quote_returned",
  "quote_decline",
  "quote_approval",
  "quote_status",
  "declined",
  "approved",
  "returned",
] as const;

const RESERVED_QUOTE_KINDS = new Set(["quote_correction", "quote_sent_no_followup"]);

export function isQuoteStatusNotificationKind(kind: string | null | undefined): boolean {
  const value = (kind ?? "").trim().toLowerCase();
  if (!value || RESERVED_QUOTE_KINDS.has(value)) return false;
  if ((QUOTE_STATUS_ALERT_KINDS as readonly string[]).includes(value)) return true;
  return /^quote_(declin|approv|return|status)/.test(value);
}

/** False for quote status. True for bind, lead intake, and action-needed exceptions. */
export function shouldEnqueueUserNotification(kind: string): boolean {
  return !isQuoteStatusNotificationKind(kind);
}

/** Read-time hide so a leftover quote-status row never reaches the bell. */
export function quoteStatusAlertsHiddenWhere(): SQL {
  return notInArray(alerts.kind, [...QUOTE_STATUS_ALERT_KINDS]);
}

/** Raw-SQL unread count exclusion. */
export function quoteStatusUnreadCountExclusion(): SQL {
  return sql` and kind not in ('quote_declined','quote_approved','quote_returned','quote_decline','quote_approval','quote_status','declined','approved','returned')`;
}
