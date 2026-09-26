/**
 * Days until the renewal the desk is actually working.
 *
 * An in-force term counts to its expiration. After Client staying advances the
 * book, `renewal_date` jumps about a year while the renew-into effective date
 * is still imminent — that future effective is the board clock (ATM205086).
 * A past effective is not a renew-into date.
 */

import {
  businessDateKey,
  calendarDaysBetween,
  resolveCurrentTerm,
  type CurrentTermInput,
  type CurrentTermResolution,
} from "@/lib/policies/current-term";
import { etDateKey } from "@/lib/time/et";

export type RenewalClockAnchor =
  | "in_force_expiration"
  | "renew_into_effective"
  | "book_expiration";

export type RenewalClock = {
  days: number | null;
  anchor: RenewalClockAnchor;
};

export function daysUntilRenewalEvent(
  resolved: CurrentTermResolution,
  input: Pick<CurrentTermInput, "effectiveDate" | "expirationDate" | "renewalDate">,
  asOf: Date,
): RenewalClock {
  const today = etDateKey(asOf);

  if (resolved.current?.expiration) {
    return {
      days: calendarDaysBetween(today, resolved.current.expiration),
      anchor: "in_force_expiration",
    };
  }

  const renewInto: string[] = [];
  if (resolved.upcoming?.effective) {
    if (calendarDaysBetween(today, resolved.upcoming.effective) >= 0) {
      renewInto.push(resolved.upcoming.effective);
    }
  }
  const policyEffective = businessDateKey(input.effectiveDate);
  if (policyEffective && calendarDaysBetween(today, policyEffective) >= 0) {
    renewInto.push(policyEffective);
  }
  if (renewInto.length > 0) {
    renewInto.sort();
    return {
      days: calendarDaysBetween(today, renewInto[0]!),
      anchor: "renew_into_effective",
    };
  }

  const book = resolved.bookExpiration ?? businessDateKey(input.expirationDate);
  if (book) {
    return { days: calendarDaysBetween(today, book), anchor: "book_expiration" };
  }
  const renewal = businessDateKey(input.renewalDate);
  if (renewal) {
    return { days: calendarDaysBetween(today, renewal), anchor: "book_expiration" };
  }
  return { days: null, anchor: "book_expiration" };
}

export function renewalClock(input: CurrentTermInput, asOf: Date = new Date()): RenewalClock {
  return daysUntilRenewalEvent(resolveCurrentTerm(input, asOf), input, asOf);
}

export function daysToRenewal(input: CurrentTermInput, asOf: Date = new Date()): number | null {
  return renewalClock(input, asOf).days;
}
