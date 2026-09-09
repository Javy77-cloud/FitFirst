import { QuotesResultsTable } from "@/components/deal/quotes-results-table";
import type { QuoteFileRow } from "@/components/deal/quote-file-actions";
import { isQuoteFileDoc } from "@/lib/deals/quote-docs";
import { sortQuotesByRatingThenPremium } from "@/lib/deals/quote-sort";
import type { Carrier, Document, DocumentVersion, Quote, QuoteAttemptLog, QuoteNote } from "@/lib/db/schema";

function quoteIdFromTags(tags: string[] | null | undefined): string | null {
  for (const tag of tags ?? []) {
    if (tag.startsWith("quote:") && tag.length > "quote:".length) {
      return tag.slice("quote:".length);
    }
  }
  return null;
}

function labelFromTags(tags: string[] | null | undefined, fallback: string): string {
  for (const tag of tags ?? []) {
    if (tag.startsWith("label:") && tag.length > "label:".length) {
      return tag.slice("label:".length);
    }
  }
  return fallback;
}

function isCarrierQuoteDoc(doc: Document): boolean {
  const tags = new Set(doc.tags ?? []);
  return tags.has("source:carrier") || doc.docType === "carrier_quote";
}

function isAgencyQuoteDoc(doc: Document): boolean {
  const tags = new Set(doc.tags ?? []);
  return tags.has("source:agency") || doc.docType === "agency_quote";
}

function toQuoteFileRow(doc: Document, versions: DocumentVersion[]): QuoteFileRow {
  const version =
    versions.find((row) => row.documentId === doc.id) ??
    null;
  return {
    id: doc.id,
    filename: doc.filename,
    displayName: labelFromTags(doc.tags, doc.filename),
    uploadedByName: version?.uploadedByName ?? null,
    createdAt: version?.createdAt ?? doc.createdAt,
  };
}

export function QuotesPanel({
  dealId,
  quotes,
  logs,
  quoteResultsNote: _quoteResultsNote,
  formId = "HO3",
  confirmLogs = [],
  quoteNotes = [],
  requestedCoverageA = null,
  docs = [],
  fileVersions = [],
}: {
  dealId: string;
  quotes: { quote: Quote; carrier: Carrier }[];
  logs: { log: QuoteAttemptLog; carrier: Carrier }[];
  /** Unused on agent Quotes tab — appetite / portal transcript stays in Developer Hub. */
  quoteResultsNote?: string | null;
  formId?: string;
  confirmLogs?: { carrierId: string; why?: string | null }[];
  quoteNotes?: QuoteNote[];
  requestedCoverageA?: number | null;
  docs?: Document[];
  fileVersions?: DocumentVersion[];
}) {
  const liveQuotes = quotes.filter((row) => !row.quote.stub);
  const sorted = sortQuotesByRatingThenPremium(
    liveQuotes.map((row) => ({
      ...row,
      premium: row.quote.premium,
      agentRating: row.quote.agentRating,
    })),
  );
  const resultByCarrier = Object.fromEntries(logs.map((row) => [row.log.carrierId, row.log.result]));
  const notesByQuote: Record<string, QuoteNote[]> = {};
  for (const note of quoteNotes) {
    (notesByQuote[note.quoteId] ??= []).push(note);
  }

  const quoteFilesByQuoteId: Record<string, { carrier: QuoteFileRow[]; agency: QuoteFileRow[] }> = {};
  for (const doc of docs) {
    if (!isQuoteFileDoc(doc)) continue;
    const quoteId = quoteIdFromTags(doc.tags);
    if (!quoteId) continue;
    const bucket = (quoteFilesByQuoteId[quoteId] ??= { carrier: [], agency: [] });
    const row = toQuoteFileRow(doc, fileVersions);
    if (isCarrierQuoteDoc(doc)) bucket.carrier.push(row);
    else if (isAgencyQuoteDoc(doc)) bucket.agency.push(row);
  }

  if (sorted.length === 0) {
    return <div className="min-h-0" data-ff-deal-quotes="" data-ff-deal-quotes-empty="" data-ff-quotes-empty="" />;
  }

  return (
    <div className="space-y-4" data-ff-deal-quotes="">
      <section className="ff-card overflow-hidden">
        <QuotesResultsTable
          dealId={dealId}
          rows={sorted}
          formId={formId}
          confirmLogs={confirmLogs}
          resultByCarrier={resultByCarrier}
          notesByQuote={notesByQuote}
          requestedCoverageA={requestedCoverageA}
          quoteFilesByQuoteId={quoteFilesByQuoteId}
        />
      </section>
    </div>
  );
}
