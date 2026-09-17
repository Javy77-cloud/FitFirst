import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parseCsv } from "@/lib/import-export/csv";
import {
  parseLifeAppetiteOutcome,
  worstLifeOutcome,
  type LifeAppetiteOutcome,
  type LifeBuildHit,
  type LifeBuildRule,
} from "./appetite-types";
import { LIFE_SHEET_DROP_DIR } from "./sheet";

/** Shown only when the build CSV has no seeded rows at all. */
export const LIFE_BUILD_TABLE_PENDING_NOTE =
  "Height/weight (build/BMI) tables pending — full MATRIX when spreadsheet provided.";

/** Americo 4'8"–5'2" sample is seeded; other carrier tabs still missing. */
export const LIFE_BUILD_PARTIAL_NOTE =
  "Americo height/weight sample seeded (4'8\"–5'2\"). Other carriers Unknown until their charts land. Full MATRIX when spreadsheet provided.";

export const LIFE_BUILD_CSV = "data/appetite/fitfirst-life-build.csv";
export const LIFE_BUILD_SAMPLE_TSV = "data/appetite/life-sheet/americo-build.tsv";
export const LIFE_BUILD_WEIGHT_FLOOR = 1;
export const LIFE_BUILD_WEIGHT_CEILING = 999;
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

