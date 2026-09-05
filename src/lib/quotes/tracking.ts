import { formatMoney, type TrackingStatus } from "@/lib/domain";

export type QuoteParty = {
  contactId: string | null;
  accountId: string | null;
  email: string | null;
  phone: string | null;
};

export type TrackingAttemptInput = {
  id: string;
  dealId: string;
  dealTitle: string;
  dealStage: string;
  carrierId: string;
  carrierName: string;
  line: string;
  result: string | null;
  bindable: boolean;
  premium: string | number | null;
  quoteNumber: string | null;
  attemptedAt: Date;
  why: string | null;
  quoteId?: string | null;
  lostReason?: string | null;
  coverageA?: number | null;
  aopDeductible?: string | null;
  hurricaneDeductible?: string | null;
  coverageGaps?: string[];
  notes?: string | null;
} & Partial<QuoteParty>;

export type BoundPolicyInput = {
  dealId: string;
  carrierId: string;
  policyId: string;
};

export type QuoteComparisonInput = {
  id: string;
  dealId: string;
  dealTitle: string;
  dealStage: string;
  carrierId: string;
  carrierName: string;
  line: string;
  bindable: boolean;
  premium: string | number | null;
  quoteNumber: string | null;
  createdAt: Date;
  notes: string | null;
  quoteAttemptLogId: string | null;
  lostReason?: string | null;
  coverageA?: number | null;
  aopDeductible?: string | null;
  hurricaneDeductible?: string | null;
  coverageGaps?: string[];
} & Partial<QuoteParty>;

export type TrackingRow = {
  id: string;
  dealId: string;
  dealTitle: string;
  dealStage: string;
  carrierId: string;
  carrierName: string;
  line: string;
  status: TrackingStatus;
  premium: number | null;
  quoteNumber: string | null;
  attemptedAt: Date;
  bindable: boolean;
  appetiteLogId: string | null;
  quoteId: string | null;
  policyId: string | null;
  why: string | null;
  cheapestQuotedRank: number | null;
  lostReason: string | null;
  coverageA: number | null;
  aopDeductible: string | null;
  hurricaneDeductible: string | null;
  coverageGaps: string[];
  notes: string | null;
  pdfDocumentId: string | null;
  pdfFilename: string | null;
  contactId: string | null;
  accountId: string | null;
  email: string | null;
  phone: string | null;
};

export type TrackingShop = {
  dealId: string;
  dealTitle: string;
  dealStage: string;
  line: string;
  rows: TrackingRow[];
  quotedCount: number;
  declinedCount: number;
  skipCount: number;
  boundCount: number;
  cheapestQuoted: TrackingRow | null;
};

const SKIP_RESULTS = new Set(["floor_only", "takeout_only", "portal_closed"]);

