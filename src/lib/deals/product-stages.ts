import {
  dealProductDef,
  dealProductSwitcherHref,
  inferDealProducts,
  isDealProductId,
  parseDealProduct,
  type DealProductId,
} from "@/lib/deals/deal-products";
import { humanizeDealStage } from "@/lib/deals/package-lines";
import {
  parseNoticeType,
  SEED_NOTICE_LABELS,
  SEED_NOTICE_TYPES,
  type NoticeType,
} from "@/lib/deals/notices";
import { resolveDealStampStage, type DealStampStage } from "@/lib/deals/status-stamp";
import type { AgentDealTab } from "@/lib/deals/tabs";

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

/** @deprecated Use SEED_NOTICE_TYPES — leftover Inspection dropdown. */
export const INSPECTION_STATUSES = SEED_NOTICE_TYPES;
export type InspectionStatus = NoticeType;

export const INSPECTION_STATUS_LABELS: Record<string, string> = {
  none: SEED_NOTICE_LABELS.none,
  before_bind: SEED_NOTICE_LABELS.inspection_before_bind,
  inspection_before_bind: SEED_NOTICE_LABELS.inspection_before_bind,
  carrier_post_bind: SEED_NOTICE_LABELS.check_mortgagee_payment,
  check_mortgagee_payment: SEED_NOTICE_LABELS.check_mortgagee_payment,
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
  /** Published confirm queue — this line is issued-done, not still shopping. */
  issuedDone?: boolean;
  /** Notice type slug. JSON key stays `inspectionStatus` for leftover rows. */
  inspectionStatus?: InspectionStatus;
  noticeType?: NoticeType;
  noticeTaskId?: string | null;
  escrowNote?: string | null;
  /** Latest working / complete-notes draft — not the only history. */
  noticeNote?: string | null;
  /** Logged notice notes (speak/type + complete). Notepad badge/log reads this. */
  noticeNotes?: NoticeNoteLogEntry[];
  /** Per-product pipeline-list notes (right-hand Notes column). */
  listNote?: string | null;
};

export type NoticeNoteLogEntry = {
  body: string;
  at: string;
  agent?: string | null;
};

export type DealProductStages = Partial<Record<string, DealProductStageState>>;

const LATE_SET = new Set<string>(LATE_PRODUCT_STAGES);
const BOARD_NOOP_SET = new Set<string>(BOARD_NOOP_STAGES);

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
  return Boolean(value && parseNoticeType(value));
}

export function parseInspectionStatus(value: unknown): InspectionStatus {
  return parseNoticeType(value);
}

export function isLateProductStage(stage?: string | null): stage is LateProductStage {
  return LATE_SET.has(canonicalizeProductStage(stage));
}

export function isBoardNoopStage(stage?: string | null): boolean {
  return BOARD_NOOP_SET.has(canonicalizeProductStage(stage));
}

/** Gathering / Markets / Quote review — list and board may move here (including rewind). */
export const EARLY_BOARD_STAGES = ["gathering", "markets", "quote_review"] as const;
const EARLY_BOARD_SET = new Set<string>(EARLY_BOARD_STAGES);

export function isEarlyBoardStage(stage?: string | null): boolean {
  return EARLY_BOARD_SET.has(canonicalizeProductStage(stage));
}

/**
 * Late / forward stages belong on Quotes, not the deals list or board.
 * Seeded late slugs always qualify. Custom stages at or after Quote sent
 * (or after Quote review when Quote sent is missing) do too.
 */
