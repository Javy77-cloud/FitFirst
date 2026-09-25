import type { ExtractedField } from "@/lib/extraction/extract";

/**
 * Covered-with-deductible mark for comprehensive and collision limits.
 * The coverage schedule prints this string in the Limit column. It is the
 * same check mark the rest of the desk uses for "yes / on".
 */
export const PHYS_DAM_COVERED_MARK = "✓";

const ABSENT_COVERAGE =
  /^(none|n\/a|na|not purchased|rejected|no coverage|not covered|declined|waived|insured rejects|—|-)$/i;

const AUTO_DEDUCTIBLE_KEYS = new Set([
  "comp_deductible",
  "collision_deductible",
  "pip_deductible",
  "liability_bi_deductible",
  "liability_pd_deductible",
  "med_pay_deductible",
  "um_uim_deductible",
  "um_pd_deductible",
  "rental_deductible",
  "towing_deductible",
  "glass",
  "vehicle_1_comp_deductible",
  "vehicle_1_collision_deductible",
  "vehicle_2_comp_deductible",
  "vehicle_2_collision_deductible",
  "vehicle_3_comp_deductible",
  "vehicle_3_collision_deductible",
  "vehicle_4_comp_deductible",
  "vehicle_4_collision_deductible",
]);

function moneyLabel(raw: string): string {
  const n = Number(raw.replace(/[$,]/g, ""));
  if (!Number.isFinite(n)) return raw.trim();
  const negative = n < 0;
  const abs = Math.abs(n);
  const digits = Number.isInteger(abs) ? abs.toFixed(0) : abs.toFixed(2);
  const [whole, frac] = digits.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body = frac ? `$${withCommas}.${frac}` : `$${withCommas}`;
  return negative ? `-${body}` : body;
}

export function isAutoDeductibleField(fieldKey: string): boolean {
  return AUTO_DEDUCTIBLE_KEYS.has(fieldKey);
}

export function isAutoShopLine(shopLine?: string | null): boolean {
  const line = (shopLine ?? "").trim().toLowerCase();
  return line === "auto" || line === "motorcycle" || line === "commercial_auto";
}

/** A token that means the coverage cell is empty or explicitly off. */
export function isAbsentCoverageToken(value: string | null | undefined): boolean {
  const trimmed = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!trimmed) return true;
  return ABSENT_COVERAGE.test(trimmed);
}

/**
 * Personal-auto deductibles are dollar amounts on the policy form.
 * `$500` and `$1,000`. `None` stays `None`. Prose such as "Insured Rejects" stays.
 */
export function formatAutoDollarDeductible(raw: string): string {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  if (ABSENT_COVERAGE.test(trimmed)) return "None";
  if (trimmed === PHYS_DAM_COVERED_MARK) return trimmed;
  const withoutLabel = trimmed.replace(/\s*(deductible|ded\.?)\s*$/i, "").trim();
  const money = withoutLabel.match(/^\$?\s*([\d,]+(?:\.\d+)?)$/);
  if (money) return moneyLabel(money[1]!);
  return trimmed;
}

export function isAutoDollarDeductible(value: string | null | undefined): boolean {
  return /^\$[\d,]+(?:\.\d+)?$/.test(String(value ?? "").trim());
}

/**
 * Comprehensive / collision limit.
 * A dollar deductible means the coverage is on: blank or `None` becomes ✓.
 * A printed limit (ACV, a dollar limit) is kept.
 * `None` only when there is no dollar deductible and no printed coverage.
 */
export function physDamLimitForDeductible(printedLimit: string, deductibleRaw: string): string {
  const deductible = formatAutoDollarDeductible(deductibleRaw);
  const limit = printedLimit.replace(/\s+/g, " ").trim();
  if (isAutoDollarDeductible(deductible)) {
    if (isAbsentCoverageToken(limit) || limit === "None") return PHYS_DAM_COVERED_MARK;
    return limit;
  }
  if (isAbsentCoverageToken(limit)) return "None";
  return limit;
}

function deductibleAmount(fields: readonly ExtractedField[], ...keys: string[]): string {
  for (const key of keys) {
    const hit = fields.find((field) => field.fieldKey === key && field.normalizedValue.trim());
    if (hit) return hit.normalizedValue;
  }
  return "";
}

function upsertLimit(fields: ExtractedField[], fieldKey: string, value: string, sample: ExtractedField) {
  const existing = fields.find((field) => field.fieldKey === fieldKey);
  if (existing) {
    if (!existing.normalizedValue.trim() || isAbsentCoverageToken(existing.normalizedValue)) {
      existing.normalizedValue = value;
      if (!existing.rawValue.trim() || isAbsentCoverageToken(existing.rawValue)) existing.rawValue = value;
    } else if (value === PHYS_DAM_COVERED_MARK && isAbsentCoverageToken(existing.normalizedValue)) {
      existing.normalizedValue = value;
    }
    return;
  }
  fields.push({
    fieldKey,
    label: fieldKey.replace(/_/g, " "),
    rawValue: value,
    normalizedValue: value,
    confidence: sample.confidence,
    flagged: false,
    source: "inferred",
    sourceDocTag: sample.sourceDocTag,
    matchPath: "gemini",
  });
}

/**
 * After Gemini mapping: dollar-format auto deductibles, and mark comp/collision
 * covered when a dollar deductible is present and the limit is missing or None.
 */
export function enforceAutoPhysDam(fields: ExtractedField[], shopLine?: string | null): void {
  if (!isAutoShopLine(shopLine)) return;
  for (const field of fields) {
    if (!isAutoDeductibleField(field.fieldKey) || !field.normalizedValue.trim()) continue;
    const next = formatAutoDollarDeductible(field.normalizedValue);
    if (next && next !== field.normalizedValue) field.normalizedValue = next;
  }
  const sample = fields.find((field) => field.normalizedValue.trim());
  if (!sample) return;
  const pairs: Array<{ limit: string; deductibles: string[] }> = [
    { limit: "comp_limit", deductibles: ["comp_deductible", "vehicle_1_comp_deductible"] },
    { limit: "collision_limit", deductibles: ["collision_deductible", "vehicle_1_collision_deductible"] },
  ];
  for (const pair of pairs) {
    const deductible = formatAutoDollarDeductible(deductibleAmount(fields, ...pair.deductibles));
    if (!isAutoDollarDeductible(deductible)) continue;
    const printed = fields.find((field) => field.fieldKey === pair.limit)?.normalizedValue ?? "";
    const next = physDamLimitForDeductible(printed, deductible);
    if (next === PHYS_DAM_COVERED_MARK) upsertLimit(fields, pair.limit, next, sample);
  }
}
