import type { QuoteSheetFieldValue } from "@/lib/domain";
import { CONFIDENCE_THRESHOLD, SUPER_COPY_KIND } from "@/lib/domain";

export type QuoteFieldDef = {
  key: string;
  label: string;
  group: string;
  extractKey?: string;
};

/** Home keys match Quote Sheet ingest catalog — consume, do not fork. */
export const HOME_SHEET_FIELDS: QuoteFieldDef[] = [
  { key: "address1", label: "Property address", group: "Property", extractKey: "address" },
  { key: "city", label: "City", group: "Property", extractKey: "city" },
  { key: "county", label: "County", group: "Property", extractKey: "county" },
  { key: "state", label: "State", group: "Property", extractKey: "state" },
  { key: "zip", label: "ZIP", group: "Property", extractKey: "zip" },
  { key: "year_built", label: "Year built", group: "Dwelling", extractKey: "year_built" },
  { key: "stories", label: "Stories", group: "Dwelling", extractKey: "stories" },
  { key: "square_feet", label: "Square feet", group: "Dwelling", extractKey: "square_feet" },
  { key: "construction", label: "Construction", group: "Dwelling", extractKey: "construction" },
  { key: "occupancy", label: "Occupancy", group: "Dwelling", extractKey: "occupancy" },
  { key: "roof_year", label: "Roof year", group: "Roof / wind", extractKey: "roof_year" },
  { key: "roof_covering", label: "Roof covering", group: "Roof / wind", extractKey: "roof_covering" },
  { key: "roof_shape", label: "Roof shape", group: "Roof / wind" },
  {
    key: "opening_protection",
    label: "Opening protection",
    group: "Roof / wind",
    extractKey: "opening_protection",
  },
  {
    key: "protection_class",
    label: "Protection class",
    group: "Roof / wind",
    extractKey: "protection_class",
  },
  {
    key: "miles_to_coast",
    label: "Miles to coast",
    group: "Roof / wind",
    extractKey: "miles_to_coast",
  },
  { key: "pool", label: "Pool", group: "Roof / wind", extractKey: "pool" },
  { key: "coverage_a", label: "Coverage A (dwelling)", group: "Coverages", extractKey: "coverage_a" },
  { key: "coverage_b", label: "Coverage B (other structures)", group: "Coverages" },
  { key: "hurricane_deductible", label: "Hurricane deductible", group: "Coverages" },
  { key: "aop_deductible", label: "AOP deductible", group: "Coverages" },
  { key: "current_carrier", label: "Current carrier", group: "Current policy" },
  { key: "four_point_date", label: "4-point date", group: "Inspections" },
  { key: "wind_mit_form", label: "Wind mit form", group: "Inspections" },
  { key: "notes", label: "Shop notes", group: "Notes" },
];

export function emptySheetValues(): Record<string, QuoteSheetFieldValue> {
  const values: Record<string, QuoteSheetFieldValue> = {};
  for (const field of HOME_SHEET_FIELDS) {
    values[field.key] = { value: "", status: "missing", source: "blank" };
  }
  return values;
}

export function isLockedSheetField(field: QuoteSheetFieldValue | undefined): boolean {
  if (!field) return false;
  if (field.source === "javy" || field.source === "agent") return true;
  if (field.status === "confirmed" && field.source === "seed") return true;
  return false;
}

export function isSheetBlank(field: QuoteSheetFieldValue | undefined): boolean {
  if (!field) return true;
  return field.status === "missing" || field.value.trim() === "";
}

export type ExtractedHint = {
  fieldKey: string;
  normalizedValue: string;
  confidence: number;
  flagged: boolean;
};

/**
 * Blanks-only fill. Never overwrite agent-typed or Javy-tested values.
 * Quote Sheet ingest owns photo OCR / apply.ts — this only consumes extracted text fields.
 */
export function fillSheetBlanks(
  current: Record<string, QuoteSheetFieldValue>,
  hints: ExtractedHint[],
): { values: Record<string, QuoteSheetFieldValue>; filledKeys: string[]; skippedKeys: string[] } {
  const values = { ...current };
  const filledKeys: string[] = [];
  const skippedKeys: string[] = [];

  for (const field of HOME_SHEET_FIELDS) {
    const hint = hints.find(
      (h) => h.fieldKey === field.extractKey || h.fieldKey === field.key,
    );
    if (!hint || !hint.normalizedValue) continue;
    const existing = values[field.key];
    if (isLockedSheetField(existing) || !isSheetBlank(existing)) {
      skippedKeys.push(field.key);
      continue;
    }
    const check = hint.flagged || hint.confidence < CONFIDENCE_THRESHOLD;
    values[field.key] = {
      value: hint.normalizedValue,
      status: check ? "check" : "confirmed",
      source: "extracted",
    };
    filledKeys.push(field.key);
  }

  return { values, filledKeys, skippedKeys };
}

export function groupHomeFields(): { group: string; fields: QuoteFieldDef[] }[] {
  const groups: { group: string; fields: QuoteFieldDef[] }[] = [];
  for (const field of HOME_SHEET_FIELDS) {
    const existing = groups.find((g) => g.group === field.group);
    if (existing) existing.fields.push(field);
    else groups.push({ group: field.group, fields: [field] });
  }
  return groups;
}

/** Extension point for Chrome Fill — same kind the extension already reads. */
export function toSuperCopyPacket(input: {
  tenantId: string;
  dealId: string;
  insured: { primary?: string | null; namedInsured?: string | null };
  risk: Record<string, unknown>;
  sheetValues: Record<string, QuoteSheetFieldValue>;
}) {
  return {
    kind: SUPER_COPY_KIND,
    version: 1,
    tenantId: input.tenantId,
    dealId: input.dealId,
    insured: input.insured,
    risk: input.risk,
    quoteSheet: input.sheetValues,
  };
}
