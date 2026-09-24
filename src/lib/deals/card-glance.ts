import { formatMoney } from "@/lib/domain";
import { splitHomeProducts } from "@/lib/deals/deal-products";
import { noticeStampPhrase } from "@/lib/deals/notices";
import { quoteMatchesDealProduct } from "@/lib/deals/shop-flow";
import { resolveDealStampStage, type DealStampStage } from "@/lib/deals/status-stamp";

const STAMP_LABEL: Record<DealStampStage, string> = {
  quote_sent: "Quote sent",
  bound: "Bound",
  policy_issued: "Policy issued",
  closed_won: "Closed won",
  done: "Done",
};

const PENDING_QUOTE = new Set(["new", "client_reviewing", "waiting_on_inspection", "pending"]);

export type ShopFlowNoticeSource = {
  productStages?: Record<
    string,
    { noticeType?: string | null; inspectionStatus?: string | null; stage?: string | null } | null | undefined
  > | null;
} | null;

const STAGE_WORD_STAMPS: Record<string, string> = {
  "quote sent": "Quote sent",
  bound: "Bound",
  inspection: "Inspection",
  "pending inspection": "Inspection",
  "policy issued": "Policy issued",
  "closed won": "Closed won",
  done: "Done",
};

function stageKey(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Premium column only. Coverage A and life face never fill this number. */
export function premiumColumnAmount(input: {
  premium?: number | string | null;
  coverageA?: number | null;
  faceAmount?: number | null;
}): number | null {
  void input.coverageA;
  void input.faceAmount;
  if (input.premium == null || input.premium === "") return null;
  const amount = typeof input.premium === "string" ? Number(input.premium) : input.premium;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

/** Aligned dash when the deal has no premium. */
export function formatPremiumColumn(premium: number | string | null | undefined): string {
  const amount = premiumColumnAmount({ premium });
  return amount == null ? "—" : formatMoney(amount);
}

/** Lowest positive premium — the best price pulled, not the largest face amount. */
export function bestQuotePremium(premiums: Array<number | string | null | undefined>): number | null {
  let best: number | null = null;
  for (const raw of premiums) {
    const amount = premiumColumnAmount({ premium: raw });
    if (amount == null) continue;
    if (best == null || amount < best) best = amount;
  }
  return best;
}

export function isPendingQuoteStatus(status: string | null | undefined): boolean {
  return PENDING_QUOTE.has((status ?? "").trim().toLowerCase());
}

export function isQuoteSentStatus(status: string | null | undefined): boolean {
  const key = (status ?? "").trim().toLowerCase();
  return key === "sent_to_client" || key === "quote_sent" || key === "client_reviewing";
}

export function docsGlanceLabel(submitted: boolean): string {
  return submitted ? "Docs in" : "Docs needed";
}

export function quotesGlanceLabel(input: {
  count: number;
  bestPremium: number | null;
  pending: number;
}): string {
  if (input.count <= 0) return "No quotes yet";
  const pulled = input.count === 1 ? "1 quote pulled" : `${input.count} quotes pulled`;
  const best =
    input.bestPremium != null && input.bestPremium > 0 ? ` · best ${formatMoney(input.bestPremium)}` : "";
  const pending =
    input.pending > 0 ? (input.pending === 1 ? " · 1 pending" : ` · ${input.pending} pending`) : "";
  return `${pulled}${best}${pending}`;
}

/** Sent quote line — premium / carrier only. Never invent numbers; never a pull count. */
export function quotesSentGlanceLabel(
  quotes: readonly { premium?: number | string | null; carrierName?: string | null }[],
): string {
  const parts: string[] = [];
  for (const quote of quotes) {
    const premium = premiumColumnAmount({ premium: quote.premium });
    const carrier = (quote.carrierName ?? "").trim();
    if (premium == null && !carrier) continue;
    if (premium == null) parts.push(carrier);
    else if (!carrier) parts.push(formatMoney(premium));
    else parts.push(`${formatMoney(premium)} · ${carrier}`);
  }
  return parts.join("; ");
}

/**
 * Quote / premium copy — Form and Stage must never show this.
 * Matches pull summaries, “no quotes yet”, best $…, pending counts, bare premiums.
 */
export function isStackQuoteLanguage(value: string | null | undefined): boolean {
  const text = (value ?? "").trim();
  if (!text) return false;
  return /pulled|quotes yet|best\s*\$|\bpending\b|\$[\d,]+|\d+\s*quotes?/i.test(text);
}

/**
 * Deals Priority Stack health flag.
 * Red (alert) when cold OR client weak (≤2 pips / score &lt; 40) OR policy weak.
 * Green only when neither side is weak and the deal is not cold.
 */
export function stackHealthFlagged(input: {
  heat?: string | null;
  clientHealth: number;
  policyHealth: number;
}): boolean {
  if (input.heat === "cold") return true;
  if (input.clientHealth < 40) return true;
  if (input.policyHealth < 40) return true;
  return false;
}

/**
 * One silence cue. Hours stay words so a lone "1h" never sits under the name.
 * Under one hour since last platform-logged touch → blank; at 1h+ keep the
 * hour/day silence labels.
 */
export function formatSilenceCue(days: number): string {
  const safe = Number.isFinite(days) ? Math.max(0, days) : 0;
  const hoursExact = safe * 24;
  if (hoursExact < 1) return "";
  if (safe < 1) {
    const hours = Math.max(1, Math.round(hoursExact));
    return hours === 1 ? "1 hour silent" : `${hours} hours silent`;
  }
  const whole = Math.round(safe);
  return whole === 1 ? "1 day silent" : `${whole} days silent`;
}

export function noticeSlugsFromShopFlow(shopFlow: ShopFlowNoticeSource): string[] {
  const stages = shopFlow?.productStages;
  if (!stages) return [];
  const slugs: string[] = [];
  for (const row of Object.values(stages)) {
    const slug = (row?.noticeType || row?.inspectionStatus || "").trim();
    if (!slug || slug === "none" || slug === "no_inspection") continue;
    slugs.push(slug);
  }
  return slugs;
}

/** Product stage words (quote sent, bound, inspection) even when the deal slug lags. */
export function productStageSlugsFromShopFlow(shopFlow: ShopFlowNoticeSource): string[] {
  const stages = shopFlow?.productStages;
  if (!stages) return [];
  const slugs: string[] = [];
  for (const row of Object.values(stages)) {
    const stage = (row?.stage ?? "").trim();
    if (stage) slugs.push(stage);
  }
  return slugs;
}

function addChip(chips: string[], seen: Set<string>, label: string) {
  const key = label.trim().toLowerCase();
  if (!key || seen.has(key)) return;
  seen.add(key);
  chips.push(label.trim());
}

function addResolvedStageStamp(chips: string[], seen: Set<string>, slug: string | null | undefined) {
  const key = stageKey(slug);
  if (!key || key === "chase") return;
  if (key === "pending_inspection" || key === "waiting_on_inspection" || key === "inspection") {
    addChip(chips, seen, "Inspection");
    return;
  }
  const resolved = resolveDealStampStage(slug);
  if (resolved === "quote_sent") addChip(chips, seen, "Quote sent");
  else if (resolved) addChip(chips, seen, STAMP_LABEL[resolved]);
}

/** Readable job stamps — inspection, quote sent, bound, payment due. Never Chase. */
export function dealJobStamps(input: {
  stageStamp: DealStampStage | null;
  stageLabel?: string | null;
  productStageSlugs?: readonly string[];
  noticeSlugs?: readonly string[];
  quoteSent?: boolean;
  inspection?: boolean;
}): string[] {
  const chips: string[] = [];
  const seen = new Set<string>();
  if (input.quoteSent || input.stageStamp === "quote_sent") addChip(chips, seen, "Quote sent");
  if (input.stageStamp && input.stageStamp !== "quote_sent") {
    addChip(chips, seen, STAMP_LABEL[input.stageStamp]);
  }
  const fromLabel = STAGE_WORD_STAMPS[(input.stageLabel ?? "").trim().toLowerCase()];
  if (fromLabel) addChip(chips, seen, fromLabel);
  for (const slug of input.productStageSlugs ?? []) addResolvedStageStamp(chips, seen, slug);
  if (input.inspection) addChip(chips, seen, "Inspection");
  for (const slug of input.noticeSlugs ?? []) {
    const key = stageKey(slug);
    if (!key || key === "none" || key === "chase") continue;
    if (key.includes("inspection")) addChip(chips, seen, "Inspection");
    else if (key.includes("mortgagee") || key.includes("payment")) addChip(chips, seen, "Payment due");
    else {
      const phrase = noticeStampPhrase(key);
      if (phrase) addChip(chips, seen, phrase.replace(/^Notice · /, ""));
    }
  }
  return chips.filter((chip) => chip.toLowerCase() !== "chase");
}

/** Form codes on the stack — never vague “Home”. Chip label wins when present. */
const STACK_PRODUCT_NAMES: Record<string, string> = {
  homeowners: "HO3",
  landlord: "DP3",
  renters: "HO4",
  auto: "Auto",
  motorcycle: "Motorcycle",
  flood: "Flood",
  rv: "RV",
  boat: "Boat",
  umbrella: "Umbrella",
  life: "Term Life",
  life_term: "Term Life",
  term_life: "Term Life",
};

/** Documents / Markets / Quotes / Bound — the place this product is in. */
const STACK_PLACE: Record<string, string> = {
  gathering: "Documents",
  gather: "Documents",
  markets: "Markets",
  quote_review: "Quotes",
  review: "Quotes",
  quotes: "Quotes",
  quote_sent: "Quotes",
  bound: "Bound",
  pending_inspection: "Bound",
  waiting_on_inspection: "Bound",
  policy_issued: "Bound",
  closed_won: "Closed won",
  closed_lost: "Closed lost",
  done: "Done",
};

export type StackProductQuote = {
  id?: string | null;
  premium?: number | string | null;
  agentStatus?: string | null;
  stub?: boolean | null;
  shopLine?: string | null;
  notes?: string | null;
  quoteRunId?: string | null;
  carrierName?: string | null;
};

export type StackProductLine = {
  product: string;
  label: string;
  stageLabel: string;
  stamps: string[];
  quoteSummary: string;
};

export function stackProductName(product: string, fallback?: string | null): string {
  const fromChip = fallback?.trim();
  // Form cell = form code only. Never quote language stuffed into a label field.
  if (fromChip && !isStackQuoteLanguage(fromChip)) return fromChip;
  return STACK_PRODUCT_NAMES[product] ?? product;
}

export function stackPlaceLabel(stage: string | null | undefined): string {
  // Stage cell = place only. Premium / pull copy never belongs here.
  if (isStackQuoteLanguage(stage)) return "Documents";
  const key = stageKey(stage);
  if (STACK_PLACE[key]) return STACK_PLACE[key];
  if (!key) return "Documents";
  // Mangled quote leftovers (e.g. best_2_109_1_pending) are not places.
  if (/best_|_pending|pulled|quotes_yet|\d{3,}/.test(key) && !STACK_PLACE[key]) {
    return "Documents";
  }
  return key.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/**
 * One row per open product. Quote totals and stamps stay on the product they
 * belong to — a Flood $487 never becomes the Home line.
 * Quote sent → show selected/sent premium·carrier, never a pull count.
 */
export function stackProductLines(input: {
  products: readonly {
    product: string;
    label?: string | null;
    stage?: string | null;
    noticeType?: string | null;
    inspectionStatus?: string | null;
  }[];
  quotes?: readonly StackProductQuote[];
  quoteRuns?: Partial<Record<string, string>> | null;
  selectedQuoteIds?: Partial<Record<string, readonly string[]>> | null;
}): StackProductLine[] {
  const products = input.products.filter((row) => row.product.trim());
  const multiLine = products.length > 1;
  const splitHome = splitHomeProducts(products.map((row) => row.product));
  const quotes = input.quotes ?? [];
  return products.map((product) => {
    const mine = quotes.filter((quote) => {
      const premium = premiumColumnAmount({ premium: quote.premium });
      const statusKey = (quote.agentStatus ?? "").trim().toLowerCase();
      const emptyStub = Boolean(quote.stub) && premium == null && (statusKey === "" || statusKey === "new");
      if (emptyStub) return false;
      return quoteMatchesDealProduct(
        {
          shopLine: quote.shopLine,
          notes: quote.notes,
          quoteRunId: quote.quoteRunId,
          quoteRuns: input.quoteRuns,
        },
        product.product,
        { multiLine, splitHomeProducts: splitHome },
      );
    });
    const stageRaw = product.stage ?? "";
    const stagePolluted = isStackQuoteLanguage(stageRaw);
    const stage = stagePolluted ? "" : stageRaw;
    const key = stageKey(stage);
    const noticeSlugs = [product.noticeType, product.inspectionStatus].filter(
      (value): value is string => Boolean(value && value.trim() && value !== "none"),
    );
    const quoteSent = mine.some((quote) => isQuoteSentStatus(quote.agentStatus)) || key === "quote_sent";
    const inspection =
      mine.some((quote) => (quote.agentStatus ?? "").trim().toLowerCase() === "waiting_on_inspection") ||
      noticeSlugs.some((slug) => stageKey(slug).includes("inspection"));
    const stageStamp =
      key === "pending_inspection" || key === "inspection" || key === "waiting_on_inspection"
        ? null
        : resolveDealStampStage(stage || null);
    const stamps = dealJobStamps({
      stageStamp,
      productStageSlugs: stage ? [stage] : [],
      noticeSlugs,
      quoteSent,
      inspection,
    });
    const hasQuoteSentStamp = stamps.some((stamp) => stamp.toLowerCase() === "quote sent");
    let quoteSummary: string;
    if (hasQuoteSentStamp) {
      const selected = new Set(
        (input.selectedQuoteIds?.[product.product] ?? []).map((id) => String(id).trim()).filter(Boolean),
      );
      const picked = selected.size
        ? mine.filter((quote) => quote.id && selected.has(String(quote.id)))
        : [];
      const sentStatus = mine.filter((quote) => isQuoteSentStatus(quote.agentStatus));
      quoteSummary = quotesSentGlanceLabel(picked.length > 0 ? picked : sentStatus);
    } else {
      quoteSummary = quotesGlanceLabel({
        count: mine.length,
        bestPremium: bestQuotePremium(mine.map((quote) => quote.premium)),
        pending: mine.filter((quote) => isPendingQuoteStatus(quote.agentStatus)).length,
      });
    }
    // Manually minted deals sometimes stuff premium / pull copy into label or stage —
    // remap that text into Quotes so Form/Stage stay pure.
    const misplaced = [product.label, stageRaw]
      .map((value) => (value ?? "").trim())
      .filter((value) => value && isStackQuoteLanguage(value));
    if (misplaced.length > 0) {
      const emptyQuotes =
        !quoteSummary ||
        quoteSummary === "No quotes yet" ||
        (!/\$/.test(quoteSummary) && !hasQuoteSentStamp);
      if (emptyQuotes) quoteSummary = misplaced[0]!;
    }
    return {
      product: product.product,
      label: stackProductName(product.product, product.label),
      stageLabel: stackPlaceLabel(stageRaw),
      stamps,
      quoteSummary,
    };
  });
}
