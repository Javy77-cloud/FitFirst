import {
  dealProductDef,
  isDealProductId,
  parseDealProduct,
  type DealProductId,
} from "@/lib/deals/deal-products";
import { humanizeDealStage } from "@/lib/deals/package-lines";
import { resolveDealStampStage, type DealStampStage } from "@/lib/deals/status-stamp";

/** Stages that stamp the product and must name the quote(s) first. */
export const LATE_PRODUCT_STAGES = [
  "quote_sent",
  "bound",
  "pending_inspection",
  "closed_won",
] as const;
export type LateProductStage = (typeof LATE_PRODUCT_STAGES)[number];

/** Captain closed-lost reasons — product-level, not a carrier decline. */
export const PRODUCT_LOST_REASONS = [
  "current_coverage_better",
  "no_better_offer",
  "price",
  "timing",
  "no_response",
  "bound_elsewhere",
  "other",
] as const;
export type ProductLostReason = (typeof PRODUCT_LOST_REASONS)[number];

export const PRODUCT_LOST_REASON_LABELS: Record<ProductLostReason, string> = {
  current_coverage_better: "Current coverage better",
  no_better_offer: "No better offer",
  price: "Premium too high",
  timing: "Timing / not ready",
  no_response: "No response",
  bound_elsewhere: "Bound with competitor",
  other: "Other",
};

export type DealProductStageState = {
  stage: string;
  selectedQuoteIds: string[];
  lostReason?: string | null;
};

export type DealProductStages = Partial<Record<string, DealProductStageState>>;

const LATE_SET = new Set<string>(LATE_PRODUCT_STAGES);

export function isLateProductStage(stage?: string | null): stage is LateProductStage {
  const key = normalizeStageSlug(stage);
  return Boolean(key && LATE_SET.has(key));
}

export function normalizeStageSlug(stage?: string | null): string {
  return (stage ?? "")
    .trim()
    .toLowerCase()
    .replace(/[/·]+/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function isProductLostReason(value: string | null | undefined): value is ProductLostReason {
  return Boolean(value && (PRODUCT_LOST_REASONS as readonly string[]).includes(value));
}

export function parseProductStages(raw: unknown): DealProductStages {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: DealProductStages = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isDealProductId(key) && !parseDealProduct(key)) continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const row = value as { stage?: unknown; selectedQuoteIds?: unknown; lostReason?: unknown };
    const rawStage = typeof row.stage === "string" ? normalizeStageSlug(row.stage) : "";
    const selectedQuoteIds = Array.isArray(row.selectedQuoteIds)
      ? row.selectedQuoteIds.map((id) => String(id ?? "").trim()).filter(Boolean)
      : [];
    const lostReason =
      typeof row.lostReason === "string" && row.lostReason.trim() ? row.lostReason.trim() : null;
    if (!rawStage && !selectedQuoteIds.length && !lostReason) continue;
    // Gloria leftover Quote sent / Bound with no pick is junk — persist as Quotes.
    const stage =
      isLateProductStage(rawStage) && selectedQuoteIds.length === 0 ? "quotes" : rawStage || "gather";
    out[key] = { stage, selectedQuoteIds, lostReason };
  }
  return out;
}

function stageWithoutLeftoverQuoteSent(stage: string, selectedQuoteIds: readonly string[]): string {
  if (isLateProductStage(stage) && selectedQuoteIds.filter(Boolean).length === 0) return "quotes";
  return stage || "gather";
}

export function productStageFor(
  stages: DealProductStages | null | undefined,
  product: DealProductId,
  fallbackStage?: string | null,
): DealProductStageState {
  const stored = stages?.[product];
  if (stored) {
    const selectedQuoteIds = stored.selectedQuoteIds ?? [];
    return {
      stage: stageWithoutLeftoverQuoteSent(
        stored.stage || normalizeStageSlug(fallbackStage) || "gather",
        selectedQuoteIds,
      ),
      selectedQuoteIds,
      lostReason: stored.lostReason ?? null,
    };
  }
  const selectedQuoteIds: string[] = [];
  return {
    stage: stageWithoutLeftoverQuoteSent(normalizeStageSlug(fallbackStage) || "gather", selectedQuoteIds),
    selectedQuoteIds,
    lostReason: null,
  };
}

