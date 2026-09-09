import { QuotesResultsTable } from "@/components/deal/quotes-results-table";
import { sortQuotesByRatingThenPremium } from "@/lib/deals/quote-sort";
import type { Carrier, Quote, QuoteAttemptLog, QuoteNote } from "@/lib/db/schema";

export function QuotesPanel({
  dealId,
  quotes,
  logs,
  quoteResultsNote: _quoteResultsNote,
  formId = "HO3",
  confirmLogs = [],
  quoteNotes = [],
  requestedCoverageA = null,
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
        />
      </section>
    </div>
  );
}
