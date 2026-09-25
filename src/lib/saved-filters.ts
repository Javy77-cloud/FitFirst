export const FILTER_STORAGE_PREFIX = "ff-saved-filters:v1";

export type FilterOption = { value: string; label: string; title?: string };
export type FilterField = { key: string; label: string; options: FilterOption[] };
export type SavedNamedFilter = {
  id: string;
  name: string;
  params: Record<string, string>;
};

export function filterStorageKey(moduleId: string): string {
  return `${FILTER_STORAGE_PREFIX}:${moduleId}`;
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export function pickFilterParams(
  params: Record<string, string | string[] | undefined>,
  keys: string[],
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const key of keys) {
    const value = firstParam(params[key]);
    if (value) next[key] = value;
  }
  return next;
}

export function sameFilterParams(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? "") !== (b[key] ?? "")) return false;
  }
  return true;
}

export function queryFromParams(params: Record<string, string>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  return query.toString();
}

export function matchesField(actual: string | null | undefined, wanted: string | undefined): boolean {
  if (!wanted) return true;
  return (actual ?? "").toLowerCase() === wanted.toLowerCase();
}

export function parseSavedFilters(raw: unknown): SavedNamedFilter[] {
  if (!Array.isArray(raw)) return [];
  const next: SavedNamedFilter[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const id = (row as { id?: unknown }).id;
    const name = (row as { name?: unknown }).name;
    const params = (row as { params?: unknown }).params;
    if (typeof id !== "string" || typeof name !== "string" || !name.trim()) continue;
    if (!params || typeof params !== "object" || Array.isArray(params)) continue;
    const clean: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string" && value.trim()) clean[key] = value.trim();
    }
    next.push({ id, name: name.trim(), params: clean });
  }
  return next;
}

export function uniqueOptions(values: Array<string | null | undefined>, extra: FilterOption[] = []): FilterOption[] {
  const seen = new Set<string>();
  const options: FilterOption[] = [];
  for (const option of extra) {
    if (seen.has(option.value)) continue;
    seen.add(option.value);
    options.push(option);
  }
  for (const value of values) {
    const text = value?.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    options.push({ value: text, label: text.replaceAll("_", " ") });
  }
  return options;
}
