/** First-class quote outcomes for Quotes-tab grouping (Gaya portal intake today; APIs later). */

export const RISK_OUTCOMES = ["bindable", "conditional", "declined", "no_market"] as const;
export type RiskOutcome = (typeof RISK_OUTCOMES)[number];

export const NEXT_STEPS = ["can_bind", "fixable", "hard_no"] as const;
export type NextStep = (typeof NEXT_STEPS)[number];

/** Exact Quotes-tab group headers (Javy 2026-09-09 sep7df). */
export const RISK_OUTCOME_LABELS: Record<RiskOutcome, string> = {
  bindable: "Bindable",
  conditional: "Conditional",
  declined: "Declined",
  no_market: "No market",
};

/** Display order on Quotes tab (raw outcomes). */
export const RISK_OUTCOME_ORDER: RiskOutcome[] = [
  "bindable",
  "conditional",
  "declined",
  "no_market",
];

/** Agent Quotes-tab stacked sections (declined + no_market combined). */
export const QUOTE_SECTION_KEYS = ["bindable", "conditional", "declined_no_market"] as const;
export type QuoteSectionKey = (typeof QUOTE_SECTION_KEYS)[number];

export const QUOTE_SECTION_LABELS: Record<QuoteSectionKey, string> = {
  bindable: "Bindable",
  conditional: "Conditional",
  declined_no_market: "Declined / No market",
};

export function sectionKeyForOutcome(outcome: RiskOutcome): QuoteSectionKey {
  if (outcome === "bindable") return "bindable";
  if (outcome === "conditional") return "conditional";
  return "declined_no_market";
}

/** Agent workflow status on a quote (Quotes tab). */
export const AGENT_STATUSES = [
  "new",
  "sent_to_client",
  "client_reviewing",
  "waiting_on_inspection",
  "dead",
] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  new: "New",
  sent_to_client: "Sent to client",
  client_reviewing: "Client reviewing",
  waiting_on_inspection: "Waiting on inspection",
  dead: "Dead",
};

export function isAgentStatus(value: string | null | undefined): value is AgentStatus {
  return Boolean(value && (AGENT_STATUSES as readonly string[]).includes(value));
}

export function normalizeAgentStatus(value: string | null | undefined): AgentStatus {
  return isAgentStatus(value) ? value : "new";
}

/** Reason-for-no when status → dead (feeds appetite). */
export const REASON_FOR_NO = [
  "too_expensive",
  "client_dislikes_carrier",
  "coverage_gap",
  "inspection_failed",
  "other",
] as const;
export type ReasonForNo = (typeof REASON_FOR_NO)[number];

export const REASON_FOR_NO_LABELS: Record<ReasonForNo, string> = {
  too_expensive: "Too expensive",
  client_dislikes_carrier: "Client dislikes carrier",
  coverage_gap: "Coverage gap",
  inspection_failed: "Inspection failed",
  other: "Other",
};

export function isReasonForNo(value: string | null | undefined): value is ReasonForNo {
  return Boolean(value && (REASON_FOR_NO as readonly string[]).includes(value));
}

/** Pre-sep7df DB values → new enum (migration renames; keep for read safety). */
const LEGACY_RISK_OUTCOME: Record<string, RiskOutcome> = {
  accepted: "bindable",
  maybe: "conditional",
  not_accepted: "declined",
  no_option: "no_market",
};

export const NEXT_STEP_LABELS: Record<NextStep, string> = {
  can_bind: "Can bind",
  fixable: "Fixable",
  hard_no: "Hard no",
};

export function isRiskOutcome(value: string | null | undefined): value is RiskOutcome {
  return Boolean(value && (RISK_OUTCOMES as readonly string[]).includes(value));
}

export function isNextStep(value: string | null | undefined): value is NextStep {
  return Boolean(value && (NEXT_STEPS as readonly string[]).includes(value));
}

/** Normalize stored or legacy risk_outcome to the current enum. */
export function normalizeRiskOutcome(value: string | null | undefined): RiskOutcome | null {
  if (!value) return null;
  if (isRiskOutcome(value)) return value;
  return LEGACY_RISK_OUTCOME[value] ?? null;
}

export function bindableFromNextStep(nextStep: NextStep): boolean {
  return nextStep === "can_bind";
}

export function nextStepForRiskOutcome(outcome: RiskOutcome): NextStep {
  if (outcome === "bindable") return "can_bind";
  if (outcome === "conditional") return "fixable";
  return "hard_no";
}

