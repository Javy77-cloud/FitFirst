import type { CustomFieldDef } from "./types";

export type FieldPicklist = {
  id: string;
  name: string;
  options: string[];
};

/** High enough for US states + DC. Custom field lists stay this size. */
export const MAX_PICKLIST_OPTIONS = 80;

export function sanitizePicklistOptions(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options.map((item) => String(item).trim()).filter(Boolean).slice(0, MAX_PICKLIST_OPTIONS);
}

export function resizePicklistOptions(options: string[], count: number): string[] {
  const n = Math.max(0, Math.min(MAX_PICKLIST_OPTIONS, Math.floor(Number(count) || 0)));
  const next = options.slice(0, n);
  while (next.length < n) next.push("");
  return next;
}

export function resolveFieldOptions(field: CustomFieldDef, lists: FieldPicklist[] = []): string[] {
  if (field.picklistId) {
    const list = lists.find((item) => item.id === field.picklistId);
    if (list) return sanitizePicklistOptions(list.options);
  }
  return sanitizePicklistOptions(field.options ?? []);
}

export function resolvedFieldValue(field: CustomFieldDef, value?: string | null): string {
  if (value !== undefined && value !== null && value !== "") return value;
  return field.defaultValue ?? "";
}

export function missingRequiredFields(
  fields: CustomFieldDef[],
  values: Record<string, string>,
): CustomFieldDef[] {
  return fields.filter((field) => {
    if (!field.required || field.type === "formula" || field.type === "image") return false;
    const raw = values[field.key] ?? "";
    if (field.type === "checkbox") return raw !== "true" && raw !== "on";
    return raw.trim() === "";
  });
}

export function cloneFieldDef(field: CustomFieldDef, existingKeys: string[]): CustomFieldDef {
  const base = `${field.key}_copy`;
  let key = base;
  let n = 2;
  while (existingKeys.includes(key)) {
    key = `${base}${n}`;
    n += 1;
  }
  return {
    ...field,
    key,
    label: field.label.endsWith(" copy") ? field.label : `${field.label} copy`,
    systemKey: null,
  };
}

export function parseFieldPicklist(raw: unknown): FieldPicklist | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as { id?: unknown; name?: unknown; options?: unknown };
  if (typeof row.id !== "string" || typeof row.name !== "string") return null;
  return {
    id: row.id,
    name: row.name.trim() || "Untitled list",
    options: sanitizePicklistOptions(row.options),
  };
}
