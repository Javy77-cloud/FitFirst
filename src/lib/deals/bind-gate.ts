/** Hard bind gate: agent must re-check premium, coverages, and deductibles. */

export type BindGateChecks = {
  premium: boolean;
  coverages: boolean;
  deductibles: boolean;
};

export function bindGateReady(checks: BindGateChecks): boolean {
  return Boolean(checks.premium && checks.coverages && checks.deductibles);
}

/** Persisted Save on the bind-recheck disclosure — liability cover. */
export function quoteBindRecheckAcked(ackedAt: Date | string | null | undefined): boolean {
  if (ackedAt instanceof Date) return !Number.isNaN(ackedAt.getTime());
  if (typeof ackedAt === "string") return ackedAt.trim().length > 0;
  return false;
}

/** Bind is allowed only when the quote is bindable AND the disclosure was Saved. */
export function canBindAfterRecheckAck(input: {
  bindable: boolean;
  ackedAt?: Date | string | null;
}): boolean {
  return Boolean(input.bindable) && quoteBindRecheckAcked(input.ackedAt);
}

export function clearBindRecheckReasonOk(reason: string | null | undefined): boolean {
  return Boolean((reason ?? "").trim());
}

export const BIND_GATE_COPY = {
  title: "Re-check this quote before bind",
  subtitle:
    "Re-check means additional or provisional information may still be required, or this quote may be incomplete / unavailable to bind online yet. Confirm premium, coverages, and deductibles against the carrier before you bind.",
  verifyPrompt:
    "Please confirm the premium, coverages, and deductibles match the carrier quote.",
  premium: "Premium matches the carrier quote",
  coverages: "Coverages match the carrier quote",
  deductibles: "Deductibles match the carrier quote",
  blocked: "Cannot finalize bind until premium, coverages, and deductibles are confirmed.",
  bindBlockedUntilSave: "Save this recheck before you can Bind.",
  save: "Save",
  saveTitle: "I verified premium, coverage, and deductible for this quote",
  ackedHint: "Saved — premium, coverage, and deductible verified.",
  uncheckHeading: "Clear this acknowledgment",
  uncheckReason: "Why are you clearing the recheck?",
  uncheckConfirm: "Clear acknowledgment",
  uncheckBlocked: "A reason is required to uncheck this disclosure.",
  acceptFloorHeading: "Meet carrier minimum for this quote only",
  acceptFloorHelp:
    "This overrides the asked Cov A for this quote only, so you can re-quote at their floor.",
  reQuote: "Re-quote",
  reQuoteTitle: "Save accepted minimum and queue this carrier for recheck",
} as const;
