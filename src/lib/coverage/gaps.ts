import type { DeclaredCoverageLine } from "@/lib/coverage/declared-coverage";
import { isInForcePolicyStatus } from "@/lib/lifecycle/client-status";

/** Lines the gap engine can see. Quotes never appear here. */
export type CoverageLine =
  | "HO"
  | "AUTO"
  | "FLOOD"
  | "UMBRELLA"
  | "GL"
  | "BOP"
  | "WC"
  | "LIFE"
  | "HEALTH"
  | "RV"
  | "OTHER";

export type GapRuleId =
  | "auto-no-home"
  | "home-no-auto"
  | "home-no-flood"
  | "no-umbrella"
  | "flood-no-home"
  | "gl-no-wc"
  | "gl-no-umbrella"
  | "bop-no-wc";

export type GapPolicyInput = {
  id: string;
  status: string;
  lineOfBusiness: string;
  policyNumber?: string | null;
};

export type CoverageGapFinding = {
  id: GapRuleId;
  title: string;
  plainEnglish: string;
  has: CoverageLine[];
  missing: CoverageLine[];
  severity: "talk" | "watch";
};

export type CoverageGapRewrite = {
  line: CoverageLine;
  plainEnglish: string;
};

export type CoverageGapReport = {
  partyName: string;
  inForceCount: number;
  inForceLines: CoverageLine[];
  /** In-force plus declared us/other. “Missing” is the complement of this set. */
  coveredLines: CoverageLine[];
  otherCarrierLines: CoverageLine[];
  findings: CoverageGapFinding[];
  rewrites: CoverageGapRewrite[];
  emptyReason: string | null;
  quotesDoNotCount: string;
};

const PERSONAL: CoverageLine[] = ["HO", "AUTO", "FLOOD", "UMBRELLA", "RV"];
const COMMERCIAL: CoverageLine[] = ["GL", "BOP", "WC"];

export function classifyCoverageLine(lineOfBusiness: string): CoverageLine {
  const raw = lineOfBusiness.trim().toUpperCase();
  if (raw === "HO" || raw === "HO3" || raw === "HO6" || raw === "HOME" || raw === "HOMEOWNERS") {
    return "HO";
  }
  if (raw === "AUTO" || raw === "PA" || raw === "PERSONAL_AUTO" || raw === "PERSONAL AUTO") {
    return "AUTO";
  }
  if (raw === "FLOOD" || raw === "NFIP") return "FLOOD";
  if (raw === "UMBRELLA" || raw === "PUM" || raw === "CUM") return "UMBRELLA";
  if (raw === "GL" || raw === "CGL" || raw === "GENERAL LIABILITY") return "GL";
  if (raw === "BOP") return "BOP";
  if (raw === "WC" || raw === "WORKERS COMP" || raw === "WORKERS_COMP") return "WC";
  if (raw === "LIFE") return "LIFE";
  if (raw === "HEALTH" || raw === "ACCIDENT") return "HEALTH";
  if (raw === "RV" || raw === "REC") return "RV";
  return "OTHER";
}

export function inForceGapPolicies(policies: GapPolicyInput[]): GapPolicyInput[] {
  return policies.filter((policy) => isInForcePolicyStatus(policy.status));
}

function lineSet(policies: GapPolicyInput[]): Set<CoverageLine> {
  const lines = new Set<CoverageLine>();
  for (const policy of inForceGapPolicies(policies)) {
    const line = classifyCoverageLine(policy.lineOfBusiness);
    if (line !== "OTHER" && line !== "LIFE" && line !== "HEALTH") lines.add(line);
  }
  return lines;
}

function hasAny(lines: Set<CoverageLine>, group: CoverageLine[]): boolean {
  return group.some((line) => lines.has(line));
}

function isCompanionLine(line: CoverageLine): boolean {
  return line !== "OTHER" && line !== "LIFE" && line !== "HEALTH";
}

function coveredLineSet(
  policies: GapPolicyInput[],
  declared: readonly DeclaredCoverageLine[] | undefined,
): { covered: Set<CoverageLine>; otherCarrier: Set<CoverageLine>; inForce: Set<CoverageLine> } {
  const inForce = lineSet(policies);
  const covered = new Set(inForce);
  const otherCarrier = new Set<CoverageLine>();
  for (const row of declared ?? []) {
    if (!isCompanionLine(row.line)) continue;
    covered.add(row.line);
    if (row.carrierOfRecord === "other" && !inForce.has(row.line)) {
      otherCarrier.add(row.line);
    }
  }
  return { covered, otherCarrier, inForce };
}

