import type { ReactNode } from "react";
import { OutsideStageOverrideDialog } from "@/components/deals/outside-stage-override-dialog";
import { OutsideFitFirstStamp } from "@/components/deal/outside-fitfirst-stamp";
import Link from "next/link";
import { QuotesBindableSignal } from "@/components/deal/quotes-bindable-signal";
import { QuotesResultsTable } from "@/components/deal/quotes-results-table";
import type { QuoteFileRow } from "@/components/deal/quote-file-actions";
import { LoadShopListButton } from "@/components/deal/load-shop-list-button";
import { ManualCarrierAdd } from "@/components/deal/manual-carrier-add";
import { RecordManualQuote } from "@/components/deal/record-manual-quote";
import { marketCarriersForManualQuote } from "@/lib/deals/manual-quote";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IssuePolicyFromDec, type IssuedPolicyChip } from "@/components/deal/issue-policy-from-dec";
import { quoteFoldersByQuoteId } from "@/lib/deals/quote-docs";
import { blobStoreReady } from "@/lib/files/object-store";
import { quoteFileUploadMode } from "@/lib/files/upload-plan";
import { isBoundReadyForIssue } from "@/lib/policy/mint-gate";
import { sortQuotesByRatingThenPremium } from "@/lib/deals/quote-sort";
import type { LineQuoteCompleteness } from "@/lib/deals/quote-completeness";
import {
  attachPriorUnderCarrier,
  groupQuotesByRun,
  quoteMatchesDealProduct,
  quoteMatchesShopLine,
  shopLineLabel,
} from "@/lib/deals/shop-flow";
import { displayAttemptWhy } from "@/lib/deals/product-instances";
import { isShopLine, type ShopLine } from "@/lib/domain";
import type { Carrier, Document, DocumentVersion, Quote, QuoteAttemptLog, QuoteNote } from "@/lib/db/schema";

function labelFromTags(tags: string[] | null | undefined, fallback: string): string {
  for (const tag of tags ?? []) {
    if (tag.startsWith("label:") && tag.length > "label:".length) {
      return tag.slice("label:".length);
    }
  }
  return fallback;
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
    slot: doc.slot,
    docType: doc.docType,
  };
}

function MissingQuotesBanner({ completeness }: { completeness: LineQuoteCompleteness | null }) {
  if (!completeness || completeness.complete) return null;
  // Markets → Quotes creates shop logs before premiums exist. "Carrier still pending"
  // is the normal manual-entry state — do not paint a red Missing-quotes laundry list.
  const actionable = completeness.missing.filter((row) => row.reason !== "pending");
  if (actionable.length === 0) return null;
  const summary =
    actionable.length === completeness.missing.length
      ? completeness.summary
      : `Missing quotes — ${actionable.map((row) => `${row.carrierName} (${row.why})`).join("; ")}`;
  return (
    <span
      className="inline-flex items-center rounded-full border border-fit-flag/35 bg-fit-flag/10 px-2 py-0.5 text-[11px] font-medium text-fit-flag"
      data-ff-quotes-missing-warning=""
      data-ff-quotes-missing-line={completeness.line}
      data-ff-quotes-missing-summary=""
    >
      {summary}
    </span>
  );
}

