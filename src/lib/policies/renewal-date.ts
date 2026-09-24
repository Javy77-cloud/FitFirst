/**
 * Calendar day the desk counts a renewal from.
 *
 * `policies.renewal_date` wins when it is set. Otherwise the desk keeps its
 * current derivation: the term expiration (book expiration, else the policy
 * expiration). Term end dates themselves are not moved.
 *
 * Date keys use the Eastern business day (`src/lib/time/et.ts` via
 * `businessDateKey` / `etDateKey`).
 */

import { businessDateKey, calendarDaysBetween } from "@/lib/policies/current-term";
import { etDateKey } from "@/lib/time/et";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export type RenewalDateInput = {
  renewalDate?: Date | string | null;
  expirationDate?: Date | string | null;
  /** Expiration the current-term resolver already chose, when one exists. */
  bookExpiration?: Date | string | null;
};

/** `YYYY-MM-DD` renewal day, or null when neither date is usable. */
export function renewalDateFor(policy: RenewalDateInput): string | null {
  const stored = businessDateKey(policy.renewalDate);
  if (stored) return stored;
  return businessDateKey(policy.bookExpiration ?? policy.expirationDate);
}

/** Eastern calendar days from `asOf` until `renewalDateFor`. */
export function daysUntilRenewal(policy: RenewalDateInput, asOf: Date): number | null {
  const key = renewalDateFor(policy);
  if (!key) return null;
  return calendarDaysBetween(etDateKey(asOf), key);
}

/** "Renews Jan 1, 2027" from a `YYYY-MM-DD` key. */
export function renewsOnPhrase(dateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return "Renews";
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return "Renews";
  return `Renews ${month} ${Number(match[3])}, ${match[1]}`;
}
