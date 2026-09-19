import { BackgroundFillRefresh } from "@/components/deal/background-fill-refresh";
import { DealDocsErrorBoundary } from "@/components/deal/deal-docs-error-boundary";
import { DealFormSends } from "@/components/deal/deal-form-sends";
import { SourceDocsUpload } from "@/components/deal/source-docs-upload";
import { MasterSheetWorkspace } from "@/components/deal/master-sheet-compare";
import { SourceFileRow } from "@/components/deal/source-file-row";
import { groupDocsByLine } from "@/lib/leads/line-documents";
import type { CompletenessReport } from "@/lib/completeness/report";
import type { Document, ExtractedFieldRow, QuoteSheetFieldValue } from "@/lib/db/schema";
import type { ShopLine } from "@/lib/domain";
import type { SheetProduct } from "@/lib/quote-sheet/products";
import { listWorksheetSourceDocs } from "@/lib/documents/deal-docs-save";
import { asList } from "@/lib/safe-list";

export function DocumentsPanel({
  dealId,
  riskId,
  docs,
  fields,
  jobs,
  health,
  sheetLine,
  sheetValues,
  formLabel,
  unlocked,
  approvedBy,
  product,
  pendingFill = false,
  hasCoApplicantFlag,
  needsReapprove = false,
  hasRequestedQuotes = false,
  productId,
  healthSherpa,
  insuredPropertyKind,
}: {
  dealId: string;
  riskId: string;
  docs: Document[];
  fields: ExtractedFieldRow[];
  jobs?: unknown[];
  health: CompletenessReport | null;
  sheetLine: ShopLine;
  sheetValues: Record<string, QuoteSheetFieldValue>;
  formLabel: string;
  unlocked: boolean;
  approvedBy?: string | null;
  product: SheetProduct;
  pendingFill?: boolean;
  hasCoApplicantFlag?: string | null;
  needsReapprove?: boolean;
  hasRequestedQuotes?: boolean;
  productId?: string | null;
  healthSherpa?: {
    medicareReady: boolean;
    acaReady: boolean;
  };
  insuredPropertyKind?: string | null;
}) {
  const { sourceDocs, lineDocs, otherSourceDocs } = listWorksheetSourceDocs(docs);
  const lineGroups = asList(groupDocsByLine(lineDocs));

  return (
    <DealDocsErrorBoundary>
      <div className="flex w-full flex-col space-y-4" data-ff-deal-docs data-ff-docs-zoom="100">
        <BackgroundFillRefresh dealId={dealId} jobs={(jobs as { engine?: string; status?: string; filledKeys?: string[]; skippedKeys?: string[]; message?: string | null }[]) ?? []} enabled={pendingFill} />
        <div className="w-full min-w-0" data-ff-deal-upload>
          <section className="ff-card w-full p-3">
            <h3 className="mb-1 text-sm font-semibold text-navy">Upload</h3>
            <p className="mb-2 text-helper text-muted-foreground">
              Type, file, create. Source files stay on this deal.
            </p>
            {lineGroups.length > 0 ? (
              <div className="mb-2 space-y-2" data-ff-deal-docs-by-line>
                {lineGroups.map((group) => (
                  <div key={group.line}>
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                      {group.label}
                    </p>
                    <ul className="mt-1 space-y-1.5">
                      {group.docs.map((doc) => (
                        <SourceFileRow key={doc.id} doc={doc} dealId={dealId} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}

            {otherSourceDocs.length > 0 ? (
              <ul className="mb-2 space-y-1.5">
                {otherSourceDocs.map((doc) => (
                  <SourceFileRow key={doc.id} doc={doc} dealId={dealId} showType />
                ))}
              </ul>
            ) : null}

            <SourceDocsUpload dealId={dealId} riskId={riskId} line={sheetLine} />
          </section>
          <DealFormSends dealId={dealId} />
        </div>

        <div className="w-full min-w-0 space-y-3" data-ff-deal-docs-sheet>
          <MasterSheetWorkspace
            dealId={dealId}
            line={sheetLine}
            fields={asList(fields)}
            values={sheetValues ?? {}}
            product={product}
            sourceDocCount={sourceDocs.length}
            formLabel={formLabel}
            unlocked={unlocked}
            approvedBy={approvedBy}
            hasCoApplicantFlag={hasCoApplicantFlag}
            needsReapprove={needsReapprove}
            hasRequestedQuotes={hasRequestedQuotes}
            productId={productId}
            healthSherpa={healthSherpa}
            insuredPropertyKind={insuredPropertyKind}
          />
          {health ? (
            <p className="text-helper text-muted-foreground">
              {health.confirmed} confirmed · {health.check} needs review · {health.missing} missing.
              Confirm the Risk Profile before quotes.
            </p>
          ) : null}
        </div>
      </div>
    </DealDocsErrorBoundary>
  );
}
