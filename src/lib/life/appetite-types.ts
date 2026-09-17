export const LIFE_UW_MATRIX_COVERAGE_NOTE =
  "Partial MATRIX seed from Javy live sheet (2026-09-17). Clear Accept/Decline/Graded cells only. Full MATRIX when spreadsheet provided.";

export const LIFE_APPETITE_OUTCOMES = [
  "accept",
  "preferred",
  "select",
  "standard",
  "graded",
  "call_carrier",
  "decline",
  "unknown",
] as const;

export type LifeAppetiteOutcome = (typeof LIFE_APPETITE_OUTCOMES)[number];

export type LifeMatrixProduct = {
  carrierSlug: string;
  carrierName: string;
  productSlug: string;
  productName: string;
  ageMin: string;
  ageMax: string;
};

export type LifeMatrixRule = {
  carrierSlug: string;
  productSlug: string;
  conditionKey: string;
  outcome: LifeAppetiteOutcome;
  ruleText: string;
  coverage: string;
  source: string;
};

export type LifeAppetitePrediction = {
  carrierSlug: string;
  carrierName: string;
  productSlug: string;
  productName: string;
  outcome: LifeAppetiteOutcome;
  conditionOutcome: LifeAppetiteOutcome;
  buildOutcome: LifeAppetiteOutcome;
  buildBand: string;
  ruleText: string;
  coverage: "seeded" | "unknown";
};

export type LifeBuildRule = {
  carrierSlug: string;
  carrierName: string;
  productSlug: string;
  productName: string;
  sex: "" | "male" | "female";
  heightInches: number | null;
  weightMin: number | null;
  weightMax: number | null;
  bmiMin: number | null;
  bmiMax: number | null;
  band: string;
  outcome: LifeAppetiteOutcome;
  ruleText: string;
  coverage: string;
  source: string;
};

export type LifeBuildHit = {
  band: string;
  outcome: LifeAppetiteOutcome;
  ruleText: string;
};

const OUTCOME_RANK: Record<LifeAppetiteOutcome, number> = {
  decline: 70,
  call_carrier: 60,
  graded: 50,
  standard: 40,
  select: 30,
  preferred: 20,
  accept: 10,
  unknown: 0,
};

export function parseLifeAppetiteOutcome(raw: string): LifeAppetiteOutcome | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (!key) return null;
  if ((LIFE_APPETITE_OUTCOMES as readonly string[]).includes(key)) {
    return key as LifeAppetiteOutcome;
  }
  return null;
}

export function worstLifeOutcome(outcomes: LifeAppetiteOutcome[]): LifeAppetiteOutcome {
  let worst: LifeAppetiteOutcome = "unknown";
  for (const outcome of outcomes) {
    if (OUTCOME_RANK[outcome] > OUTCOME_RANK[worst]) worst = outcome;
  }
  return worst;
}

/**
 * Condition × product is primary. Build/BMI is a second input that can worsen
 * Accept → Graded/Decline (or independently Decline/Graded). Unknown never
 * upgrades to Accept — a green build chart cannot mint a missing MATRIX cell.
 */
export function combineLifeConditionAndBuild(
  conditionOutcome: LifeAppetiteOutcome,
  buildOutcome: LifeAppetiteOutcome,
): LifeAppetiteOutcome {
  if (conditionOutcome === "decline" || buildOutcome === "decline") return "decline";
  if (conditionOutcome === "unknown") {
    if (buildOutcome === "graded" || buildOutcome === "call_carrier") return buildOutcome;
    return "unknown";
  }
  if (buildOutcome === "unknown") return conditionOutcome;
  return worstLifeOutcome([conditionOutcome, buildOutcome]);
}

export function lifeOutcomeLabel(outcome: LifeAppetiteOutcome): string {
  if (outcome === "call_carrier") return "Call carrier";
  if (outcome === "unknown") return "Unknown";
  return outcome.charAt(0).toUpperCase() + outcome.slice(1);
}
