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

/** Display order on Quotes tab. */
export const RISK_OUTCOME_ORDER: RiskOutcome[] = [
  "bindable",
  "conditional",
  "declined",
  "no_market",
];

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
