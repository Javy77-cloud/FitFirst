import { BindConfirmGate } from "@/components/deal/bind-confirm-gate";
import { QuotesResultsTable } from "@/components/deal/quotes-results-table";
import type { BindPathTarget } from "@/lib/crm/bind-path";
import { sortQuotesCheapestFirst } from "@/lib/deals/quote-sort";
import type { Carrier, Quote, QuoteAttemptLog } from "@/lib/db/schema";

export function QuotesPanel({
  dealId,
  quotes,
  logs,
  quoteResultsNote: _quoteResultsNote,
  formId = "HO3",
  confirmLogs = [],
  bind,
}: {
  dealId: string;
  quotes: { quote: Quote; carrier: Carrier }[];
  logs: { log: QuoteAttemptLog; carrier: Carrier }[];
  quoteResultsNote?: string | null;
  formId?: string;
  confirmLogs?: { carrierId: string; why?: string | null }[];
  bind?: {
    defaultTarget: BindPathTarget;
    lineLabel: string;
    isAna: boolean;
    bound: boolean;
    party: { id: string; name: string; href: string; kind: "contact" | "account" } | null;
    policies: { id: string; policyNumber: string }[];
  };
}) {
  const liveQuotes = quotes.filter((row) => !row.quote.stub);
  const sorted = sortQuotesCheapestFirst(
    liveQuotes.map((row) => ({ ...row, premium: row.quote.premium })),
  );
  const cheapest = sorted[0] ?? null;
  const resultByCarrier = Object.fromEntries(logs.map((row) => [row.log.carrierId, row.log.result]));
  const whyByCarrier = Object.fromEntries(
    logs.map((row) => [row.log.carrierId, row.log.why ?? undefined]),
  );

  if (sorted.length === 0) {
    return <div data-ff-deal-quotes-empty="" data-ff-quotes-empty="" />;
  }

  return (
    <div className="space-y-4">
      <section className="ff-card overflow-hidden" data-ff-deal-quotes>
        <QuotesResultsTable
          dealId={dealId}
          rows={sorted}
          formId={formId}
          confirmLogs={confirmLogs}
          resultByCarrier={resultByCarrier}
          whyByCarrier={whyByCarrier}
        />
      </section>

      {bind ? (
        <BindConfirmGate
          dealId={dealId}
          defaultTarget={bind.defaultTarget}
          lineLabel={bind.lineLabel}
          isAna={bind.isAna}
          bound={bind.bound}
          party={bind.party}
          policies={bind.policies}
          quote={
            cheapest
              ? {
                  carrierName: cheapest.carrier.name,
                  premium: cheapest.quote.premium,
                  coverageA: cheapest.quote.coverageA,
                  aopDeductible: cheapest.quote.aopDeductible,
                  hurricaneDeductible: cheapest.quote.hurricaneDeductible,
                }
              : null
          }
        />
      ) : null}
    </div>
  );
}
