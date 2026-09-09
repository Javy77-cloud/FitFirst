/** First-class quote outcomes for Quotes-tab grouping (Gaya portal intake today; APIs later). */

export const RISK_OUTCOMES = ["accepted", "maybe", "not_accepted", "no_option"] as const;
export type RiskOutcome = (typeof RISK_OUTCOMES)[number];

export const NEXT_STEPS = ["can_bind", "fixable", "hard_no"] as const;
export type NextStep = (typeof NEXT_STEPS)[number];

/** Exact Quotes-tab group headers (Javy 2026-09-09). */
export const RISK_OUTCOME_LABELS: Record<RiskOutcome, string> = {
  accepted: "Accepted",
  maybe: "Maybe",
  not_accepted: "Not accepted",
  no_option: "No option",
};

/** Display order on Quotes tab. */
export const RISK_OUTCOME_ORDER: RiskOutcome[] = [
  "accepted",
  "maybe",
  "not_accepted",
  "no_option",
];

export function isRiskOutcome(value: string | null | undefined): value is RiskOutcome {
  return Boolean(value && (RISK_OUTCOMES as readonly string[]).includes(value));
}

export function isNextStep(value: string | null | undefined): value is NextStep {
  return Boolean(value && (NEXT_STEPS as readonly string[]).includes(value));
}

export function bindableFromNextStep(nextStep: NextStep): boolean {
  return nextStep === "can_bind";
}

export function nextStepForRiskOutcome(outcome: RiskOutcome): NextStep {
  if (outcome === "accepted") return "can_bind";
  if (outcome === "maybe") return "fixable";
  return "hard_no";
}

export function syncQuoteOutcomes(input: {
  riskOutcome: RiskOutcome;
  nextStep?: NextStep | null;
}): { riskOutcome: RiskOutcome; nextStep: NextStep; bindable: boolean } {
  const nextStep = input.nextStep && isNextStep(input.nextStep)
    ? input.nextStep
    : nextStepForRiskOutcome(input.riskOutcome);
  // Accepted must stay can_bind; otherwise keep explicit next_step when provided.
  const resolved: NextStep =
    input.riskOutcome === "accepted"
      ? "can_bind"
      : input.riskOutcome === "maybe" && nextStep === "can_bind"
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
 * Floor-only → Maybe/fixable; $0 UW / skipped / portal closed → Not accepted or No option / hard_no;
 * incomplete → Maybe/fixable; hard blocked → Not accepted/hard_no.
 */
export function inferQuoteOutcomes(input: {
  notes?: string | null;
  result?: string | null;
  bindable?: boolean | null;
  premium?: string | number | null;
}): { riskOutcome: RiskOutcome; nextStep: NextStep; bindable: boolean } {
  if (input.bindable === true) {
    return syncQuoteOutcomes({ riskOutcome: "accepted", nextStep: "can_bind" });
  }

  const notes = (input.notes ?? "").toLowerCase();
  const result = (input.result ?? "").toLowerCase().replaceAll(" ", "_");
  const blob = `${notes} ${result}`;

  if (
    /portal\s*closed/.test(blob) ||
    /\bskipped\b/.test(blob) ||
    result === "portal_closed" ||
    result === "takeout_only" ||
    result === "skipped"
  ) {
    return syncQuoteOutcomes({ riskOutcome: "no_option", nextStep: "hard_no" });
  }

  if (
    /hard\s*blocked/.test(blob) ||
    /\$0\b/.test(notes) ||
    /\buw\b.*\b(age|county|declin)/.test(blob) ||
    result === "declined"
  ) {
    return syncQuoteOutcomes({ riskOutcome: "not_accepted", nextStep: "hard_no" });
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
    result === "incomplete"
  ) {
    return syncQuoteOutcomes({ riskOutcome: "maybe", nextStep: "fixable" });
  }

  if (result === "quoted") {
    // Quoted but not marked bindable → still Maybe until bind path is clear.
    return syncQuoteOutcomes({ riskOutcome: "maybe", nextStep: "fixable" });
  }

  // Live row with no signal yet — keep as Maybe so it still appears in Quotes.
  return syncQuoteOutcomes({ riskOutcome: "maybe", nextStep: "fixable" });
}

export function riskOutcomeLabel(value: string | null | undefined): string {
  if (isRiskOutcome(value)) return RISK_OUTCOME_LABELS[value];
  return "Maybe";
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
    const raw = getOutcome(row);
    const outcome: RiskOutcome = isRiskOutcome(raw) ? raw : "maybe";
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
