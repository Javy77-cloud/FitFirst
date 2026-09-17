import { readFileSync } from "node:fs";
import path from "node:path";
import { parseCsv } from "@/lib/import-export/csv";
import {
  parseLifeAppetiteOutcome,
  worstLifeOutcome,
  type LifeAppetiteOutcome,
  type LifeBuildHit,
  type LifeBuildRule,
} from "./appetite-types";

/** Placeholder until Javy’s MATRIX height/weight tabs land. Do not invent carrier build charts. */
export const LIFE_BUILD_TABLE_PENDING_NOTE =
  "Height/weight (build/BMI) tables pending — full MATRIX when spreadsheet provided.";

export const LIFE_BUILD_CSV = "data/appetite/fitfirst-life-build.csv";

export type LifeBuildInput = {
  heightFt?: string | null;
  heightIn?: string | null;
  weightLbs?: string | null;
  sex?: string | null;
};

export type LifeBuildSnapshot = {
  heightInches: number | null;
  weightLbs: number | null;
  bmi: number | null;
  sex: "" | "male" | "female";
  /** Applicant-level band from a carrier-agnostic row; else unknown. */
  band: string;
  /** True while the build CSV has no seeded rows. */
  tablePending: boolean;
  note: string;
};

function parseNumber(raw: string | null | undefined): number | null {
  const value = Number(String(raw ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function normalizeLifeSex(raw: string | null | undefined): "" | "male" | "female" {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (value === "m" || value === "male" || value === "man") return "male";
  if (value === "f" || value === "female" || value === "woman") return "female";
  return "";
}

export function lifeBuildFromSheet(input: LifeBuildInput): LifeBuildSnapshot {
  const feet = parseNumber(input.heightFt);
  const inches = parseNumber(input.heightIn) ?? 0;
  const weightLbs = parseNumber(input.weightLbs);
  const heightInches = feet != null ? feet * 12 + inches : null;
  const bmi =
    heightInches && weightLbs ? Math.round((weightLbs / (heightInches * heightInches)) * 7030) / 10 : null;
  return {
    heightInches,
    weightLbs,
    bmi,
    sex: normalizeLifeSex(input.sex),
    band: "unknown",
    tablePending: true,
    note: LIFE_BUILD_TABLE_PENDING_NOTE,
  };
}

function parseOptionalNumber(raw: string | null | undefined): number | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  return parseNumber(trimmed);
}

function hasLookupRange(rule: Pick<LifeBuildRule, "weightMin" | "weightMax" | "bmiMin" | "bmiMax">): boolean {
  return rule.weightMin != null || rule.weightMax != null || rule.bmiMin != null || rule.bmiMax != null;
}

function inInclusiveRange(value: number | null, min: number | null, max: number | null): boolean {
  if (min == null && max == null) return true;
  if (value == null) return false;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

export function parseLifeBuildCsv(text: string): LifeBuildRule[] {
  const { rows } = parseCsv(text);
  const rules: LifeBuildRule[] = [];
  for (const row of rows) {
    const outcome = parseLifeAppetiteOutcome(String(row.outcome ?? ""));
    if (!outcome || outcome === "unknown") continue;
    const heightInches = parseOptionalNumber(row.height_inches);
    const weightMin = parseOptionalNumber(row.weight_min);
    const weightMax = parseOptionalNumber(row.weight_max);
    const bmiMin = parseOptionalNumber(row.bmi_min);
    const bmiMax = parseOptionalNumber(row.bmi_max);
    if (!hasLookupRange({ weightMin, weightMax, bmiMin, bmiMax })) continue;
    const band = String(row.band ?? "").trim() || outcome;
    rules.push({
      carrierSlug: String(row.carrier_slug ?? "").trim(),
      carrierName: String(row.carrier_name ?? "").trim(),
      productSlug: String(row.product_slug ?? "").trim(),
      productName: String(row.product_name ?? "").trim(),
      sex: normalizeLifeSex(row.sex),
      heightInches,
      weightMin,
      weightMax,
      bmiMin,
      bmiMax,
      band,
      outcome,
      ruleText: String(row.rule_text ?? "").trim(),
      coverage: String(row.coverage ?? "").trim() || "incomplete",
      source: String(row.source ?? "").trim(),
    });
  }
  return rules;
}

function loadBuildText(): string {
  return readFileSync(path.join(process.cwd(), LIFE_BUILD_CSV), "utf8");
}

let cachedRules: LifeBuildRule[] | null = null;

export function loadLifeBuildTable(): LifeBuildRule[] {
  if (!cachedRules) cachedRules = parseLifeBuildCsv(loadBuildText());
  return cachedRules;
}

export function lifeBuildTablePending(rules: LifeBuildRule[]): boolean {
  return rules.length === 0;
}

function ruleMatchesProduct(
  rule: LifeBuildRule,
  input: { carrierSlug: string; productSlug: string },
): boolean {
  if (rule.carrierSlug && rule.carrierSlug !== input.carrierSlug) return false;
  if (rule.productSlug && rule.productSlug !== input.productSlug) return false;
  return true;
}

function ruleMatchesBuild(
  rule: LifeBuildRule,
  input: {
    heightInches: number | null;
    weightLbs: number | null;
    bmi: number | null;
    sex: string;
  },
): boolean {
  if (rule.sex && input.sex && rule.sex !== input.sex) return false;
  if (rule.heightInches != null) {
    if (input.heightInches == null) return false;
    if (Math.round(rule.heightInches) !== Math.round(input.heightInches)) return false;
  }
  if (!inInclusiveRange(input.weightLbs, rule.weightMin, rule.weightMax)) return false;
  if (!inInclusiveRange(input.bmi, rule.bmiMin, rule.bmiMax)) return false;
  return true;
}

export function lookupLifeBuild(input: {
  heightInches: number | null;
  weightLbs: number | null;
  bmi: number | null;
  sex: string;
  carrierSlug: string;
  productSlug: string;
  rules: LifeBuildRule[];
}): LifeBuildHit {
  const matches = input.rules.filter(
    (rule) => ruleMatchesProduct(rule, input) && ruleMatchesBuild(rule, input),
  );
  if (!matches.length) return { band: "unknown", outcome: "unknown", ruleText: "" };
  const outcome = worstLifeOutcome(matches.map((row) => row.outcome));
  const winner = matches.find((row) => row.outcome === outcome) ?? matches[0];
  return { band: winner.band || outcome, outcome, ruleText: winner.ruleText };
}

export function applyLifeBuildSnapshot(
  snapshot: LifeBuildSnapshot,
  rules: LifeBuildRule[],
): LifeBuildSnapshot {
  const tablePending = lifeBuildTablePending(rules);
  if (tablePending) {
    return { ...snapshot, band: "unknown", tablePending: true, note: LIFE_BUILD_TABLE_PENDING_NOTE };
  }
  const generic = lookupLifeBuild({
    heightInches: snapshot.heightInches,
    weightLbs: snapshot.weightLbs,
    bmi: snapshot.bmi,
    sex: snapshot.sex,
    carrierSlug: "",
    productSlug: "",
    rules: rules.filter((rule) => !rule.carrierSlug && !rule.productSlug),
  });
  return {
    ...snapshot,
    band: generic.band,
    tablePending: false,
    note: generic.band === "unknown" ? "Build table loaded; no matching band for this height/weight." : "",
  };
}

export function lifeBuildSummary(build: LifeBuildSnapshot | null | undefined): string {
  if (!build?.bmi) return "";
  if (build.tablePending) return `Build: BMI ${build.bmi} (table pending)`;
  if (build.band && build.band !== "unknown") return `Build: BMI ${build.bmi} · ${build.band}`;
  return `Build: BMI ${build.bmi} (no band match)`;
}

export type { LifeAppetiteOutcome, LifeBuildHit, LifeBuildRule };
