/** Operations carrier-history: one row per carrier per LOB. Confidence is a glance color. */

export type HistoryConfidence = "verified" | "single_source" | "overridden";

export const HISTORY_CONFIDENCE_LABEL: Record<HistoryConfidence, string> = {
  verified: "Verified",
  single_source: "Single-source",
  overridden: "Overridden",
};

export type CarrierHistoryInput = {
  carrierId: string;
  carrierName: string;
  lineOfBusiness: string;
  lastPullAt: Date | string | null;
  pullCount: number;
  fieldsCaptured: string[];
  hasCorrectionRule: boolean;
  laterPullAfterRule: boolean;
};

export function historyConfidence(row: {
  pullCount: number;
  hasCorrectionRule: boolean;
  laterPullAfterRule: boolean;
}): HistoryConfidence {
  if (row.hasCorrectionRule && !row.laterPullAfterRule) return "overridden";
  if (row.pullCount >= 2 || (row.hasCorrectionRule && row.laterPullAfterRule)) return "verified";
  return "single_source";
}

export function historyToneClass(confidence: HistoryConfidence): string {
  if (confidence === "verified") return "bg-fit-green-bg text-fit-green";
  if (confidence === "single_source") return "bg-fit-yellow-bg text-fit-yellow";
  return "bg-fit-flag-bg text-fit-flag";
}

const SNAP_LABELS: Record<string, string> = {
  snapYearBuilt: "year built",
  snapRoofYear: "roof year",
  snapRoofCovering: "roof covering",
  snapConstruction: "construction",
  snapOpeningProtection: "opening protection",
  snapOccupancy: "occupancy",
  snapStories: "stories",
  snapPool: "pool",
  snapProtectionClass: "protection class",
  snapMilesToCoast: "miles to coast",
  snapCity: "city",
  snapCounty: "county",
  snapCoverageA: "coverage A",
  premium: "premium",
  quoteNumber: "quote #",
};

export function capturedFieldLabels(snap: Record<string, unknown>): string[] {
  const labels: string[] = [];
  for (const [key, label] of Object.entries(SNAP_LABELS)) {
    const value = snap[key];
    if (value == null || value === "") continue;
    labels.push(label);
  }
  return labels;
}

export type HistoryLogLike = {
  carrierId: string;
  carrierName: string;
  lineOfBusiness: string;
  attemptedAt: Date | string;
  why?: string | null;
  snap?: Record<string, unknown>;
};

export type HistoryRuleLike = {
  carrierId: string | null;
  shopLine?: string | null;
  loggedAt: Date | string;
  fieldKey: string;
};

function asTime(value: Date | string): number {
  return new Date(value).getTime();
}

export function groupCarrierHistory(
  logs: HistoryLogLike[],
  rules: HistoryRuleLike[],
): CarrierHistoryInput[] {
  const groups = new Map<string, HistoryLogLike[]>();
  for (const log of logs) {
    const key = `${log.carrierId}:${log.lineOfBusiness}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(log);
    groups.set(key, bucket);
  }

  const rows: CarrierHistoryInput[] = [];
  for (const [, bucket] of groups) {
    const sorted = [...bucket].sort((a, b) => asTime(b.attemptedAt) - asTime(a.attemptedAt));
    const last = sorted[0]!;
    const matchingRules = rules.filter(
      (rule) => rule.carrierId === last.carrierId,
    );
    const lastRuleAt = matchingRules.reduce(
      (max, rule) => Math.max(max, asTime(rule.loggedAt)),
      0,
    );
    const laterPullAfterRule =
      lastRuleAt > 0 && sorted.some((log) => asTime(log.attemptedAt) > lastRuleAt);

    rows.push({
      carrierId: last.carrierId,
      carrierName: last.carrierName,
      lineOfBusiness: last.lineOfBusiness,
      lastPullAt: last.attemptedAt,
      pullCount: bucket.length,
      fieldsCaptured: capturedFieldLabels(last.snap ?? {}),
      hasCorrectionRule: matchingRules.length > 0,
      laterPullAfterRule,
    });
  }

  return rows.sort((a, b) => a.carrierName.localeCompare(b.carrierName) || a.lineOfBusiness.localeCompare(b.lineOfBusiness));
}
