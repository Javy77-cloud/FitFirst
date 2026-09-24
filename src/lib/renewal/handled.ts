/** Client staying / renewal handled — quiet Renewals collection, not archive. */

import { addUtcDays } from "@/lib/home/as-of";

export const RENEWAL_HANDLED_STAGE = "handled" as const;
export const RENEWAL_HANDLED_EVENT = "renewal_handled" as const;
export const RENEWAL_HANDLED_LABEL = "Client staying" as const;
export const RENEWAL_HANDLED_FILTER_LABEL = "Handled" as const;

/** Work-lane alert kinds cleared when an agent marks Client staying. */
export const RENEWAL_HANDLED_CLEAR_KINDS = [
  "renewal_silence",
  "renewal_autopilot",
] as const;

export function isRenewalHandledStageValue(stage: string | null | undefined): boolean {
  return stage === RENEWAL_HANDLED_STAGE;
}

/** Post-mark confirmation (dialog) — calmer than Policy published. */
export const RENEWAL_HANDLED_SUCCESS_TITLE = "Client staying" as const;
export const RENEWAL_HANDLED_SUCCESS_CONGRATS = "Nice work keeping them." as const;
export const RENEWAL_HANDLED_SUCCESS_BODY =
  "Chase is cleared and this renewal sits quietly in Handled. The policy stays live — you'll see them again at the next renewal." as const;
export const RENEWAL_HANDLED_SUCCESS_DONE = "Got it" as const;

/**
 * While Client staying / Handled is active, renewal proximity must not drive
 * Policies care bands, Events care chips, or the in-policy care banner.
 * Day-of term-start deletes the Handled queue row, so care returns naturally.
 */
export function renewalProximityDrivesCare(
  renewalHandled: boolean | null | undefined,
): boolean {
  return !Boolean(renewalHandled);
}

/** Last-N-days window before renewalDate when Client staying may be marked. */
export const CLIENT_STAYING_WINDOW_DAYS = 90 as const;

export const CLIENT_STAYING_NO_RENEWAL_DATE =
  "Client staying needs a renewal date on the policy." as const;

export const CLIENT_STAYING_TOO_EARLY =
  "Client staying is only available in the last 90 days before the renewal date." as const;

/**
 * Client staying is only available in the last 90 days before renewalDate
 * (inclusive of the renewal day). Missing / invalid renewal date → not available.
 * Does not fall back to expirationDate.
 */
export function isClientStayingAvailable(
  renewalDate: Date | string | null | undefined,
  asOf: Date = new Date(),
): boolean {
  if (renewalDate == null || renewalDate === "") return false;
  const anchor = renewalDate instanceof Date ? renewalDate : new Date(String(renewalDate));
  if (Number.isNaN(anchor.getTime())) return false;
  const windowStart = addUtcDays(anchor, -CLIENT_STAYING_WINDOW_DAYS);
  const t = asOf.getTime();
  return t >= windowStart.getTime() && t <= anchor.getTime();
}

/** Throws when Client staying must be blocked (server gate). */
export function assertClientStayingAvailable(
  renewalDate: Date | string | null | undefined,
  asOf: Date = new Date(),
): void {
  if (renewalDate == null || renewalDate === "") {
    throw new Error(CLIENT_STAYING_NO_RENEWAL_DATE);
  }
  const anchor = renewalDate instanceof Date ? renewalDate : new Date(String(renewalDate));
  if (Number.isNaN(anchor.getTime())) {
    throw new Error(CLIENT_STAYING_NO_RENEWAL_DATE);
  }
  if (!isClientStayingAvailable(anchor, asOf)) {
    throw new Error(CLIENT_STAYING_TOO_EARLY);
  }
}

export function clientStayingUnavailableReason(
  renewalDate: Date | string | null | undefined,
  asOf: Date = new Date(),
): string | null {
  if (isClientStayingAvailable(renewalDate, asOf)) return null;
  if (renewalDate == null || renewalDate === "") return CLIENT_STAYING_NO_RENEWAL_DATE;
  const anchor = renewalDate instanceof Date ? renewalDate : new Date(String(renewalDate));
  if (Number.isNaN(anchor.getTime())) return CLIENT_STAYING_NO_RENEWAL_DATE;
  return CLIENT_STAYING_TOO_EARLY;
}
