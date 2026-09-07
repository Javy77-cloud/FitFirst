import { finalizeQuoteResults } from "@/app/actions/lifecycle";
import { BindConfirmGate } from "@/components/deal/bind-confirm-gate";
import { QuoteConfirmRow } from "@/components/deal/quote-confirm-row";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/domain";
import type { BindPathTarget } from "@/lib/crm/bind-path";
import {
  isLowConfidencePull,
  quotePullNeedsConfirm,
  type QuoteConfirmKind,
} from "@/lib/deals/quote-confirm";
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
  const sorted = sortQuotesCheapestFirst(
    quotes.map((row) => ({ ...row, premium: row.quote.premium })),
  );
  const cheapest = sorted[0] ?? null;
  const resultByCarrier = new Map(logs.map((row) => [row.log.carrierId, row.log.result]));

  return (
    <div className="space-y-4">
      <section className="ff-card overflow-hidden" data-ff-deal-quotes>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-navy">Quote results</h3>
            <p className="mt-1 text-base text-muted-foreground">
              Cheapest on top. Premium, coverages, deductibles, and carrier status per market.
              A quote never becomes a policy.
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
        {sorted.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            No quotes yet. Approve the master sheet, then request in-appetite quotes on Markets.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Carrier</th>
                <th>Premium</th>
                <th>Coverages</th>
                <th>Deductibles</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ quote, carrier }) => {
                const denied = resultByCarrier.get(carrier.id) === "declined";
                const kind: QuoteConfirmKind = quotePullNeedsConfirm({
                  quoteId: quote.id,
                  carrierId: carrier.id,
                  formId,
                  logs: confirmLogs,
                  denied,
                  lowConfidence: isLowConfidencePull(quote),
                });
                return (
                  <tr key={quote.id}>
                    <td className="font-medium">
                      {carrier.name}
                      {quote.stub ? (
                        <div className="text-base text-muted-foreground">Stub · no paid rater</div>
                      ) : null}
                      <QuoteConfirmRow
                        dealId={dealId}
                        quoteId={quote.id}
                        carrierId={carrier.id}
                        carrierName={carrier.name}
                        formId={formId}
                        kind={kind}
                      />
                    </td>
                    <td>{formatMoney(quote.premium)}</td>
                    <td className="text-xs">
                      Cov A {formatMoney(quote.coverageA)}
                      {quote.coverageGaps.length ? (
                        <div className="text-fit-flag">{quote.coverageGaps.join("; ")}</div>
                      ) : (
                        <div className="text-muted-foreground">Gaps none noted</div>
                      )}
                    </td>
                    <td className="text-xs">
                      AOP {quote.aopDeductible ?? "—"}
                      <div>Hurricane {quote.hurricaneDeductible ?? "—"}</div>
                    </td>
                    <td className="text-xs uppercase">
                      {denied ? "Denied" : quote.bindable ? "Quoted" : "Not bindable"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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

      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
          Attempt log on this deal
        </div>
        {logs.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">No attempts recorded.</p>
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
                <tr key={log.id}>
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
