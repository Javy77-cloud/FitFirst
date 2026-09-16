import {
  dealProductDef,
  isDealProductId,
  parseDealProduct,
  type DealProductId,
} from "@/lib/deals/deal-products";
import { humanizeDealStage } from "@/lib/deals/package-lines";
import { resolveDealStampStage, type DealStampStage } from "@/lib/deals/status-stamp";

/** Locked per-product pipeline — product chip owns this, tabs are workspaces. */
export const PRODUCT_STAGE_ORDER = [
  "gathering",
  "markets",
  "quote_review",
  "quote_sent",
  "bound",
  "policy_issued",
  "closed_won",
] as const;
export type ProductStageSlug = (typeof PRODUCT_STAGE_ORDER)[number] | "closed_lost";

export const PRODUCT_STAGE_LABELS: Record<string, string> = {
  gathering: "Gathering",
  markets: "Markets",
  quote_review: "Quote review",
  quote_sent: "Quote sent",
  bound: "Bound",
  policy_issued: "Policy issued",
  closed_won: "Closed won",
  closed_lost: "Closed lost",
};

/** Old slugs still in Neon / shop_flow JSON. */
export const PRODUCT_STAGE_ALIASES: Record<string, string> = {
  gather: "gathering",
  gather_info: "gathering",
  shopping: "gathering",
  quotes: "markets",
  meet_quotes: "markets",
  quoting: "markets",
  review: "quote_review",
  comparing: "quote_review",
  pending_inspection: "bound",
  lost: "closed_lost",
};

export const INSPECTION_STATUSES = ["none", "before_bind", "carrier_post_bind"] as const;
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
  none: "No inspection",
  before_bind: "Inspection before bind",
  carrier_post_bind: "Carrier post-bind inspection",
};

/** Stages that stamp the product and must name the quote(s) first. */
export const LATE_PRODUCT_STAGES = [
  "quote_sent",
  "bound",
  "policy_issued",
  "closed_won",
] as const;
export type LateProductStage = (typeof LATE_PRODUCT_STAGES)[number];

/** Board / list cannot move into these — late changes only from Quotes. */
export const BOARD_NOOP_STAGES = [
  "quote_sent",
  "bound",
  "policy_issued",
  "closed_won",
  "closed_lost",
] as const;

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

export type DealProductMintStatus = "creating" | "unpublished" | "published";

export type DealProductStageState = {
  stage: string;
  selectedQuoteIds: string[];
  lostReason?: string | null;
  policyId?: string | null;
  mintStatus?: DealProductMintStatus | null;
  inspectionStatus?: InspectionStatus;
  escrowNote?: string | null;
};

export type DealProductStages = Partial<Record<string, DealProductStageState>>;

const LATE_SET = new Set<string>(LATE_PRODUCT_STAGES);
const BOARD_NOOP_SET = new Set<string>(BOARD_NOOP_STAGES);
const INSPECTION_SET = new Set<string>(INSPECTION_STATUSES);

export function normalizeStageSlug(stage?: string | null): string {
  return (stage ?? "")
    .trim()
    .toLowerCase()
    .replace(/[/·]+/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Read old `review` as `quote_review`, `gather` as `gathering`, etc. */
export function canonicalizeProductStage(stage?: string | null): string {
  const key = normalizeStageSlug(stage);
  if (!key) return "gathering";
  return PRODUCT_STAGE_ALIASES[key] ?? key;
}

export function isInspectionStatus(value: string | null | undefined): value is InspectionStatus {
  return Boolean(value && INSPECTION_SET.has(value));
}

export function parseInspectionStatus(value: unknown): InspectionStatus {
  return isInspectionStatus(typeof value === "string" ? value : "") ? value : "none";
}

export function isLateProductStage(stage?: string | null): stage is LateProductStage {
  return LATE_SET.has(canonicalizeProductStage(stage));
}

export function isBoardNoopStage(stage?: string | null): boolean {
  return BOARD_NOOP_SET.has(canonicalizeProductStage(stage));
}

export function productStageRank(stage?: string | null): number {
  const key = canonicalizeProductStage(stage);
  if (key === "closed_lost") return 99;
  const idx = (PRODUCT_STAGE_ORDER as readonly string[]).indexOf(key);
  return idx < 0 ? 0 : idx;
}

/** Auto-advance only moves forward. Never pull Quote sent back to Markets. */
export function shouldAutoAdvanceStage(current?: string | null, next?: string | null): boolean {
  const from = canonicalizeProductStage(current);
  const to = canonicalizeProductStage(next);
  if (from === "closed_lost" || from === "closed_won") return false;
  return productStageRank(to) > productStageRank(from);
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
    const row = value as {
      stage?: unknown;
      selectedQuoteIds?: unknown;
      lostReason?: unknown;
      policyId?: unknown;
      mintStatus?: unknown;
      inspectionStatus?: unknown;
      escrowNote?: unknown;
    };
    const rawStage = typeof row.stage === "string" ? normalizeStageSlug(row.stage) : "";
    const selectedQuoteIds = Array.isArray(row.selectedQuoteIds)
      ? row.selectedQuoteIds.map((id) => String(id ?? "").trim()).filter(Boolean)
      : [];
    const lostReason =
      typeof row.lostReason === "string" && row.lostReason.trim() ? row.lostReason.trim() : null;
    const policyId =
      typeof row.policyId === "string" && row.policyId.trim() ? row.policyId.trim() : null;
    const mintStatus =
      row.mintStatus === "creating" || row.mintStatus === "unpublished" || row.mintStatus === "published"
        ? row.mintStatus
        : null;
    const inspectionStatus = parseInspectionStatus(row.inspectionStatus);
    const escrowNote =
      typeof row.escrowNote === "string" && row.escrowNote.trim() ? row.escrowNote.trim() : null;
    if (
      !rawStage &&
      !selectedQuoteIds.length &&
      !lostReason &&
      !policyId &&
      !mintStatus &&
      inspectionStatus === "none" &&
      !escrowNote
    ) {
      continue;
    }
    const stage = canonicalizeProductStage(rawStage || "gathering");
    out[key] = {
      stage,
      selectedQuoteIds,
      lostReason,
      policyId,
      mintStatus,
      inspectionStatus:
        inspectionStatus === "none" && rawStage === "pending_inspection"
          ? "before_bind"
          : inspectionStatus,
      escrowNote,
    };
  }
  return out;
}

function stageWithoutLeftoverQuoteSent(stage: string, selectedQuoteIds: readonly string[]): string {
  const canonical = canonicalizeProductStage(stage);
  if (isLateProductStage(canonical) && selectedQuoteIds.filter(Boolean).length === 0) {
    return "quote_review";
  }
  return canonical;
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
      stage: stageWithoutLeftoverQuoteSent(stored.stage || fallbackStage || "gathering", selectedQuoteIds),
      selectedQuoteIds,
      lostReason: stored.lostReason ?? null,
      policyId: stored.policyId ?? null,
      mintStatus: stored.mintStatus ?? null,
      inspectionStatus: stored.inspectionStatus ?? "none",
      escrowNote: stored.escrowNote ?? null,
    };
  }
  const selectedQuoteIds: string[] = [];
  return {
    stage: stageWithoutLeftoverQuoteSent(fallbackStage || "gathering", selectedQuoteIds),
    selectedQuoteIds,
    lostReason: null,
    policyId: null,
    mintStatus: null,
    inspectionStatus: normalizeStageSlug(fallbackStage) === "pending_inspection" ? "before_bind" : "none",
    escrowNote: null,
  };
}

