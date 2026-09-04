import {
  APPETITE_CAPTURE_RESULTS,
  QUOTE_RESULTS,
  QUOTING_FORMS,
  type AppetiteCaptureResult,
  type QuoteAttemptResult,
  type QuotingFormId,
  type ShopLine,
} from "@/lib/domain";

export function quotingFormById(id: string) {
  return QUOTING_FORMS.find((form) => form.id === id) ?? null;
}

export function isQuotingFormId(id: string): id is QuotingFormId {
  return QUOTING_FORMS.some((form) => form.id === id);
}

/** HO3 also prepares Auto + commercial worksheets so the desk does not start those from scratch. */
export function companionLines(formId: string): ShopLine[] {
  if (formId === "HO3") return ["auto", "general_liability", "workers_comp"];
  return [];
}

export function sheetsToPrepare(formId: string): ShopLine[] {
  const form = quotingFormById(formId);
  if (!form) return ["home"];
  const lines = new Set<ShopLine>([form.shopLine, ...companionLines(formId)]);
  return Array.from(lines);
}

export function canUnlockQuoting(input: { reviewed: boolean; sure: boolean }): boolean {
  return Boolean(input.reviewed && input.sure);
}

export function isAppetiteCaptureResult(value: string): value is AppetiteCaptureResult {
  return (APPETITE_CAPTURE_RESULTS as readonly string[]).includes(value);
}

/** `maybe` stays on the internal log and does not feed filter-first matching. */
export function isMatchPriorResult(value: string): value is QuoteAttemptResult {
  return (QUOTE_RESULTS as readonly string[]).includes(value);
}

export function quotingUnlockedForDeal(deal: {
  quotingUnlocked?: boolean | null;
  pipelineStage?: string | null;
}): boolean {
  if (deal.quotingUnlocked) return true;
  return deal.pipelineStage === "bound" || deal.pipelineStage === "closed_won";
}
