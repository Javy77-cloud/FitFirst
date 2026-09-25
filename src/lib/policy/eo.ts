/**
 * Errors & Omissions — commercial liability product on the GL line.
 * Stored like the other GL-line products: line_of_business GL,
 * form_type and policy_sub_type exactly "Errors & Omissions".
 * Short label on badges, lists, and filters is E&O.
 */

export const ERRORS_OMISSIONS_LABEL = "Errors & Omissions";
export const ERRORS_OMISSIONS_SHORT = "E&O";
export const ERRORS_OMISSIONS_LINE = "GL";
export const ERRORS_OMISSIONS_FORM_ID = "EO";

const ALIASES = new Set([
  "eo",
  "e&o",
  "e & o",
  "errors & omissions",
  "errors and omissions",
]);

export function normalizeErrorsOmissionsKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function isErrorsOmissionsProduct(
  ...values: Array<string | null | undefined>
): boolean {
  return values.some((value) => ALIASES.has(normalizeErrorsOmissionsKey(value)));
}

/** Badge / list / filter label. Unrelated products pass through unchanged. */
export function policyProductDisplayLabel(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  return isErrorsOmissionsProduct(raw) ? ERRORS_OMISSIONS_SHORT : raw;
}

const RETRO_KEY = /retro|prior[_\s-]?acts/i;
const DEDUCTIBLE_KEYS = ["deductible", "Deductible", "aopDeductible", "aop_deductible"];

export function liabilityLimitText(
  limits: Record<string, string> | null | undefined,
): string | null {
  if (!limits) return null;
  const preferred = ["generalAggregate", "eachOccurrence", "general_aggregate", "each_occurrence"];
  for (const key of preferred) {
    const hit = limits[key]?.trim();
    if (hit) return hit;
  }
  const rows = Object.entries(limits).filter(([, value]) => value?.trim());
  if (!rows.length) return null;
  return rows.map(([key, value]) => `${key}: ${value.trim()}`).join(" · ");
}

export function liabilityDeductible(
  limits: Record<string, string> | null | undefined,
): string | null {
  if (!limits) return null;
  for (const key of DEDUCTIBLE_KEYS) {
    const hit = limits[key]?.trim();
    if (hit) return hit;
  }
  const loose = Object.entries(limits).find(
    ([key, value]) => /deductible/i.test(key) && value?.trim(),
  );
  return loose?.[1]?.trim() || null;
}

/** Retroactive / prior-acts date only when a stored limit key already has one. */
export function liabilityRetroDate(
  limits: Record<string, string> | null | undefined,
): string | null {
  if (!limits) return null;
  const loose = Object.entries(limits).find(([key, value]) => RETRO_KEY.test(key) && value?.trim());
  return loose?.[1]?.trim() || null;
}