export function isQuotesOnlyBoardStage(
  stage?: string | null,
  boardStages?: ReadonlyArray<{ slug: string; sortOrder?: number }>,
): boolean {
  const key = canonicalizeProductStage(stage);
  if (!key) return false;
  if (isBoardNoopStage(key)) return true;
  if (isEarlyBoardStage(key)) return false;
  if (!boardStages?.length) return false;
  const ranked = boardStages.map((row, index) => ({
    key: canonicalizeProductStage(row.slug),
    order: typeof row.sortOrder === "number" ? row.sortOrder : index,
  }));
  const target = ranked.find((row) => row.key === key);
  if (!target) return false;
  const quoteSent = ranked.find((row) => row.key === "quote_sent");
  if (quoteSent) return target.order >= quoteSent.order;
  const quoteReview = ranked.find((row) => row.key === "quote_review");
  if (quoteReview) return target.order > quoteReview.order;
  return true;
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
      issuedDone?: unknown;
      inspectionStatus?: unknown;
      noticeType?: unknown;
      noticeTaskId?: unknown;
      escrowNote?: unknown;
      noticeNote?: unknown;
      noticeNotes?: unknown;
      listNote?: unknown;
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
    const issuedDone = row.issuedDone === true;
    const inspectionStatus = parseInspectionStatus(row.noticeType ?? row.inspectionStatus);
    const noticeTaskId =
      typeof row.noticeTaskId === "string" && row.noticeTaskId.trim() ? row.noticeTaskId.trim() : null;
    const escrowNote =
      typeof row.escrowNote === "string" && row.escrowNote.trim() ? row.escrowNote.trim() : null;
    const noticeNote =
      typeof row.noticeNote === "string" && row.noticeNote.trim() ? row.noticeNote.trim() : null;
    const noticeNotes = parseNoticeNoteLog(row.noticeNotes);
    const listNote =
      typeof row.listNote === "string" && row.listNote.trim() ? row.listNote.trim() : null;
    if (
      !rawStage &&
      !selectedQuoteIds.length &&
      !lostReason &&
      !policyId &&
      !mintStatus &&
      !issuedDone &&
      inspectionStatus === "none" &&
      !noticeTaskId &&
      !escrowNote &&
      !noticeNote &&
      !noticeNotes.length &&
      !listNote
    ) {
      continue;
    }
    const stage = canonicalizeProductStage(rawStage || "gathering");
    const explicitNotice = "noticeType" in row || "inspectionStatus" in row;
    const noticeType =
      inspectionStatus === "none" && rawStage === "pending_inspection" && !explicitNotice
        ? "inspection_before_bind"
        : inspectionStatus;
    out[key] = {
      stage,
      selectedQuoteIds,
      lostReason,
      policyId,
      mintStatus,
      issuedDone,
      inspectionStatus: noticeType,
      noticeType,
      noticeTaskId,
      escrowNote,
      noticeNote,
      noticeNotes,
      listNote,
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
    const noticeType = stored.noticeType ?? stored.inspectionStatus ?? "none";
    return {
      stage: stageWithoutLeftoverQuoteSent(stored.stage || fallbackStage || "gathering", selectedQuoteIds),
      selectedQuoteIds,
      lostReason: stored.lostReason ?? null,
      policyId: stored.policyId ?? null,
      mintStatus: stored.mintStatus ?? null,
      issuedDone: Boolean(stored.issuedDone),
      inspectionStatus: noticeType,
      noticeType,
      noticeTaskId: stored.noticeTaskId ?? null,
      escrowNote: stored.escrowNote ?? null,
      noticeNote: stored.noticeNote ?? null,
      noticeNotes: stored.noticeNotes ?? [],
      listNote: stored.listNote ?? null,
    };
  }
  const selectedQuoteIds: string[] = [];
  const leftoverNotice =
    normalizeStageSlug(fallbackStage) === "pending_inspection" ? "inspection_before_bind" : "none";
  return {
    stage: stageWithoutLeftoverQuoteSent(fallbackStage || "gathering", selectedQuoteIds),
    selectedQuoteIds,
    lostReason: null,
    policyId: null,
    mintStatus: null,
    issuedDone: false,
    inspectionStatus: leftoverNotice,
    noticeType: leftoverNotice,
    noticeTaskId: null,
    escrowNote: null,
    noticeNote: null,
    noticeNotes: [],
    listNote: null,
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
    issuedDone: patch.issuedDone === undefined ? Boolean(current.issuedDone) : Boolean(patch.issuedDone),
    inspectionStatus:
      patch.noticeType === undefined && patch.inspectionStatus === undefined
        ? current.noticeType ?? current.inspectionStatus ?? "none"
        : parseInspectionStatus(patch.noticeType ?? patch.inspectionStatus),
    noticeType:
      patch.noticeType === undefined && patch.inspectionStatus === undefined
        ? current.noticeType ?? current.inspectionStatus ?? "none"
        : parseInspectionStatus(patch.noticeType ?? patch.inspectionStatus),
    noticeTaskId: patch.noticeTaskId === undefined ? current.noticeTaskId ?? null : patch.noticeTaskId,
    escrowNote: patch.escrowNote === undefined ? current.escrowNote ?? null : patch.escrowNote,
    noticeNote: patch.noticeNote === undefined ? current.noticeNote ?? null : patch.noticeNote,
    noticeNotes: patch.noticeNotes === undefined ? current.noticeNotes ?? [] : patch.noticeNotes,
    listNote: patch.listNote === undefined ? current.listNote ?? null : patch.listNote,
  };
  if (normalizeStageSlug(next.stage) !== "closed_lost") {
    next.lostReason = next.lostReason ?? null;
  }
  if (isLateProductStage(next.stage) && next.selectedQuoteIds.filter(Boolean).length === 0) {
    next.stage = "quote_review";
  }
  return { ...stages, [product]: next };
}

