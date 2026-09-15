export const DEAL_STAMP_STAGES = ["quote_sent", "bound", "pending_inspection"] as const;
export type DealStampStage = (typeof DEAL_STAMP_STAGES)[number];

export const DEAL_STAMP_LABELS: Record<DealStampStage, string> = {
  quote_sent: "QUOTE SENT",
  bound: "BOUND",
  pending_inspection: "PENDING INSPECTION",
};

const SLUG_ALIASES: Record<string, DealStampStage> = {
  quote_sent: "quote_sent",
  quotesent: "quote_sent",
  quote_sent_to_client: "quote_sent",
  bound: "bound",
  closed_won: "bound",
  closedwon: "bound",
  won: "bound",
  pending_inspection: "pending_inspection",
  pendinginspection: "pending_inspection",
};

export function resolveDealStampStage(
  slug?: string | null,
  pipelineStage?: string | null,
  boundAt?: Date | string | null,
): DealStampStage | null {
  const keys = [slug, pipelineStage].map((value) =>
    (value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[/·]+/g, " ")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, ""),
  );
  for (const key of keys) {
    if (SLUG_ALIASES[key]) return SLUG_ALIASES[key];
  }
  if (boundAt) return "bound";
  return null;
}

export function dealStampLabel(stage: DealStampStage): string {
  return DEAL_STAMP_LABELS[stage];
}

export function isBoundQuote(input: {
  quoteId: string;
  agentStatus?: string | null;
  boundQuoteId?: string | null;
}): boolean {
  if (input.boundQuoteId && input.quoteId === input.boundQuoteId) return true;
  return (input.agentStatus ?? "").toLowerCase() === "bound";
}

export function pickBoundQuoteId(input: {
  dealBound?: boolean;
  quotes: readonly {
    id: string;
    bindable?: boolean | null;
    agentStatus?: string | null;
    stub?: boolean | null;
  }[];
}): string | null {
  const live = input.quotes.filter((row) => row.stub !== true);
  const marked = live.find((row) => (row.agentStatus ?? "").toLowerCase() === "bound");
  if (marked) return marked.id;
  if (!input.dealBound) return null;
  // Only pin a live quote. Stub rows are hidden on Quotes and must not fake BOUND.
  return live.find((row) => row.bindable)?.id ?? live[0]?.id ?? null;
}
