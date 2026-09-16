export const DEAL_STAMP_STAGES = ["quote_sent", "bound", "policy_issued", "closed_won", "done"] as const;
export type DealStampStage = (typeof DEAL_STAMP_STAGES)[number];

export const DEAL_STAMP_LABELS: Record<DealStampStage, string> = {
  quote_sent: "QUOTE SENT",
  bound: "BOUND",
  policy_issued: "POLICY ISSUED",
  closed_won: "CLOSED WON",
  done: "DONE",
};

const SLUG_ALIASES: Record<string, DealStampStage> = {
  quote_sent: "quote_sent",
  quotesent: "quote_sent",
  quote_sent_to_client: "quote_sent",
  bound: "bound",
  policy_issued: "policy_issued",
  policyissued: "policy_issued",
  closed_won: "closed_won",
  closedwon: "closed_won",
  won: "closed_won",
  done: "done",
  issued_done: "done",
  issueddone: "done",
  pending_inspection: "bound",
  pendinginspection: "bound",
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
  selectedQuoteIds?: readonly string[] | null;
  quotes: readonly {
    id: string;
    bindable?: boolean | null;
    agentStatus?: string | null;
    stub?: boolean | null;
  }[];
}): string | null {
  const live = input.quotes.filter((row) => row.stub !== true);
  const liveIds = new Set(live.map((row) => row.id));
  const selected = (input.selectedQuoteIds ?? []).filter((id) => liveIds.has(id));
  if (selected[0]) return selected[0]!;
  const marked = live.find((row) => (row.agentStatus ?? "").toLowerCase() === "bound");
  if (marked) return marked.id;
  // Never auto-bind the cheapest bindable. Late stages require an explicit pick.
  return null;
}
