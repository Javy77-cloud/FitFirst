/**
 * Policies stack last column — "Renewal agreed" show / clear.
 *
 * Render-time only. A stored renewed-term effective date wins. Otherwise the
 * next term starts the calendar day after the current expiration: a
 * 2025-10-10 → 2026-10-09 term renews effective 2026-10-10.
 *
 * Today is the America/New_York calendar day from src/lib/time/et.ts.
 * Day math stays on YYYY-MM-DD keys. Eastern today comes from etDateKey.
 */

import { businessDateKey, calendarDaysBetween } from "@/lib/policies/current-term";
import { etDateKey } from "@/lib/time/et";

export const RENEWAL_AGREED_LABEL = "Renewal agreed" as const;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export type RenewalAgreedStampInput = {
  renewalHandled?: boolean | null;
  /** Stored renewed / upcoming term effective, when the book has one. */
  renewedEffective?: Date | string | null;
  /** In-force (or latest book) term dates used to derive the next start. */
  termEffective?: Date | string | null;
  termExpiration?: Date | string | null;
  /**
   * Prior term expiration. On the morning the renewed term is itself in force
   * (its effective is today and is the day after this expiration), the stamp clears.
   */
  priorExpiration?: Date | string | null;
  asOf?: Date;
};

function shiftCalendarDays(key: string, days: number): string | null {
  const match = DATE_ONLY.exec(key);
  if (!match) return null;
  const shifted = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days),
  );
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftCalendarYears(key: string, years: number): string | null {
  const match = DATE_ONLY.exec(key);
  if (!match) return null;
  const shifted = new Date(Date.UTC(Number(match[1]) + years, Number(match[2]) - 1, Number(match[3])));
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Next term effective when no renewed term is stored.
 * Expiration wins: the day after it. Effective + 1 year is only a fallback.
 */
export function deriveNextTermStart(
  termExpiration: Date | string | null | undefined,
  termEffective?: Date | string | null | undefined,
): string | null {
  const expiration = businessDateKey(termExpiration);
  if (expiration) return shiftCalendarDays(expiration, 1);
  const effective = businessDateKey(termEffective);
  if (!effective) return null;
  return shiftCalendarYears(effective, 1);
}

/** The date the stamp is waiting on. Null when it cannot be known. */
export function renewalAgreedEffectiveKey(input: RenewalAgreedStampInput): string | null {
  const stored = businessDateKey(input.renewedEffective);
  if (stored) return stored;

  const today = etDateKey(input.asOf ?? new Date());
  const inForce = businessDateKey(input.termEffective);
  const priorEnd = businessDateKey(input.priorExpiration);
  if (inForce && priorEnd) {
    const rolled = shiftCalendarDays(priorEnd, 1);
    if (rolled && rolled === inForce && inForce === today) return inForce;
  }

  return deriveNextTermStart(input.termExpiration, input.termEffective);
}

/**
 * True while Client staying is on and today (Eastern) is still before the
 * renewed term's effective date. The stamp clears on that day.
 */
export function showRenewalAgreedStamp(input: RenewalAgreedStampInput): boolean {
  if (!input.renewalHandled) return false;
  const start = renewalAgreedEffectiveKey(input);
  if (!start) return false;
  const today = etDateKey(input.asOf ?? new Date());
  return calendarDaysBetween(today, start) > 0;
}

/** Drop the expiration date that trails "Renews in Nd". Other cue text stays. */
export function stackRenewCueText(cue: string): string {
  return cue
    .split(" · ")
    .map((bit) => bit.trim().replace(/^Renews in (\d+)d,\s+.*$/i, "Renews in $1d"))
    .filter(Boolean)
    .join(" · ");
}
