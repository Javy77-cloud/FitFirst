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
