import type { FormFieldDef } from "@/lib/db/schema";

/** Demo values only — not Ana Dib, not a live OCR result. */
export const SCAN_DEMO_FIELDS: Record<string, string> = {
  named_insured: "Elena Ruiz",
  phone: "(321) 555-0140",
  email: "elena.ruiz@desk.local",
  mailing: "412 Harbor Isle Dr, Melbourne, FL 32901",
  address1: "412 Harbor Isle Dr",
  city: "Melbourne",
  county: "Brevard",
  state: "FL",
  zip: "32901",
  year_built: "1998",
  construction: "Masonry",
  occupancy: "Primary",
  roof_year: "2018",
  roof_covering: "Architectural shingle",
  opening_protection: "Impact glass",
  coverage_a: "385000",
  current_carrier: "Citizens",
  policy_number: "HO3-ELENA-2026",
  effective_date: "2026-03-01",
  cancellation_date: "2026-09-15",
  cancellation_reason: "Rewritten to admitted market",
  prior_agency: "Coastal Bound Agency",
  new_agency: "FitFirst",
};

export type FieldMapEntry = {
  formKey: string;
  sourceKey: string;
};

export function defaultFieldMap(fields: FormFieldDef[]): FieldMapEntry[] {
  return fields.map((field) => ({
    formKey: field.key,
    sourceKey: field.sheetKey ?? field.contactKey ?? field.key,
  }));
}

export function parsePastedFields(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([^:=\t]+)\s*[:=\t]\s*(.+?)\s*$/);
    if (!match) continue;
    const key = normalizeFieldKey(match[1] ?? "");
    const value = (match[2] ?? "").trim();
    if (key && value) out[key] = value;
  }
  return out;
}

export function normalizeFieldKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function suggestScanFields(input: {
  pasted?: string;
  filename?: string | null;
}): Record<string, string> {
  const parsed = parsePastedFields(input.pasted ?? "");
  return { ...SCAN_DEMO_FIELDS, ...parsed };
}

export function applyScanToForm(
  fields: FormFieldDef[],
  source: Record<string, string>,
  mapping: FieldMapEntry[] = defaultFieldMap(fields),
): Record<string, string> {
  const byForm = new Map(mapping.map((row) => [row.formKey, row.sourceKey]));
  const out: Record<string, string> = {};
  for (const field of fields) {
    const sourceKey = byForm.get(field.key) ?? field.key;
    const value =
      source[sourceKey] ??
      source[field.key] ??
      source[normalizeFieldKey(field.label)] ??
      "";
    if (value) out[field.key] = value;
  }
  return out;
}

export function mergeFillValues(
  current: Record<string, string>,
  incoming: Record<string, string>,
): Record<string, string> {
  return { ...current, ...incoming };
}
