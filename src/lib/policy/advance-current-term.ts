/**
 * After renewal: when a Current-term DEC is marked (or Client staying with a Current DEC),
 * advance policy_terms + policies.effective/expiration so Policies → Current shows days left.
 *
 * Date precedence (never invent conflicting DEC dates):
 * 1. Extracted DEC effective+expiration when both present
 * 2. Agent-edited policy dates when they already differ from the previous current term
 * 3. Proposed policy_terms row (Fill Compare) when present with both dates
 * 4. Annual roll from previous current: new effective = old expiration; new expiration =
 *    old expiration + prior term length (matches Zoila 10641239 2026-07-30 → 2027-07-29)
 */

export type TermDatePair = {
  effective: Date;
  expiration: Date;
};

export type AdvanceTermDateSource =
  | "extracted"
  | "policy_edited"
  | "proposed_term"
  | "annual_roll";

export type ResolveAdvanceTermDatesInput = {
  /** Gemini/DEC extract — only used when both dates parse cleanly. */
  extractedEffective?: Date | string | null;
  extractedExpiration?: Date | string | null;
  /** Live policy row dates (may already have been edited by the agent). */
  policyEffective?: Date | string | null;
  policyExpiration?: Date | string | null;
  /** Previous role=current term (book of record before advance). */
  previousCurrent?: {
    termEffective: Date | string;
    termExpiration: Date | string;
  } | null;
  /** Optional Fill Compare proposed term. */
  proposed?: {
    termEffective: Date | string;
    termExpiration: Date | string;
  } | null;
  /** policies.term_months or document term_months tag; default 12. */
  termMonths?: number | null;
  /**
   * Desk "today" for annual-roll gating. Annual roll only runs when the prior
   * expiration is on or before this day (renewal already in force / past X-date).
   * Extract / policy_edited / proposed still apply regardless.
   */
  asOf?: Date | string | null;
  /** When false, skip annual roll even if expired (default true). */
  allowAnnualRoll?: boolean;
};

export type ResolveAdvanceTermDatesResult =
  | { ok: true; dates: TermDatePair; source: AdvanceTermDateSource }
  | { ok: false; reason: string };

function asNoonUtc(value: Date | string | null | undefined): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const day = value.toISOString().slice(0, 10);
    return new Date(`${day}T12:00:00.000Z`);
  }
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return new Date(`${text.slice(0, 10)}T12:00:00.000Z`);
  }
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.toISOString().slice(0, 10);
  return new Date(`${day}T12:00:00.000Z`);
}

function sameDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

function validPair(effective: Date, expiration: Date): boolean {
  return expiration.getTime() >= effective.getTime();
}

/**
 * Roll the renewed term forward from the prior current term.
 * New effective = old expiration; length preserved (or termMonths / 12 months).
 */
export function inferAnnualRollTermDates(input: {
  termEffective: Date | string;
  termExpiration: Date | string;
  termMonths?: number | null;
}): TermDatePair | null {
  const oldEff = asNoonUtc(input.termEffective);
  const oldExp = asNoonUtc(input.termExpiration);
  if (!oldEff || !oldExp || !validPair(oldEff, oldExp)) return null;

  const newEffective = oldExp;
  const priorMs = oldExp.getTime() - oldEff.getTime();
  if (priorMs > 0) {
    const rolled = new Date(newEffective.getTime() + priorMs);
    const day = rolled.toISOString().slice(0, 10);
    return {
      effective: newEffective,
      expiration: new Date(`${day}T12:00:00.000Z`),
    };
  }

  const months =
    input.termMonths != null && Number.isFinite(input.termMonths) && input.termMonths > 0
      ? Math.round(input.termMonths)
      : 12;
  const y = newEffective.getUTCFullYear();
  const m = newEffective.getUTCMonth();
  const d = newEffective.getUTCDate();
  const end = new Date(Date.UTC(y, m + months, d, 12, 0, 0, 0));
  // Exclusive-end style used on many FL annual policies: land one day earlier.
  end.setUTCDate(end.getUTCDate() - 1);
  return { effective: newEffective, expiration: end };
}


/** Prior expiration is on/before asOf (UTC day) — safe to annual-roll. */
export function priorTermIsExpiredOrDue(
  expiration: Date | string | null | undefined,
  asOf: Date | string | null | undefined = new Date(),
): boolean {
  const exp = asNoonUtc(expiration);
  const today = asNoonUtc(asOf) ?? asNoonUtc(new Date());
  if (!exp || !today) return false;
  return exp.getTime() <= today.getTime();
}

export const ADVANCE_NOTHING_TO_ADVANCE =
  "No DEC extract or proposed term to advance, and prior term is not yet due for annual roll.";