export function setProductStage(
  stages: DealProductStages | null | undefined,
  product: DealProductId,
  patch: Partial<DealProductStageState>,
): DealProductStages {
  const current = productStageFor(stages, product);
  const next: DealProductStageState = {
    stage: patch.stage != null ? normalizeStageSlug(patch.stage) || current.stage : current.stage,
    selectedQuoteIds: patch.selectedQuoteIds ?? current.selectedQuoteIds,
    lostReason:
      patch.lostReason === undefined ? current.lostReason : patch.lostReason,
  };
  if (normalizeStageSlug(next.stage) !== "closed_lost") {
    next.lostReason = next.lostReason ?? null;
  }
  // Never persist Quote sent / Bound / Inspection / Closed won with an empty pick.
  if (isLateProductStage(next.stage) && next.selectedQuoteIds.filter(Boolean).length === 0) {
    next.stage = "quotes";
  }
  return { ...stages, [product]: next };
}

export function liveSelectedQuoteIds(
  selectedQuoteIds?: readonly string[] | null,
  liveQuoteIds?: readonly string[] | null,
): string[] {
  const selected = (selectedQuoteIds ?? []).map((id) => String(id ?? "").trim()).filter(Boolean);
  if (liveQuoteIds == null) return selected;
  const live = new Set((liveQuoteIds ?? []).map((id) => String(id ?? "").trim()).filter(Boolean));
  return selected.filter((id) => live.has(id));
}

export function lateStageNeedsQuoteSelection(input: {
  stage?: string | null;
  selectedQuoteIds?: readonly string[] | null;
  liveQuoteIds?: readonly string[] | null;
}): boolean {
  if (!isLateProductStage(input.stage)) return false;
  return liveSelectedQuoteIds(input.selectedQuoteIds, input.liveQuoteIds).length === 0;
}

export function selectedQuoteHighlightId(input: {
  selectedQuoteIds?: readonly string[] | null;
  boundQuoteId?: string | null;
  stage?: string | null;
}): string | null {
  const selected = (input.selectedQuoteIds ?? []).map((id) => id.trim()).filter(Boolean);
  if (selected[0]) return selected[0]!;
  if (input.boundQuoteId) return input.boundQuoteId;
  return null;
}

export function isSelectedQuote(
  quoteId: string,
  selectedQuoteIds?: readonly string[] | null,
): boolean {
  return (selectedQuoteIds ?? []).includes(quoteId);
}

/** Use the sheet form only when it belongs to this product (HO3 ≠ DP3 on a shared home sheet). */
export function sheetFormForProduct(
  product: DealProductId,
  sheetForm?: string | null,
): string | null {
  const form = (sheetForm ?? "").trim();
  if (!form) return null;
  if (product === "homeowners") return /^ho|^mho/i.test(form) ? form : null;
  if (product === "landlord") return /^dp/i.test(form) ? form : null;
  if (product === "renters") return /^ho4$/i.test(form) ? form : null;
  if (product === "auto" || product === "motorcycle") return /auto|pa|moto/i.test(form) ? form : null;
  if (product === "flood") return /flood/i.test(form) ? form : null;
  return form;
}

