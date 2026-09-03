import { finalizeQuoteResults } from "@/app/actions/lifecycle";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/domain";
import type { Carrier, Quote, QuoteAttemptLog } from "@/lib/db/schema";

export function QuotesPanel({
  dealId,
  quotes,
  logs,
  quoteResultsNote,
}: {
  dealId: string;
  quotes: { quote: Quote; carrier: Carrier }[];
  logs: { log: QuoteAttemptLog; carrier: Carrier }[];
  quoteResultsNote?: string | null;
}) {
  return (
    <div className="space-y-4">
      <section className="ff-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-navy">Ranked quote results</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Cheapest first. This note stays on the deal. Quotes never become policies — bind is
              the only path that writes a policy.
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
          <pre className="mt-3 whitespace-pre-wrap rounded-md bg-muted px-3 py-2 text-xs">
            {quoteResultsNote}
          </pre>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No ranked note yet. Build stub quotes, then finalize.
          </p>
        )}
      </section>

      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
          Quote comparison
        </div>
        {quotes.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No quotes on this deal. Filter markets first, then build stub quotes for green fits.
            A quote never creates a policy.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Carrier</th>
                <th>Premium</th>
                <th>AOP ded</th>
                <th>Hurricane</th>
                <th>Cov A</th>
                <th>Bindable</th>
                <th>Gaps</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(({ quote, carrier }) => (
                <tr key={quote.id}>
                  <td className="font-medium">
                    {carrier.name}
                    {quote.stub ? (
                      <div className="text-[11px] text-muted-foreground">Stub · no portal</div>
                    ) : null}
                  </td>
                  <td>{formatMoney(quote.premium)}</td>
                  <td>{quote.aopDeductible ?? "—"}</td>
                  <td>{quote.hurricaneDeductible ?? "—"}</td>
                  <td>{formatMoney(quote.coverageA)}</td>
                  <td>{quote.bindable ? "Yes" : "No"}</td>
                  <td className="text-xs">
                    {quote.coverageGaps.length ? quote.coverageGaps.join("; ") : "None noted"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
          Attempt log on this deal
        </div>
        {logs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No attempts recorded.</p>
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
