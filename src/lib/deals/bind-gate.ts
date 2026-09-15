/** Hard bind gate: agent must re-check premium, coverages, and deductibles. */

export type BindGateChecks = {
  premium: boolean;
  coverages: boolean;
  deductibles: boolean;
};

export type BindRecheckTerms = {
  premium?: string | number | null;
  coverageA?: number | null;
  hurricaneDeductible?: string | null;
  aopDeductible?: string | null;
  quoteRunId?: string | null;
};

export type BindRecheckAckInput = {
  ackedAt?: Date | string | null;
  fingerprint?: string | null;
  terms?: BindRecheckTerms | null;
};

export function bindGateReady(checks: BindGateChecks): boolean {
  return Boolean(checks.premium && checks.coverages && checks.deductibles);
}

function hasAckTimestamp(ackedAt: Date | string | null | undefined): boolean {
  if (ackedAt instanceof Date) return !Number.isNaN(ackedAt.getTime());
  if (typeof ackedAt === "string") return ackedAt.trim().length > 0;
  return false;
}

function termPart(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value).replace(/[$,]/g, "").trim();
}

/** Fingerprint of the terms the agent Saved — stale if premium / coverage / deductible / run change. */
export function bindRecheckTermsFingerprint(terms: BindRecheckTerms): string {
  return [
    `p=${termPart(terms.premium)}`,
    `a=${termPart(terms.coverageA)}`,
    `h=${termPart(terms.hurricaneDeductible)}`,
    `d=${termPart(terms.aopDeductible)}`,
    `r=${termPart(terms.quoteRunId)}`,
  ].join("|");
}

export function bindRecheckTermsFromQuote(quote: BindRecheckTerms): BindRecheckTerms {
  return {
    premium: quote.premium,
    coverageA: quote.coverageA,
    hurricaneDeductible: quote.hurricaneDeductible,
    aopDeductible: quote.aopDeductible,
    quoteRunId: quote.quoteRunId,
  };
}

/** Persisted Save is valid only while the quote's terms still match the saved fingerprint. */
export function quoteBindRecheckAcked(input: BindRecheckAckInput | Date | string | null | undefined): boolean {
  if (input == null || input instanceof Date || typeof input === "string") {
    return false;
  }
  if (!hasAckTimestamp(input.ackedAt)) return false;
  const stored = (input.fingerprint ?? "").trim();
  if (!stored || !input.terms) return false;
  return stored === bindRecheckTermsFingerprint(input.terms);
}

/** Bind is allowed only when the quote is bindable AND the disclosure Save still matches current terms. */
export function canBindAfterRecheckAck(input: BindRecheckAckInput & { bindable: boolean }): boolean {
  return Boolean(input.bindable) && quoteBindRecheckAcked(input);
}

export const BIND_RECHECK_CLEAR_PATCH = {
  bindRecheckAckedAt: null,
  bindRecheckAckFingerprint: null,
} as const;

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
  ackedHint: "Saved — premium, coverage, and deductible verified. Holds until this quote is rechecked or those terms change.",
  staleHint: "Quote terms changed — Save this recheck again before Bind.",
  acceptFloorHeading: "Meet carrier minimum for this quote only",
  acceptFloorHelp:
    "This overrides the asked Cov A for this quote only, so you can re-quote at their floor.",
  reQuote: "Re-quote",
  reQuoteTitle: "Save accepted minimum and queue this carrier for recheck",
} as const;
