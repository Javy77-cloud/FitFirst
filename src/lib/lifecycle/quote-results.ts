import { formatMoney } from "@/lib/domain";

export type RankableQuote = {
  carrierName: string;
  premium: string | number | null | undefined;
  bindable: boolean;
};

export function sortQuotesCheapestFirst<T extends RankableQuote>(quotes: T[]): T[] {
  return [...quotes].sort((a, b) => {
    const pa = a.premium == null || a.premium === "" ? Number.POSITIVE_INFINITY : Number(a.premium);
    const pb = b.premium == null || b.premium === "" ? Number.POSITIVE_INFINITY : Number(b.premium);
    const na = Number.isFinite(pa) ? pa : Number.POSITIVE_INFINITY;
    const nb = Number.isFinite(pb) ? pb : Number.POSITIVE_INFINITY;
    if (na !== nb) return na - nb;
    return a.carrierName.localeCompare(b.carrierName);
  });
}

/** Ranked quote-results note. Quotes never become policies. */
export function buildQuoteResultsNote(quotes: RankableQuote[]): string {
  if (quotes.length === 0) {
    return "No quotes on this deal. Quotes never become policies.";
  }
  const ranked = sortQuotesCheapestFirst(quotes);
  const lines = ranked.map((quote, index) => {
    const bind = quote.bindable ? "bindable" : "not bindable";
    return `${index + 1}. ${quote.carrierName} · ${formatMoney(quote.premium)} · ${bind}`;
  });
  return [
    "Quote results (cheapest first). These are shopping quotes — none of them is a policy.",
    ...lines,
  ].join("\n");
}
