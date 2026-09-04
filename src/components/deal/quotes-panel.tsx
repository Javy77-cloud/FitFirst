import { finalizeQuoteResults } from "@/app/actions/lifecycle";
import { DeskDetails } from "@/components/desk-details";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/domain";
import type { Carrier, Document, Quote, QuoteAttemptLog } from "@/lib/db/schema";
import { AppetiteCapture } from "./appetite-capture";

export function QuotesPanel({
  dealId,
  quotes,
  logs,
  quoteResultsNote,
  quoteDocs = [],
  unlocked = false,
  carriers = [],
}: {
  dealId: string;
  quotes: { quote: Quote; carrier: Carrier }[];
  logs: { log: QuoteAttemptLog; carrier: Carrier }[];
  quoteResultsNote?: string | null;
  quoteDocs?: Document[];
  unlocked?: boolean;
  carriers?: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-4">
      <DeskDetails
        title="Appetite capture"
        summary="Quoted / declined / maybe after carrier paste. Maybe does not change matching."
        open
      >
        <AppetiteCapture dealId={dealId} unlocked={unlocked} carriers={carriers} />
      </DeskDetails>

      <DeskDetails
        title="Ranked quote results"
        summary="Cheapest first. This note stays on the deal. Quotes never become policies."
        open={Boolean(quoteResultsNote)}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Bind is the only path that writes a policy. Finalize after you have stub quotes.
          </p>
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
      </DeskDetails>

      <DeskDetails
        title="Quote comparison"
        summary={
          quotes.length
            ? `${quotes.length} quote${quotes.length === 1 ? "" : "s"} on this deal`
            : "Empty until you log stub quotes"
        }
        open={quotes.length > 0}
        padded={false}
      >
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
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(({ quote, carrier }) => {
                const pdf = quoteDocs.find((doc) => doc.dealId === quote.dealId && doc.docType === "quote_pdf");
                return (
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
                  <td>
                    {pdf ? (
                      <a href={`/api/documents/${pdf.id}`} className="text-xs text-primary hover:underline">
                        Open PDF
                      </a>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Pending finalize</span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </DeskDetails>

      {quoteDocs.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {quoteDocs.length} quote PDF{quoteDocs.length === 1 ? "" : "s"} attached on this deal.
          These files are not policies.
        </p>
      ) : null}

      <DeskDetails
        title="Attempt log on this deal"
        summary={logs.length ? `${logs.length} attempt${logs.length === 1 ? "" : "s"}` : "No attempts yet"}
        open={logs.length > 0}
        padded={false}
      >
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
      </DeskDetails>
    </div>
  );
}
