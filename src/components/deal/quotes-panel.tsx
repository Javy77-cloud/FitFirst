import { finalizeQuoteResults } from "@/app/actions/lifecycle";
import { BindConfirmGate } from "@/components/deal/bind-confirm-gate";
import { QuotesResultsTable } from "@/components/deal/quotes-results-table";
import { Button } from "@/components/ui/button";
import type { BindPathTarget } from "@/lib/crm/bind-path";
import { sortQuotesCheapestFirst } from "@/lib/deals/quote-sort";
import type { Carrier, Quote, QuoteAttemptLog } from "@/lib/db/schema";

export function QuotesPanel({
  dealId,
  quotes,
  logs,
  quoteResultsNote,
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

  if (sorted.length === 0) {
    return <div data-ff-deal-quotes-empty="" data-ff-quotes-empty="" />;
  }

  return (
    <div className="space-y-4">
      <section className="ff-card overflow-hidden" data-ff-deal-quotes>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-navy">Quote results</h3>
            <p className="mt-1 text-base text-muted-foreground">
              Grouped by outcome: Accepted, Maybe, Not accepted, No option. Cheapest within each group.
              A quote never becomes a policy. Check rows to delete one or many.
            </p>
          </div>
          <form action={finalizeQuoteResults}>
            <input type="hidden" name="dealId" value={dealId} />
            <Button type="submit" size="sm" variant="outline">
              Finalize quote results
            </Button>
          </form>
        </div>
        {quoteResultsNote ? (
          <pre className="whitespace-pre-wrap border-b border-border bg-muted px-4 py-2 text-sm">
            {quoteResultsNote}
          </pre>
        ) : null}
        <QuotesResultsTable
          dealId={dealId}
          rows={sorted}
          formId={formId}
          confirmLogs={confirmLogs}
          resultByCarrier={resultByCarrier}
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

      <section className="ff-card overflow-hidden" data-ff-appetite-log="">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
          <div className="text-base font-semibold text-navy">Appetite Log</div>
          <a
            href="/carriers/logs"
            className="text-sm text-primary underline-offset-2 hover:underline"
            data-ff-appetite-log-link=""
          >
            Full appetite / decline log
          </a>
        </div>
        <p className="border-b border-border px-4 py-2 text-sm text-muted-foreground">
          Training feed from every quote attempt on this deal (quote_attempt_logs). Source of
          truth for appetite — not a redesign.
        </p>
        {logs.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">No appetite attempts recorded.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Carrier</th>
                <th>Result</th>
                <th>Bindable</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(({ log, carrier }) => (
                <tr key={log.id} data-ff-appetite-log-row={log.id}>
                  <td className="whitespace-nowrap text-xs">
                    {log.attemptedAt.toISOString().slice(0, 10)}
                  </td>
                  <td>{carrier.name}</td>
                  <td className="uppercase">{log.result.replaceAll("_", " ")}</td>
                  <td>{log.bindable ? "Y" : "N"}</td>
                  <td className="text-xs">{log.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
