/**
 * "Renewal agreed" on the policy overview.
 *
 * Shown while Client staying is set and today (America/New_York) is still
 * before the renewed term's effective date. Clears on that date. Not stored.
 */

import { businessDateKey } from "@/lib/policies/current-term";
import { etDateKey } from "@/lib/time/et";

export const RENEWAL_AGREED_LABEL = "Renewal agreed" as const;

const RENEWED_TERM_ROLES = new Set(["proposed", "renewal", "upcoming"]);
const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export type RenewalAgreedTerm = {
  role?: string | null;
  effective?: Date | string | null;
  expiration?: Date | string | null;
  termEffective?: Date | string | null;
  termExpiration?: Date | string | null;
};

export type RenewalAgreedWindow = {
  /**
   * Stored `policies.renewal_date`. Preferred when set.
   * Pass `renewalDateFor(policy)` here once that helper is on main.
   */
  renewalDate?: Date | string | null;
  /** In-force term start. Used only to derive the next term when renewal date is blank. */
  effectiveDate?: Date | string | null;
  /** In-force term end. Exclusive end, or the last covered day on a DEC. */
  expirationDate?: Date | string | null;
  /** Recorded renewed-term effective date, when the caller already resolved one. */
  renewedEffectiveDate?: Date | string | null;
  terms?: readonly RenewalAgreedTerm[] | null;
};

export type RenewalAgreedInput = RenewalAgreedWindow & {
  /** renewal_queue stage === handled ("Client staying"). */
  clientStaying: boolean;
};

function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Calendar shift of a `YYYY-MM-DD` key. Not a `toISOString` day bucket. */
function shiftCalendarDays(dateKey: string, days: number): string | null {
  const match = DATE_KEY.exec(dateKey);
  if (!match) return null;
  return formatUtcDate(
    new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days)),
  );
}

function addCalendarYears(dateKey: string, years: number): string | null {
  const match = DATE_KEY.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]) + years;
  const month = Number(match[2]);
  const day = Number(match[3]);
  const shifted = new Date(Date.UTC(year, month - 1, day));
  if (shifted.getUTCMonth() !== month - 1) {
    return formatUtcDate(new Date(Date.UTC(year, month, 0)));
  }
  return formatUtcDate(shifted);
}

function termDate(term: RenewalAgreedTerm, which: "effective" | "expiration"): string | null {
  return businessDateKey(
    which === "effective" ? (term.termEffective ?? term.effective) : (term.termExpiration ?? term.expiration),
  );
}

/**
 * Next term start from the in-force window.
 *
 * The desk treats expiration as exclusive, so a 2025-10-10 → 2026-10-10 term
 * is in force through 2026-10-09 and renews effective 2026-10-10. A DEC that
 * stores the last covered day (2025-10-10 → 2026-10-09) renews on that same
 * anniversary, 2026-10-10. Any other end date is already the next start.
 */
export function derivedNextTermStart(
  effectiveDate: Date | string | null | undefined,
  expirationDate: Date | string | null | undefined,
): string | null {
  const expiration = businessDateKey(expirationDate);
  if (!expiration) return null;
  const effective = businessDateKey(effectiveDate);
  if (!effective) return expiration;

  let years = 1;
  let anniversary = addCalendarYears(effective, years);
  while (anniversary && anniversary < expiration && years < 40) {
    years += 1;
    anniversary = addCalendarYears(effective, years);
  }
  if (!anniversary || anniversary === expiration) return expiration;
  const dayAfterEnd = shiftCalendarDays(expiration, 1);
  if (dayAfterEnd && dayAfterEnd === anniversary) return anniversary;
  return expiration;
}

function recordedRenewedEffective(
  terms: readonly RenewalAgreedTerm[] | null | undefined,
  currentEffective: string | null,
): string | null {
  const dates = (terms ?? [])
    .filter((term) => RENEWED_TERM_ROLES.has((term.role ?? "").trim().toLowerCase()))
    .map((term) => termDate(term, "effective"))
    .filter((date): date is string => Boolean(date))
    .filter((date) => !currentEffective || date > currentEffective)
    .sort();
  return dates[0] ?? null;
}

/**
 * Effective date of the renewed term.
 * Stored policy renewal date wins. Term derivation runs only when that field is blank.
 */
export function renewalAgreedEffectiveDate(input: RenewalAgreedWindow): string | null {
  const storedRenewal = businessDateKey(input.renewalDate);
  if (storedRenewal) return storedRenewal;
  const explicit = businessDateKey(input.renewedEffectiveDate);
  if (explicit) return explicit;
  const effective = businessDateKey(input.effectiveDate);
  const recorded = recordedRenewedEffective(input.terms, effective);
  if (recorded) return recorded;
  return derivedNextTermStart(input.effectiveDate, input.expirationDate);
}

/**
 * True only while Client staying is set and today in America/New_York is
 * strictly before the renewed term's effective date.
 */
export function showRenewalAgreedStamp(
  input: RenewalAgreedInput,
  asOf: Date = new Date(),
): boolean {
  if (!input.clientStaying) return false;
  const clearOn = renewalAgreedEffectiveDate(input);
  if (!clearOn) return false;
  return etDateKey(asOf) < clearOn;
}
