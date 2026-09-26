/**
 * "Renewal agreed" on the policy overview.
 *
 * Shown while Client staying is set and today (America/New_York) is still
 * before the renewed term's effective date — the term the client agreed to
 * enter. Clears on that date. Not stored.
 *
 * After the book rolls onto that term, `policies.renewal_date` jumps about a
 * year forward (the following cycle). The stamp follows the renew-into
 * effective date, so that later renewal date cannot keep it up.
 *
 * That clear date is the imminent renew (George Rigby MMHO: effective
 * 2026-10-10), not the expiration or renewal_date the renewals board may
 * still count (~379 days). Those board bands are a separate clock.
 */

import { businessDateKey, calendarDaysBetween } from "@/lib/policies/current-term";
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
  /** Prior term end. A roll into `effectiveDate` means that effective is the renew-into date. */
  priorExpiration?: Date | string | null;
  /**
   * When the queue was set to Client staying. A mark dated before the
   * in-force effective was for entering that term. A later mark is the next cycle.
   */
  handledAt?: Date | string | null;
  terms?: readonly RenewalAgreedTerm[] | null;
};

/** Queue stage after Client staying clears on the renewed term's effective date. */
export const CLIENT_STAYING_AFTER_RENEWAL_STAGE = "upcoming" as const;

/** A stored renewal date this many days after the renew-into boundary is the next cycle. */
const NEXT_CYCLE_MIN_DAYS = 300;
const NEXT_CYCLE_MAX_DAYS = 430;

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

function priorExpirationKey(input: RenewalAgreedWindow, effective: string | null): string | null {
  const explicit = businessDateKey(input.priorExpiration);
  if (explicit) return explicit;
  const dates = (input.terms ?? [])
    .filter((term) => (term.role ?? "").trim().toLowerCase() === "prior")
    .map((term) => termDate(term, "expiration"))
    .filter((date): date is string => Boolean(date))
    .filter((date) => !effective || date <= effective)
    .sort();
  return dates[dates.length - 1] ?? null;
}

/** Prior end lands on the current effective, or the day before it. */
function priorAbutsEffective(priorEnd: string | null, effective: string | null): boolean {
  if (!priorEnd || !effective) return false;
  if (priorEnd === effective) return true;
  return shiftCalendarDays(priorEnd, 1) === effective;
}

function aboutOneYearAfter(start: string, later: string): boolean {
  const days = calendarDaysBetween(start, later);
  return days >= NEXT_CYCLE_MIN_DAYS && days <= NEXT_CYCLE_MAX_DAYS;
}

function upcomingBoundary(
  effective: string | null,
  expiration: string | null,
): string | null {
  if (effective && expiration) return derivedNextTermStart(effective, expiration);
  if (expiration) return shiftCalendarDays(expiration, 1);
  if (effective) return addCalendarYears(effective, 1);
  return null;
}

/**
 * Effective date of the term the client agreed to renew into.
 *
 * A future book effective is that date (the upcoming term is already on the
 * policy). A renewal date about a year later is the following cycle.
 * Once a rolled term's effective day is reached, and the Client staying mark
 * predates that day, the clear date is the effective — not the jumped renewal date.
 */
export function renewalAgreedEffectiveDate(
  input: RenewalAgreedWindow,
  asOf: Date = new Date(),
): string | null {
  const today = etDateKey(asOf);
  const effective = businessDateKey(input.effectiveDate);
  const expiration = businessDateKey(input.expirationDate);
  const renewal = businessDateKey(input.renewalDate);
  const derived = upcomingBoundary(effective, expiration);
  const recorded =
    businessDateKey(input.renewedEffectiveDate) ?? recordedRenewedEffective(input.terms, effective);
  const priorEnd = priorExpirationKey(input, effective);
  const handledDay = businessDateKey(input.handledAt);

  // Imminent renew: the book effective is still ahead. Expiration and
  // renewal_date on that same row are the following cycle, not this clear date.
  if (effective && effective > today) return effective;

  // The renewed term starts today, and the stored renewal date is the cycle after it.
  const horizon = renewal ?? derived;
  if (effective && effective === today && horizon && aboutOneYearAfter(effective, horizon)) {
    return effective;
  }

  // Mark predates the rolled term. That term has started; its effective is the agreement.
  const rolled = priorAbutsEffective(priorEnd, effective);
  const markPredatesTerm = Boolean(effective && handledDay && handledDay < effective);
  if (rolled && effective && today >= effective && markPredatesTerm) return effective;

  if (recorded && recorded > today && (!effective || recorded > effective)) {
    if (renewal && aboutOneYearAfter(recorded, renewal)) return recorded;
    if (renewal) return renewal;
    return recorded;
  }

  if (derived) {
    if (renewal && aboutOneYearAfter(derived, renewal)) return derived;
    if (renewal) return renewal;
    return derived;
  }

  if (recorded) return recorded;
  return renewal;
}

/**
 * True once America/New_York today is on or after a known renew-into effective.
 * Distance to `policies.renewal_date` is not this check. A premature jump that
 * leaves renewal_date more than 90 days out does not count as the term starting.
 */
export function renewedTermEffectiveReached(
  renewedEffective: Date | string | null | undefined,
  asOf: Date = new Date(),
): boolean {
  const clearOn = businessDateKey(renewedEffective);
  if (!clearOn) return false;
  return etDateKey(asOf) >= clearOn;
}

/**
 * True once America/New_York today is on or after the renew-into effective date.
 * That is when Client staying leaves `handled` for the next cycle.
 */
export function clientStayingTermHasStarted(
  input: RenewalAgreedWindow,
  asOf: Date = new Date(),
): boolean {
  return renewedTermEffectiveReached(renewalAgreedEffectiveDate(input, asOf), asOf);
}

/**
 * True only while Client staying is set and today in America/New_York is
 * strictly before the renewed term's effective date.
 */
export function showRenewalAgreedStamp(
  input: RenewalAgreedInput,
  asOf: Date = new Date(),
): boolean {
  if (input.clientStaying !== true) return false;
  const clearOn = renewalAgreedEffectiveDate(input, asOf);
  if (!clearOn) return false;
  return etDateKey(asOf) < clearOn;
}
