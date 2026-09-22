import { isDeclarationDocType } from "@/lib/policy/dec-prompt";

/** Docs uploaded from Quotes (agency/carrier quote files) — not master-sheet source docs. */

export type QuoteDocLike = {
  slot?: string | null;
  docType?: string | null;
  tags?: readonly string[] | null;
};

export type QuoteFolderKind = "manual" | "carrier";

function normalizedTags(tags?: readonly string[] | null): string[] {
  return (tags ?? []).map((tag) => tag.trim().toLowerCase());
}

/** True for Quote-tab uploads (slot quote_file, agency/carrier quote types, or quote: tags). */
export function isQuoteFileDoc(doc: QuoteDocLike): boolean {
  if (isDeclarationDocType(doc.docType) && (doc.slot === "source_doc" || !doc.slot)) return false;
  if (doc.slot === "quote_file") return true;
  const type = (doc.docType ?? "").trim().toLowerCase();
  if (type === "carrier_quote" || type === "agency_quote") return true;
  const tags = normalizedTags(doc.tags);
  if (tags.some((tag) => tag === "source:agency" || tag === "source:carrier")) return true;
  return tags.some((tag) => tag.startsWith("quote:"));
}

/** Quote id from a `quote:{id}` tag. Prefix match is case-insensitive; the id keeps its spelling. */
export function quoteIdFromDocTags(tags?: readonly string[] | null): string | null {
  for (const tag of tags ?? []) {
    const raw = tag.trim();
    if (raw.length <= "quote:".length) continue;
    if (raw.slice(0, "quote:".length).toLowerCase() !== "quote:") continue;
    return raw.slice("quote:".length);
  }
  return null;
}

/**
 * Manual (`source:agency` / agency_quote) or carrier (`source:carrier` / carrier_quote)
 * membership for one quote. This is the Quotes folder badge: a file the agent can open
 * there is a member. Shopping source docs (declaration type on `source_doc`, no quote folder)
 * are not members.
 */
export function quoteFolderKind(doc: QuoteDocLike): QuoteFolderKind | null {
  if (!isQuoteFileDoc(doc)) return null;
  if (!quoteIdFromDocTags(doc.tags)) return null;
  const tags = new Set(normalizedTags(doc.tags));
  const type = (doc.docType ?? "").trim().toLowerCase();
  if (tags.has("source:carrier") || type === "carrier_quote") return "carrier";
  if (tags.has("source:agency") || type === "agency_quote") return "manual";
  return null;
}

/** Same buckets the Manual and carrier badges render, keyed by quote id. */
export function quoteFoldersByQuoteId<T extends QuoteDocLike>(
  docs: readonly T[],
): Record<string, { manual: T[]; carrier: T[] }> {
  const out: Record<string, { manual: T[]; carrier: T[] }> = {};
  for (const doc of docs) {
    const quoteId = quoteIdFromDocTags(doc.tags);
    const kind = quoteFolderKind(doc);
    if (!quoteId || !kind) continue;
    const bucket = (out[quoteId] ??= { manual: [], carrier: [] });
    bucket[kind].push(doc);
  }
  return out;
}

/** Master-sheet / Documents list — exclude quote uploads and other non-source slots. */
export function isDocumentsSourceDoc(doc: QuoteDocLike): boolean {
  if (doc.slot === "quote_pdf" || doc.slot === "policy_file") return false;
  return !isQuoteFileDoc(doc);
}

/** Infer shop line from a source-doc tag/slot so a Home upload does not stale Auto. */
export function shopLineFromSourceDoc(doc: QuoteDocLike): string | null {
  for (const tag of doc.tags ?? []) {
    const raw = tag.startsWith("line:") ? tag.slice("line:".length) : tag;
    const key = raw.trim().toLowerCase();
    if (
      key === "home" ||
      key === "auto" ||
      key === "flood" ||
      key === "rec_rv" ||
      key === "umbrella" ||
      key === "life" ||
      key === "health"
    ) {
      return key;
    }
  }
  const blob = `${doc.slot ?? ""} ${doc.docType ?? ""}`.toLowerCase();
  if (/flood/.test(blob)) return "flood";
  if (/auto|vin|id.?card/.test(blob)) return "auto";
  if (/home|ho3|dec|wind.?mit|4.?point|four.?point/.test(blob)) return "home";
  return null;
}

const HO_DOC_BLOB = /homeowners|wind.?mit|4.?point|four.?point|ho-?3|oir-b1/i;
const AUTO_DOC_BLOB = /\bauto\b|\bvin\b|id.?card|acord\s*90/i;

/**
 * Shop line for a Gemini extract call.
 * A photo typed as "dec" is not automatically Home — an Auto deal's declaration
 * photo must use the Auto key list or the model returns an empty object.
 */
export function shopLineForGeminiExtract(opts: {
  docType?: string | null;
  filename?: string | null;
  tags?: string[] | null;
  quotingLine?: string | null;
}): string | null {
  for (const tag of opts.tags ?? []) {
    if (!tag.startsWith("line:")) continue;
    const key = tag.slice("line:".length).trim().toLowerCase();
    if (key === "auto" || key === "motorcycle" || key === "commercial_auto") return "auto";
    if (key === "home" || key === "flood") return key;
  }
  const blob = `${opts.filename ?? ""} ${opts.docType ?? ""}`;
  if (AUTO_DOC_BLOB.test(blob) && !HO_DOC_BLOB.test(blob)) return "auto";
  const doc = (opts.docType ?? "").trim().toLowerCase();
  const quoting = (opts.quotingLine ?? "").trim().toLowerCase();
  const photoOrDec =
    doc === "" ||
    doc === "photo" ||
    doc === "dec" ||
    doc === "policy" ||
    doc === "current_policy" ||
    doc.includes("dec") ||
    doc.includes("photo") ||
    doc.includes("declar");
  if (
    (quoting === "auto" || quoting === "motorcycle" || quoting === "commercial_auto") &&
    photoOrDec &&
    !HO_DOC_BLOB.test(blob)
  ) {
    return "auto";
  }
  return (
    shopLineFromSourceDoc({ docType: opts.docType, tags: opts.tags }) ??
    (quoting || null)
  );
}
