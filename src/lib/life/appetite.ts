import { readFileSync } from "node:fs";
import path from "node:path";
import { parseCsv } from "@/lib/import-export/csv";
import {
  applyLifeBuildSnapshot,
  lifeBuildFromSheet,
  loadLifeBuildTable,
  lookupLifeBuild,
  type LifeBuildSnapshot,
} from "./build";
import {
  lifeConditionKeysFromSheet,
  parseLifeConditionLabels,
  tobaccoConditionKey,
} from "./conditions";
import {
  LIFE_UW_MATRIX_COVERAGE_NOTE,
  combineLifeConditionAndBuild,
  parseLifeAppetiteOutcome,
  worstLifeOutcome,
  type LifeAppetitePrediction,
  type LifeBuildRule,
  type LifeMatrixProduct,
  type LifeMatrixRule,
} from "./appetite-types";

export const LIFE_UW_MATRIX_CSV = "data/appetite/fitfirst-life-uw-matrix.csv";
export {
  LIFE_APPETITE_OUTCOMES,
  LIFE_UW_MATRIX_COVERAGE_NOTE,
  combineLifeConditionAndBuild,
  lifeOutcomeLabel,
  parseLifeAppetiteOutcome,
  worstLifeOutcome,
  type LifeAppetiteOutcome,
  type LifeAppetitePrediction,
  type LifeBuildRule,
  type LifeMatrixProduct,
  type LifeMatrixRule,
} from "./appetite-types";

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
    const outcome = parseLifeAppetiteOutcome(String(row.outcome ?? ""));
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

function conditionPrediction(
  product: LifeMatrixProduct,
  conditionKeys: string[],
  productRules: LifeMatrixRule[],
): Pick<LifeAppetitePrediction, "outcome" | "ruleText" | "coverage"> {
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
      outcome,
      ruleText,
      coverage: outcome === "decline" ? "seeded" : "unknown",
    };
  }
  const outcome = worstLifeOutcome(hits.map((row) => row.outcome));
  return {
    outcome,
    ruleText: hits.find((row) => row.outcome === outcome)?.ruleText ?? "",
    coverage: "seeded",
  };
}

function pickCombinedRuleText(
  condition: Pick<LifeAppetitePrediction, "outcome" | "ruleText">,
  build: { outcome: LifeAppetitePrediction["outcome"]; ruleText: string },
  combined: LifeAppetitePrediction["outcome"],
): string {
  if (combined === condition.outcome && condition.ruleText) return condition.ruleText;
  if (combined === build.outcome && build.ruleText) return build.ruleText;
  return condition.ruleText || build.ruleText;
}

export function predictLifeAppetite(input: {
  medicalConditions?: string | null;
  tobaccoStatus?: string | null;
  heightFt?: string | null;
  heightIn?: string | null;
  weightLbs?: string | null;
  sex?: string | null;
  matrix?: { products: LifeMatrixProduct[]; rules: LifeMatrixRule[] };
  buildRules?: LifeBuildRule[];
}): {
  selectedLabels: string[];
  conditionKeys: string[];
  predictions: LifeAppetitePrediction[];
  coverageNote: string;
  build: LifeBuildSnapshot;
} {
  const matrix = input.matrix ?? loadLifeUwMatrix();
  const buildRules = input.buildRules ?? loadLifeBuildTable();
  const build = applyLifeBuildSnapshot(
    lifeBuildFromSheet({
      heightFt: input.heightFt,
      heightIn: input.heightIn,
      weightLbs: input.weightLbs,
      sex: input.sex,
    }),
    buildRules,
  );
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
    const condition = conditionPrediction(product, conditionKeys, productRules);
    const buildHit = lookupLifeBuild({
      heightInches: build.heightInches,
      weightLbs: build.weightLbs,
      bmi: build.bmi,
      sex: build.sex,
      carrierSlug: product.carrierSlug,
      productSlug: product.productSlug,
      rules: buildRules,
    });
    const outcome = combineLifeConditionAndBuild(condition.outcome, buildHit.outcome);
    const seeded = condition.coverage === "seeded" || buildHit.outcome !== "unknown";
    const coverage = outcome === "unknown" || !seeded ? "unknown" : "seeded";
    return {
      carrierSlug: product.carrierSlug,
      carrierName: product.carrierName,
      productSlug: product.productSlug,
      productName: product.productName,
      outcome,
      conditionOutcome: condition.outcome,
      buildOutcome: buildHit.outcome,
      buildBand: buildHit.band,
      ruleText: pickCombinedRuleText(condition, buildHit, outcome),
      coverage,
    } satisfies LifeAppetitePrediction;
  });

  return {
    selectedLabels,
    conditionKeys,
    predictions,
    coverageNote: LIFE_UW_MATRIX_COVERAGE_NOTE,
    build,
  };
}
