import { formatMoney } from "@/lib/domain";
import { noticeStampPhrase } from "@/lib/deals/notices";
import { type DealStampStage } from "@/lib/deals/status-stamp";

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

/** One silence cue. Hours stay words so a lone "1h" never sits under the name. */
export function formatSilenceCue(days: number): string {
  if (!Number.isFinite(days) || days < 1) {
    const hours = Math.max(1, Math.round((Number.isFinite(days) ? Math.max(0, days) : 0) * 24));
    return hours === 1 ? "1 hour silent" : `${hours} hours silent`;
  }
  const whole = Math.round(days);
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

function addChip(chips: string[], seen: Set<string>, label: string) {
  const key = label.trim().toLowerCase();
  if (!key || seen.has(key)) return;
  seen.add(key);
  chips.push(label.trim());
}

/** Readable job stamps — inspection, quote sent, bound, payment due. */
export function dealJobStamps(input: {
  stageStamp: DealStampStage | null;
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
  if (input.inspection) addChip(chips, seen, "Inspection");
  for (const slug of input.noticeSlugs ?? []) {
    const key = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (!key || key === "none") continue;
    if (key.includes("inspection")) addChip(chips, seen, "Inspection");
    else if (key.includes("mortgagee") || key.includes("payment")) addChip(chips, seen, "Payment due");
    else {
      const phrase = noticeStampPhrase(key);
      if (phrase) addChip(chips, seen, phrase.replace(/^Notice · /, ""));
    }
  }
  return chips;
}
