import Link from "next/link";
import { finalizeQuoteResults } from "@/app/actions/lifecycle";
import { DeskDetails } from "@/components/desk-details";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/domain";
import type { Carrier, Document, Quote, QuoteAttemptLog } from "@/lib/db/schema";
import { matchQuotePdf } from "@/lib/files/quote-match";
import { filePreviewHref, isProposalAttachment } from "@/lib/files/urls";
import { cn } from "@/lib/utils";
import { AppetiteCapture } from "./appetite-capture";
import { DocFileActions } from "./doc-file-actions";

export function QuotesPanel({
  dealId,
  quotes,
  logs,
  quoteResultsNote,
  quoteDocs = [],
  unlocked = false,
  carriers = [],
  contactId,
  accountId,
  email,
  phone,
}: {
  dealId: string;
  quotes: { quote: Quote; carrier: Carrier }[];
  logs: { log: QuoteAttemptLog; carrier: Carrier }[];
  quoteResultsNote?: string | null;
  quoteDocs?: Document[];
  unlocked?: boolean;
  carriers?: { id: string; name: string }[];
  contactId?: string | null;
  accountId?: string | null;
  email?: string | null;
  phone?: string | null;
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Select quotes, read the diffs in plain English, then print a branded proposal or paste a
            video walkthrough URL.
          </p>
          <Link
            href={`/deals/${dealId}/compare`}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Open interactive compare
          </Link>
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
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(({ quote, carrier }) => {
                const pdf = matchQuotePdf(quote, carrier, quoteDocs);
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
                      <div className="space-y-1">
                        <a href={filePreviewHref(pdf.id)} className="text-xs text-primary hover:underline">
                          Open PDF
                        </a>
                        <DocFileActions
                          documentId={pdf.id}
                          filename={pdf.filename}
                          dealId={dealId}
                          contactId={contactId}
                          accountId={accountId}
                          email={email}
                          phone={phone}
                          compact
                        />
                      </div>
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

      {quoteDocs.filter((doc) => isProposalAttachment(doc)).length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {quoteDocs.filter((doc) => isProposalAttachment(doc)).length} branded proposal
          {quoteDocs.filter((doc) => isProposalAttachment(doc)).length === 1 ? "" : "s"} on this
          deal. Open them from Compare or Documents.
        </p>
      ) : null}

      {quoteDocs.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {quoteDocs.filter((doc) => !isProposalAttachment(doc)).length} quote PDF
          {quoteDocs.filter((doc) => !isProposalAttachment(doc)).length === 1 ? "" : "s"} attached
          on this deal. These files are not policies.
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