export function resolveAdvanceTermDates(
  input: ResolveAdvanceTermDatesInput,
): ResolveAdvanceTermDatesResult {
  const extractedEff = asNoonUtc(input.extractedEffective);
  const extractedExp = asNoonUtc(input.extractedExpiration);
  if (extractedEff && extractedExp) {
    if (!validPair(extractedEff, extractedExp)) {
      return {
        ok: false,
        reason:
          "DEC extract has conflicting dates (expiration before effective). Fix the extract or Correct term dates — FitFirst will not invent replacements.",
      };
    }
    return {
      ok: true,
      dates: { effective: extractedEff, expiration: extractedExp },
      source: "extracted",
    };
  }
  // Partial extract: do not silently invent the missing side.
  if (extractedEff || extractedExp) {
    return {
      ok: false,
      reason:
        "DEC extract has only one of effective/expiration. Complete the extract or Correct term dates — FitFirst will not invent the missing date.",
    };
  }

  const prev = input.previousCurrent
    ? {
        eff: asNoonUtc(input.previousCurrent.termEffective),
        exp: asNoonUtc(input.previousCurrent.termExpiration),
      }
    : null;

  const policyEff = asNoonUtc(input.policyEffective);
  const policyExp = asNoonUtc(input.policyExpiration);
  if (policyEff && policyExp && validPair(policyEff, policyExp)) {
    const differsFromPrev =
      !prev?.eff ||
      !prev?.exp ||
      !sameDay(policyEff, prev.eff) ||
      !sameDay(policyExp, prev.exp);
    if (differsFromPrev) {
      return {
        ok: true,
        dates: { effective: policyEff, expiration: policyExp },
        source: "policy_edited",
      };
    }
  }

  const proposedEff = asNoonUtc(input.proposed?.termEffective);
  const proposedExp = asNoonUtc(input.proposed?.termExpiration);
  if (proposedEff && proposedExp && validPair(proposedEff, proposedExp)) {
    return {
      ok: true,
      dates: { effective: proposedEff, expiration: proposedExp },
      source: "proposed_term",
    };
  }

  const allowRoll = input.allowAnnualRoll !== false;
  const asOf = input.asOf ?? new Date();

  if (allowRoll && prev?.eff && prev?.exp && priorTermIsExpiredOrDue(prev.exp, asOf)) {
    const rolled = inferAnnualRollTermDates({
      termEffective: prev.eff,
      termExpiration: prev.exp,
      termMonths: input.termMonths,
    });
    if (rolled) {
      return { ok: true, dates: rolled, source: "annual_roll" };
    }
  }

  if (
    allowRoll &&
    policyEff &&
    policyExp &&
    validPair(policyEff, policyExp) &&
    priorTermIsExpiredOrDue(policyExp, asOf)
  ) {
    const rolled = inferAnnualRollTermDates({
      termEffective: policyEff,
      termExpiration: policyExp,
      termMonths: input.termMonths,
    });
    if (rolled) {
      return { ok: true, dates: rolled, source: "annual_roll" };
    }
  }

  return {
    ok: false,
    reason: ADVANCE_NOTHING_TO_ADVANCE,
  };
}

export type AdvanceTermTrigger = "document_term_role" | "client_staying" | "manual_fix";

/**
 * A Current mark with nothing to roll is still a successful tag change.
 * Policy-missing and manual_fix stay hard failures at the caller.
 */
export function unresolvedAdvanceResult(
  trigger: AdvanceTermTrigger,
  reason: string,
): { ok: true; advanced: false; reason: string } | { ok: false; error: string } {
  if (trigger === "manual_fix") return { ok: false, error: reason };
  return { ok: true, advanced: false, reason };
}

/** True when book dates already match the resolved renewed term (idempotent skip). */
export function advanceTermAlreadyApplied(
  current: { termEffective: Date | string; termExpiration: Date | string } | null | undefined,
  next: TermDatePair,
): boolean {
  if (!current) return false;
  const eff = asNoonUtc(current.termEffective);
  const exp = asNoonUtc(current.termExpiration);
  if (!eff || !exp) return false;
  return sameDay(eff, next.effective) && sameDay(exp, next.expiration);
}

export type PolicyTermRoleRow = {
  id: string;
  role: string;
  termEffective: Date | string;
  createdAt?: Date | string | null;
};

/**
 * Plan policy_terms role demotions for a renewal advance:
 * current → prior; existing priors stay prior (book history; domain has no archive role).
 * Document tag archive flip remains day-of / document-labels responsibility.
 */
export function planPolicyTermDemotions(terms: readonly PolicyTermRoleRow[]): {
  demoteCurrentToPrior: string[];
} {
  return {
    demoteCurrentToPrior: terms.filter((row) => row.role === "current").map((row) => row.id),
  };
}

export function formatAdvanceTermIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function advanceTermChangeSummary(input: {
  policyNumber?: string | null;
  fromEffective: string;
  fromExpiration: string;
  toEffective: string;
  toExpiration: string;
  source: AdvanceTermDateSource;
}): string {
  const label = (input.policyNumber ?? "").trim() || "policy";
  return `Advanced current term on ${label} (${input.fromEffective}→${input.toEffective} / ${input.fromExpiration}→${input.toExpiration}) via ${input.source}.`;
}