/** Product whose visible notice is linked to this desk task. */
export function findProductNoticeForTask(
  stages: DealProductStages | null | undefined,
  taskId: string | null | undefined,
): { product: string; noticeType: NoticeType } | null {
  const id = (taskId ?? "").trim();
  if (!id) return null;
  for (const [product, state] of Object.entries(stages ?? {})) {
    if (state?.noticeTaskId !== id) continue;
    const noticeType = parseNoticeType(state.noticeType ?? state.inspectionStatus);
    if (noticeType === "none") continue;
    return { product, noticeType };
  }
  return null;
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

const PC_FORM_LEFTOVER = /^(ho[1-8]?|mho|dp[13]|pa|flood|homeowners|landlord)$/i;

/** Use the sheet form only when it belongs to this product (HO3 ≠ DP3 on a shared home sheet). */
export function sheetFormForProduct(
  product: DealProductId,
  sheetForm?: string | null,
): string | null {
  const form = (sheetForm ?? "").trim();
  if (!form) return null;
  const group = dealProductDef(product).group;
  if (group === "life" || group === "health") {
    return PC_FORM_LEFTOVER.test(form) ? null : form;
  }
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
  if (def.group === "life" || def.group === "health") {
    return scoped || def.label;
  }
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
  done: "Done",
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
  issuedDone?: boolean | null;
}): string | null {
  if (input.issuedDone) return productChipStageLabel("done");
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

export type ListProductStageChip = {
  product: DealProductId;
  label: string;
  stage: string;
  stageLabel: string;
  /** Deal + product + workspace tab this product still needs. Not a list filter. */
  href?: string;
};

const QUOTES_WORKSPACE_STAGES = new Set([
  "quote_review",
  "quote_sent",
  "bound",
  "policy_issued",
  "closed_won",
  "closed_lost",
]);

/** List chip click — open that product on the tab it still needs. */
export function workspaceTabForProductStage(
  stage?: string | null,
  detailsComplete?: boolean,
): AgentDealTab {
  const key = canonicalizeProductStage(stage);
  if (QUOTES_WORKSPACE_STAGES.has(key)) return "quotes";
  if (key === "markets") return "markets";
  return detailsComplete ? "documents" : "details";
}

export function listProductStageHref(input: {
  dealId: string;
  product: DealProductId;
  stage?: string | null;
  detailsComplete?: boolean;
}): string {
  return dealProductSwitcherHref({
    dealId: input.dealId,
    product: input.product,
    tab: workspaceTabForProductStage(input.stage, input.detailsComplete),
  });
}

export function attachListProductStageHrefs(
  chips: readonly ListProductStageChip[],
  input: {
    dealId: string;
    detailsCompleteByProduct?: Partial<Record<string, boolean>>;
  },
): ListProductStageChip[] {
  return chips.map((chip) => ({
    ...chip,
    href: listProductStageHref({
      dealId: input.dealId,
      product: chip.product,
      stage: chip.stage,
      detailsComplete: input.detailsCompleteByProduct?.[chip.product],
    }),
  }));
}

function productStagesFromShopFlow(shopFlow: unknown): DealProductStages {
  if (!shopFlow || typeof shopFlow !== "object" || Array.isArray(shopFlow)) return {};
  return parseProductStages((shopFlow as { productStages?: unknown }).productStages);
}

export function parseNoticeNoteLog(raw: unknown): NoticeNoteLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: NoticeNoteLogEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as { body?: unknown; at?: unknown; agent?: unknown };
    const body = typeof row.body === "string" ? row.body.trim() : "";
    if (!body) continue;
    const at = typeof row.at === "string" && row.at.trim() ? row.at.trim() : "";
    const agent = typeof row.agent === "string" && row.agent.trim() ? row.agent.trim() : null;
    out.push({ body, at, agent });
  }
  return out;
}

