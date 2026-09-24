/** Marker on attempt logs that record one quote dying. Other deals must not learn from it. */
export const QUOTE_ROW_DECLINE_MARKER = "quote-row-scoped";

export function quoteRowDeclineWhy(input: { quoteId: string; detail: string }): string {
  return `${QUOTE_ROW_DECLINE_MARKER} quote=${input.quoteId} ${input.detail}`.trim();
}

export function isQuoteRowScopedDecline(why?: string | null): boolean {
  return (why ?? "").includes(QUOTE_ROW_DECLINE_MARKER);
}

export type DeclineLogScope = {
  dealId?: string | null;
  why?: string | null;
  quoteId?: string | null;
};

/**
 * A killed or deleted quote teaches appetite only on the deal that owns the row.
 * Book-wide priors (real portal declines with snapshots) stay book-wide.
 */
export function declineVisibleOnDeal(log: DeclineLogScope, viewingDealId: string): boolean {
  if (!isQuoteRowScopedDecline(log.why)) return true;
  return (log.dealId ?? "") === viewingDealId;
}

export function priorDeclineScope(why?: string | null): "deal" | null {
  return isQuoteRowScopedDecline(why) ? "deal" : null;
}

/** Delete plan never names another deal or a carrier-wide wipe. */
export function quoteDeletePlan(input: { dealId: string; quoteIds: readonly string[] }): {
  dealId: string;
  quoteIds: string[];
  bookWide: false;
} {
  return {
    dealId: input.dealId.trim(),
    quoteIds: input.quoteIds.map((id) => id.trim()).filter(Boolean),
    bookWide: false,
  };
}
