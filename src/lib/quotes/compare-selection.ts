/** Session compare picks on Quotes Bindable / Conditional rows (max 3). */

export const QUOTE_COMPARE_MAX = 3;

export const QUOTE_COMPARE_TIP = "Compare Up To 3 Quotes Side By Side.";

/** Toggle a quote id into the compare set — never exceeds max. */
export function toggleCompareSelection(
  current: string[],
  id: string,
  max = QUOTE_COMPARE_MAX,
): string[] {
  if (current.includes(id)) return current.filter((item) => item !== id);
  if (current.length >= max) return current;
  return [...current, id];
}

export function canAddToCompare(current: string[], id: string, max = QUOTE_COMPARE_MAX): boolean {
  return current.includes(id) || current.length < max;
}

export function premiumSortValue(premium: string | number | null | undefined): number {
  if (premium == null || premium === "") return Number.POSITIVE_INFINITY;
  if (typeof premium === "number") return Number.isFinite(premium) ? premium : Number.POSITIVE_INFINITY;
  const n = Number(String(premium).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

/** Cheapest first (left), most expensive last (right). Missing premium sorts last. */
export function sortByPremiumAsc<T>(
  rows: T[],
  getPremium: (row: T) => string | number | null | undefined,
): T[] {
  return [...rows].sort((a, b) => premiumSortValue(getPremium(a)) - premiumSortValue(getPremium(b)));
}