/** HO3 / DP3 / Auto / Flood — never cryptic PA / FLOT. */
export function productChipLabel(input: {
  product: DealProductId;
  quotingForm?: string | null;
  sheetForm?: string | null;
}): string {
  const def = dealProductDef(input.product);
  const raw = (input.sheetForm || input.quotingForm || "").trim();
  const scoped = sheetFormForProduct(input.product, raw);
  const form = (scoped || def.quotingForm || "").trim();
  if (input.product === "homeowners") {
    if (/^ho[3568]$/i.test(form) || /^mho$/i.test(form)) return form.toUpperCase();
    return form && form !== "Homeowners" ? form : "HO3";
  }
  if (input.product === "landlord") {
    if (/^dp[13]$/i.test(form)) return form.toUpperCase();
    return form && !/landlord/i.test(form) ? form : "DP3";
  }
  if (input.product === "renters") return /^ho4$/i.test(form) ? "HO4" : form || "HO4";
  if (input.product === "auto") {
    if (!form || /^pa$/i.test(form) || /^auto$/i.test(form) || /personal\s*auto/i.test(form)) {
      return "Auto";
    }
    return form;
  }
  if (input.product === "flood") return "Flood";
  return form || def.label;
}

const CHIP_STAGE_LABELS: Record<string, string> = {
  gather: "Gather info",
  gather_info: "Gather info",
  shopping: "Gather info",
  quotes: "Quotes",
  meet_quotes: "Quotes",
  quoting: "Quotes",
  review: "Quotes",
  markets: "Markets",
  quote_sent: "Quote sent",
  bound: "Bound",
  pending_inspection: "Inspection",
  closed_won: "Bound",
  closed_lost: "Lost",
  lost: "Lost",
};

/** Chip stage — real shopping step, not a vague Review slug. */
export function productChipStageLabel(stage?: string | null): string | null {
  const key = normalizeStageSlug(stage);
  if (!key || key === "gather" || key === "gather_info" || key === "shopping") return null;
  return CHIP_STAGE_LABELS[key] ?? humanizeDealStage(key);
}

/** Hide leftover Quote sent / Bound chip text when no quote is selected. */
export function productChipStageLabelForState(input: {
  stage?: string | null;
  selectedQuoteIds?: readonly string[] | null;
  liveQuoteIds?: readonly string[] | null;
}): string | null {
  if (lateStageNeedsQuoteSelection(input)) return productChipStageLabel("quotes");
  return productChipStageLabel(input.stage);
}

/** Header / chip stage to show — leftover Quote sent without a pick falls back to Quotes. */
export function displayProductStage(input: {
  stage?: string | null;
  selectedQuoteIds?: readonly string[] | null;
  fallback?: string | null;
  liveQuoteIds?: readonly string[] | null;
}): string {
  if (lateStageNeedsQuoteSelection(input)) return "quotes";
  return normalizeStageSlug(input.stage) || normalizeStageSlug(input.fallback) || "gather";
}

export function productChipBound(stage?: string | null): boolean {
  const key = normalizeStageSlug(stage);
  return key === "bound" || key === "closed_won";
}

/** Selected carrier row — same words as the stamp / header stage. */
export const SELECTED_QUOTE_STAGE_LABELS: Record<string, string> = {
  quote_sent: "Quote sent",
  bound: "Bound",
  pending_inspection: "Pending inspection",
  closed_won: "Closed won",
};

export function selectedQuoteRowLabel(stage?: string | null): string | null {
  const key = normalizeStageSlug(stage);
  return SELECTED_QUOTE_STAGE_LABELS[key] ?? null;
}

export function productStampStage(
  productState: DealProductStageState | null | undefined,
  fallbackStage?: string | null,
  boundAt?: Date | string | null,
  liveQuoteIds?: readonly string[] | null,
): DealStampStage | null {
  const selected = liveSelectedQuoteIds(productState?.selectedQuoteIds, liveQuoteIds);
  // Never stamp Quote sent / Bound / Inspection without a live selected quote
  // on this product — leftover deal Quote sent or boundAt is not enough.
  if (selected.length === 0) return null;
  const candidate = productState?.stage ?? fallbackStage;
  if (!isLateProductStage(candidate) && !boundAt) return null;
  return resolveDealStampStage(candidate, null, boundAt);
}

/**
 * Ready = this product has its quotes in — not “sheet has any cell”.
 * Shared home sheets used to mark HO3 + DP3 + Flood ready together.
 */
export function productReadyFromQuotes(input: {
  complete?: boolean | null;
  shopped?: boolean | null;
}): boolean {
  return Boolean(input.complete);
}
