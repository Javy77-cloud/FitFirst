import { saveLifeHealthQuoteResultAction } from "@/app/actions/quotes";
import { QuotesResultsTable } from "@/components/deal/quotes-results-table";
import type { QuoteFileRow } from "@/components/deal/quote-file-actions";
import { IssuePolicyFromDec, type IssuedPolicyChip } from "@/components/deal/issue-policy-from-dec";
import { Button } from "@/components/ui/button";
import { quoteFoldersByQuoteId } from "@/lib/deals/quote-docs";
import { blobStoreReady } from "@/lib/files/object-store";
import { quoteFileUploadMode } from "@/lib/files/upload-plan";
import { isBoundReadyForIssue } from "@/lib/policy/mint-gate";
import { sortQuotesByRatingThenPremium } from "@/lib/deals/quote-sort";
import { lifeHealthQuoteCarriers } from "@/lib/life/quote-writer";
import type { Carrier, Document, DocumentVersion, Quote, QuoteNote } from "@/lib/db/schema";

function labelFromTags(tags: string[] | null | undefined, fallback: string): string {
  for (const tag of tags ?? []) {
    if (tag.startsWith("label:") && tag.length > "label:".length) {
      return tag.slice("label:".length);
    }
  }
  return fallback;
}

function toQuoteFileRow(doc: Document, versions: DocumentVersion[]): QuoteFileRow {
  const version = versions.find((row) => row.documentId === doc.id) ?? null;
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

export function LifeHealthQuotesPanel({
  dealId,
  quotes,
  logs,
  quoteNotes = [],
  formId = "Term Life",
  docs = [],
  fileVersions = [],
  carriers = [],
  dealLine = "LIFE",
  shopLine = "life",
  product = null,
  productStage = null,
  selectedQuoteIds = [],
  boundQuoteId = null,
  mintStatus = null,
  issuedPolicy = null,
  autoIssue = false,
  canLogGap = false,
  healthSherpaEnrollment = null,
}: {
  dealId: string;
  quotes: { quote: Quote; carrier: Carrier }[];
  logs: { log: { carrierId: string; why?: string | null; lostReason?: string | null; result?: string | null } }[];
  quoteNotes?: QuoteNote[];
  formId?: string;
  docs?: Document[];
  fileVersions?: DocumentVersion[];
  carriers?: { id: string; name: string; writtenLines?: string[] | null }[];
  dealLine?: string;
  shopLine?: string;
  product?: string | null;
  productStage?: string | null;
  selectedQuoteIds?: string[];
  boundQuoteId?: string | null;
  mintStatus?: string | null;
  issuedPolicy?: IssuedPolicyChip | null;
  autoIssue?: boolean;
  canLogGap?: boolean;
  healthSherpaEnrollment?: {
    confirmationNumber: string | null;
    event: string;
    product: string;
    policyId: string | null;
  } | null;
}) {
  const liveQuotes = quotes.filter((row) => !row.quote.stub);
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
  const whyByCarrier: Record<string, string | null | undefined> = Object.fromEntries(
    logs.map((row) => [row.log.carrierId, row.log.why]),
  );
  const lostReasonByCarrier: Record<string, string | null | undefined> = Object.fromEntries(
    logs.map((row) => [row.log.carrierId, row.log.lostReason]),
  );
  const resultByCarrier: Record<string, string | undefined> = Object.fromEntries(
    logs.map((row) => [row.log.carrierId, row.log.result ?? undefined]),
  );
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
  const writerCarriers = lifeHealthQuoteCarriers(carriers, dealLine);
  const familyLabel = shopLine === "health" ? "Health" : "Life";

  return (
    <div className="space-y-4" data-ff-life-health-quotes="" data-ff-quotes-line={shopLine}>
      {shopLine === "health" && healthSherpaEnrollment ? (
        <section className="ff-card space-y-1 p-4" data-ff-healthsherpa-quote-status="">
          <h3 className="text-sm font-semibold text-navy">HealthSherpa enrollment</h3>
          <p className="text-xs text-muted-foreground">
            {healthSherpaEnrollment.event === "enrollment_submitted"
              ? "Enrollment submitted"
              : healthSherpaEnrollment.event}{" "}
            · {healthSherpaEnrollment.product}
            {healthSherpaEnrollment.confirmationNumber
              ? ` · ${healthSherpaEnrollment.confirmationNumber}`
              : ""}
            {healthSherpaEnrollment.policyId ? " · unpublished policy on file" : ""}. Manual
            enrollments may not fire the webhook.
          </p>
        </section>
      ) : null}
      <section className="ff-card space-y-3 p-4" data-ff-life-health-quote-writer="">
        <div>
          <h3 className="text-sm font-semibold text-navy">{familyLabel} quote writer</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Record quote-writer notes and results here. This is not a P&amp;C rate pull — stage and
            notice stay on the deal header.
          </p>
        </div>
        <form
          action={saveLifeHealthQuoteResultAction}
          className="grid gap-3 sm:grid-cols-2"
          data-ff-life-health-quote-form=""
        >
          <input type="hidden" name="dealId" value={dealId} />
          <input type="hidden" name="product" value={product ?? ""} />
          <input type="hidden" name="shopLine" value={shopLine} />
          <label className="text-xs text-navy">
            Carrier
            <select
              name="carrierId"
              required
              disabled={writerCarriers.length === 0}
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              defaultValue=""
              data-ff-life-health-quote-carrier=""
            >
              <option value="" disabled>
                {writerCarriers.length ? "Select carrier" : `No ${familyLabel} carriers on the desk`}
              </option>
              {writerCarriers.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-navy">
            Result
            <select
              name="outcome"
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              defaultValue="conditional"
              data-ff-life-health-quote-outcome=""
            >
              <option value="bindable">Quoted / bindable</option>
              <option value="conditional">Quoted / conditional</option>
              <option value="declined">Declined</option>
              <option value="no_market">No market</option>
            </select>
          </label>
          <label className="text-xs text-navy">
            Premium
            <input
              name="premium"
              type="text"
              inputMode="decimal"
              placeholder="Optional"
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              data-ff-life-health-quote-premium=""
            />
          </label>
          <label className="text-xs text-navy">
            Face amount
            <input
              name="faceAmount"
              type="text"
              inputMode="numeric"
              placeholder="Optional"
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              data-ff-life-health-quote-face=""
            />
          </label>
          <label className="sm:col-span-2 text-xs text-navy">
            Quote-writer notes
            <textarea
              name="notes"
              rows={3}
              placeholder="Carrier result, table, underwriting notes."
              className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm"
              data-ff-life-health-quote-notes=""
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={writerCarriers.length === 0}>
              Save result
            </Button>
          </div>
        </form>
      </section>

      {product &&
      (isBoundReadyForIssue(productStage) || mintStatus || issuedPolicy || autoIssue) ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <IssuePolicyFromDec
            dealId={dealId}
            product={product}
            stage={productStage}
            selectedQuoteIds={selectedQuoteIds}
            mintStatus={mintStatus}
            issued={issuedPolicy}
            autoOpen={autoIssue}
            folderHasPolicy={selectedHasFolderPolicy}
          />
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-ff-life-health-quotes-empty="">
          No quote-writer results yet. Add a carrier result above, then use stage and the header
          notice control.
        </p>
      ) : (
        <section className="ff-card overflow-hidden" data-ff-quotes-current="">
          <QuotesResultsTable
            dealId={dealId}
            rows={sorted}
            formId={formId}
            confirmLogs={[]}
            resultByCarrier={resultByCarrier}
            whyByCarrier={whyByCarrier}
            lostReasonByCarrier={lostReasonByCarrier}
            notesByQuote={notesByQuote}
            requestedCoverageA={null}
            quoteFilesByQuoteId={quoteFilesByQuoteId}
            boundQuoteId={boundQuoteId}
            selectedQuoteIds={selectedQuoteIds}
            product={product}
            productStage={productStage}
            canLogGap={canLogGap}
            uploadMode={quoteFileUploadMode({ vercel: process.env.VERCEL, blobReady: blobStoreReady() })}
          />
        </section>
      )}
    </div>
  );
}
