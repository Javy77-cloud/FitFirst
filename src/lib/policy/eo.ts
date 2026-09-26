/**
 * Errors & Omissions — commercial liability product on the GL line.
 * Stored like the other GL-line products: line_of_business GL,
 * form_type and policy_sub_type exactly "Errors & Omissions".
 * Short label on badges, lists, and filters is E&O.
 */

export const ERRORS_OMISSIONS_LABEL = "Errors & Omissions";
/** Menu text. */
export const ERRORS_OMISSIONS_SHORT = "E&O";
/** Tooltip and long name. Uses the word "and", not "&". */
export const ERRORS_OMISSIONS_LONG = "Errors and Omissions";
export const ERRORS_OMISSIONS_LINE = "GL";
export const ERRORS_OMISSIONS_FORM_ID = "EO";
/** Line-menu value. Persisted policies stay line GL; this choice is the product. */
export const ERRORS_OMISSIONS_MENU_VALUE = "EO";

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

/** Tooltip for an E&O choice. Other products have no extra title. */
export function productMenuTitle(value: string | null | undefined): string | undefined {
  return isErrorsOmissionsProduct(value) ? ERRORS_OMISSIONS_LONG : undefined;
}

export type CommercialMenuOption = { value: string; label: string; title?: string };

/**
 * Insert E&O beside General Liability / Workers Comp in a line menu.
 * Does not add a LineOfBusiness code. Skips lists that already show E&O.
 */
export function commercialLineMenuOptions(
  lines: readonly string[],
  labelFor: (line: string) => string = (line) => line,
): CommercialMenuOption[] {
  const options: CommercialMenuOption[] = lines.map((line) =>
    isErrorsOmissionsProduct(line)
      ? { value: line, label: ERRORS_OMISSIONS_SHORT, title: ERRORS_OMISSIONS_LONG }
      : { value: line, label: labelFor(line) },
  );
  if (
    options.some(
      (row) => row.value.toUpperCase() === ERRORS_OMISSIONS_MENU_VALUE || row.label === ERRORS_OMISSIONS_SHORT,
    )
  ) {
    return options;
  }
  const commercial = options.some(
    (row) =>
      row.value === "GL" ||
      row.value === "WC" ||
      row.value === "gl" ||
      row.value === "workers_comp" ||
      /general liability|workers/i.test(row.label),
  );
  if (!commercial) return options;
  const eo: CommercialMenuOption = {
    value: ERRORS_OMISSIONS_MENU_VALUE,
    label: ERRORS_OMISSIONS_SHORT,
    title: ERRORS_OMISSIONS_LONG,
  };
  const glAt = options.findIndex(
    (row) =>
      row.value === "GL" ||
      row.value === "gl" ||
      row.label === "GL" ||
      row.label === "General Liability" ||
      row.label === "General liability",
  );
  const wcAt = options.findIndex(
    (row) => row.value === "WC" || row.value === "workers_comp" || /workers/i.test(row.label),
  );
  const at = glAt >= 0 ? glAt + 1 : wcAt >= 0 ? wcAt : options.length;
  const next = [...options];
  next.splice(at, 0, eo);
  return next;
}

/** Keep the stored list value when the current record uses the E&O alias. */
export function menuOptionValue(options: readonly string[], current: string): string {
  if (!current) return current;
  if (options.includes(current)) return current;
  if (isErrorsOmissionsProduct(current)) {
    const hit = options.find((option) => isErrorsOmissionsProduct(option));
    if (hit) return hit;
  }
  return current;
}

export function withCurrentProductOption(options: readonly string[], current: string): string[] {
  if (!current) return [...options];
  if (options.includes(current)) return [...options];
  if (isErrorsOmissionsProduct(current) && options.some((option) => isErrorsOmissionsProduct(option))) {
    return [...options];
  }
  return [current, ...options];
}

/**
 * Line filter. GL still matches every GL row, including E&O policies stored on GL.
 * E&O matches the EO code or an E&O form / subtype.
 */
export function matchesCommercialLineChoice(
  wanted: string | null | undefined,
  line: string | null | undefined,
  ...hints: Array<string | null | undefined>
): boolean {
  const want = (wanted ?? "").trim();
  if (!want || want === "all") return true;
  if (isErrorsOmissionsProduct(want) || want.toUpperCase() === ERRORS_OMISSIONS_MENU_VALUE) {
    return isErrorsOmissionsProduct(line, ...hints) || (line ?? "").trim().toUpperCase() === ERRORS_OMISSIONS_MENU_VALUE;
  }
  return (line ?? "").trim().toLowerCase() === want.toLowerCase();
}

/** Subtype filter accepts the stored name and the E&O alias as the same product. */
export function matchesProductChoice(
  actual: string | null | undefined,
  wanted: string | null | undefined,
): boolean {
  const want = (wanted ?? "").trim();
  if (!want) return true;
  if ((actual ?? "").trim().toLowerCase() === want.toLowerCase()) return true;
  return isErrorsOmissionsProduct(want) && isErrorsOmissionsProduct(actual);
}

/** Settings lists keep the canonical subtype string so the live policy stays on the list. */
export function canonicalStoredListLabel(listKey: string, label: string): string {
  const trimmed = label.trim();
  if (!isErrorsOmissionsProduct(trimmed)) return trimmed;
  if (listKey === "policy_sub_type") return ERRORS_OMISSIONS_LABEL;
  if (listKey === "policy_type") return ERRORS_OMISSIONS_SHORT;
  return trimmed;
}

const RETRO_KEY = /retro|prior[_\s-]?acts/i;
const DEDUCTIBLE_KEYS = [
  "deductible",
  "Deductible",
  "aopDeductible",
  "aop_deductible",
  "gl_deductible",
  "pl_per_claim_deductible",
];

export function liabilityLimitText(
  limits: Record<string, string> | null | undefined,
): string | null {
  if (!limits) return null;
  const preferred = [
    "generalAggregate",
    "eachOccurrence",
    "general_aggregate",
    "each_occurrence",
    "gl_general_aggregate",
    "gl_each_occurrence",
    "pl_per_claim",
    "pl_aggregate",
  ];
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
