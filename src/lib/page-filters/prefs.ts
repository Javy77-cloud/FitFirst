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

export function enabledPageFilters(filters: PageFilter[]): PageFilter[] {
  return filters.filter((row) => row.enabled);
}

export function pageFilterParamKeys(filters: PageFilter[]): string[] {
  return enabledPageFilters(filters).map((row) => row.fieldKey);
}

export function mergeLiveOptions(
  filters: PageFilter[],
  live: Record<string, Array<string | null | undefined>>,
): PageFilter[] {
  return filters.map((filter) => {
    const extras = live[filter.fieldKey];
    if (!extras?.length) return filter;
    const seen = new Set(filter.options.map((option) => option.value.toLowerCase()));
    const options = [...filter.options];
    for (const raw of extras) {
      const value = raw?.trim();
      if (!value || seen.has(value.toLowerCase())) continue;
      seen.add(value.toLowerCase());
      options.push({ value, label: titleCaseLabel(value.replaceAll("_", " ")), color: null });
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
