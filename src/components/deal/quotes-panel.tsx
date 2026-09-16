import Link from "next/link";
import { QuotesBindableSignal } from "@/components/deal/quotes-bindable-signal";
import { QuotesStageFlags } from "@/components/deal/quotes-stage-flags";
import { QuotesResultsTable } from "@/components/deal/quotes-results-table";
import type { QuoteFileRow } from "@/components/deal/quote-file-actions";
import { LoadShopListButton } from "@/components/deal/load-shop-list-button";
import { ManualCarrierAdd } from "@/components/deal/manual-carrier-add";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IssuePolicyFromDec, type IssuedPolicyChip } from "@/components/deal/issue-policy-from-dec";
import { isQuoteFileDoc } from "@/lib/deals/quote-docs";
import { sortQuotesByRatingThenPremium } from "@/lib/deals/quote-sort";
import type { LineQuoteCompleteness } from "@/lib/deals/quote-completeness";
import {
  attachPriorUnderCarrier,
  groupQuotesByRun,
  quoteMatchesDealProduct,
  quoteMatchesShopLine,
  shopLineLabel,
} from "@/lib/deals/shop-flow";
import { isShopLine, type ShopLine } from "@/lib/domain";
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

function MissingQuotesBanner({ completeness }: { completeness: LineQuoteCompleteness | null }) {
  if (!completeness || completeness.complete) return null;
  return (
    <p
      className="text-[11px] text-fit-flag"
      data-ff-quotes-missing-warning=""
      data-ff-quotes-missing-line={completeness.line}
      data-ff-quotes-missing-summary=""
    >
      {completeness.summary}
    </p>
  );
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
  carriers = [],
  dealLine = "HO",
  shopLine,
  currentQuoteRunId = null,
  multiLine = false,
  completeness = null,
  boundQuoteId = null,
  product = null,
  productStage = null,
  selectedQuoteIds = [],
  sheetStale = false,
  splitHomeProducts = false,
  quoteRuns = null,
  isPrimaryLine,
  preScoped = false,
  mintStatus = null,
  issuedPolicy = null,
  autoIssue = false,
  inspectionStatus = "none",
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
  carriers?: { id: string; name: string; writtenLines?: string[] | null }[];
  dealLine?: string;
  shopLine?: string;
  currentQuoteRunId?: string | null;
  multiLine?: boolean;
  completeness?: LineQuoteCompleteness | null;
  boundQuoteId?: string | null;
  product?: string | null;
  productStage?: string | null;
  selectedQuoteIds?: string[];
  sheetStale?: boolean;
  /** Gloria HO3+DP3 only — Heather HO3+Auto+Flood must not hide HO3 quotes. */
  splitHomeProducts?: boolean;
  quoteRuns?: Partial<Record<string, string>> | null;
  isPrimaryLine?: boolean;
  /** Page already filtered `quotes` to this product — do not drop them again. */
  preScoped?: boolean;
  mintStatus?: string | null;
  issuedPolicy?: IssuedPolicyChip | null;
  autoIssue?: boolean;
  inspectionStatus?: "none" | "before_bind" | "carrier_post_bind" | null;
}) {
  const activeLine: ShopLine | null = isShopLine(shopLine) ? shopLine : null;
  const lineLogs = logs.map((row) => row.log);
  const primary = isPrimaryLine ?? !multiLine;
  const scoped = preScoped
    ? quotes
    : quotes.filter((row) => {
        const input = {
          shopLine: row.quote.shopLine,
          quoteAttemptLogId: row.quote.quoteAttemptLogId,
          notes: row.quote.notes,
          logs: lineLogs,
          quoteRunId: row.quote.quoteRunId,
          quoteRuns,
        };
        if (product) {
          return quoteMatchesDealProduct(input, product, {
            multiLine,
            isPrimaryLine: primary,
            splitHomeProducts,
          });
        }
        if (!activeLine) return true;
        return quoteMatchesShopLine(input, activeLine, { multiLine, isPrimaryLine: primary });
      });
  const liveQuotes = scoped.filter((row) => !row.quote.stub);
  const sorted = sortQuotesByRatingThenPremium(
    liveQuotes.map((row) => ({
      ...row,
      premium: row.quote.premium,
      agentRating: row.quote.agentRating,
    })),
  );
  const pinId = boundQuoteId || selectedQuoteIds[0] || null;
  if (pinId) {
    sorted.sort((a, b) => {
      if (a.quote.id === pinId) return -1;
      if (b.quote.id === pinId) return 1;
      return 0;
    });
  }
  const whyByCarrier = Object.fromEntries(logs.map((row) => [row.log.carrierId, row.log.why]));
  const lostReasonByCarrier = Object.fromEntries(
    logs.map((row) => [row.log.carrierId, row.log.lostReason]),
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

  const grouped = groupQuotesByRun(
    sorted,
    (row) => ({ runId: row.quote.quoteRunId, createdAt: row.quote.createdAt }),
    currentQuoteRunId,
  );
  const paired = attachPriorUnderCarrier(
    grouped.current,
    grouped.previous,
    (row) => row.quote.carrierId,
  );
  const priorByQuoteId = Object.fromEntries(
    paired
      .filter((row) => row.prior)
      .map((row) => [
        row.current.quote.id,
        { quote: row.prior!.quote, carrier: row.prior!.carrier, label: row.priorLabel },
      ]),
  );
  const lineLabel = activeLine ? shopLineLabel(activeLine) : null;

  if (sorted.length === 0) {
    return (
      <div
        className="space-y-3"
        data-ff-deal-quotes=""
        data-ff-deal-quotes-empty=""
        data-ff-quotes-empty=""
        data-ff-quotes-line={activeLine ?? ""}
      >
        <div className="ff-card space-y-3 p-4">
          <h3 className="text-sm font-semibold text-navy">Quotes</h3>
          <QuotesStageFlags
            dealId={dealId}
            product={product}
            stage={productStage}
            inspectionStatus={inspectionStatus}
          />
          <MissingQuotesBanner completeness={completeness} />
          <p className="text-sm text-muted-foreground" data-ff-quotes-empty-stats="">
            0 quote rows · build carriers on Markets first
          </p>
          <p className="text-sm text-muted-foreground">
            Confirm & request quotes lands on Markets so you can load a list and add carriers.
            Real quote rows show here once portals or Fill return them.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/deals/${dealId}?tab=markets${shopLine ? `&line=${shopLine}` : ""}`}
              className={cn(buttonVariants({ size: "sm", variant: "default" }))}
              data-ff-quotes-go-markets=""
            >
              Go to Markets
            </Link>
            <LoadShopListButton dealId={dealId} dealLine={dealLine} />
          </div>
          <ManualCarrierAdd
            dealId={dealId}
            carriers={carriers}
            alreadyIds={[]}
            dealLine={dealLine}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-ff-deal-quotes="" data-ff-quotes-line={activeLine ?? ""}>
      <QuotesBindableSignal quotes={sorted.map((row) => row.quote)} />
      <QuotesStageFlags
        dealId={dealId}
        product={product}
        stage={productStage}
        inspectionStatus={inspectionStatus}
      />
      <MissingQuotesBanner completeness={completeness} />
      {product ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <IssuePolicyFromDec
            dealId={dealId}
            product={product}
            stage={productStage}
            selectedQuoteIds={selectedQuoteIds}
            mintStatus={mintStatus}
            issued={issuedPolicy}
            autoOpen={autoIssue}
          />
        </div>
      ) : null}
      {grouped.current.length ? (
        <section className="ff-card overflow-hidden" data-ff-quotes-current="">
          <QuotesResultsTable
            dealId={dealId}
            rows={grouped.current}
            formId={formId}
            confirmLogs={confirmLogs}
            resultByCarrier={resultByCarrier}
            whyByCarrier={whyByCarrier}
            lostReasonByCarrier={lostReasonByCarrier}
            notesByQuote={notesByQuote}
            requestedCoverageA={requestedCoverageA}
            quoteFilesByQuoteId={quoteFilesByQuoteId}
            boundQuoteId={boundQuoteId}
            selectedQuoteIds={selectedQuoteIds}
            product={product}
            productStage={productStage}
            sheetStale={sheetStale}
            priorByQuoteId={priorByQuoteId}
          />
        </section>
      ) : (
        <div className="ff-card space-y-2 p-4" data-ff-quotes-current="" data-ff-quotes-current-empty="">
          <h3 className="text-sm font-semibold text-navy">
            {lineLabel ? `Current ${lineLabel} quotes` : "Current quotes"}
          </h3>
          <p className="text-sm text-muted-foreground">
            No current quotes yet. Prior premiums stay under each carrier after a re-request.
          </p>
        </div>
      )}
    </div>
  );
}
