import type { FilterField } from "@/lib/saved-filters";
import { policyProductDisplayLabel, productMenuTitle } from "@/lib/policy/eo";
import { titleCaseLabel } from "@/lib/ui/title-case";
import { defaultPageFilters } from "./defaults";
import { pageFilterFields } from "./fields";
import { PAGE_FILTER_MODULES, type PageFilter, type PageFilterModule, type PageFilterOption } from "./types";

export function normalizePageFilterModule(raw: string | null | undefined): PageFilterModule | null {
  const key = (raw ?? "").trim().toLowerCase();
  if (key === "accounts" || key === "business" || key === "account") return "businesses";
  if ((PAGE_FILTER_MODULES as readonly string[]).includes(key)) return key as PageFilterModule;
  return null;
}

export function isPageFilterModule(raw: string | null | undefined): raw is PageFilterModule {
  return normalizePageFilterModule(raw) != null;
}

export function normalizeOptionColor(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  const short = /^#([0-9a-fA-F]{3})$/.exec(value);
  if (short) {
    const [, hex] = short;
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toUpperCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toUpperCase();
  return null;
}

function parseOption(raw: unknown): PageFilterOption | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as { value?: unknown; label?: unknown; color?: unknown };
  const value = typeof row.value === "string" ? row.value.trim() : "";
  if (!value) return null;
  const label = titleCaseLabel(typeof row.label === "string" && row.label.trim() ? row.label : value);
  return { value, label, color: normalizeOptionColor(row.color) };
}

function parseFilter(raw: unknown, fallbackId: string): PageFilter | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as {
    id?: unknown;
    label?: unknown;
    fieldKey?: unknown;
    field?: unknown;
    enabled?: unknown;
    options?: unknown;
  };
  const fieldKey = String(row.fieldKey ?? row.field ?? "").trim();
  if (!fieldKey) return null;
  const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : fallbackId;
  const label = titleCaseLabel(
    typeof row.label === "string" && row.label.trim() ? row.label : fieldKey.replaceAll("_", " "),
  );
  const options: PageFilterOption[] = [];
  const seen = new Set<string>();
  if (Array.isArray(row.options)) {
    for (const option of row.options) {
      const parsed = parseOption(option);
      if (!parsed || seen.has(parsed.value)) continue;
      seen.add(parsed.value);
      options.push(parsed);
    }
  }
  return {
    id,
    label,
    fieldKey,
    enabled: row.enabled !== false,
    options,
  };
}

/** Stored agency list. Empty array means the agency cleared every chip. Null/junk → defaults. */
export function resolvePageFilters(module: PageFilterModule, stored: unknown): PageFilter[] {
  if (stored == null) return defaultPageFilters(module);
  if (!Array.isArray(stored)) return defaultPageFilters(module);
  if (stored.length === 0) return [];
  const next: PageFilter[] = [];
  const ids = new Set<string>();
  stored.forEach((row, index) => {
    const parsed = parseFilter(row, `${module}-filter-${index + 1}`);
    if (!parsed) return;
    let id = parsed.id;
    if (ids.has(id)) id = `${id}-${index + 1}`;
    ids.add(id);
    next.push({ ...parsed, id });
  });
  return next;
}

export function enabledPageFilters(filters: PageFilter[] | null | undefined): PageFilter[] {
  return (filters ?? []).filter((row) => row.enabled);
}

export function pageFilterParamKeys(filters: PageFilter[]): string[] {
  return enabledPageFilters(filters).map((row) => row.fieldKey);
}

export function mergeLiveOptions(
  filters: PageFilter[],
  live: Record<string, Array<string | null | undefined>>,
): PageFilter[] {
  return (filters ?? []).map((filter) => {
    const extras = live[filter.fieldKey];
    const baseOptions = filter.options ?? [];
    if (!extras?.length) return { ...filter, options: baseOptions };
    const seen = new Set(baseOptions.map((option) => option.value.toLowerCase()));
    const options = [...baseOptions];
    for (const raw of extras) {
      const value = raw?.trim();
      if (!value || seen.has(value.toLowerCase())) continue;
      seen.add(value.toLowerCase());
      options.push({
        value,
        label: policyProductDisplayLabel(titleCaseLabel(value.replaceAll("_", " "))),
        title: productMenuTitle(value),
        color: null,
      });
    }
    return { ...filter, options };
  });
}

export function newPageFilterId(module: PageFilterModule): string {
  const stamp = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
  return `${module}-${stamp}`;
}

export function seedPageFilter(module: PageFilterModule, fieldKey: string): PageFilter {
  const fromDefault = defaultPageFilters(module).find((row) => row.fieldKey === fieldKey);
  if (fromDefault) {
    return { ...fromDefault, id: newPageFilterId(module), enabled: true };
  }
  const field = pageFilterFields(module).find((row) => row.key === fieldKey);
  return {
    id: newPageFilterId(module),
    label: field?.label ?? titleCaseLabel(fieldKey.replaceAll("_", " ")),
    fieldKey,
    enabled: true,
    options: [],
  };
}

/** Enabled agency prefs → PipelineFilterPopover FilterField[]. */
export function filterFieldsFromPageFilters(filters: PageFilter[] | null | undefined): FilterField[] {
  return enabledPageFilters(filters).map((row) => ({
    key: row.fieldKey,
    label: row.label,
    options: (row.options ?? []).map((option) => ({
      value: option.value,
      label: option.label,
      title: option.title,
    })),
  }));
}

/**
 * Toggle / reorder live pipeline FilterField[] from agency page-filter prefs.
 * Empty stored list = cleared (no fields). Live options win when present.
 */
export function applyPageFilterPrefsToFields(
  fields: FilterField[] | null | undefined,
  prefs: PageFilter[] | null | undefined,
): FilterField[] {
  const prefList = prefs ?? [];
  if (prefList.length === 0) return [];
  const enabled = enabledPageFilters(prefList);
  const byKey = new Map((fields ?? []).map((field) => [field.key, field]));
  const out: FilterField[] = [];
  for (const pref of enabled) {
    const live = byKey.get(pref.fieldKey);
    const prefOptions = (pref.options ?? []).map((option) => ({
      value: option.value,
      label: option.label,
      title: option.title,
    }));
    if (live) {
      const liveOptions = live.options ?? [];
      out.push({
        key: live.key,
        label: pref.label || live.label,
        options: liveOptions.length > 0 ? liveOptions : prefOptions,
      });
      continue;
    }
    if (prefOptions.length) {
      out.push({
        key: pref.fieldKey,
        label: pref.label,
        options: prefOptions,
      });
    }
  }
  return out;
}
