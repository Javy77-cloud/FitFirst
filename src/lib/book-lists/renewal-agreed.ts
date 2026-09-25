/**
 * Policy-band "Renewal agreed" badge. Same mark on every band.
 *
 * Shown while a policy is Client staying and today (America/New_York) is
 * still before the renewed term's effective date. Cleared on that date.
 * Computed at render time — nothing here is stored.
 *
 * The effective date prefers a stored policy renewal date. Pass
 * `renewalDateFor(policy)` in `renewalDate` once that helper is on main.
 * Derivation runs only when that field is blank.
 */

import { businessDateKey } from "@/lib/policies/current-term";
import { etDateKey } from "@/lib/time/et";

export const RENEWAL_AGREED_LABEL = "Renewal agreed" as const;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Add calendar days to a `YYYY-MM-DD` key. Not an instant bucket. */
export function addCalendarDays(dateKey: string, days: number): string | null {
  const match = DATE_ONLY.exec(dateKey);
  if (!match || !Number.isFinite(days)) return null;
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type RenewalAgreedInput = {
  /** renewal_queue stage === handled (Client staying). */
  clientStaying?: boolean | null;
  /** Same flag on the book card payload. */
  handled?: boolean | null;
  /** Render-time clock. Defaults to now. */
  asOf?: Date;
  /**
   * Stored `policies.renewal_date`. Preferred when set.
   * Pass `renewalDateFor(policy)` here once that helper is on main.
   */
  renewalDate?: Date | string | null;
  /** Recorded effective date of the renewed / upcoming term. */
  renewedTermEffective?: Date | string | null;
  /** Alias for `renewedTermEffective` on the book card. */
  renewedEffective?: Date | string | null;
  /** Effective date of the term that is current at render. */
  currentTermEffective?: Date | string | null;
  /** Alias for `currentTermEffective` on the book card. */
  termEffective?: Date | string | null;
  /** Expiration of the term being renewed (current, else the term that just ended). */
  termExpiration?: Date | string | null;
};

function clientStaying(input: RenewalAgreedInput): boolean {
  return Boolean(input.clientStaying ?? input.handled);
}

/**
 * Calendar day the renewed term starts.
 *
 * A stored policy renewal date wins. When that field is blank, a recorded
 * renewed-term effective date wins, then the day after the current expiration:
 * 2025-10-10 through 2026-10-09 renews effective 2026-10-10, and a Jan 1
 * through Dec 31 Marketplace, Medicare, or PNC term renews the next Jan 1.
 * If that renewed term is already current today, its effective date is today
 * and the badge clears.
 */
export function renewalEffectiveDateKey(
  input: Omit<RenewalAgreedInput, "clientStaying" | "handled">,
  asOf: Date = input.asOf ?? new Date(),
): string | null {
  const storedRenewal = businessDateKey(input.renewalDate);
  if (storedRenewal) return storedRenewal;

  const recorded = businessDateKey(input.renewedTermEffective ?? input.renewedEffective);
  if (recorded) return recorded;

  const today = etDateKey(asOf);
  const currentEffective = businessDateKey(input.currentTermEffective ?? input.termEffective);
  if (currentEffective && currentEffective === today) return currentEffective;

  const expiration = businessDateKey(input.termExpiration);
  if (!expiration) return null;
  return addCalendarDays(expiration, 1);
}

/** True only while Client staying is set and today (ET) is before the renewal effective date. */
export function showRenewalAgreedBadge(input: RenewalAgreedInput): boolean {
  if (!clientStaying(input)) return false;
  const asOf = input.asOf ?? new Date();
  const effective = renewalEffectiveDateKey(input, asOf);
  if (!effective) return false;
  return etDateKey(asOf) < effective;
}
