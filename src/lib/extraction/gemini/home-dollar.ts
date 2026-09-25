import type { ExtractedField } from "@/lib/extraction/extract";
import { isAutoShopLine } from "./auto-deductible";

/**
 * Manufactured / mobile home product id already used by the quoting catalog.
 * HMO and MH on a dec are the same product. HO3 / Home are not.
 */
export const MANUFACTURED_HOME_FORM = "MHO";

const MANUFACTURED_LANGUAGE =
  /manufactured|\bmobile\s*home\b|\bmmho\b|\bmho\b|\bhmo\b/;

const HOME_DOLLAR_COVERAGE_KEYS = new Set([
  "coverage_a",
  "coverage_b",
  "coverage_c",
  "coverage_d",
  "coverage_e",
  "coverage_f",
]);

const HOME_DEDUCTIBLE_KEYS = new Set([
  "hurricane_deductible",
  "aop_deductible",
  "wind_hail_deductible",
]);

/** Fill-from-DEC keys whose displayed text must keep a printed dollar sign. */
export const HOME_DOLLAR_DISPLAY_FILL_KEYS = new Set([
  "coverageALimit",
  "coverageB",
  "coverageC",
  "coverageD",
  "coverageE",
  "coverageF",
  "aopDeductible",
  "hurricaneDeductible",
  "windHailDeductible",
]);

function compactForm(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s_\-./]+/g, "");
}

function presentFact(raw: string | null | undefined): boolean {
  const text = (raw ?? "").trim();
  return Boolean(text) && !/^(none|n\/a|na|null|—|-)$/i.test(text);
}

/** HO3 / Home / blank. A real HO5, DP, or HO6 form is not generic. */
export function isGenericHomeForm(raw: string | null | undefined): boolean {
  const compact = compactForm(raw ?? "");
  return (
    compact === "" ||
    compact === "HOME" ||
    compact === "HOMEOWNERS" ||
    compact === "HOMEOWNER" ||
    compact === "HO" ||
    compact === "HO3"
  );
}

export function isManufacturedHomeFormCode(raw: string | null | undefined): boolean {
  const compact = compactForm(raw ?? "");
  return (
    compact === "MHO" ||
    compact === "HMO" ||
    compact === "MH" ||
    compact === "MMHO" ||
    compact === "MH3" ||
    compact === "MOBILEHOME" ||
    compact === "MANUFACTUREDHOME"
  );
}

export type HomeFormSignals = {
  form?: string | null;
  insuranceType?: string | null;
  construction?: string | null;
  dwellingType?: string | null;
  carrier?: string | null;
  unitYear?: string | null;
  unitMake?: string | null;
  unitSerial?: string | null;
};

/**
 * MHO when the dec prints manufactured / mobile home, an MH form code,
 * or a manufactured-home unit (year, make, or serial) on a generic Home/HO3 form.
 * A stick-built HO3 with no unit facts stays HO3. Does not invent construction.
 */
export function classifyManufacturedHomeForm(input: HomeFormSignals): string | null {
  const form = input.form ?? "";
  const blob = [form, input.insuranceType, input.construction, input.dwellingType, input.carrier]
    .map((part) => part ?? "")
    .join(" ");
  const language = MANUFACTURED_LANGUAGE.test(blob);
  const code = isManufacturedHomeFormCode(form) || isManufacturedHomeFormCode(input.insuranceType);
  const unit =
    presentFact(input.unitYear) || presentFact(input.unitMake) || presentFact(input.unitSerial);
  const generic = isGenericHomeForm(form);
  if (code || language) return MANUFACTURED_HOME_FORM;
  if (unit && generic) return MANUFACTURED_HOME_FORM;
  return null;
}

function moneyLabel(raw: string): string {
  const n = Number(String(raw).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n)) return raw.trim();
  const negative = n < 0;
  const abs = Math.abs(n);
  const digits = Number.isInteger(abs) ? abs.toFixed(0) : abs.toFixed(2);
  const [whole, frac] = digits.split(".");
  const withCommas = (whole ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body = frac ? `$${withCommas}.${frac}` : `$${withCommas}`;
  return negative ? `-${body}` : body;
}

/**
 * Coverage A/C/D/E/F, and B when it is a dollar limit.
 * A printed percent stays a percent. A dollar amount displays with $.
 */