export function syncQuoteOutcomes(input: {
  riskOutcome: RiskOutcome;
  nextStep?: NextStep | null;
}): { riskOutcome: RiskOutcome; nextStep: NextStep; bindable: boolean } {
  const nextStep =
    input.nextStep && isNextStep(input.nextStep)
      ? input.nextStep
      : nextStepForRiskOutcome(input.riskOutcome);
  // Bindable must stay can_bind; otherwise keep explicit next_step when provided.
  const resolved: NextStep =
    input.riskOutcome === "bindable"
      ? "can_bind"
      : input.riskOutcome === "conditional" && nextStep === "can_bind"
        ? "fixable"
        : nextStep;
  return {
    riskOutcome: input.riskOutcome,
    nextStep: resolved,
    bindable: bindableFromNextStep(resolved),
  };
}

/**
 * Infer outcomes from portal notes / attempt result for backfill and intake.
 * Floor-only → Conditional/fixable; $0 UW / skipped / portal closed → Declined or No market / hard_no;
 * incomplete → Conditional/fixable; hard blocked → Declined/hard_no.
 *
 * Mapping:
 * - Bindable = accepted / can_bind / bindable true
 * - Conditional = maybe / fixable (floor only, UW, incomplete that can continue)
 * - Declined = not_accepted / hard_no with a quote attempt (UW decline, hard block with quote #)
 * - No market = no_option / skipped / portal closed / no voluntary NB
 */
export function inferQuoteOutcomes(input: {
  notes?: string | null;
  result?: string | null;
  bindable?: boolean | null;
  premium?: string | number | null;
}): { riskOutcome: RiskOutcome; nextStep: NextStep; bindable: boolean } {
  if (input.bindable === true) {
    return syncQuoteOutcomes({ riskOutcome: "bindable", nextStep: "can_bind" });
  }

  const notes = (input.notes ?? "").toLowerCase();
  const result = (input.result ?? "").toLowerCase().replaceAll(" ", "_");
  const blob = `${notes} ${result}`;

  if (
    /portal\s*closed/.test(blob) ||
    /\bskipped\b/.test(blob) ||
    result === "portal_closed" ||
    result === "takeout_only" ||
    result === "skipped" ||
    /no voluntary\s*nb/.test(blob) ||
    /no true .* url/.test(blob)
  ) {
    return syncQuoteOutcomes({ riskOutcome: "no_market", nextStep: "hard_no" });
  }

  if (
    /hard\s*blocked/.test(blob) ||
    /\$0\b/.test(notes) ||
    /\buw\b.*\b(age|county|declin)/.test(blob) ||
    result === "declined" ||
    result === "not_accepted"
  ) {
    return syncQuoteOutcomes({ riskOutcome: "declined", nextStep: "hard_no" });
  }

  if (
    /incomplete/.test(blob) ||
    /floor\s*only/.test(blob) ||
    /not\s*bindable/.test(blob) ||
    /unable\s*online/.test(blob) ||
    /pre-?final/.test(blob) ||
    /provisional/.test(blob) ||
    result === "floor_only" ||
    result === "maybe" ||
    result === "incomplete" ||
    result === "conditional"
  ) {
    return syncQuoteOutcomes({ riskOutcome: "conditional", nextStep: "fixable" });
  }

  if (result === "quoted" || result === "accepted" || result === "bindable") {
    // Quoted but not marked bindable → still Conditional until bind path is clear.
    if (result === "accepted" || result === "bindable") {
      return syncQuoteOutcomes({ riskOutcome: "bindable", nextStep: "can_bind" });
    }
    return syncQuoteOutcomes({ riskOutcome: "conditional", nextStep: "fixable" });
  }

  // Live row with no signal yet — keep as Conditional so it still appears in Quotes.
  return syncQuoteOutcomes({ riskOutcome: "conditional", nextStep: "fixable" });
}

export function riskOutcomeLabel(value: string | null | undefined): string {
  const normalized = normalizeRiskOutcome(value);
  if (normalized) return RISK_OUTCOME_LABELS[normalized];
  return "Conditional";
}

export function nextStepLabel(value: string | null | undefined): string {
  if (isNextStep(value)) return NEXT_STEP_LABELS[value];
  return "—";
}

/** Pill color tokens for Quotes status (navy/fit depth). */
export function riskOutcomePillClass(outcome: RiskOutcome): string {
  switch (outcome) {
    case "bindable":
      return "border-fit-green/45 bg-fit-green-bg text-fit-green shadow-sm";
    case "conditional":
      return "border-fit-flag/45 bg-fit-flag-bg text-fit-flag shadow-sm";
    case "declined":
      return "border-fit-red/45 bg-fit-red-bg text-fit-red shadow-sm";
    case "no_market":
      return "border-border bg-muted text-muted-foreground shadow-sm";
  }
}

