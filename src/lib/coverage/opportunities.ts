import { ageFromDob } from "@/lib/appetite/auto-premium-learning";
import {
  applyInForceCarrierLock,
  classifyDeclaredCoverageType,
  type DeclaredCoverageLine,
} from "@/lib/coverage/declared-coverage";
import {
  declaredCoverageFromElsewhere,
  elsewhereRenewalsInWindow,
  mergeDeclaredCoverage,
  RENEWAL_WINDOW_DAYS,
} from "@/lib/coverage/elsewhere-coverage";
import {
  analyzeCoverageGaps,
  gapLineLabel,
  type CoverageLine,
  type GapPolicyInput,
} from "@/lib/coverage/gaps";
import { householdCoveredLines } from "@/lib/coverage/notices";
import type { ContactDependent, ElsewhereCoverageRow } from "@/lib/db/schema";

export type GeneratedOpportunityReason =
  | "gap"
  | "life_event"
  | "household"
  | "renewal"
  | "rewrite";

export type GeneratedOpportunityCta = {
  kind: "start_deal" | "open_coverage";
  label: string;
};

export type GeneratedOpportunity = {
  id: string;
  line: CoverageLine;
  label: string;
  title: string;
  reason: GeneratedOpportunityReason;
  detail: string;
  suggestedLine: CoverageLine;
  cta?: GeneratedOpportunityCta;
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
  "CYBER",
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

/** Occupations that commonly need professional / commercial liability. */
const PROFESSIONAL_OCCUPATION_RE =
  /\b(attorney|lawyer|doctor|physician|dentist|accountant|cpa|architect|engineer|consultant|realtor|real\s*estate|nurse\s*practitioner|therapist|chiropractor|veterinarian|pharmacist|broker)\b/i;

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
    const reasonRank = (r: GeneratedOpportunityReason) =>
      r === "renewal" ? 0 : r === "gap" ? 1 : r === "household" ? 2 : r === "life_event" ? 3 : 4;
    const rr = reasonRank(a.reason) - reasonRank(b.reason);
    if (rr !== 0) return rr;
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

export function parseDependentAge(
  dobOrAge: string | null | undefined,
  asOf: Date = new Date(),
): number | null {
  const raw = String(dobOrAge ?? "").trim();
  if (!raw) return null;
  if (/^\d{1,2}$/.test(raw)) {
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n < 120 ? n : null;
  }
  return ageFromDob(raw, asOf);
}

/**
 * Dependents nearing driving / adult milestones → Auto review.
 * Window: ages 15–17 (16/18 chase).
 */
export function dependentsNearingAutoAge(
  dependents: readonly ContactDependent[] | null | undefined,
  asOf: Date = new Date(),
): Array<{ name: string; age: number }> {
  const out: Array<{ name: string; age: number }> = [];
  for (const dep of dependents ?? []) {
    const age = parseDependentAge(dep.dobOrAge, asOf);
    if (age == null) continue;
    if (age < 15 || age > 17) continue;
    out.push({ name: dep.name?.trim() || "Dependent", age });
  }
  return out;
}

export function occupationSuggestsProfessional(occupation: string | null | undefined): boolean {
  return PROFESSIONAL_OCCUPATION_RE.test(String(occupation ?? ""));
}

function pushUnique(byKey: Map<string, GeneratedOpportunity>, row: GeneratedOpportunity) {
  if (byKey.has(row.id)) return;
  // One opportunity per line unless renewal (chase) or household (distinct why).
  if (row.reason !== "renewal" && row.reason !== "household") {
    for (const existing of byKey.values()) {
      if (existing.line === row.line && existing.reason !== "renewal") return;
    }
  }
  byKey.set(row.id, row);
}

/**
 * Read-only household opportunities.
 * Covered = in-force with us ∪ coverage with other carriers (declared + elsewhere rows).
 * Sources: coverage gaps, household facts, life events, elsewhere renewals.
 */
export function generateContactOpportunities(input: {
  policies?: GapPolicyInput[];
  inForceLines?: Iterable<CoverageLine>;
  declaredCoverage?: DeclaredCoverageLine[] | null;
  elsewhereCoverage?: ElsewhereCoverageRow[] | null;
  recentLifeEvents?: string | null;
  partyName?: string;
  dependents?: ContactDependent[] | null;
  spouseName?: string | null;
  occupation?: string | null;
  openDealLines?: Iterable<CoverageLine> | null;
  asOf?: Date;
  contactId?: string;
}): GeneratedOpportunity[] {
  const elsewhere = input.elsewhereCoverage ?? [];
  const declaredMerged = mergeDeclaredCoverage(
    input.declaredCoverage,
    declaredCoverageFromElsewhere(elsewhere),
  );
  const policies = input.policies ?? syntheticPolicies(input.inForceLines ?? []);
  const declaredOther = declaredMerged.filter(
    (row) => row.line !== "OTHER" && row.carrierOfRecord !== "us",
  );
  const declared = applyInForceCarrierLock(declaredOther, input.inForceLines ?? []);
  const partyName = input.partyName?.trim() || "This household";
  const asOf = input.asOf ?? new Date();
  const report = analyzeCoverageGaps({
    policies,
    partyName,
    declaredCoverage: declared,
  });
  const covered = householdCoveredLines(policies, declared);
  const openDealLines = new Set(
    [...(input.openDealLines ?? [])].filter((line) => line !== "OTHER"),
  );
  const byKey = new Map<string, GeneratedOpportunity>();

  for (const finding of report.findings) {
    for (const line of finding.missing) {
      if (covered.has(line)) continue;
      pushUnique(byKey, {
        id: `gap-${line}`,
        line,
        label: gapLineLabel(line),
        title: `Missing ${gapLineLabel(line)}`,
        reason: "gap",
        detail: finding.plainEnglish,
        suggestedLine: line,
        cta: { kind: "start_deal", label: "Start deal" },
      });
    }
  }

  for (const rewrite of report.rewrites) {
    pushUnique(byKey, {
      id: `rewrite-${rewrite.line}`,
      line: rewrite.line,
      label: gapLineLabel(rewrite.line),
      title: `${gapLineLabel(rewrite.line)} with another carrier`,
      reason: "rewrite",
      detail: rewrite.plainEnglish,
      suggestedLine: rewrite.line,
      cta: { kind: "open_coverage", label: "Open coverage" },
    });
  }

  for (const event of parseRecentLifeEvents(input.recentLifeEvents)) {
    for (const line of linesForLifeEvent(event)) {
      if (covered.has(line)) continue;
      pushUnique(byKey, {
        id: `life-${line}`,
        line,
        label: gapLineLabel(line),
        title: `Review ${gapLineLabel(line)} after ${event}`,
        reason: "life_event",
        detail: `${event} is a reason to review ${gapLineLabel(line).toLowerCase()} — the household is not covered for that line.`,
        suggestedLine: line,
        cta: { kind: "start_deal", label: "Start deal" },
      });
    }
  }

  for (const dep of dependentsNearingAutoAge(input.dependents, asOf)) {
    if (covered.has("AUTO")) continue;
    pushUnique(byKey, {
      id: `hh-auto-${dep.name}-${dep.age}`,
      line: "AUTO",
      label: gapLineLabel("AUTO"),
      title: `${dep.name} nearing driving age`,
      reason: "household",
      detail: `${dep.name} is about ${dep.age} — dependents nearing 16/18 are a reason to shop auto before the next birthday.`,
      suggestedLine: "AUTO",
      cta: { kind: "start_deal", label: "Start deal" },
    });
  }

  const spouse = String(input.spouseName ?? "").trim();
  if (spouse && !covered.has("LIFE")) {
    pushUnique(byKey, {
      id: "hh-spouse-life",
      line: "LIFE",
      label: gapLineLabel("LIFE"),
      title: `Life for ${spouse}`,
      reason: "household",
      detail: `${spouse} is on the household with no life coverage on file — spouse without life is a common cross-sell.`,
      suggestedLine: "LIFE",
      cta: { kind: "start_deal", label: "Start deal" },
    });
  }

  if (occupationSuggestsProfessional(input.occupation) && !covered.has("GL")) {
    const occ = String(input.occupation ?? "").trim();
    pushUnique(byKey, {
      id: "hh-professional-gl",
      line: "GL",
      label: gapLineLabel("GL"),
      title: "Professional liability check",
      reason: "household",
      detail: `${occ || "This occupation"} often needs professional / general liability — none is on the household yet.`,
      suggestedLine: "GL",
      cta: { kind: "start_deal", label: "Start deal" },
    });
  }

  for (const row of elsewhereRenewalsInWindow(elsewhere, {
    withinDays: RENEWAL_WINDOW_DAYS,
    asOf,
  })) {
    const classified = classifyDeclaredCoverageType(row.line);
    if (classified === "OTHER") continue;
    const hasOpen = openDealLines.has(classified);
    pushUnique(byKey, {
      id: `renewal-${row.id}`,
      line: classified,
      label: gapLineLabel(classified),
      title: `${gapLineLabel(classified)} renews in ${row.daysUntil} day${row.daysUntil === 1 ? "" : "s"}`,
      reason: "renewal",
      detail: hasOpen
        ? `${row.carrier || "Another carrier"} renews ${gapLineLabel(classified).toLowerCase()} soon — there is already an open deal for this line.`
        : `${row.carrier || "Another carrier"} renews ${gapLineLabel(classified).toLowerCase()} within ~${RENEWAL_WINDOW_DAYS} days — chase before they rebind elsewhere.`,
      suggestedLine: classified,
      cta: hasOpen
        ? { kind: "open_coverage", label: "Open coverage" }
        : { kind: "start_deal", label: "Start deal" },
    });
  }

  return sortOpportunities([...byKey.values()]);
}

const COMMERCIAL_CORE: CoverageLine[] = ["BOP", "GL", "WC", "UMBRELLA", "CYBER"];

/** Industries / ops text that commonly need cyber liability. */
const CYBER_SIGNAL_RE =
  /\b(tech|software|saas|it\b|msp|data|cloud|e-?commerce|online|healthcare|medical|finance|bank|insurance|law\s*firm|attorney|accountant|cpa|realtor|real\s*estate)\b/i;

export function accountSuggestsCyber(input: {
  industry?: string | null;
  operations?: string | null;
  website?: string | null;
}): boolean {
  const blob = [input.industry, input.operations, input.website].filter(Boolean).join(" ");
  return CYBER_SIGNAL_RE.test(blob);
}

/**
 * Commercial Opportunities for Accounts.
 * Covered = in-force with us ∪ elsewhere rows.
 * Sources: commercial gap engine, ops facts (employees → WC, industry → cyber),
 * elsewhere renewals, open deals for missing lines.
 */
export function generateAccountOpportunities(input: {
  policies?: GapPolicyInput[];
  inForceLines?: Iterable<CoverageLine>;
  declaredCoverage?: DeclaredCoverageLine[] | null;
  elsewhereCoverage?: ElsewhereCoverageRow[] | null;
  partyName?: string;
  employeeCount?: number | null;
  industry?: string | null;
  operations?: string | null;
  website?: string | null;
  openDealLines?: Iterable<CoverageLine> | null;
  asOf?: Date;
  accountId?: string;
}): GeneratedOpportunity[] {
  const elsewhere = input.elsewhereCoverage ?? [];
  const declaredMerged = mergeDeclaredCoverage(
    input.declaredCoverage,
    declaredCoverageFromElsewhere(elsewhere),
  );
  const policies = input.policies ?? syntheticPolicies(input.inForceLines ?? []);
  const declaredOther = declaredMerged.filter(
    (row) => row.line !== "OTHER" && row.carrierOfRecord !== "us",
  );
  const declared = applyInForceCarrierLock(declaredOther, input.inForceLines ?? []);
  const partyName = input.partyName?.trim() || "This account";
  const asOf = input.asOf ?? new Date();
  const report = analyzeCoverageGaps({
    policies,
    partyName,
    declaredCoverage: declared,
  });
  const covered = householdCoveredLines(policies, declared);
  const openDealLines = new Set(
    [...(input.openDealLines ?? [])].filter((line) => line !== "OTHER"),
  );
  const byKey = new Map<string, GeneratedOpportunity>();
  const employees =
    input.employeeCount != null && Number.isFinite(Number(input.employeeCount))
      ? Number(input.employeeCount)
      : null;

  for (const finding of report.findings) {
    for (const line of finding.missing) {
      if (covered.has(line)) continue;
      // Prefer commercial companion findings on Accounts.
      if (!COMMERCIAL_CORE.includes(line) && line !== "UMBRELLA") continue;
      pushUnique(byKey, {
        id: `gap-${line}`,
        line,
        label: gapLineLabel(line),
        title: `Missing ${gapLineLabel(line)}`,
        reason: "gap",
        detail: finding.plainEnglish,
        suggestedLine: line,
        cta: { kind: "start_deal", label: "Start deal" },
      });
    }
  }

  for (const rewrite of report.rewrites) {
    if (!COMMERCIAL_CORE.includes(rewrite.line) && rewrite.line !== "UMBRELLA") continue;
    pushUnique(byKey, {
      id: `rewrite-${rewrite.line}`,
      line: rewrite.line,
      label: gapLineLabel(rewrite.line),
      title: `${gapLineLabel(rewrite.line)} with another carrier`,
      reason: "rewrite",
      detail: rewrite.plainEnglish,
      suggestedLine: rewrite.line,
      cta: { kind: "open_coverage", label: "Open coverage" },
    });
  }

  const hasCommercialLiability = covered.has("GL") || covered.has("BOP");
  if (!hasCommercialLiability) {
    pushUnique(byKey, {
      id: "gap-commercial-liability",
      line: "BOP",
      label: gapLineLabel("BOP"),
      title: "No BOP / GL on file",
      reason: "gap",
      detail: `${partyName} has no business owners policy or general liability with us or elsewhere — core commercial liability is a common first ask.`,
      suggestedLine: "BOP",
      cta: { kind: "start_deal", label: "Start deal" },
    });
  }

  if (employees != null && employees > 0 && !covered.has("WC")) {
    pushUnique(byKey, {
      id: "hh-employees-wc",
      line: "WC",
      label: gapLineLabel("WC"),
      title: "Employees without workers comp",
      reason: "household",
      detail: `${partyName} shows ${employees} employee${employees === 1 ? "" : "s"} and no workers comp on file — payroll without WC is a commercial cross-sell.`,
      suggestedLine: "WC",
      cta: { kind: "start_deal", label: "Start deal" },
    });
  }

  if (accountSuggestsCyber(input) && !covered.has("CYBER")) {
    pushUnique(byKey, {
      id: "hh-cyber",
      line: "CYBER",
      label: gapLineLabel("CYBER"),
      title: "Cyber liability check",
      reason: "household",
      detail: `${input.industry?.trim() || input.operations?.trim() || "This business"} often needs cyber liability — none is on the account yet.`,
      suggestedLine: "CYBER",
      cta: { kind: "start_deal", label: "Start deal" },
    });
  }

  if (hasCommercialLiability && !covered.has("UMBRELLA")) {
    pushUnique(byKey, {
      id: "gap-commercial-umbrella",
      line: "UMBRELLA",
      label: gapLineLabel("UMBRELLA"),
      title: "No commercial umbrella",
      reason: "gap",
      detail: `${partyName} has commercial liability and no umbrella — one bad claim can exceed those limits.`,
      suggestedLine: "UMBRELLA",
      cta: { kind: "start_deal", label: "Start deal" },
    });
  }

  for (const row of elsewhereRenewalsInWindow(elsewhere, {
    withinDays: RENEWAL_WINDOW_DAYS,
    asOf,
  })) {
    const classified = classifyDeclaredCoverageType(row.line);
    if (classified === "OTHER") continue;
    const hasOpen = openDealLines.has(classified);
    pushUnique(byKey, {
      id: `renewal-${row.id}`,
      line: classified,
      label: gapLineLabel(classified),
      title: `${gapLineLabel(classified)} renews in ${row.daysUntil} day${row.daysUntil === 1 ? "" : "s"}`,
      reason: "renewal",
      detail: hasOpen
        ? `${row.carrier || "Another carrier"} renews ${gapLineLabel(classified).toLowerCase()} soon — there is already an open deal for this line.`
        : `${row.carrier || "Another carrier"} renews ${gapLineLabel(classified).toLowerCase()} within ~${RENEWAL_WINDOW_DAYS} days — chase before they rebind elsewhere.`,
      suggestedLine: classified,
      cta: hasOpen
        ? { kind: "open_coverage", label: "Open coverage" }
        : { kind: "start_deal", label: "Start deal" },
    });
  }

  return sortOpportunities([...byKey.values()]);
}
