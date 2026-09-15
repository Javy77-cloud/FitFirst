import { EXCLUDE_MARKET_MARKER, isExplicitMarketActionText } from "@/lib/deals/manual-markets";
import { quoteMatchesShopLine } from "@/lib/deals/shop-flow";
import { SHOP_LINE_TO_LOB, isShopLine, type ShopLine } from "@/lib/domain";

export const MISSING_QUOTE_REASONS = [
  "not_shopped",
  "pending",
  "timeout",
  "portal_error",
  "not_appointed",
  "skip",
  "hard_decline",
] as const;
export type MissingQuoteReason = (typeof MISSING_QUOTE_REASONS)[number];

export type MissingQuoteGap = {
  carrierId?: string;
  carrierName: string;
  reason: MissingQuoteReason;
  why: string;
};

export type LineQuoteCompleteness = {
  line: ShopLine;
  shopped: boolean;
  complete: boolean;
  expected: number;
  retrieved: number;
  missing: MissingQuoteGap[];
  summary: string;
};

const TERMINAL_RESULTS = new Set([
  "quoted",
  "declined",
  "floor_only",
  "takeout_only",
  "portal_closed",
  "no_market",
]);

export function classifyShopGap(
  why: string | null | undefined,
  result: string | null | undefined,
): { reason: MissingQuoteReason; why: string } {
  const blob = `${result ?? ""} ${why ?? ""}`.toLowerCase();
  if (/timeout|timed out|time[-\s]?out/.test(blob)) {
    return { reason: "timeout", why: "Portal timed out" };
  }
  if (/password|sso|system error|portal error|couldn.?t finish|login expired|agent lock/.test(blob)) {
    return { reason: "portal_error", why: "Portal error" };
  }
  if (/not appointed|unappointed|no appointment/.test(blob)) {
    return { reason: "not_appointed", why: "Not appointed" };
  }
  if (/skip-?decline|\bskipped\b|quote-gate skip/.test(blob)) {
    return { reason: "skip", why: "Hard decline / skip" };
  }
  if (result === "declined" || /hard no|uw decline|\bdeclined\b/.test(blob)) {
    return { reason: "hard_decline", why: "Carrier declined" };
  }
  return { reason: "pending", why: "Carrier still pending" };
}

export function isTerminalShopResult(result: string | null | undefined): boolean {
  return TERMINAL_RESULTS.has((result ?? "").trim().toLowerCase());
}

export function lineQuoteCompleteness(input: {
  line: ShopLine;
  logs: readonly {
    id: string;
    carrierId: string;
    lineOfBusiness?: string | null;
    result?: string | null;
    why?: string | null;
    attemptedAt?: Date | string | null;
  }[];
  quotes: readonly {
    carrierId: string;
    stub?: boolean | null;
    shopLine?: string | null;
    quoteAttemptLogId?: string | null;
    notes?: string | null;
  }[];
  carriers?: readonly { id: string; name: string }[];
}): LineQuoteCompleteness {
  const nameById = new Map((input.carriers ?? []).map((row) => [row.id, row.name]));
  const lineLogs = input.logs.filter((log) => {
    if ((log.why ?? "").includes(EXCLUDE_MARKET_MARKER)) return false;
    const lob = (log.lineOfBusiness ?? "").toUpperCase();
    if (lob && lob === SHOP_LINE_TO_LOB[input.line]) return true;
    return quoteMatchesShopLine(
      { quoteAttemptLogId: log.id, notes: log.why, logs: input.logs, shopLine: null },
      input.line,
      { multiLine: true },
    );
  });
  const shopped =
    lineLogs.some((log) => isExplicitMarketActionText(log.why)) ||
    lineQuotes.some((quote) => isExplicitMarketActionText(quote.notes));
  const shopLogs = lineLogs.filter((log) => isExplicitMarketActionText(log.why));
  const lineQuotes = input.quotes.filter(
    (quote) =>
      !quote.stub &&
      quoteMatchesShopLine(
        {
          shopLine: quote.shopLine,
          quoteAttemptLogId: quote.quoteAttemptLogId,
          notes: quote.notes,
          logs: input.logs,
        },
        input.line,
        { multiLine: true, isPrimaryLine: false },
      ),
  );

  if (!shopped) {
    if (lineQuotes.length > 0) {
      return {
        line: input.line,
        shopped: false,
        complete: true,
        expected: lineQuotes.length,
        retrieved: lineQuotes.length,
        missing: [],
        summary: `${lineQuotes.length} quote${lineQuotes.length === 1 ? "" : "s"} in`,
      };
    }
    return {
      line: input.line,
      shopped: false,
      complete: false,
      expected: 0,
      retrieved: 0,
      missing: [
        {
          carrierName: "This product",
          reason: "not_shopped",
          why: "Markets not run for this line yet",
        },
      ],
      summary: "Missing quotes — Markets not run for this line yet",
    };
  }

  const latestByCarrier = new Map<string, (typeof shopLogs)[number]>();
  const sorted = [...shopLogs].sort((a, b) => {
    const ta = a.attemptedAt ? new Date(a.attemptedAt).getTime() : 0;
    const tb = b.attemptedAt ? new Date(b.attemptedAt).getTime() : 0;
    return ta - tb;
  });
  for (const log of sorted) latestByCarrier.set(log.carrierId, log);

  const quotedCarrierIds = new Set(lineQuotes.map((quote) => quote.carrierId));
  const missing: MissingQuoteGap[] = [];
  for (const [carrierId, log] of latestByCarrier) {
    if (quotedCarrierIds.has(carrierId)) continue;
    if (isTerminalShopResult(log.result)) continue;
    const gap = classifyShopGap(log.why, log.result);
    if (gap.reason === "hard_decline" || gap.reason === "skip") continue;
    missing.push({
      carrierId,
      carrierName: nameById.get(carrierId) ?? "Carrier",
      reason: gap.reason,
      why: gap.why,
    });
  }

  const expected = latestByCarrier.size;
  const retrieved = expected - missing.length;
  const complete = missing.length === 0 && (expected > 0 || lineQuotes.length > 0);
  const summary = complete
    ? `${lineQuotes.length} quote${lineQuotes.length === 1 ? "" : "s"} in`
    : `Missing quotes — ${missing.map((row) => `${row.carrierName} (${row.why})`).join("; ")}`;

  return {
    line: input.line,
    shopped: true,
    complete,
    expected,
    retrieved,
    missing,
    summary,
  };
}

export function packageQuotesComplete(
  lines: readonly ShopLine[],
  byLine: Partial<Record<string, LineQuoteCompleteness>>,
): boolean {
  if (!lines.length) return false;
  return lines.every((line) => byLine[line]?.complete);
}

export function shopLineForUnknown(value: string | null | undefined): ShopLine | null {
  return isShopLine(value) ? value : null;
}
