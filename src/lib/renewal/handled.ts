/** Client staying / renewal handled — quiet Renewals collection, not archive. */

import { calendarDaysBetween, businessDateKey } from "@/lib/policies/current-term";
import { etDateKey } from "@/lib/time/et";

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
 * When the renewed term's effective date is reached, the queue stage leaves
 * handled for upcoming, so care returns for the next cycle.
 */
export function renewalProximityDrivesCare(
  renewalHandled: boolean | null | undefined,
): boolean {
  return !Boolean(renewalHandled);
}

/**
 * Last-N-days window before renewalDate when Client staying marks Handled
 * with no extra confirm. Inclusive of the renewal day.
 * Farther out is allowed only after an explicit confirm — it is not a hard block.
 */
export const CLIENT_STAYING_WINDOW_DAYS = 90 as const;

export const CLIENT_STAYING_NO_RENEWAL_DATE =
  "Client staying needs a renewal date on the policy." as const;

/** Hard block once the renewal day (ET) has already passed. */
export const CLIENT_STAYING_TOO_EARLY =
  "Client staying is only available in the last 90 days before the renewal date." as const;

/** Structured refusal when Client staying is more than 90 days before renewalDate. */
export const CLIENT_STAYING_EARLY_CODE = "client_staying_early" as const;

export const CLIENT_STAYING_EARLY_CANCEL = "Cancel" as const;
export const CLIENT_STAYING_EARLY_CONFIRM = "Confirm" as const;

export function clientStayingEarlyConfirmMessage(daysAway: number): string {
  return `This client is ${daysAway} days away from the renewal date. Are you sure you want to mark it as client staying?`;
}

export type ClientStayingEarlyResult = {
  ok: false;
  code: typeof CLIENT_STAYING_EARLY_CODE;
  daysAway: number;
  message: string;
};

/** Calendar days from today (ET) until renewalDate. Null when the date is missing. */
export function daysUntilClientStayingRenewal(
  renewalDate: Date | string | null | undefined,
  asOf: Date = new Date(),
): number | null {
  const anchor = businessDateKey(renewalDate);
  if (!anchor) return null;
  return calendarDaysBetween(etDateKey(asOf), anchor);
}

/**
 * True inside the last 90 days before renewalDate (inclusive of the renewal day).
 * False when the date is missing, already past, or more than 90 days away.
 * Does not fall back to expirationDate. More than 90 days away is a confirm, not this flag.
 */
export function isClientStayingAvailable(
  renewalDate: Date | string | null | undefined,
  asOf: Date = new Date(),
): boolean {
  const days = daysUntilClientStayingRenewal(renewalDate, asOf);
  return days != null && days >= 0 && days <= CLIENT_STAYING_WINDOW_DAYS;
}

export type ClientStayingClickPlan =
  | { kind: "blocked"; reason: string }
  | { kind: "confirm"; daysAway: number; message: string }
  | { kind: "mark" };

/**
 * What the Client staying control should do.
 * Missing renewal date, and a renewal day already past, stay blocked.
 * More than 90 days away asks for a confirm. Inside the window marks immediately.
 */
export function planClientStayingClick(
  renewalDate: Date | string | null | undefined,
  asOf: Date = new Date(),
): ClientStayingClickPlan {
  if (!businessDateKey(renewalDate)) return { kind: "blocked", reason: CLIENT_STAYING_NO_RENEWAL_DATE };
  const days = daysUntilClientStayingRenewal(renewalDate, asOf);
  if (days == null || days < 0) return { kind: "blocked", reason: CLIENT_STAYING_TOO_EARLY };
  if (days > CLIENT_STAYING_WINDOW_DAYS) {
    return {
      kind: "confirm",
      daysAway: days,
      message: clientStayingEarlyConfirmMessage(days),
    };
  }
  return { kind: "mark" };
}

/** Hard-block copy only. Null when the click can mark or can confirm. */
export function clientStayingUnavailableReason(
  renewalDate: Date | string | null | undefined,
  asOf: Date = new Date(),
): string | null {
  const plan = planClientStayingClick(renewalDate, asOf);
  return plan.kind === "blocked" ? plan.reason : null;
}

export function confirmEarlyClientStayingRequested(value: unknown): boolean {
  return value === true || value === "true";
}

export function clientStayingEarlyResult(daysAway: number): ClientStayingEarlyResult {
  return {
    ok: false,
    code: CLIENT_STAYING_EARLY_CODE,
    daysAway,
    message: clientStayingEarlyConfirmMessage(daysAway),
  };
}

export function isClientStayingEarlyResult(value: unknown): value is ClientStayingEarlyResult {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<ClientStayingEarlyResult>;
  return row.ok === false && row.code === CLIENT_STAYING_EARLY_CODE && typeof row.daysAway === "number";
}

/**
 * Structured refusal when the renewal is more than 90 days away and the
 * caller did not pass confirmEarlyClientStaying. Null when the mark may proceed
 * (inside the window, or outside it with the confirm flag). Hard blocks are
 * separate — this does not swallow a missing or past renewal date.
 */
export function clientStayingEarlyRefusal(
  renewalDate: Date | string | null | undefined,
  asOf: Date = new Date(),
  options?: { confirmEarlyClientStaying?: boolean },
): ClientStayingEarlyResult | null {
  const plan = planClientStayingClick(renewalDate, asOf);
  if (plan.kind !== "confirm") return null;
  if (options?.confirmEarlyClientStaying) return null;
  return clientStayingEarlyResult(plan.daysAway);
}

export class ClientStayingEarlyConfirmError extends Error {
  readonly code = CLIENT_STAYING_EARLY_CODE;
  readonly daysAway: number;

  constructor(daysAway: number) {
    super(clientStayingEarlyConfirmMessage(daysAway));
    this.name = "ClientStayingEarlyConfirmError";
    this.daysAway = daysAway;
  }
}

/**
 * Server gate. Missing renewal date and a past renewal day throw.
 * More than 90 days away throws ClientStayingEarlyConfirmError unless
 * confirmEarlyClientStaying is set. Inside the window, no flag is required.
 */
export function assertClientStayingAvailable(
  renewalDate: Date | string | null | undefined,
  asOf: Date = new Date(),
  options?: { confirmEarlyClientStaying?: boolean },
): void {
  const plan = planClientStayingClick(renewalDate, asOf);
  if (plan.kind === "blocked") throw new Error(plan.reason);
  if (plan.kind === "confirm" && !options?.confirmEarlyClientStaying) {
    throw new ClientStayingEarlyConfirmError(plan.daysAway);
  }
}
