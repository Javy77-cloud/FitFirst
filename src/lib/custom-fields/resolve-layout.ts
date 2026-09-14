import { MODULE_LAYOUT_LINE, type FieldLayoutModule } from "./modules";
import { formatPhoneStandard } from "@/lib/phone/format";
import {
  allLayoutFieldKeys,
  parseLayout,
  type CustomFieldDef,
  type FieldLayout,
} from "./types";

export type SavedLayoutRow = {
  lineOfBusiness: string;
  columns: unknown;
  updatedAt?: Date | string | null;
};

export function layoutContentScore(layout: FieldLayout): number {
  return layout.columns.reduce(
    (sum, column) =>
      sum +
      column.sections.reduce((sectionSum, section) => sectionSum + section.fieldKeys.length, 0),
    0,
  );
}

export function layoutHasFields(layout: FieldLayout): boolean {
  return layoutContentScore(layout) > 0;
}

function updatedAtMs(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const ms = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(ms) ? ms : 0;
}

/** Prefer a non-empty saved layout. Never pick a blank row when a populated one exists. */
export function pickSavedModuleLayout(
  rows: readonly SavedLayoutRow[],
  module: FieldLayoutModule,
  preferredLine?: string,
): FieldLayout | null {
  const preferred =
    preferredLine || (module === "deals" ? "HO" : MODULE_LAYOUT_LINE);
  const parsed = rows.map((row) => ({
    lineOfBusiness: row.lineOfBusiness,
    updatedAtMs: updatedAtMs(row.updatedAt),
    layout: parseLayout(row.columns),
    score: 0,
  }));
  for (const row of parsed) row.score = layoutContentScore(row.layout);
  const withFields = parsed.filter((row) => row.score > 0);
  if (withFields.length === 0) return null;
  withFields.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aPref = a.lineOfBusiness === preferred ? 1 : 0;
    const bPref = b.lineOfBusiness === preferred ? 1 : 0;
    if (bPref !== aPref) return bPref - aPref;
    return b.updatedAtMs - a.updatedAtMs;
  });
  return withFields[0]?.layout ?? null;
}

export function humanizeFieldKey(key: string): string {
  const label = key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
  return label || key;
}

/** Keep every layout field visible even if the catalog row is missing. */
export function resolveLayoutFields(
  layout: FieldLayout,
  fields: readonly CustomFieldDef[],
): CustomFieldDef[] {
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const extras: CustomFieldDef[] = [];
  for (const key of allLayoutFieldKeys(layout)) {
    if (byKey.has(key)) continue;
    const field: CustomFieldDef = {
      key,
      label: humanizeFieldKey(key),
      type: "single_line",
    };
    extras.push(field);
    byKey.set(key, field);
  }
  return extras.length ? [...fields, ...extras] : [...fields];
}

export function mergeRecordSystemValues(
  record: Record<string, unknown> | null | undefined,
  stored: Record<string, string>,
  fields: readonly CustomFieldDef[],
): Record<string, string> {
  const fromSystem: Record<string, string> = {};
  if (record) {
    for (const field of fields) {
      if (!field.systemKey) continue;
      const value = record[field.systemKey];
      if (value == null || value === "") continue;
      fromSystem[field.key] = value instanceof Date
        ? value.toISOString().slice(0, 10)
        : Array.isArray(value)
          ? value.map(String).filter(Boolean).join(", ")
          : String(value);
    }
  }
  return { ...fromSystem, ...stored };
}

export function customValuesFromForm(
  form: FormData,
  fields: readonly CustomFieldDef[],
): Record<string, string> {
  const custom: Record<string, string> = {};
  for (const field of fields) {
    if (field.type === "formula") continue;
    if (field.type === "multi_select") {
      custom[field.key] = form
        .getAll(`field_${field.key}`)
        .map((item) => String(item))
        .filter(Boolean)
        .join(",");
      continue;
    }
    if (field.type === "checkbox") {
      custom[field.key] = form.get(`field_${field.key}`) ? "true" : "";
      continue;
    }
    if (form.has(`field_${field.key}`)) {
      const raw = String(form.get(`field_${field.key}`) ?? "");
      custom[field.key] =
        field.type === "phone" ? formatPhoneStandard(raw) || raw : raw;
    }
  }
  return custom;
}

/** Append any catalog fields missing from the saved layout into a trailing "More fields" section. */
export function ensureLayoutIncludesCatalogFields(
  layout: FieldLayout,
  fields: readonly CustomFieldDef[],
): FieldLayout {
  const present = new Set(allLayoutFieldKeys(layout));
  const missing = fields.map((field) => field.key).filter((key) => key && !present.has(key));
  if (missing.length === 0) return layout;
  const columns = layout.columns.map((column) => ({
    ...column,
    sections: column.sections.map((section) => ({ ...section, fieldKeys: [...section.fieldKeys] })),
  }));
  const right = columns[1] ?? columns[0];
  if (!right) return layout;
  const more = right.sections.find((section) => section.id === "more_fields" || section.label === "More fields");
  if (more) {
    more.fieldKeys = [...more.fieldKeys, ...missing];
  } else {
    right.sections.push({
      id: "more_fields",
      label: "More fields",
      fieldKeys: missing,
    });
  }
  return { columns: columns as FieldLayout["columns"] };
}