/** Badge / log — stored log, or the leftover single noticeNote. */
export function noticeNoteLog(
  state: Pick<DealProductStageState, "noticeNote" | "noticeNotes"> | null | undefined,
): NoticeNoteLogEntry[] {
  const logged = parseNoticeNoteLog(state?.noticeNotes);
  if (logged.length) return logged;
  const leftover = (state?.noticeNote ?? "").trim();
  if (!leftover) return [];
  return [{ body: leftover, at: "", agent: null }];
}

export function appendNoticeNoteLog(
  current: readonly NoticeNoteLogEntry[] | null | undefined,
  input: { body: string; at?: string; agent?: string | null },
): NoticeNoteLogEntry[] {
  const body = input.body.trim();
  if (!body) return [...(current ?? [])];
  const last = current?.[current.length - 1];
  if (last && last.body === body) return [...(current ?? [])];
  return [
    ...(current ?? []),
    {
      body,
      at: input.at?.trim() || new Date().toISOString(),
      agent: input.agent?.trim() || null,
    },
  ];
}

export type ListProductNote = {
  product: DealProductId;
  label: string;
  note: string;
};

type ProductNoteChip = Pick<ListProductNote, "product" | "label">;

export function isDealListNotesColumn(
  columnId: string,
  field?: { type?: string; label?: string } | null,
): boolean {
  if (columnId === "notes") return true;
  if (field?.type === "multi_line" && /notes/i.test(field.label ?? "")) return true;
  return columnId === "new_field" && (!field || /notes/i.test(field.label ?? "Notes"));
}

