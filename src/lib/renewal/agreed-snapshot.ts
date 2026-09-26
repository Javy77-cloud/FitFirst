/**
 * Freeze old vs new when Client staying is pushed, before term roles advance.
 * Reopen reads this record so Compare still has both sides after prior/current flip.
 */

import type { PolicyCoverageLine, RenewalCompareSnapshot } from "@/lib/db/schema";
import {
  buildCompareSnapshot,
  compareSummary,
  coverageRows,
  parseMoney,
  premiumChange,
} from "@/lib/renewal/compare";

export const RENEWAL_AGREED_COMPARE_EVENT = "renewal_agreed" as const;

export type AgreedTermSide = {
  id: string;
  premium: string | number | null;
  termEffective: Date | string;
  termExpiration: Date | string;
  aopDeductible: string | null;
  hurricaneDeductible: string | null;
  comprehensiveDeductible: string | null;
  collisionDeductible: string | null;
  coverages: PolicyCoverageLine[] | Record<string, string> | null;
};

export type RenewalAgreedCompareValues = {
  policyId: string;
  currentTermId: string;
  proposedTermId: string;
  eventType: typeof RENEWAL_AGREED_COMPARE_EVENT;
  currentPremium: string;
  proposedPremium: string;
  delta: string;
  pct: string | null;
  summary: string;
  snapshot: RenewalCompareSnapshot;
};

function isoStamp(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function deductibles(term: AgreedTermSide): Record<string, string | null> {
  return {
    aopDeductible: term.aopDeductible,
    hurricaneDeductible: term.hurricaneDeductible,
    comprehensiveDeductible: term.comprehensiveDeductible,
    collisionDeductible: term.collisionDeductible,
  };
}

/**
 * Old term is role=current and new term is role=proposed at stamp time.
 * Returns null when either premium is missing — the stamp still proceeds.
 */
export function renewalAgreedCompareValues(input: {
  policyId: string;
  oldTerm: AgreedTermSide;
  newTerm: AgreedTermSide;
}): RenewalAgreedCompareValues | null {
  const currentPremium = parseMoney(input.oldTerm.premium);
  const proposedPremium = parseMoney(input.newTerm.premium);
  if (currentPremium == null || proposedPremium == null) return null;
  const change = premiumChange(currentPremium, proposedPremium);
  const rows = coverageRows(input.oldTerm.coverages, input.newTerm.coverages);
  const currentText = currentPremium.toFixed(2);
  const proposedText = proposedPremium.toFixed(2);
  return {
    policyId: input.policyId,
    currentTermId: input.oldTerm.id,
    proposedTermId: input.newTerm.id,
    eventType: RENEWAL_AGREED_COMPARE_EVENT,
    currentPremium: currentText,
    proposedPremium: proposedText,
    delta: change.delta.toFixed(2),
    pct: change.pct == null ? null : change.pct.toFixed(4),
    summary: compareSummary(change),
    snapshot: {
      ...buildCompareSnapshot({
        currentPremium: currentText,
        proposedPremium: proposedText,
        change,
        currentDeductibles: deductibles(input.oldTerm),
        proposedDeductibles: deductibles(input.newTerm),
        coverageRows: rows,
      }),
      currentTermEffective: isoStamp(input.oldTerm.termEffective),
      currentTermExpiration: isoStamp(input.oldTerm.termExpiration),
      proposedTermEffective: isoStamp(input.newTerm.termEffective),
      proposedTermExpiration: isoStamp(input.newTerm.termExpiration),
      baselineLabel: "Old term",
      renewalLabel: "New term",
    },
  };
}

export function asRenewalCompareSnapshot(value: unknown): RenewalCompareSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<RenewalCompareSnapshot>;
  if (typeof row.currentPremium !== "string" || typeof row.proposedPremium !== "string") return null;
  if (!Array.isArray(row.coverageRows)) return null;
  return row as RenewalCompareSnapshot;
}

/** Latest renewal-agreed freeze. Ignores later live term roles. */
export function latestRenewalAgreedSnapshot(
  logs: readonly { eventType: string; createdAt: Date | string; snapshot: unknown }[],
): RenewalCompareSnapshot | null {
  const matches = logs
    .filter((log) => log.eventType === RENEWAL_AGREED_COMPARE_EVENT)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  for (const log of matches) {
    const snapshot = asRenewalCompareSnapshot(log.snapshot);
    if (snapshot) return snapshot;
  }
  return null;
}
