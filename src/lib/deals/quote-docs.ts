import { isDeclarationDocType } from "@/lib/policy/dec-prompt";

/** Docs uploaded from Quotes (agency/carrier quote files) — not master-sheet source docs. */

export type QuoteDocLike = {
  slot?: string | null;
  docType?: string | null;
  tags?: string[] | null;
};

/** True for Quote-tab uploads (slot quote_file, agency/carrier quote types, or quote: tags). */
export function isQuoteFileDoc(doc: QuoteDocLike): boolean {
  if (isDeclarationDocType(doc.docType) && (doc.slot === "source_doc" || !doc.slot)) return false;
  if (doc.slot === "quote_file") return true;
  if (doc.docType === "carrier_quote" || doc.docType === "agency_quote") return true;
  const tags = doc.tags ?? [];
  if (tags.some((tag) => tag === "source:agency" || tag === "source:carrier")) return true;
  return tags.some((tag) => tag.startsWith("quote:"));
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
