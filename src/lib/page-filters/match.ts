import { matchesField } from "@/lib/saved-filters";

export type PageFilterValue = string | readonly string[] | null | undefined;

export function matchesPageFilters(
  values: Record<string, PageFilterValue>,
  selected: Record<string, string>,
): boolean {
  for (const [key, wanted] of Object.entries(selected)) {
    if (!wanted) continue;
    const actual = values[key];
    if (Array.isArray(actual)) {
      if (!actual.some((item) => matchesField(item, wanted))) return false;
      continue;
    }
    if (!matchesField(actual == null ? "" : String(actual), wanted)) return false;
  }
  return true;
}
