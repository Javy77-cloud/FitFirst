import { extractExisting } from "@/app/actions/documents";
import { DocumentsZoom } from "@/components/deal/documents-zoom";
import { SourceDocsUpload } from "@/components/deal/source-docs-upload";
import { MasterSheetWorkspace } from "@/components/deal/master-sheet-compare";
import { FileActionMenu } from "@/components/documents/file-action-menu";
import { worksheetDocTypeLabel } from "@/lib/deals/source-doc-types";
import { groupDocsByLine, isImageDoc, lineFromTags } from "@/lib/leads/line-documents";
import { fileViewHref } from "@/lib/files/urls";
import { Button } from "@/components/ui/button";
import type { CompletenessReport } from "@/lib/completeness/report";
import type { Document, ExtractedFieldRow, QuoteSheetFieldValue } from "@/lib/db/schema";
import type { ShopLine } from "@/lib/domain";
import type { SheetProduct } from "@/lib/quote-sheet/products";
import { asList } from "@/lib/safe-list";

export function DocumentsPanel({
  dealId,
  riskId,
  docs,
  fields,
  health,
  sheetLine,
  sheetValues,
  formLabel,
  unlocked,
  approvedBy,
  product,
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
}) {
  const sourceDocs = asList(docs).filter((d) => d.slot !== "quote_pdf" && d.slot !== "policy_file");
  const lineDocs = sourceDocs.filter((d) => lineFromTags(d.tags));
  const otherSourceDocs = sourceDocs.filter((d) => !lineFromTags(d.tags));
  const lineGroups = asList(groupDocsByLine(lineDocs));

  return (
    <DocumentsZoom>
    <div className="flex w-full flex-col space-y-4" data-ff-deal-docs>
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

          <SourceDocsUpload dealId={dealId} riskId={riskId} />
        </section>
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
        />
        {health ? (
          <p className="text-helper text-muted-foreground">
            {health.confirmed} confirmed · {health.check} needs review · {health.missing} missing.
            Confirm the sheet before quotes.
          </p>
        ) : null}
      </div>
    </div>
    </DocumentsZoom>
  );
}

function SourceFileRow({
  doc,
  dealId,
  showType = false,
}: {
  doc: Document;
  dealId: string;
  showType?: boolean;
}) {
  return (
    <li className="deal-doc-row flex w-full items-center gap-2 rounded-md border border-border/70 px-2 py-1.5">
      <FileActionMenu
        documentId={doc.id}
        filename={doc.filename}
        slot={doc.slot}
        docType={doc.docType}
        dealId={dealId}
        className="min-w-0 flex-1"
      >
        {isImageDoc(doc) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileViewHref(doc.id)} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-secondary text-[10px] font-semibold uppercase text-muted-foreground">
            {doc.filename.split(".").pop()?.slice(0, 4) || "file"}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy">
          {doc.filename}
          {showType ? (
            <span className="ml-2 text-[11px] uppercase text-muted-foreground">
              {worksheetDocTypeLabel(doc.docType, true)}
            </span>
          ) : null}
        </span>
      </FileActionMenu>
      {doc.slot === "source_doc" ? (
        <form action={extractExisting}>
          <input type="hidden" name="documentId" value={doc.id} />
          <input type="hidden" name="dealId" value={dealId} />
          <Button type="submit" variant="ghost" size="xs">
            Re-extract
          </Button>
        </form>
      ) : null}
    </li>
  );
}
