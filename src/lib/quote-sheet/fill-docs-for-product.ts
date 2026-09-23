/**
 * Product-scoped doc selection for Risk Profile Fill / Gemini extract.
 * Matches Documents-tab membership so Flood Fill never loads HO3 line:home PDFs.
 */
import { isDocumentsSourceDoc, isQuoteFileDoc } from "@/lib/deals/quote-docs";
import { isQuoteAttachment } from "@/lib/ingest/identity";
import {
  filterDocsForProductWindow,
  type ProductDocWindow,
} from "@/lib/documents/product-doc-membership";

export type FillDocCandidate = {
  id?: string;
  filename?: string | null;
  slot?: string | null;
  docType?: string | null;
  tags?: readonly string[] | null;
};

/** Source (non-quote) deal docs that belong to this product window. */
export function selectFillDocsForProductWindow<T extends FillDocCandidate>(
  docs: readonly T[] | null | undefined,
  window: ProductDocWindow,
): T[] {
  const source = (docs ?? []).filter(
    (doc) =>
      isDocumentsSourceDoc(doc) &&
      !isQuoteFileDoc(doc) &&
      !isQuoteAttachment(doc.docType || "", doc.filename || undefined),
  );
  return filterDocsForProductWindow(source, window);
}