export function analyzeCoverageGaps(input: {
  policies: GapPolicyInput[];
  partyName: string;
  isAna?: boolean;
  quoteCount?: number;
  /** Contact Coverage marks — other-carrier only. In-force with us comes from policies. */
  declaredCoverage?: DeclaredCoverageLine[];
}): CoverageGapReport {
  const inForce = inForceGapPolicies(input.policies);
  const { covered: lines, otherCarrier, inForce: inForceSet } = coveredLineSet(
    input.policies,
    input.declaredCoverage,
  );
  const inForceLines = [...inForceSet].sort();
  const coveredLines = [...lines].sort();
  const otherCarrierLines = [...otherCarrier].sort();
  const quotesDoNotCount =
    input.quoteCount && input.quoteCount > 0
      ? `${input.quoteCount} quote${input.quoteCount === 1 ? "" : "s"} on the shop do not count as coverage.`
      : "Quotes are not coverage. Only Active, Bound, or Pending policies count.";

  if (inForce.length === 0 && lines.size === 0) {
    return {
      partyName: input.partyName,
      inForceCount: 0,
      inForceLines: [],
      coveredLines: [],
      otherCarrierLines: [],
      findings: [],
      rewrites: [],
      emptyReason: input.isAna
        ? "Ana Dib has no in-force policy. This shop stays Quote Sent. Coverage A is $321,000. Do not bind Ana."
        : `${input.partyName} has no in-force policy yet. ${quotesDoNotCount}`,
      quotesDoNotCount,
    };
  }

  const findings: CoverageGapFinding[] = [];
  const personalBook = hasAny(lines, PERSONAL);
  const commercialBook = hasAny(lines, COMMERCIAL);

  if (personalBook) {
    if (lines.has("AUTO") && !lines.has("HO")) {
      findings.push({
        id: "auto-no-home",
        title: "Auto on the books — no homeowners",
        plainEnglish: `${input.partyName} has an auto policy and no homeowners. The car is covered; the house is not. A dwelling claim would have nowhere to go.`,
        has: ["AUTO"],
        missing: ["HO"],
        severity: "talk",
      });
    }
    if (lines.has("HO") && !lines.has("AUTO")) {
      findings.push({
        id: "home-no-auto",
        title: "Home on the books — no auto",
        plainEnglish: `${input.partyName} has homeowners and no auto. The house is written; the driveway is not. Ask whether anyone in the household drives.`,
        has: ["HO"],
        missing: ["AUTO"],
        severity: "talk",
      });
    }
    if (lines.has("HO") && !lines.has("FLOOD")) {
      findings.push({
        id: "home-no-flood",
        title: "Homeowners, no flood",
        plainEnglish: `${input.partyName} has homeowners and no flood policy. An HO3 does not pay for flood. In Florida that is a separate conversation.`,
        has: ["HO"],
        missing: ["FLOOD"],
        severity: "talk",
      });
    }
    if ((lines.has("HO") || lines.has("AUTO")) && !lines.has("UMBRELLA")) {
      findings.push({
        id: "no-umbrella",
        title: "No personal umbrella",
        plainEnglish: `${input.partyName} has ${
          lines.has("HO") && lines.has("AUTO")
            ? "home and auto"
            : lines.has("HO")
              ? "homeowners"
              : "auto"
        } and no umbrella. A serious liability claim can blow past those limits.`,
        has: lines.has("HO") && lines.has("AUTO") ? ["HO", "AUTO"] : lines.has("HO") ? ["HO"] : ["AUTO"],
        missing: ["UMBRELLA"],
        severity: "watch",
      });
    }
    if (lines.has("FLOOD") && !lines.has("HO")) {
      findings.push({
        id: "flood-no-home",
        title: "Flood on the books — no homeowners",
        plainEnglish: `${input.partyName} has flood and no homeowners. Flood does not replace an HO3 for fire, wind, or theft.`,
        has: ["FLOOD"],
        missing: ["HO"],
        severity: "talk",
      });
    }
  }

  if (commercialBook) {
    if ((lines.has("GL") || lines.has("BOP")) && !lines.has("WC")) {
      findings.push({
        id: lines.has("BOP") && !lines.has("GL") ? "bop-no-wc" : "gl-no-wc",
        title: "Liability written — no workers comp",
        plainEnglish: `${input.partyName} has ${
          lines.has("GL") ? "general liability" : "a BOP"
        } and no workers comp. A hurt employee or crew is not covered by GL.`,
        has: lines.has("GL") ? ["GL"] : ["BOP"],
        missing: ["WC"],
        severity: "talk",
      });
    }
    if ((lines.has("GL") || lines.has("BOP")) && !lines.has("UMBRELLA")) {
      findings.push({
        id: "gl-no-umbrella",
        title: "No commercial umbrella",
        plainEnglish: `${input.partyName} has ${
          lines.has("GL") ? "GL" : "a BOP"
        } and no umbrella. One bad liability claim can exceed those limits.`,
        has: lines.has("GL") ? ["GL"] : ["BOP"],
        missing: ["UMBRELLA"],
        severity: "watch",
      });
    }
  }

  const rewrites = otherCarrierLines.map((line) => ({
    line,
    plainEnglish: `${input.partyName} has ${gapLineLabel(line).toLowerCase()} with another carrier — rewrite, not a missing-${gapLineLabel(line).toLowerCase()} gap.`,
  }));

  return {
    partyName: input.partyName,
    inForceCount: inForce.length,
    inForceLines,
    coveredLines,
    otherCarrierLines,
    findings,
    rewrites,
    emptyReason:
      findings.length === 0 && rewrites.length === 0
        ? `${input.partyName} has the companion lines this desk checks.`
        : null,
    quotesDoNotCount,
  };
}

export function gapLineLabel(line: CoverageLine): string {
  switch (line) {
    case "HO":
      return "Homeowners";
    case "AUTO":
      return "Auto";
    case "FLOOD":
      return "Flood";
    case "UMBRELLA":
      return "Umbrella";
    case "GL":
      return "General liability";
    case "BOP":
      return "BOP";
    case "WC":
      return "Workers comp";
    case "LIFE":
      return "Life";
    case "HEALTH":
      return "Health";
    case "RV":
      return "Rec / RV";
    default:
      return "Other";
  }
}