function escapeNoteLabel(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unwrapOwnProductLabel(note: string, label: string): string {
  const prefix = new RegExp(`^${escapeNoteLabel(label)}:\\s*`, "i");
  let out = note.trim();
  while (out && prefix.test(out)) {
    const next = out.replace(prefix, "").trim();
    if (next === out) break;
    out = next;
  }
  return out;
}

function productNoteLabelAliases(chip: ProductNoteChip): string[] {
  const def = dealProductDef(chip.product);
  return [chip.label, productChipLabel({ product: chip.product }), def.label, chip.product]
    .map((label) => label.trim())
    .filter(Boolean);
}

/**
 * Split a deal-level / first-row blob that was stored as joined
 * `HO3: …\\nAuto: …` notes. Leaves a plain single note untouched.
 */
export function splitConcatenatedProductListNotes(
  blob: string | null | undefined,
  chips: readonly ProductNoteChip[],
): Partial<Record<DealProductId, string>> | null {
  const text = (blob ?? "").replace(/\r\n/g, "\n").trim();
  if (!text || chips.length < 2) return null;

  const aliases = new Map<string, DealProductId>();
  for (const chip of chips) {
    for (const label of productNoteLabelAliases(chip)) {
      aliases.set(label.toLowerCase(), chip.product);
    }
  }
  const labels = [...aliases.keys()].sort((a, b) => b.length - a.length);
  if (labels.length < 2) return null;

  const prefix = new RegExp(`^(${labels.map(escapeNoteLabel).join("|")}):\\s*`, "i");
  const matched = new Set<DealProductId>();
  const sections: { product: DealProductId | null; lines: string[] }[] = [];
  let current: { product: DealProductId | null; lines: string[] } = { product: null, lines: [] };

  for (const line of text.split("\n")) {
    const match = line.match(prefix);
    const product = match ? aliases.get(match[1].toLowerCase()) : undefined;
    if (match && product) {
      if (current.product != null || current.lines.length) sections.push(current);
      current = { product, lines: [line.slice(match[0].length)] };
      matched.add(product);
      continue;
    }
    current.lines.push(line);
  }
  if (current.product != null || current.lines.length) sections.push(current);
  if (matched.size < 2) return null;

  const out: Partial<Record<DealProductId, string>> = {};
  for (const section of sections) {
    const body = section.lines.join("\n").trim();
    if (!body) continue;
    const product =
      section.product ??
      chips.find((chip) => !matched.has(chip.product))?.product ??
      chips[0]?.product;
    if (!product) continue;
    const cleaned = unwrapOwnProductLabel(body, chips.find((chip) => chip.product === product)?.label ?? "");
    out[product] = out[product] ? `${out[product]}\n${cleaned}` : cleaned;
  }
  return out;
}

function mergedSplitProductNotes(
  chips: readonly ProductNoteChip[],
  stages: DealProductStages,
  fallback: string,
): Partial<Record<DealProductId, string>> {
  const merged: Partial<Record<DealProductId, string>> = {};
  const sources = [
    fallback,
    ...chips.map((chip) => (stages[chip.product]?.listNote ?? "").trim()),
  ];
  for (const source of sources) {
    const split = splitConcatenatedProductListNotes(source, chips);
    if (!split) continue;
    for (const chip of chips) {
      const note = (split[chip.product] ?? "").trim();
      if (note && !merged[chip.product]) merged[chip.product] = note;
    }
  }
  return merged;
}

/** One list-notes field per product — 2 products → 2 sections, 3 → 3. */
export function listProductNotes(input: {
  shopProducts?: string[] | null;
  shopLines?: string[] | null;
  lineOfBusiness?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
  shopFlow?: unknown;
  fallbackNote?: string | null;
}): ListProductNote[] {
  const chips = listProductStageChips(input);
  const stages = productStagesFromShopFlow(input.shopFlow);
  const fallback = (input.fallbackNote ?? "").trim();
  const splitNotes = mergedSplitProductNotes(chips, stages, fallback);
  const fallbackIsConcat = Boolean(splitConcatenatedProductListNotes(fallback, chips));
  return chips.map((chip, index) => {
    const stored = (stages[chip.product]?.listNote ?? "").trim();
    const storedIsConcat = Boolean(splitConcatenatedProductListNotes(stored, chips));
    let note = "";
    if (stored && !storedIsConcat) {
      note = unwrapOwnProductLabel(stored, chip.label);
    } else if (splitNotes[chip.product]) {
      note = splitNotes[chip.product] ?? "";
    } else if (index === 0 && !fallbackIsConcat) {
      note = fallback;
    }
    return {
      product: chip.product,
      label: chip.label,
      note,
    };
  });
}

/** Persist one product note and split any leftover concatenated blob onto the other lines. */
export function syncProductListNotes(input: {
  shopProducts?: string[] | null;
  shopLines?: string[] | null;
  lineOfBusiness?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
  shopFlow?: unknown;
  fallbackNote?: string | null;
  product: DealProductId;
  note: string;
}): { productStages: DealProductStages; notes: ListProductNote[] } {
  const stages = productStagesFromShopFlow(input.shopFlow);
  const next = setProductStage(stages, input.product, { listNote: input.note.trim() || null });
  const notes = listProductNotes({
    ...input,
    shopFlow: { productStages: next },
  });
  let persisted = next;
  for (const row of notes) {
    const want = row.note.trim() || null;
    const existing = persisted[row.product];
    const current = (existing?.listNote ?? "").trim() || null;
    if (current === want) continue;
    if (!want && !existing) continue;
    persisted = setProductStage(persisted, row.product, { listNote: want });
  }
  return {
    productStages: persisted,
    notes: listProductNotes({
      ...input,
      shopFlow: { productStages: persisted },
      fallbackNote: null,
    }),
  };
}

export function joinProductListNotes(notes: readonly ListProductNote[]): string {
  const filled = notes.filter((row) => row.note.trim());
  if (!filled.length) return "";
  if (notes.length <= 1) return filled[0]?.note.trim() ?? "";
  return notes
    .map((row) => {
      const body = row.note.trim();
      return body ? `${row.label}: ${body}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

export function isHeatherCamirandDeal(deal: {
  title?: string | null;
  primaryNamedInsured?: string | null;
}): boolean {
  const blob = `${deal.title ?? ""} ${deal.primaryNamedInsured ?? ""}`.toLowerCase();
  if (/\bcameron\b/.test(blob)) return false;
  return /\bheather\b/.test(blob) && /\bcamirand\b/.test(blob);
}

const CAMIRAND_CLEAR_NOTICE_PRODUCTS = new Set(["homeowners", "auto"]);

/** Heather Camirand — drop leftover HO3 / Auto mini notices. Keep Flood. */
export function stripStaleCamirandProductNotices(stages: DealProductStages): DealProductStages {
  let changed = false;
  const next: DealProductStages = { ...stages };
  for (const product of CAMIRAND_CLEAR_NOTICE_PRODUCTS) {
    const current = next[product];
    if (!current) continue;
    const notice = parseNoticeType(current.noticeType ?? current.inspectionStatus);
    if (notice === "none" && !current.noticeTaskId) continue;
    next[product] = {
      ...current,
      inspectionStatus: "none",
      noticeType: "none",
      noticeTaskId: null,
    };
    changed = true;
  }
  return changed ? next : stages;
}

/** Always show a stage word on list/board chips, including Gathering. */
export function listProductStageLabel(stage?: string | null): string {
  const key = canonicalizeProductStage(stage);
  return CHIP_STAGE_LABELS[key] ?? PRODUCT_STAGE_LABELS[key] ?? humanizeDealStage(key) ?? "Gathering";
}

/** One chip per product (HO3 / DP3 / Auto / Flood…) with that product’s stage. */
export function listProductStageChips(input: {
  shopProducts?: string[] | null;
  shopLines?: string[] | null;
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
  shopFlow?: unknown;
  pipelineStage?: string | null;
}): ListProductStageChip[] {
  const products = inferDealProducts(input);
  const stages = productStagesFromShopFlow(input.shopFlow);
  return products.map((product) => {
    const state = productStageFor(stages, product, input.pipelineStage);
    const stage = displayProductStage({
      stage: state.stage,
      selectedQuoteIds: state.selectedQuoteIds,
      fallback: input.pipelineStage,
    });
    return {
      product,
      label: productChipLabel({ product, quotingForm: input.quotingForm }),
      stage,
      stageLabel: listProductStageLabel(stage),
    };
  });
}

/** Selected carrier row — same words as the stamp / header stage. */
export const SELECTED_QUOTE_STAGE_LABELS: Record<string, string> = {
  quote_sent: "Quote sent",
  bound: "Bound",
  policy_issued: "Policy issued",
  pending_inspection: "Pending inspection",
  closed_won: "Closed won",
  done: "Done",
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
  if (productState?.issuedDone) return "done";
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
