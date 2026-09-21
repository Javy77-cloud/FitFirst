import { isShopLine, SHOP_LINE_TO_LOB } from "@/lib/domain";
import { hasShopMarketAction } from "@/lib/deals/manual-markets";
import { quoteMatchesShopLine } from "@/lib/deals/shop-flow";

/**
 * Risk Profile confirm on an open shop goes to Markets until this line has
 * carriers or quote rows. A sibling line's unlock must not skip Markets.
 * Binding (Bound → Policy issued) is the only path that may open Quotes
 * before a shop, so the declaration mint prompt can show there.
 */
export function lineAlreadyShopped(input: {
  line: string;
  logs?: readonly { id?: string; lineOfBusiness?: string | null; why?: string | null }[];
  quotes?: readonly {
    stub?: boolean | null;
    shopLine?: string | null;
    notes?: string | null;
    quoteAttemptLogId?: string | null;
  }[];
  requestCarrierIds?: readonly string[] | null;
}): boolean {
  if ((input.requestCarrierIds ?? []).some((id) => String(id ?? "").trim())) return true;
  if (!isShopLine(input.line)) return false;
  const line = input.line;
  const logs = input.logs ?? [];
  const wantedLob = SHOP_LINE_TO_LOB[line];
  const lineLogs = logs.filter((log) => (log.lineOfBusiness ?? "").trim().toUpperCase() === wantedLob);
  const lineQuotes = (input.quotes ?? []).filter((quote) =>
    quoteMatchesShopLine(
      {
        shopLine: quote.shopLine,
        notes: quote.notes,
        quoteAttemptLogId: quote.quoteAttemptLogId,
        logs: logs
          .filter((log) => log.id)
          .map((log) => ({ id: log.id as string, lineOfBusiness: log.lineOfBusiness })),
      },
      line,
      { multiLine: true },
    ),
  );
  if (lineQuotes.some((quote) => quote.stub === false)) return true;
  return hasShopMarketAction(lineLogs, lineQuotes);
}

export function riskConfirmTab(input: { shopped: boolean; binding: boolean }): "markets" | "quotes" {
  if (input.binding || input.shopped) return "quotes";
  return "markets";
}
