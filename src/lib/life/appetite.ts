import { readFileSync } from "node:fs";
import path from "node:path";
import { parseCsv } from "@/lib/import-export/csv";
import { lifeBuildFromSheet, type LifeBuildSnapshot } from "./build";
import {
  lifeConditionKeysFromSheet,
  parseLifeConditionLabels,
  tobaccoConditionKey,
} from "./conditions";
import {
  LIFE_APPETITE_OUTCOMES,
  LIFE_UW_MATRIX_COVERAGE_NOTE,
  type LifeAppetiteOutcome,
  type LifeAppetitePrediction,
  type LifeMatrixProduct,
  type LifeMatrixRule,
} from "./appetite-types";

export const LIFE_UW_MATRIX_CSV = "data/appetite/fitfirst-life-uw-matrix.csv";
export {
  LIFE_APPETITE_OUTCOMES,
  LIFE_UW_MATRIX_COVERAGE_NOTE,
  lifeOutcomeLabel,
  type LifeAppetiteOutcome,
  type LifeAppetitePrediction,
  type LifeMatrixProduct,
  type LifeMatrixRule,
} from "./appetite-types";

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

function parseOutcome(raw: string): LifeAppetiteOutcome | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (!key) return null;
  if ((LIFE_APPETITE_OUTCOMES as readonly string[]).includes(key)) {
    return key as LifeAppetiteOutcome;
  }
  return null;
}

function loadMatrixText(): string {
  return readFileSync(path.join(process.cwd(), LIFE_UW_MATRIX_CSV), "utf8");
}

export function parseLifeUwMatrixCsv(text: string): {
  products: LifeMatrixProduct[];
  rules: LifeMatrixRule[];
} {
  const { rows } = parseCsv(text);
  const products: LifeMatrixProduct[] = [];
  const seenProducts = new Set<string>();
  const rules: LifeMatrixRule[] = [];

  for (const row of rows) {
    const carrierSlug = String(row.carrier_slug ?? "").trim();
    const productSlug = String(row.product_slug ?? "").trim();
    if (!carrierSlug || !productSlug) continue;
    const productKey = `${carrierSlug}::${productSlug}`;
    if (!seenProducts.has(productKey)) {
      seenProducts.add(productKey);
      products.push({
        carrierSlug,
        carrierName: String(row.carrier_name ?? "").trim(),
        productSlug,
        productName: String(row.product_name ?? "").trim(),
        ageMin: String(row.age_min ?? "").trim(),
        ageMax: String(row.age_max ?? "").trim(),
      });
    }
    const conditionKey = String(row.condition_key ?? "").trim();
    const outcome = parseOutcome(String(row.outcome ?? ""));
    if (!conditionKey || !outcome || outcome === "unknown") continue;
    rules.push({
      carrierSlug,
      productSlug,
      conditionKey,
      outcome,
      ruleText: String(row.rule_text ?? "").trim(),
      coverage: String(row.coverage ?? "").trim() || "incomplete",
      source: String(row.source ?? "").trim(),
    });
  }

  return { products, rules };
}

let cached: { products: LifeMatrixProduct[]; rules: LifeMatrixRule[] } | null = null;

export function loadLifeUwMatrix(): { products: LifeMatrixProduct[]; rules: LifeMatrixRule[] } {
  if (!cached) cached = parseLifeUwMatrixCsv(loadMatrixText());
  return cached;
}

export function worstLifeOutcome(outcomes: LifeAppetiteOutcome[]): LifeAppetiteOutcome {
  let worst: LifeAppetiteOutcome = "unknown";
  for (const outcome of outcomes) {
    if (OUTCOME_RANK[outcome] > OUTCOME_RANK[worst]) worst = outcome;
  }
  return worst;
}

export function predictLifeAppetite(input: {
  medicalConditions?: string | null;
  tobaccoStatus?: string | null;
  heightFt?: string | null;
  heightIn?: string | null;
  weightLbs?: string | null;
  matrix?: { products: LifeMatrixProduct[]; rules: LifeMatrixRule[] };
}): {
  selectedLabels: string[];
  conditionKeys: string[];
  predictions: LifeAppetitePrediction[];
  coverageNote: string;
  build: LifeBuildSnapshot;
} {
  const matrix = input.matrix ?? loadLifeUwMatrix();
  const build = lifeBuildFromSheet({
    heightFt: input.heightFt,
    heightIn: input.heightIn,
    weightLbs: input.weightLbs,
  });
  const selectedLabels = parseLifeConditionLabels(input.medicalConditions).filter(
    (label) => label.toLowerCase() !== "none",
  );
  const conditionKeys = lifeConditionKeysFromSheet(selectedLabels.join(", "));
  const tobacco = tobaccoConditionKey(input.tobaccoStatus);
  if (tobacco && !conditionKeys.includes(tobacco)) conditionKeys.push(tobacco);

  const rulesByProduct = new Map<string, LifeMatrixRule[]>();
  for (const rule of matrix.rules) {
    const key = `${rule.carrierSlug}::${rule.productSlug}`;
    const list = rulesByProduct.get(key) ?? [];
    list.push(rule);
    rulesByProduct.set(key, list);
  }

  const predictions = matrix.products.map((product) => {
    const productRules = rulesByProduct.get(`${product.carrierSlug}::${product.productSlug}`) ?? [];
    const hits: LifeMatrixRule[] = [];
    let missing = false;
    for (const conditionKey of conditionKeys) {
      const match = productRules.find((rule) => rule.conditionKey === conditionKey);
      if (match) hits.push(match);
      else missing = true;
    }
    if (conditionKeys.length === 0 || hits.length === 0 || missing) {
      const known = hits.length ? worstLifeOutcome(hits.map((row) => row.outcome)) : "unknown";
      // A known decline still wins; anything else stays Unknown so we do not fake green lights.
      const outcome = known === "decline" ? "decline" : "unknown";
      const ruleText =
        outcome === "decline"
          ? hits.find((row) => row.outcome === "decline")?.ruleText ?? ""
          : conditionKeys.length === 0
            ? "Select Life conditions on the Risk Profile to predict MATRIX appetite."
            : LIFE_UW_MATRIX_COVERAGE_NOTE;
      return {
        carrierSlug: product.carrierSlug,
        carrierName: product.carrierName,
        productSlug: product.productSlug,
        productName: product.productName,
        outcome,
        ruleText,
        coverage: outcome === "decline" ? "seeded" : "unknown",
      } satisfies LifeAppetitePrediction;
    }
    const outcome = worstLifeOutcome(hits.map((row) => row.outcome));
    return {
      carrierSlug: product.carrierSlug,
      carrierName: product.carrierName,
      productSlug: product.productSlug,
      productName: product.productName,
      outcome,
      ruleText: hits.find((row) => row.outcome === outcome)?.ruleText ?? "",
      coverage: "seeded" as const,
    };
  });

  return {
    selectedLabels,
    conditionKeys,
    predictions,
    coverageNote: LIFE_UW_MATRIX_COVERAGE_NOTE,
    build,
  };
}