export function formatHomeDollarAmount(raw: string | null | undefined): string {
  const trimmed = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  if (/%/.test(trimmed)) return trimmed;
  if (/[a-z]/i.test(trimmed)) return trimmed;
  return moneyLabel(trimmed);
}

/**
 * Hurricane, AOP, and wind/hail.
 * Dollar amounts use $. A percent stays a percent. Both stay when the dec prints both.
 */
export function formatHomeDeductibleAmount(raw: string | null | undefined): string {
  const trimmed = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  const pctMatches = [...trimmed.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];
  const money = trimmed.match(/\$\s*([\d,]+(?:\.\d+)?)/);
  if (pctMatches.length > 0 && money) {
    const pctRaw = pctMatches[pctMatches.length - 1]![1]!;
    const pct = Number(pctRaw);
    const pctText = Number.isFinite(pct) && pct % 1 === 0 ? `${pct}%` : `${pctRaw}%`;
    return `${pctText} (${moneyLabel(money[1]!)})`;
  }
  if (pctMatches.length > 0) {
    const withoutPct = trimmed.replace(/\d+(?:\.\d+)?\s*%/g, " ");
    if (!/[a-z]/i.test(withoutPct)) {
      const pctRaw = pctMatches[pctMatches.length - 1]![1]!;
      const pct = Number(pctRaw);
      return Number.isFinite(pct) && pct % 1 === 0 ? `${pct}%` : `${pctRaw}%`;
    }
    return trimmed;
  }
  if (/[a-z]/i.test(trimmed)) return trimmed;
  return moneyLabel(trimmed);
}

export function displayHomeCoverageLimit(key: string, value: string): string {
  if (!HOME_DOLLAR_COVERAGE_KEYS.has(key)) return value;
  return formatHomeDollarAmount(value) || value;
}

export function displayHomeDeductible(value: string | null | undefined): string {
  const formatted = formatHomeDeductibleAmount(value);
  return formatted || String(value ?? "").trim();
}

function fieldValue(fields: readonly ExtractedField[], key: string): string {
  return fields.find((field) => field.fieldKey === key && field.normalizedValue.trim())?.normalizedValue ?? "";
}

function upsertForm(fields: ExtractedField[], value: string) {
  const existing = fields.find((field) => field.fieldKey === "form");
  if (existing) {
    existing.normalizedValue = value;
    if (!existing.rawValue.trim()) existing.rawValue = value;
    return;
  }
  const sample = fields.find((field) => field.normalizedValue.trim());
  fields.push({
    fieldKey: "form",
    label: "form",
    rawValue: value,
    normalizedValue: value,
    confidence: sample?.confidence ?? 0.9,
    flagged: false,
    source: "inferred",
    sourceDocTag: sample?.sourceDocTag,
    matchPath: "gemini",
  });
}

/**
 * After Gemini mapping on a home dec: dollar-format coverages and deductibles,
 * and classify a manufactured-home dec as MHO instead of generic Home / HO3.
 */
export function enforceHomeDecDollars(fields: ExtractedField[], shopLine?: string | null): void {
  if (isAutoShopLine(shopLine)) return;
  for (const field of fields) {
    if (!field.normalizedValue.trim()) continue;
    if (HOME_DOLLAR_COVERAGE_KEYS.has(field.fieldKey)) {
      const next = formatHomeDollarAmount(field.normalizedValue);
      if (next && next !== field.normalizedValue) field.normalizedValue = next;
    } else if (HOME_DEDUCTIBLE_KEYS.has(field.fieldKey)) {
      const next = formatHomeDeductibleAmount(field.normalizedValue);
      if (next && next !== field.normalizedValue) field.normalizedValue = next;
    }
  }
  const form = classifyManufacturedHomeForm({
    form: fieldValue(fields, "form"),
    insuranceType: fieldValue(fields, "insurance_type"),
    construction: fieldValue(fields, "construction"),
    dwellingType: fieldValue(fields, "dwelling_type"),
    carrier: fieldValue(fields, "current_carrier"),
    unitYear: fieldValue(fields, "unit_year"),
    unitMake: fieldValue(fields, "unit_make"),
    unitSerial: fieldValue(fields, "unit_serial"),
  });
  if (form === MANUFACTURED_HOME_FORM) upsertForm(fields, MANUFACTURED_HOME_FORM);
}
