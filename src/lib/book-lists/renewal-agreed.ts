/**
 * Policy-band "Renewal agreed" badge. Same mark on every band.
 *
 * Shown while a policy is Client staying and today (America/New_York) is
 * still before the renewed term's effective date. Cleared on that date.
 * Computed at render time — nothing here is stored.
 *
 * The clear date is the term the client agreed to enter. A renewal date
 * that jumped about a year after that term started is the following cycle.
 */

import { renewalAgreedEffectiveDate } from "@/lib/policies/renewal-agreed";
import { etDateKey } from "@/lib/time/et";

export const RENEWAL_AGREED_LABEL = "Renewal agreed" as const;

export type RenewalAgreedInput = {
  /** renewal_queue stage === handled (Client staying). */
  clientStaying?: boolean | null;
  /** Same flag on the book card payload. */
  handled?: boolean | null;
  /** Render-time clock. Defaults to now. */
  asOf?: Date;
  /** Stored `policies.renewal_date`. Ignored when it is the cycle after the renew-into term. */
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
  /** Prior term end, when the in-force effective is the term that was just entered. */
  priorExpiration?: Date | string | null;
  /** When Client staying was marked. */
  handledAt?: Date | string | null;
};

function clientStaying(input: RenewalAgreedInput): boolean {
  if (input.clientStaying === true || input.clientStaying === false) return input.clientStaying;
  return input.handled === true;
}

/**
 * Calendar day the renewed term starts.
 *
 * 2025-10-10 through 2026-10-09 renews effective 2026-10-10, and a Jan 1
 * through Dec 31 Marketplace, Medicare, or PNC term renews the next Jan 1.
 * A future book effective is the upcoming renew-into date. Once that day
 * is today, the badge clears.
 */
export function renewalEffectiveDateKey(
  input: Omit<RenewalAgreedInput, "clientStaying" | "handled">,
  asOf: Date = input.asOf ?? new Date(),
): string | null {
  return renewalAgreedEffectiveDate(
    {
      renewalDate: input.renewalDate,
      effectiveDate: input.currentTermEffective ?? input.termEffective,
      expirationDate: input.termExpiration,
      renewedEffectiveDate: input.renewedTermEffective ?? input.renewedEffective,
      priorExpiration: input.priorExpiration,
      handledAt: input.handledAt,
    },
    asOf,
  );
}

/** True only while Client staying is set and today (ET) is before the renewal effective date. */
export function showRenewalAgreedBadge(input: RenewalAgreedInput): boolean {
  if (!clientStaying(input)) return false;
  const asOf = input.asOf ?? new Date();
  const effective = renewalEffectiveDateKey(input, asOf);
  if (!effective) return false;
  return etDateKey(asOf) < effective;
}
