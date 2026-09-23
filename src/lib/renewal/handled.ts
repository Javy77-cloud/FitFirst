/** Client staying / renewal handled — quiet Renewals collection, not archive. */

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