export type OutcomeGroup<T> = {
  outcome: RiskOutcome;
  label: string;
  rows: T[];
};

export type SectionGroup<T> = {
  key: QuoteSectionKey;
  label: string;
  rows: T[];
  /** True for Declined / No market — UI collapses by default. */
  collapseByDefault: boolean;
};

/** Group live quotes by risk_outcome; within each group keep caller order (usually cheapest first). */
export function groupQuotesByRiskOutcome<T>(
  rows: T[],
  getOutcome: (row: T) => string | null | undefined,
): OutcomeGroup<T>[] {
  const buckets = new Map<RiskOutcome, T[]>();
  for (const outcome of RISK_OUTCOME_ORDER) buckets.set(outcome, []);

  for (const row of rows) {
    const outcome: RiskOutcome = normalizeRiskOutcome(getOutcome(row)) ?? "conditional";
    buckets.get(outcome)!.push(row);
  }

  return RISK_OUTCOME_ORDER.filter((outcome) => (buckets.get(outcome)?.length ?? 0) > 0).map(
    (outcome) => ({
      outcome,
      label: RISK_OUTCOME_LABELS[outcome],
      rows: buckets.get(outcome) ?? [],
    }),
  );
}

/** Three stacked Quotes sections: Bindable · Conditional · Declined/No market. */
export function groupQuotesBySection<T>(
  rows: T[],
  getOutcome: (row: T) => string | null | undefined,
): SectionGroup<T>[] {
  const buckets = new Map<QuoteSectionKey, T[]>();
  for (const key of QUOTE_SECTION_KEYS) buckets.set(key, []);

  for (const row of rows) {
    const outcome: RiskOutcome = normalizeRiskOutcome(getOutcome(row)) ?? "conditional";
    buckets.get(sectionKeyForOutcome(outcome))!.push(row);
  }

  return QUOTE_SECTION_KEYS.filter((key) => (buckets.get(key)?.length ?? 0) > 0).map((key) => ({
    key,
    label: QUOTE_SECTION_LABELS[key],
    rows: buckets.get(key) ?? [],
    collapseByDefault: key === "declined_no_market",
  }));
}

/** Parse Cov A tried/forced hints from notes; coverage_a is treated as forced when present. */
export function parseCovATriedForced(input: {
  coverageA?: number | null;
  notes?: string | null;
}): { tried: number | null; forced: number | null; forcedNoted: boolean } {
  const notes = input.notes ?? "";
  const forcedFromNotes = notes.match(/cov\s*a\s*forced\s*~?\$?([\d,]+)/i);
  const triedFromNotes = notes.match(/cov\s*a\s*tried\s*~?\$?([\d,]+)/i);
  const parseNum = (raw: string | undefined) => {
    if (!raw) return null;
    const n = Number(raw.replaceAll(",", ""));
    return Number.isFinite(n) ? n : null;
  };
  const forcedNoted = /cov\s*a\s*forced/i.test(notes);
  const forced = input.coverageA ?? parseNum(forcedFromNotes?.[1]) ?? null;
  const tried = parseNum(triedFromNotes?.[1]);
  return { tried, forced, forcedNoted };
}

/** Short risk chips for expanded details — not a full notes dump. */
export function shortRiskChips(notes: string | null | undefined, gaps: string[] = []): string[] {
  const chips: string[] = [...gaps.filter(Boolean)];
  const blob = notes ?? "";
  const patterns: Array<[RegExp, string]> = [
    [/floor\s*only/i, "Floor only"],
    [/hard\s*blocked/i, "Hard blocked"],
    [/incomplete/i, "Incomplete"],
    [/portal\s*closed/i, "Portal closed"],
    [/\bskipped\b/i, "Skipped"],
    [/uw\s*age\/county/i, "UW age/county"],
    [/not\s*bindable/i, "Not bindable"],
    [/unable\s*online/i, "Unable online"],
    [/water\s*backup/i, "Water backup"],
    [/flood/i, "Flood"],
  ];
  for (const [re, label] of patterns) {
    if (re.test(blob) && !chips.includes(label)) chips.push(label);
  }
  return chips.slice(0, 6);
}

/**
 * Bind-requirement chips in plain English for agent Details.
 * Never surfaces raw PORTAL WHY / APPETITE NOTES — those stay in Developer Hub.
 */
