import {
  excludedCarrierIdsFromLogs,
  isExcludedMarketWhy,
  isExplicitMarketActionText,
} from "@/lib/deals/manual-markets";
import { shopLineFromLob } from "@/lib/deals/shop-flow";
import { isShopLine } from "@/lib/domain";

/** Stored on quotes.notes and the attempt log. Not a portal pull. */
export const MANUAL_QUOTE_NOTE = "Manual quote recorded. No portal pull.";

export type ManualQuoteMarketLog = {
  carrierId: string;
  why?: string | null;
  lineOfBusiness?: string | null;
  carrierName?: string | null;
};

/**
 * Carriers already on this line's Markets (shop, shop list, or manual add).
 * Excluded carriers stay off the premium form.
 */
export function marketCarriersForManualQuote(
  logs: readonly ManualQuoteMarketLog[],
  line?: string | null,
): { id: string; name: string }[] {
  const wanted = isShopLine(line) ? line : null;
  const excluded = new Set(
    excludedCarrierIdsFromLogs(
      logs.map((log) => ({ carrierId: log.carrierId, why: log.why })),
    ),
  );
  const seen = new Map<string, string>();
  for (const log of logs) {
    const id = log.carrierId?.trim();
    if (!id || excluded.has(id)) continue;
    if (!isExplicitMarketActionText(log.why) || isExcludedMarketWhy(log.why)) continue;
    if (wanted) {
      const logLine = shopLineFromLob(log.lineOfBusiness);
      if (logLine && logLine !== wanted) continue;
    }
    if (!seen.has(id)) seen.set(id, (log.carrierName ?? "").trim() || "Carrier");
  }
  return [...seen.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}

export type ManualQuoteExisting = {
  id: string;
  shopLine?: string | null;
  stub?: boolean | null;
  notes?: string | null;
  quoteRunId?: string | null;
  quoteAttemptLogId?: string | null;
};

/**
 * Same carrier and shop line only. Other quotes stay untouched.
 * A hidden stub on this line is filled in place so we do not add a second row.
 */
export function manualQuoteTarget(
  rows: readonly ManualQuoteExisting[],
  shopLine: string,
): ManualQuoteExisting | null {
  const onLine = rows.filter((row) => row.shopLine === shopLine);
  return onLine.find((row) => !row.stub) ?? onLine[0] ?? null;
}

export type ManualQuoteWrite = {
  premium: string;
  stub: false;
  shopLine: string;
  bindable: boolean;
  riskOutcome: string;
  nextStep: string;
  quoteAttemptLogId: string;
  quoteRunId?: string;
  notes?: string;
};

/**
 * Fields written on save. Existing notes, quote number, coverages, and run id stay.
 * This never describes a delete.
 */
export function manualQuoteWrite(input: {
  existing: ManualQuoteExisting | null;
  premium: string;
  shopLine: string;
  quoteRunId: string;
  attemptLogId: string;
  riskOutcome: string;
  nextStep: string;
  bindable: boolean;
}): ManualQuoteWrite {
  const write: ManualQuoteWrite = {
    premium: input.premium,
    stub: false,
    shopLine: input.existing?.shopLine || input.shopLine,
    bindable: input.bindable,
    riskOutcome: input.riskOutcome,
    nextStep: input.nextStep,
    quoteAttemptLogId: input.existing?.quoteAttemptLogId || input.attemptLogId,
  };
  if (!input.existing?.quoteRunId) write.quoteRunId = input.quoteRunId;
  if (!input.existing?.notes?.trim()) write.notes = MANUAL_QUOTE_NOTE;
  return write;
}

/** Positive dollar amount for a recorded premium. Empty or zero is not a quote. */
export function parseManualQuotePremium(raw: string | null | undefined): string | null {
  const cleaned = String(raw ?? "").replace(/[$,\s]/g, "").trim();
  if (!cleaned) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount.toFixed(2);
}