export function parseLifeHeightInches(raw: string | null | undefined): number | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const feetInches = text.match(/^(\d+)\s*['’]\s*(\d+)\s*["”]?$/);
  if (feetInches) {
    const height = Number(feetInches[1]) * 12 + Number(feetInches[2]);
    return Number.isFinite(height) && height > 0 ? height : null;
  }
  const feet = parseNumber(text);
  return feet;
}

export function parseLifeWeightRange(raw: string | null | undefined): { min: number; max: number } | null {
  const match = String(raw ?? "").match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const min = Number(match[1]);
  const max = Number(match[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) return null;
  return { min, max };
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

/** Map a raw MATRIX build-tab column to a product slug. Empty = all products for that carrier. */
export function lifeBuildProductSlugFromColumn(header: string): string {
  const key = header
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  if (!key) return "";
  if (key === "all_products_except_for_adb" || key === "all_products" || key === "standard") return "";
  if (key === "di_rider" || key === "di") return "di_rider";
  if (key === "adb" || key === "accidental_death_benefit") return "adb";
  return key;
}

export function lifeBuildCarrierSlugFromSource(source: string): { slug: string; name: string } {
  const name = source.trim();
  const slug = name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  if (slug === "american_amicable" || slug === "american_amicable_occidental" || slug === "amam") {
    return { slug: "amam", name: "American Amicable" };
  }
  if (slug === "american_general" || slug === "american_general_aig" || slug === "aig" || slug === "aig_corebridge") {
    return { slug: "corebridge", name: "Corebridge" };
  }
  if (slug === "fidelity_and_guaranty" || slug === "f_g" || slug === "fg") {
    return { slug: "fg", name: "Fidelity & Guaranty" };
  }
  return { slug: slug || name.toLowerCase(), name: name || slug };
}

function pushBandRules(
  rules: LifeBuildRule[],
  base: Omit<LifeBuildRule, "weightMin" | "weightMax" | "band" | "outcome" | "ruleText">,
  range: { min: number; max: number },
  label: string,
): void {
  const heightLabel = base.heightInches != null ? `${base.heightInches} in` : "this height";
  const chart = label || "build chart";
  rules.push({
    ...base,
    weightMin: range.min,
    weightMax: range.max,
    band: "in_range",
    outcome: "accept",
    ruleText: `${base.carrierName} ${chart}: ${heightLabel} ${range.min}-${range.max} lbs Accept.`,
  });
  if (range.min > LIFE_BUILD_WEIGHT_FLOOR) {
    rules.push({
      ...base,
      weightMin: LIFE_BUILD_WEIGHT_FLOOR,
      weightMax: range.min - 1,
      band: "underweight",
      outcome: "decline",
      ruleText: `${base.carrierName} ${chart}: ${heightLabel} below ${range.min} lbs Decline.`,
    });
  }
  if (range.max < LIFE_BUILD_WEIGHT_CEILING) {
    rules.push({
      ...base,
      weightMin: range.max + 1,
      weightMax: LIFE_BUILD_WEIGHT_CEILING,
      band: "overweight",
      outcome: "decline",
      ruleText: `${base.carrierName} ${chart}: ${heightLabel} above ${range.max} lbs Decline.`,
    });
  }
}

/**
 * Flatten a carrier height/weight tab (TSV or CSV) into lookup rows.
 * First two columns are Source + Height; remaining columns are product/rider bands.
 * Other carriers can drop the same shape into `life-sheet/` later.
 */
export function flattenLifeBuildChartSample(text: string): LifeBuildRule[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delimiter).map((cell) => cell.trim());
  const sourceIdx = headers.findIndex((header) => /source|carrier/i.test(header));
  const heightIdx = headers.findIndex((header) => /height/i.test(header));
  if (heightIdx < 0) return [];
  const bandCols = headers
    .map((header, index) => ({ header, index }))
    .filter((col) => col.index !== sourceIdx && col.index !== heightIdx && col.header);

  const rules: LifeBuildRule[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(delimiter);
    const source = sourceIdx >= 0 ? (cells[sourceIdx] ?? "").trim() : "Americo";
    const heightInches = parseLifeHeightInches(cells[heightIdx] ?? "");
    if (heightInches == null) continue;
    const carrier = lifeBuildCarrierSlugFromSource(source || "Americo");
    for (const col of bandCols) {
      const range = parseLifeWeightRange(cells[col.index] ?? "");
      if (!range) continue;
      const productSlug = lifeBuildProductSlugFromColumn(col.header);
      pushBandRules(
        rules,
        {
          carrierSlug: carrier.slug,
          carrierName: carrier.name,
          productSlug,
          productName: productSlug ? col.header.trim() : "",
          sex: "",
          heightInches,
          bmiMin: null,
          bmiMax: null,
          coverage: "seeded",
          source: "live_sheet_build_sample",
        },
        range,
        col.header.trim(),
      );
    }
  }
  return rules;
}

export function serializeLifeBuildCsv(rules: LifeBuildRule[]): string {
  const header = [
    "carrier_slug",
    "carrier_name",
    "product_slug",
    "product_name",
    "sex",
    "height_inches",
    "weight_min",
    "weight_max",
    "bmi_min",
    "bmi_max",
    "band",
    "outcome",
    "rule_text",
    "coverage",
    "source",
  ];
  const lines = [header.join(",")];
  for (const rule of rules) {
    const cells = [
      rule.carrierSlug,
      rule.carrierName,
      rule.productSlug,
      rule.productName,
      rule.sex,
      rule.heightInches ?? "",
      rule.weightMin ?? "",
      rule.weightMax ?? "",
      rule.bmiMin ?? "",
      rule.bmiMax ?? "",
      rule.band,
      rule.outcome,
      `"${rule.ruleText.replace(/"/g, '""')}"`,
      rule.coverage,
      rule.source,
    ];
    lines.push(cells.join(","));
  }
  return `${lines.join("\n")}\n`;
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

function loadDroppedBuildRules(): LifeBuildRule[] {
  const dir = path.join(process.cwd(), LIFE_SHEET_DROP_DIR);
  if (!existsSync(dir)) return [];
  const rules: LifeBuildRule[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (!/(^|[.-])build/i.test(name)) continue;
    const text = readFileSync(path.join(dir, name), "utf8");
    if (name.endsWith(".tsv") || text.includes("\t")) {
      rules.push(...flattenLifeBuildChartSample(text));
      continue;
    }
    if (name.endsWith(".csv")) {
      rules.push(...parseLifeBuildCsv(text));
    }
  }
  return rules;
}

let cachedRules: LifeBuildRule[] | null = null;

export function loadLifeBuildTable(): LifeBuildRule[] {
  if (!cachedRules) {
    const packed = parseLifeBuildCsv(loadBuildText());
    const packedCarriers = new Set(packed.map((rule) => rule.carrierSlug).filter(Boolean));
    const extra = loadDroppedBuildRules().filter(
      (rule) => !rule.carrierSlug || !packedCarriers.has(rule.carrierSlug),
    );
    cachedRules = [...packed, ...extra];
  }
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

function rulesForProduct(
  rules: LifeBuildRule[],
  input: { carrierSlug: string; productSlug: string },
): LifeBuildRule[] {
  const productRules = rules.filter((rule) => ruleMatchesProduct(rule, input));
  const specific = productRules.filter((rule) => rule.productSlug && rule.productSlug === input.productSlug);
  return specific.length ? specific : productRules;
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
  const pool = rulesForProduct(input.rules, input);
  if (input.carrierSlug && !pool.length) {
    return { band: "unknown", outcome: "unknown", ruleText: "" };
  }
  const matches = pool.filter((rule) => ruleMatchesBuild(rule, input));
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
  const carrierSpecific = rules.some((rule) => rule.carrierSlug);
  return {
    ...snapshot,
    band: generic.band,
    tablePending: false,
    note:
      generic.band === "unknown"
        ? carrierSpecific
          ? LIFE_BUILD_PARTIAL_NOTE
          : "Build table loaded; no matching band for this height/weight."
        : "",
  };
}

export function lifeBuildSummary(build: LifeBuildSnapshot | null | undefined): string {
  if (!build?.bmi) return "";
  if (build.tablePending) return `Build: BMI ${build.bmi} (table pending)`;
  if (build.band && build.band !== "unknown") return `Build: BMI ${build.bmi} · ${build.band}`;
  if (build.note === LIFE_BUILD_PARTIAL_NOTE) return `Build: BMI ${build.bmi} (partial build chart)`;
  return `Build: BMI ${build.bmi} (no band match)`;
}

export type { LifeAppetiteOutcome, LifeBuildHit, LifeBuildRule };