export function setProductStage(
  stages: DealProductStages | null | undefined,
  product: DealProductId,
  patch: Partial<DealProductStageState>,
): DealProductStages {
  const current = productStageFor(stages, product);
  const next: DealProductStageState = {
    stage:
      patch.stage != null ? canonicalizeProductStage(patch.stage) || current.stage : current.stage,
    selectedQuoteIds: patch.selectedQuoteIds ?? current.selectedQuoteIds,
    lostReason: patch.lostReason === undefined ? current.lostReason : patch.lostReason,
    policyId: patch.policyId === undefined ? current.policyId : patch.policyId,
    mintStatus: patch.mintStatus === undefined ? current.mintStatus : patch.mintStatus,
    inspectionStatus:
      patch.inspectionStatus === undefined
        ? current.inspectionStatus ?? "none"
        : parseInspectionStatus(patch.inspectionStatus),
    escrowNote: patch.escrowNote === undefined ? current.escrowNote ?? null : patch.escrowNote,
  };
  if (normalizeStageSlug(next.stage) !== "closed_lost") {
    next.lostReason = next.lostReason ?? null;
  }
  if (isLateProductStage(next.stage) && next.selectedQuoteIds.filter(Boolean).length === 0) {
    next.stage = "quote_review";
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
  gathering: "Gathering",
  markets: "Markets",
  quote_review: "Quote review",
  quote_sent: "Quote sent",
  bound: "Bound",
  policy_issued: "Policy issued",
  closed_won: "Closed won",
  closed_lost: "Closed lost",
  pending_inspection: "Bound",
};

/** Chip stage — real shopping step, not a vague Review slug. */
export function productChipStageLabel(stage?: string | null): string | null {
  const key = canonicalizeProductStage(stage);
  if (!key || key === "gathering") return null;
  return CHIP_STAGE_LABELS[key] ?? PRODUCT_STAGE_LABELS[key] ?? humanizeDealStage(key);
}

/** Hide leftover Quote sent / Bound chip text when no quote is selected. */
export function productChipStageLabelForState(input: {
  stage?: string | null;
  selectedQuoteIds?: readonly string[] | null;
  liveQuoteIds?: readonly string[] | null;
}): string | null {
  if (lateStageNeedsQuoteSelection(input)) return productChipStageLabel("quote_review");
  return productChipStageLabel(input.stage);
}

/** Header / chip stage to show — leftover Quote sent without a pick falls back to Quote review. */
export function displayProductStage(input: {
  stage?: string | null;
  selectedQuoteIds?: readonly string[] | null;
  fallback?: string | null;
  liveQuoteIds?: readonly string[] | null;
}): string {
  if (lateStageNeedsQuoteSelection(input)) return "quote_review";
  return canonicalizeProductStage(input.stage || input.fallback);
}

export function productChipBound(stage?: string | null): boolean {
  const key = canonicalizeProductStage(stage);
  return key === "bound" || key === "policy_issued" || key === "closed_won";
}

/** Selected carrier row — same words as the stamp / header stage. */
export const SELECTED_QUOTE_STAGE_LABELS: Record<string, string> = {
  quote_sent: "Quote sent",
  bound: "Bound",
  policy_issued: "Policy issued",
  pending_inspection: "Pending inspection",
  closed_won: "Closed won",
};

export function selectedQuoteRowLabel(stage?: string | null): string | null {
  const key = normalizeStageSlug(stage);
  return SELECTED_QUOTE_STAGE_LABELS[key] ?? SELECTED_QUOTE_STAGE_LABELS[canonicalizeProductStage(stage)] ?? null;
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