/** True when the agent is about to bind — show the recheck-before-bind alert. Not every Conditional. */
export function quoteNeedsBindRecheckAlert(input: {
  riskOutcome?: string | null;
  nextStep?: string | null;
  bindable?: boolean | null;
}): boolean {
  const outcome = normalizeRiskOutcome(input.riskOutcome);
  return (
    outcome === "bindable" ||
    input.bindable === true ||
    input.nextStep === "can_bind"
  );
}

export function bindRequirementChips(input: {
  notes?: string | null;
  gaps?: string[] | null;
  bindRequirements?: string[] | null;
  coverageA?: number | null;
  hurricaneDeductible?: string | null;
}): string[] {
  const stored = (input.bindRequirements ?? []).map((s) => s.trim()).filter(Boolean);
  if (stored.length) return stored.slice(0, 8);

  const chips: string[] = [];
  const push = (label: string) => {
    if (label && !chips.includes(label)) chips.push(label);
  };
  for (const gap of input.gaps ?? []) push(gap);

  const blob = input.notes ?? "";
  const patterns: Array<[RegExp, string]> = [
    [/4[- ]?point|four[- ]?point/i, "Four-point inspection required"],
    [/mitigation(\s+form)?/i, "Mitigation form needed"],
    [/roof\s*(cert|certificate|inspection)/i, "Roof certificate required"],
    [/inspect(ion)?\s*(required|needed)/i, "Inspection required"],
    [/elec(trical)?\s*(circuit\s*)?amps?/i, "Electrical circuit amps needed"],
    [/floor\s*only/i, "Floor-only quote — not bindable yet"],
    [/hard\s*blocked/i, "Hard blocked — cannot bind online"],
    [/incomplete/i, "Incomplete submission"],
    [/water\s*backup/i, "Water backup limit applies"],
    [/wind\s*(mit|mitigation)/i, "Wind mitigation required"],
    [/opening\s*protect/i, "Opening protection required"],
  ];
  for (const [re, label] of patterns) {
    if (re.test(blob)) push(label);
  }

  const covForced = blob.match(/cov\s*a\s*forced\s*~?\$?([\d,]+)/i);
  const covMin = blob.match(/min(?:imum)?\s*cov(?:erage)?\s*a\s*~?\$?([\d,]+)/i);
  if (covForced?.[1]) {
    push(`Minimum Coverage A $${covForced[1]}`);
  } else if (covMin?.[1]) {
    push(`Minimum Coverage A $${covMin[1]}`);
  } else if (input.coverageA != null && /cov\s*a\s*forced/i.test(blob)) {
    push(`Minimum Coverage A $${input.coverageA.toLocaleString("en-US")}`);
  }

  const windCap = blob.match(/wind\s*(?:ded(?:uctible)?)?\s*(?:capped\s*at\s*)?(\d+(?:\.\d+)?)\s*%/i);
  const hurCap = blob.match(/hurricane\s*(?:ded(?:uctible)?)?\s*(?:capped\s*at\s*)?(\d+(?:\.\d+)?)\s*%/i);
  if (windCap?.[1]) push(`Wind deductible capped at ${windCap[1]}%`);
  else if (hurCap?.[1]) push(`Wind deductible capped at ${hurCap[1]}%`);
  else if (input.hurricaneDeductible && /%/.test(input.hurricaneDeductible)) {
    const pct = input.hurricaneDeductible.match(/(\d+(?:\.\d+)?)\s*%/);
    if (pct && Number(pct[1]) <= 2) push(`Wind deductible capped at ${pct[1]}%`);
  }

  return chips.slice(0, 8);
}

/** One short reason label for the collapsed carrier row (not a notes dump). */
export function shortReasonLabel(input: {
  notes?: string | null;
  riskOutcome?: string | null;
  gaps?: string[] | null;
}): string {
  const chips = bindRequirementChips({
    notes: input.notes,
    gaps: input.gaps,
  });
  if (chips[0]) {
    const first = chips[0];
    return first.length > 42 ? `${first.slice(0, 39)}…` : first;
  }
  const outcome = normalizeRiskOutcome(input.riskOutcome);
  if (outcome === "bindable") return "Ready to bind";
  if (outcome === "conditional") return "Needs follow-up";
  if (outcome === "declined") return "Declined";
  if (outcome === "no_market") return "No market";
  const notes = (input.notes ?? "").trim();
  if (!notes) return "—";
  const first = notes.split(/\s*[·|]\s*|\n/)[0]?.trim() || notes;
  // Strip form prefix like "HO3"
  const cleaned = first.replace(/^[A-Z0-9]{2,4}\s*[·\-]\s*/i, "").trim() || first;
  return cleaned.length > 42 ? `${cleaned.slice(0, 39)}…` : cleaned;
}