function QuotesWarningStrip({
  quotes,
  sheetStale,
  completeness,
}: {
  quotes: Quote[];
  sheetStale?: boolean;
  completeness: LineQuoteCompleteness | null;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-ff-quotes-warning-strip=""
    >
      <QuotesBindableSignal quotes={quotes} />
      {sheetStale ? (
        <span
          className="inline-flex items-center rounded-full border border-fit-flag/40 bg-fit-flag/10 px-2 py-0.5 text-[11px] font-medium text-navy"
          data-ff-quotes-sheet-stale=""
        >
          Sheet changed — recheck carriers
        </span>
      ) : null}
      <MissingQuotesBanner completeness={completeness} />
    </div>
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
  productLabel = null,
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
  canLogGap = false,
  outsideOverride = false,
  outsideOverrideDetail = null,
  pipelineSlug = "p-c",
  createNotice = null,
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
  productLabel?: string | null;
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
  canLogGap?: boolean;
  outsideOverride?: boolean;
  outsideOverrideDetail?: import("@/lib/deals/outside-stage-override").OutsideStageOverride | null;
  pipelineSlug?: string;
  createNotice?: ReactNode;
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
  const whyByCarrier = Object.fromEntries(
    logs.map((row) => [row.log.carrierId, displayAttemptWhy(row.log.why)]),
  );
  const lostReasonByCarrier = Object.fromEntries(
    logs.map((row) => [row.log.carrierId, row.log.lostReason]),
  );
  const resultByCarrier = Object.fromEntries(logs.map((row) => [row.log.carrierId, row.log.result]));
  const notesByQuote: Record<string, QuoteNote[]> = {};
  for (const note of quoteNotes) {
    (notesByQuote[note.quoteId] ??= []).push(note);
  }

  const foldersByQuote = quoteFoldersByQuoteId(docs);
  const quoteFilesByQuoteId: Record<string, { carrier: QuoteFileRow[]; agency: QuoteFileRow[] }> = {};
  for (const [quoteId, bucket] of Object.entries(foldersByQuote)) {
    quoteFilesByQuoteId[quoteId] = {
      carrier: bucket.carrier.map((doc) => toQuoteFileRow(doc, fileVersions)),
      agency: bucket.manual.map((doc) => toQuoteFileRow(doc, fileVersions)),
    };
  }
  const selectedHasFolderPolicy = selectedQuoteIds.some((id) => {
    const bucket = foldersByQuote[id];
    return Boolean(bucket && (bucket.manual.length > 0 || bucket.carrier.length > 0));
  });

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
  const manualQuoteCarriers = marketCarriersForManualQuote(
    logs.map((row) => ({
      carrierId: row.log.carrierId,
      why: displayAttemptWhy(row.log.why),
      lineOfBusiness: row.log.lineOfBusiness,
      carrierName: row.carrier.name,
    })),
    activeLine,
  );
  const manualQuoteForm = (
    <RecordManualQuote
      dealId={dealId}
      carriers={manualQuoteCarriers}
      shopLine={activeLine}
      product={product}
    />
  );
  const quotesHead = (
    <div className="flex flex-wrap items-center" data-ff-quotes-head="">
      {createNotice ? <div className="shrink-0">{createNotice}</div> : null}
      <div className={createNotice ? "ml-3" : undefined}>
        <QuotesWarningStrip
          quotes={sorted.map((row) => row.quote)}
          sheetStale={sheetStale}
          completeness={completeness}
        />
      </div>
    </div>
  );

  if (sorted.length === 0) {
    return (
      <div
        className="relative flex flex-col gap-3"
        data-ff-deal-quotes=""
        data-ff-deal-quotes-empty=""
        data-ff-quotes-empty=""
        data-ff-quotes-line={activeLine ?? ""}
      >
        <div className="ff-card space-y-3 p-4">
          {quotesHead}
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-navy">
              {productLabel ? `Quotes · ${productLabel}` : "Quotes"}
            </h3>
          </div>
          {outsideOverride ? (
            <OutsideFitFirstStamp
              override={outsideOverrideDetail ?? { reason: "Quoted outside FitFirst", at: "", toStage: "policy_issued" }}
              variant="hero"
            />
          ) : null}
          <p className="text-sm text-muted-foreground" data-ff-quotes-empty-stats="">
            0 quote rows
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
            {product && !outsideOverride ? (
              <OutsideStageOverrideDialog
                dealId={dealId}
                product={product}
                pipelineSlug={pipelineSlug}
                currentStage={productStage}
              />
            ) : null}
          </div>
          <ManualCarrierAdd
            dealId={dealId}
            carriers={carriers}
            alreadyIds={[]}
            dealLine={dealLine}
          />
          {product &&
          outsideOverride &&
          (isBoundReadyForIssue(productStage) || mintStatus || issuedPolicy || autoIssue) ? (
            <IssuePolicyFromDec
              dealId={dealId}
              product={product}
              stage={productStage}
              selectedQuoteIds={selectedQuoteIds}
              outsideOverride={outsideOverride}
              mintStatus={mintStatus}
              issued={issuedPolicy}
              autoOpen={autoIssue}
            />
          ) : null}
        </div>
        {manualQuoteForm}
      </div>
    );
  }

  const issueControl =
    product &&
    (isBoundReadyForIssue(productStage) || mintStatus || issuedPolicy || autoIssue || outsideOverride) ? (
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
        <IssuePolicyFromDec
          dealId={dealId}
          product={product}
          stage={productStage}
          selectedQuoteIds={selectedQuoteIds}
          outsideOverride={outsideOverride}
          mintStatus={mintStatus}
          issued={issuedPolicy}
          autoOpen={autoIssue}
          folderHasPolicy={selectedHasFolderPolicy}
        />
      </div>
    ) : null;

  return (
    <div className="relative flex flex-col gap-4" data-ff-deal-quotes="" data-ff-quotes-line={activeLine ?? ""}>
      {grouped.current.length ? (
        <section className="ff-card overflow-hidden" data-ff-quotes-current="">
          <div className="border-b border-border px-4 py-3">{quotesHead}</div>
          {issueControl}
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
            priorByQuoteId={priorByQuoteId}
            canLogGap={canLogGap}
            uploadMode={quoteFileUploadMode({ vercel: process.env.VERCEL, blobReady: blobStoreReady() })}
          />
        </section>
      ) : (
        <div className="ff-card space-y-2 p-4" data-ff-quotes-current="" data-ff-quotes-current-empty="">
          {quotesHead}
          {issueControl}
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-navy">
              {productLabel
                ? `Quotes · ${productLabel}`
                : lineLabel
                  ? `Current ${lineLabel} quotes`
                  : "Current quotes"}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">No current quotes yet.</p>
        </div>
      )}
      {manualQuoteForm}
    </div>
  );
}
