export const LIFE_UW_MATRIX_COVERAGE_NOTE =
  "Partial MATRIX seed from Javy screenshots (2026-09-16). Full MATRIX when spreadsheet provided.";

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
  ruleText: string;
  coverage: "seeded" | "unknown";
};

export function lifeOutcomeLabel(outcome: LifeAppetiteOutcome): string {
  if (outcome === "call_carrier") return "Call carrier";
  if (outcome === "unknown") return "Unknown";
  return outcome.charAt(0).toUpperCase() + outcome.slice(1);
}
