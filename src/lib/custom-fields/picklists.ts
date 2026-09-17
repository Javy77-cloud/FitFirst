import type { CustomFieldDef } from "./types";
import { STATUS_COLOR_KEYS, type StatusColorKey } from "@/lib/desk/status-colors";

export type PicklistOption = {
  value: string;
  color?: StatusColorKey | null;
  isDefault?: boolean;
};

export type FieldPicklist = {
  id: string;
  name: string;
  options: PicklistOption[];
  seedKey?: string | null;
  active?: boolean;
};

/** High enough for US states + DC. Custom field lists stay this size. */
export const MAX_PICKLIST_OPTIONS = 80;

function asColor(raw: unknown): StatusColorKey | null {
  const key = String(raw ?? "").trim().toLowerCase();
  return (STATUS_COLOR_KEYS as readonly string[]).includes(key) ? (key as StatusColorKey) : null;
}

/** Accept legacy string[] or rich { value, color?, isDefault? }[]; sort A–Z; at most one default. */
export function sanitizeRichPicklistOptions(options: unknown): PicklistOption[] {
  if (!Array.isArray(options)) return [];
  const seen = new Set<string>();
  const next: PicklistOption[] = [];
  for (const item of options) {
    let value = "";
    let color: StatusColorKey | null = null;
    let isDefault = false;
    if (typeof item === "string" || typeof item === "number") {
      value = String(item).trim();
    } else if (item && typeof item === "object") {
      const row = item as Record<string, unknown>;
      value = String(row.value ?? row.label ?? row.name ?? "").trim();
      color = asColor(row.color);
      isDefault = Boolean(row.isDefault ?? row.default ?? row.is_default);
    }
    if (!value || seen.has(value)) continue;
    seen.add(value);
    next.push({ value, color, isDefault });
    if (next.length >= MAX_PICKLIST_OPTIONS) break;
  }
  next.sort((a, b) => a.value.localeCompare(b.value));
  let sawDefault = false;
  for (const option of next) {
    if (option.isDefault && !sawDefault) {
      sawDefault = true;
      continue;
    }
    option.isDefault = false;
  }
  return next;
}

/** Labels only — for selects and field.options consumers. */
export function sanitizePicklistOptions(options: unknown): string[] {
  return sanitizeRichPicklistOptions(options).map((option) => option.value);
}

export function resizePicklistOptions(options: string[], count: number): string[] {
  const n = Math.max(0, Math.min(MAX_PICKLIST_OPTIONS, Math.floor(Number(count) || 0)));
  const next = options.slice(0, n);
  while (next.length < n) next.push("");
  return next;
}

export function resolveRichFieldOptions(
  field: CustomFieldDef,
  lists: FieldPicklist[] = [],
): PicklistOption[] {
  if (field.picklistId) {
    const list = lists.find((item) => item.id === field.picklistId);
    if (list) return sanitizeRichPicklistOptions(list.options);
  }
  // Inline options may already be rich { value, color } from the field row.
  if (field.optionColors && Object.keys(field.optionColors).length > 0) {
    return sanitizeRichPicklistOptions(
      (field.options ?? []).map((value) => ({
        value,
        color: field.optionColors?.[value] ?? null,
      })),
    );
  }
  return sanitizeRichPicklistOptions(field.options ?? []);
}

export function resolveFieldOptions(field: CustomFieldDef, lists: FieldPicklist[] = []): string[] {
  return resolveRichFieldOptions(field, lists).map((option) => option.value);
}

export function optionColorMap(options: PicklistOption[]): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const option of options) {
    map[option.value] = option.color ?? null;
  }
  return map;
}

export function resolvePicklistDefault(
  field: CustomFieldDef,
  lists: FieldPicklist[] = [],
): string {
  if (field.defaultValue) return field.defaultValue;
  if (field.picklistId) {
    const list = lists.find((item) => item.id === field.picklistId);
    const fallback = list?.options.find((option) => option.isDefault)?.value;
    if (fallback) return fallback;
  }
  return "";
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
  const row = raw as { id?: unknown; name?: unknown; options?: unknown; seedKey?: unknown; active?: unknown };
  if (typeof row.id !== "string" || typeof row.name !== "string") return null;
  return {
    id: row.id,
    name: row.name.trim() || "Untitled list",
    options: sanitizeRichPicklistOptions(row.options),
    seedKey: typeof row.seedKey === "string" && row.seedKey.trim() ? row.seedKey.trim() : null,
    active: row.active !== false,
  };
}

/** Set every option color to null (None) — start-over for list color pickers. */
export function clearAllPicklistOptionColors(options: PicklistOption[]): PicklistOption[] {
  return options.map((option) => ({ ...option, color: null }));
}
