/** Sort helpers for Quotes tab. Unpriced rows sink so a blank does not beat a real quote. */

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

/**
 * Favorites float: agent_rating desc (nulls last), then cheapest premium within each section.
 */
export function sortQuotesByRatingThenPremium<
  T extends { premium?: string | number | null; agentRating?: number | null },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ra = a.agentRating != null && a.agentRating >= 1 && a.agentRating <= 5 ? a.agentRating : null;
    const rb = b.agentRating != null && b.agentRating >= 1 && b.agentRating <= 5 ? b.agentRating : null;
    if (ra != null && rb != null && ra !== rb) return rb - ra;
    if (ra != null && rb == null) return -1;
    if (ra == null && rb != null) return 1;
    const pa = premiumNumber(a.premium);
    const pb = premiumNumber(b.premium);
    if (pa != null && pb != null) return pa - pb;
    if (pa != null) return -1;
    if (pb != null) return 1;
    return 0;
  });
}
