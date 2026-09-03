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
