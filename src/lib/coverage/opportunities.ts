import {
  applyInForceCarrierLock,
  type DeclaredCoverageLine,
} from "@/lib/coverage/declared-coverage";
import {
  analyzeCoverageGaps,
  gapLineLabel,
  type CoverageLine,
  type GapPolicyInput,
} from "@/lib/coverage/gaps";
import { householdCoveredLines } from "@/lib/coverage/notices";

export type GeneratedOpportunityReason = "gap" | "life_event";

export type GeneratedOpportunity = {
  line: CoverageLine;
  label: string;
  reason: GeneratedOpportunityReason;
  detail: string;
};

const LINE_ORDER: CoverageLine[] = [
  "HO",
  "AUTO",
  "FLOOD",
  "UMBRELLA",
  "RV",
  "GL",
  "BOP",
  "WC",
  "LIFE",
  "HEALTH",
];

/**
 * Recent life events → lines to review if the household is not already covered
 * (with us or another carrier).
 */
const LIFE_EVENT_LINES: Record<string, CoverageLine[]> = {
  marriage: ["UMBRELLA", "LIFE"],
  divorce: ["HO", "AUTO", "LIFE"],
  "new baby": ["LIFE", "HEALTH", "UMBRELLA"],
  "new home purchase": ["HO", "FLOOD", "UMBRELLA"],
  moved: ["HO", "AUTO", "FLOOD"],
  "remodel / renovation": ["HO", "FLOOD"],
  "job change": ["LIFE", "HEALTH"],
  retirement: ["LIFE", "HEALTH", "UMBRELLA"],
  "death in family": ["LIFE"],
  "empty nest": ["LIFE", "UMBRELLA"],
};

export function parseRecentLifeEvents(raw: string | null | undefined): string[] {
  return String(raw ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function linesForLifeEvent(event: string): CoverageLine[] {
  const key = event.trim().toLowerCase();
  return LIFE_EVENT_LINES[key] ?? [];
}

function sortOpportunities(rows: GeneratedOpportunity[]): GeneratedOpportunity[] {
  return [...rows].sort((a, b) => {
    const ai = LINE_ORDER.indexOf(a.line);
    const bi = LINE_ORDER.indexOf(b.line);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
}

function syntheticPolicies(inForceLines: Iterable<CoverageLine>): GapPolicyInput[] {
  return [...inForceLines]
    .filter((line) => line !== "OTHER")
    .map((line) => ({
      id: `in-force-${line}`,
      status: "active",
      lineOfBusiness: line,
    }));
}

/**
 * Read-only household opportunities.
 * Covered = in-force with us ∪ coverage with other carriers.
 * Missing-home / missing-auto are not invented when those lines are already covered.
 */
export function generateContactOpportunities(input: {
  policies?: GapPolicyInput[];
  inForceLines?: Iterable<CoverageLine>;
  declaredCoverage?: DeclaredCoverageLine[] | null;
  recentLifeEvents?: string | null;
  partyName?: string;
}): GeneratedOpportunity[] {
  const policies = input.policies ?? syntheticPolicies(input.inForceLines ?? []);
  const declaredOther = (input.declaredCoverage ?? []).filter(
    (row) => row.line !== "OTHER" && row.carrierOfRecord !== "us",
  );
  const declared = applyInForceCarrierLock(declaredOther, input.inForceLines ?? []);
  const partyName = input.partyName?.trim() || "This household";
  const report = analyzeCoverageGaps({
    policies,
    partyName,
    declaredCoverage: declared,
  });
  const covered = householdCoveredLines(policies, declared);
  const byLine = new Map<CoverageLine, GeneratedOpportunity>();

  for (const finding of report.findings) {
    for (const line of finding.missing) {
      if (covered.has(line)) continue;
      byLine.set(line, {
        line,
        label: gapLineLabel(line),
        reason: "gap",
        detail: finding.plainEnglish,
      });
    }
  }

  for (const event of parseRecentLifeEvents(input.recentLifeEvents)) {
    for (const line of linesForLifeEvent(event)) {
      if (covered.has(line) || byLine.has(line)) continue;
      byLine.set(line, {
        line,
        label: gapLineLabel(line),
        reason: "life_event",
        detail: `${event} is a reason to review ${gapLineLabel(line).toLowerCase()} — the household is not covered for that line.`,
      });
    }
  }

  return sortOpportunities([...byLine.values()]);
}
