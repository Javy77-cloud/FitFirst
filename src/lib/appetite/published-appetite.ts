/**
 * Published carrier appetite used by Markets (appetite_rules) and the quote-gate catalog.
 * Add new carriers here — do not hardcode Trident-only checks in the matcher.
 */
export type PublishedHoAppetite = {
  slug: string;
  legalName: string;
  aliases: string[];
  /** Homeowners form (HO3, HO6, …). */
  line: string;
  state: string;
  minCovA: number | null;
  placement: string;
  notesForAgent: string;
};

export const TRIDENT_HO_APPETITE: PublishedHoAppetite = {
  slug: "trident_reciprocal",
  legalName: "Trident Reciprocal Exchange",
  aliases: ["trident reciprocal exchange", "trident reciprocal", "trident"],
  line: "HO3",
  state: "FL",
  minCovA: 300_000,
  placement: "QuoteRUSH",
  notesForAgent:
    "FL HO-3 via QuoteRUSH. Minimum Coverage A $300,000 (was $400k; effective immediately). Broader Florida HO placement — re-shop risks previously below $400k.",
};

export const PUBLISHED_HO_APPETITE: PublishedHoAppetite[] = [TRIDENT_HO_APPETITE];

export function publishedHoBySlug(slug: string): PublishedHoAppetite | undefined {
  return PUBLISHED_HO_APPETITE.find((row) => row.slug === slug);
}

export function minCovAToken(minCovA: number): string {
  return `min_cov_a:${minCovA}`;
}

export function parseMinCovAToken(token: string): number | null {
  const match = /^min_cov_a:(\d+)$/i.exec(token.trim());
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}
