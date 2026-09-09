/** Docs uploaded from Quotes (agency/carrier quote files) — not master-sheet source docs. */

export type QuoteDocLike = {
  slot?: string | null;
  docType?: string | null;
  tags?: string[] | null;
};

/** True for Quote-tab uploads (slot quote_file, agency/carrier quote types, or quote: tags). */
export function isQuoteFileDoc(doc: QuoteDocLike): boolean {
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
