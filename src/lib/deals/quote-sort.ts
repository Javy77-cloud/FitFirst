/** Cheapest premium first. Unpriced rows sink so a $0 stub does not beat a real quote. */

export function premiumNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function sortQuotesCheapestFirst<T extends { premium?: string | number | null }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const pa = premiumNumber(a.premium);
    const pb = premiumNumber(b.premium);
    if (pa != null && pb != null) return pa - pb;
    if (pa != null) return -1;
    if (pb != null) return 1;
    return 0;
  });
}