export function parsePremium(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

export function trackingStatus(result: string | null, hasBoundPolicy: boolean): TrackingStatus {
  if (hasBoundPolicy) return "bound";
  if (result === "quoted") return "quoted";
  if (result === "declined") return "declined";
  return "skip";
}

export function isShopResultSkip(result: string | null | undefined): boolean {
  return result != null && SKIP_RESULTS.has(result);
}

export function assignCheapestQuotedRanks(rows: TrackingRow[]): TrackingRow[] {
  const rankable = rows
    .filter((row) => (row.status === "quoted" || row.status === "bound") && row.premium != null)
    .sort((a, b) => {
      if (a.premium !== b.premium) return (a.premium ?? 0) - (b.premium ?? 0);
      return a.carrierName.localeCompare(b.carrierName);
    });

  const ranks = new Map<string, number>();
  rankable.forEach((row, index) => {
    ranks.set(row.id, index + 1);
  });

  return rows.map((row) => ({
    ...row,
    cheapestQuotedRank: ranks.get(row.id) ?? null,
  }));
}

function partyFrom(input: Partial<QuoteParty>): QuoteParty {
  return {
    contactId: input.contactId ?? null,
    accountId: input.accountId ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
  };
}

function attemptToRow(
  attempt: TrackingAttemptInput,
  policy: BoundPolicyInput | undefined,
): TrackingRow {
  return {
    id: attempt.id,
    dealId: attempt.dealId,
    dealTitle: attempt.dealTitle,
    dealStage: attempt.dealStage,
    carrierId: attempt.carrierId,
    carrierName: attempt.carrierName,
    line: attempt.line,
    status: trackingStatus(attempt.result, Boolean(policy)),
    premium: parsePremium(attempt.premium),
    quoteNumber: attempt.quoteNumber,
    attemptedAt: attempt.attemptedAt,
    bindable: attempt.bindable,
    appetiteLogId: attempt.id,
    quoteId: attempt.quoteId ?? null,
    policyId: policy?.policyId ?? null,
    why: attempt.why,
    cheapestQuotedRank: null,
    lostReason: attempt.lostReason ?? null,
    coverageA: attempt.coverageA ?? null,
    aopDeductible: attempt.aopDeductible ?? null,
    hurricaneDeductible: attempt.hurricaneDeductible ?? null,
    coverageGaps: attempt.coverageGaps ?? [],
    notes: attempt.notes ?? attempt.why,
    pdfDocumentId: null,
    pdfFilename: null,
    ...partyFrom(attempt),
  };
}

export function buildTrackingRows(
  attempts: TrackingAttemptInput[],
  policies: BoundPolicyInput[] = [],
  quotes: QuoteComparisonInput[] = [],
): TrackingRow[] {
  const policyByDealCarrier = new Map(
    policies.map((policy) => [`${policy.dealId}:${policy.carrierId}`, policy]),
  );
  const quotesByLogId = new Map(
    quotes.filter((quote) => quote.quoteAttemptLogId).map((quote) => [quote.quoteAttemptLogId!, quote]),
  );
  const usedQuoteIds = new Set<string>();

  const fromLogs = attempts.map((attempt) => {
    const quote = quotesByLogId.get(attempt.id);
    if (quote) usedQuoteIds.add(quote.id);
    const merged: TrackingAttemptInput = quote
      ? {
          ...attempt,
          quoteId: quote.id,
          premium: attempt.premium ?? quote.premium,
          quoteNumber: attempt.quoteNumber ?? quote.quoteNumber,
          bindable: attempt.bindable || quote.bindable,
          lostReason: attempt.lostReason ?? quote.lostReason ?? null,
          coverageA: attempt.coverageA ?? quote.coverageA ?? null,
          aopDeductible: attempt.aopDeductible ?? quote.aopDeductible ?? null,
          hurricaneDeductible: attempt.hurricaneDeductible ?? quote.hurricaneDeductible ?? null,
          coverageGaps: attempt.coverageGaps?.length ? attempt.coverageGaps : (quote.coverageGaps ?? []),
          notes: attempt.notes ?? quote.notes ?? attempt.why,
          contactId: attempt.contactId ?? quote.contactId ?? null,
          accountId: attempt.accountId ?? quote.accountId ?? null,
          email: attempt.email ?? quote.email ?? null,
          phone: attempt.phone ?? quote.phone ?? null,
        }
      : attempt;
    return attemptToRow(merged, policyByDealCarrier.get(`${attempt.dealId}:${attempt.carrierId}`));
  });

  const orphans = quotes
    .filter((quote) => !usedQuoteIds.has(quote.id))
    .map((quote) => {
      const policy = policyByDealCarrier.get(`${quote.dealId}:${quote.carrierId}`);
      return {
        id: quote.id,
        dealId: quote.dealId,
        dealTitle: quote.dealTitle,
        dealStage: quote.dealStage,
        carrierId: quote.carrierId,
        carrierName: quote.carrierName,
        line: quote.line,
        status: trackingStatus(quote.bindable || policy ? "quoted" : "quoted", Boolean(policy)),
        premium: parsePremium(quote.premium),
        quoteNumber: quote.quoteNumber,
        attemptedAt: quote.createdAt,
        bindable: quote.bindable,
        appetiteLogId: quote.quoteAttemptLogId,
        quoteId: quote.id,
        policyId: policy?.policyId ?? null,
        why: quote.notes,
        cheapestQuotedRank: null,
        lostReason: quote.lostReason ?? null,
        coverageA: quote.coverageA ?? null,
        aopDeductible: quote.aopDeductible ?? null,
        hurricaneDeductible: quote.hurricaneDeductible ?? null,
        coverageGaps: quote.coverageGaps ?? [],
        notes: quote.notes,
        pdfDocumentId: null,
        pdfFilename: null,
        ...partyFrom(quote),
      } satisfies TrackingRow;
    });

  return assignCheapestQuotedRanksByDeal([...fromLogs, ...orphans]);
}

export function assignCheapestQuotedRanksByDeal(rows: TrackingRow[]): TrackingRow[] {
  const byDeal = new Map<string, TrackingRow[]>();
  for (const row of rows) {
    const list = byDeal.get(row.dealId) ?? [];
    list.push(row);
    byDeal.set(row.dealId, list);
  }

  const ranked: TrackingRow[] = [];
  for (const list of byDeal.values()) {
    ranked.push(...assignCheapestQuotedRanks(list));
  }
  return ranked;
}

export function groupTrackingShops(rows: TrackingRow[]): TrackingShop[] {
  const byDeal = new Map<string, TrackingRow[]>();
  for (const row of rows) {
    const list = byDeal.get(row.dealId) ?? [];
    list.push(row);
    byDeal.set(row.dealId, list);
  }

  const shops: TrackingShop[] = [];
  for (const list of byDeal.values()) {
    const sorted = [...list].sort((a, b) => {
      const rankA = a.cheapestQuotedRank ?? 999;
      const rankB = b.cheapestQuotedRank ?? 999;
      if (rankA !== rankB) return rankA - rankB;
      return b.attemptedAt.getTime() - a.attemptedAt.getTime();
    });
    const cheapestQuoted =
      sorted.find((row) => row.cheapestQuotedRank === 1) ??
      sorted.find((row) => row.status === "quoted" || row.status === "bound") ??
      null;
    shops.push({
      dealId: sorted[0].dealId,
      dealTitle: sorted[0].dealTitle,
      dealStage: sorted[0].dealStage,
      line: sorted[0].line,
      rows: sorted,
      quotedCount: sorted.filter((row) => row.status === "quoted").length,
      declinedCount: sorted.filter((row) => row.status === "declined").length,
      skipCount: sorted.filter((row) => row.status === "skip").length,
      boundCount: sorted.filter((row) => row.status === "bound").length,
      cheapestQuoted,
    });
  }

  return shops.sort((a, b) => a.dealTitle.localeCompare(b.dealTitle));
}

export function trackingStatusLabel(status: TrackingStatus): string {
  return status;
}

export function cheapestQuotedSummary(shop: TrackingShop): string {
  if (!shop.cheapestQuoted || shop.cheapestQuoted.premium == null) {
    return "No quoted premium to rank";
  }
  return `${shop.cheapestQuoted.carrierName} ${formatMoney(shop.cheapestQuoted.premium)}`;
}
