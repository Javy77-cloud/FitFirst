import { formatMoney } from "@/lib/domain";
import type { PolicyCoverageLine, RenewalCompareSnapshot } from "@/lib/db/schema";

export type TermRole = "current" | "proposed";

export type PremiumChange = {
  current: number;
  proposed: number;
  delta: number;
  pct: number | null;
  direction: "up" | "down" | "flat";
};

export type CoverageCompareRow = {
  key: string;
  label: string;
  currentValue: string;
  proposedValue: string;
  changed: boolean;
};

export function parseMoney(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = Number(String(value).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function premiumChange(current: number, proposed: number): PremiumChange {
  const delta = roundMoney(proposed - current);
  const pct = current === 0 ? null : delta / current;
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return { current, proposed, delta, pct, direction };
}

export function formatSignedMoney(n: number): string {
  const abs = formatMoney(Math.abs(n));
  if (n > 0) return `+${abs}`;
  if (n < 0) return `-${abs}`;
  return abs;
}

/** Board + Compare drawer: increase = red, flat/decrease = green (match Overview up = fit-red). */
export function premiumDeltaTone(direction: PremiumChange["direction"]): "red" | "green" {
  return direction === "up" ? "red" : "green";
}

export function formatDeltaPct(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const body = `${(pct * 100).toFixed(1)}%`;
  return pct > 0 ? `+${body}` : body;
}

export function compareSummary(change: PremiumChange): string {
  if (change.direction === "flat") {
    return `Premium unchanged at ${formatMoney(change.current)}.`;
  }
  const verb = change.direction === "up" ? "increase" : "decrease";
  return `Premium ${verb} ${formatSignedMoney(change.delta)} (${formatDeltaPct(change.pct)}) from ${formatMoney(change.current)} to ${formatMoney(change.proposed)}.`;
}

/**
 * One-line shop/stay hint from simple % thresholds — not AI, never invents premiums.
 * <5% modest stay; 5–15% review/shop if needed; ≥15% shop strong alternatives.
 */
export function premiumShopStayHint(change: PremiumChange): string {
  if (change.direction === "flat") {
    return "Flat renewal — stay with carrier unless coverage gaps.";
  }
  if (change.direction === "down") {
    return "Premium down — stay is usually the easy call.";
  }
  const pctPoints = change.pct == null || !Number.isFinite(change.pct) ? null : change.pct * 100;
  if (pctPoints == null) {
    return "Premium up — open Compare and confirm with the client.";
  }
  if (pctPoints < 5) {
    return "Modest increase — often stay; confirm coverages match.";
  }
  if (pctPoints < 15) {
    return "Material increase — review Compare and shop if needed.";
  }
  return "Sharp increase — shop strong alternatives before renewing.";
}

/** One-word board chip — only when the signal is obvious; skip modest bumps (no clutter). */
export function premiumShopStayChip(
  change: Pick<PremiumChange, "pct" | "direction">,
): "Shop" | "Stay" | null {
  if (change.direction === "flat" || change.direction === "down") return "Stay";
  const pctPoints = change.pct == null || !Number.isFinite(change.pct) ? null : change.pct * 100;
  if (pctPoints != null && pctPoints >= 8) return "Shop";
  return null;
}

/** Tunable premium-% bands for desk renewal-risk chips (not AI). */
export const PREMIUM_LAPSE_RISK_LOW_MAX = 5;
export const PREMIUM_LAPSE_RISK_MEDIUM_MAX = 12;

export type PremiumLapseRisk = "low" | "medium" | "high";

export const PREMIUM_LAPSE_RISK_LABEL: Record<PremiumLapseRisk, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/**
 * Premium-driven renewal risk (shopping risk) from proposed % change — not payment lapse.
 * <5% Low; 5–12% Medium; ≥12% High. Flat/down → Low (cheaper renewals rarely drive shopping).
 */
export function premiumLapseRisk(
  change: Pick<PremiumChange, "pct" | "direction">,
): PremiumLapseRisk {
  if (change.direction === "flat" || change.direction === "down") return "low";
  const pctPoints = change.pct == null || !Number.isFinite(change.pct) ? null : change.pct * 100;
  if (pctPoints == null) return "medium";
  if (pctPoints < PREMIUM_LAPSE_RISK_LOW_MAX) return "low";
  if (pctPoints < PREMIUM_LAPSE_RISK_MEDIUM_MAX) return "medium";
  return "high";
}

/** Board clutter control — only surface Medium/High premium renewal risk. */
export function premiumLapseRiskBoardChip(
  change: Pick<PremiumChange, "pct" | "direction">,
): PremiumLapseRisk | null {
  const level = premiumLapseRisk(change);
  return level === "low" ? null : level;
}

/** Board glance: +$118 +3.3% (never invents % when current premium is zero). */
export function formatBoardPremiumDelta(delta: number, pct: number | null): string {
  const money = formatSignedMoney(delta);
  if (pct == null || !Number.isFinite(pct)) return money;
  return `${money} ${formatDeltaPct(pct)}`;
}

function asCoverageLines(
  value: PolicyCoverageLine[] | Record<string, string> | null | undefined,
): PolicyCoverageLine[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return Object.entries(value).map(([key, lineValue]) => ({
    key,
    label: key,
    value: lineValue,
  }));
}

export function coverageRows(
  current: PolicyCoverageLine[] | Record<string, string> | null | undefined,
  proposed: PolicyCoverageLine[] | Record<string, string> | null | undefined,
): CoverageCompareRow[] {
  const currentLines = asCoverageLines(current);
  const proposedLines = asCoverageLines(proposed);
  const keys: string[] = [];
  for (const line of [...currentLines, ...proposedLines]) {
    if (!keys.includes(line.key)) keys.push(line.key);
  }
  const currentByKey = new Map(currentLines.map((line) => [line.key, line]));
  const proposedByKey = new Map(proposedLines.map((line) => [line.key, line]));
  return keys.map((key) => {
    const currentLine = currentByKey.get(key);
    const proposedLine = proposedByKey.get(key);
    const currentValue = currentLine?.value ?? "—";
    const proposedValue = proposedLine?.value ?? "—";
    return {
      key,
      label: proposedLine?.label ?? currentLine?.label ?? key,
      currentValue,
      proposedValue,
      changed: currentValue !== proposedValue,
    };
  });
}

export function deductiblesForLine(lineOfBusiness: string): {
  key: "aopDeductible" | "hurricaneDeductible" | "comprehensiveDeductible" | "collisionDeductible";
  label: string;
}[] {
  if (lineOfBusiness === "AUTO") {
    return [
      { key: "comprehensiveDeductible", label: "Comprehensive deductible" },
      { key: "collisionDeductible", label: "Collision deductible" },
    ];
  }
  return [
    { key: "aopDeductible", label: "AOP deductible" },
    { key: "hurricaneDeductible", label: "Hurricane deductible" },
  ];
}

export function buildCompareSnapshot(input: {
  currentPremium: string | number;
  proposedPremium: string | number;
  change: PremiumChange;
  currentDeductibles: Record<string, string | null>;
  proposedDeductibles: Record<string, string | null>;
  coverageRows: CoverageCompareRow[];
}): RenewalCompareSnapshot {
  return {
    currentPremium: String(input.currentPremium),
    proposedPremium: String(input.proposedPremium),
    premiumDelta: input.change.delta.toFixed(2),
    premiumDeltaPct: input.change.pct == null ? null : input.change.pct.toFixed(4),
    currentDeductibles: input.currentDeductibles,
    proposedDeductibles: input.proposedDeductibles,
    coverageRows: input.coverageRows,
  };
}
