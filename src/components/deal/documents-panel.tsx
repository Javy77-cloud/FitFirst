import { CONFIDENCE_THRESHOLD, formatPct, type ShopLine } from "@/lib/domain";
import type { Document, ExtractedFieldRow, QuoteSheetFieldValue } from "@/lib/db/schema";
import { acceptExtractedField, extractExisting } from "@/app/actions/documents";
import { SourceDocsUpload } from "@/components/deal/source-docs-upload";
import { MasterSheetCompare } from "@/components/deal/master-sheet-compare";
import { SheetApproveGate } from "@/components/deal/sheet-approve-gate";
import { DeleteUploadedFileButton } from "@/components/documents/delete-uploaded-file";
import { worksheetDocTypeLabel } from "@/lib/deals/source-doc-types";
import { groupDocsByLine, isImageDoc, lineFromTags } from "@/lib/leads/line-documents";
import { fileViewHref } from "@/lib/files/urls";
import { Button } from "@/components/ui/button";
import type { CompletenessReport } from "@/lib/completeness/report";
import type { ExtractionJob } from "@/lib/db/schema";

export function DocumentsPanel({
  dealId,
  riskId,
  docs,
  fields,
  jobs = [],
  health,
  sheetLine,
  sheetValues,
  formLabel,
  unlocked,
  approvedBy,
}: {
  dealId: string;
  riskId: string;
  docs: Document[];
  fields: ExtractedFieldRow[];
  jobs?: ExtractionJob[];
  health: CompletenessReport | null;
  sheetLine: ShopLine;
  sheetValues: Record<string, QuoteSheetFieldValue>;
  formLabel: string;
  unlocked: boolean;
  approvedBy?: string | null;
}) {
  const flagged = fields.filter((f) => f.flagged && !f.appliedToRisk);
  const sourceDocs = docs.filter((d) => d.slot !== "quote_pdf" && d.slot !== "policy_file");
  const lineDocs = sourceDocs.filter((d) => lineFromTags(d.tags));
  const otherSourceDocs = sourceDocs.filter((d) => !lineFromTags(d.tags));
  const lineGroups = groupDocsByLine(lineDocs);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2" data-ff-deal-upload-split>
        <div className="min-w-0 space-y-4" data-ff-deal-upload>
          <section className="ff-card p-4">
            <h3 className="mb-1 text-base font-semibold text-navy">Upload</h3>
            <p className="mb-3 text-base text-muted-foreground">
              One zone. Type, file, create. Dec, wind mit, 4-point, and photos stay on this deal.
            </p>
            <SourceDocsUpload dealId={dealId} riskId={riskId} />

            {lineGroups.length > 0 ? (
              <div className="mb-3 space-y-2" data-ff-deal-docs-by-line>
                {lineGroups.map((group) => (
                  <details key={group.line} open className="rounded-md border border-border px-3 py-2">
                    <summary className="cursor-pointer text-sm font-semibold text-navy">
                      {group.label} · {group.docs.length} file{group.docs.length === 1 ? "" : "s"}
                    </summary>
                    <ul className="mt-2 space-y-1.5">
                      {group.docs.map((doc) => (
                        <SourceFileRow key={doc.id} doc={doc} dealId={dealId} />
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            ) : null}

            {otherSourceDocs.length === 0 && lineGroups.length === 0 ? (
              <p className="text-base text-muted-foreground">No source files yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {otherSourceDocs.map((doc) => (
                  <SourceFileRow key={doc.id} doc={doc} dealId={dealId} showType />
                ))}
              </ul>
            )}
          </section>

          {jobs.length > 0 || fields.length > 0 ? (
            <section className="ff-card p-4">
              <h3 className="mb-1 text-base font-semibold text-navy">Extracted fields</h3>
              {flagged.length > 0 ? (
                <div className="mb-3 rounded-md bg-fit-flag-bg px-3 py-2 text-base text-fit-flag">
                  {flagged.length} field{flagged.length === 1 ? "" : "s"} below{" "}
                  {Math.round(CONFIDENCE_THRESHOLD * 100)}% — glance and accept.
                </div>
              ) : null}
              {jobs.slice(0, 3).map((job) => (
                <p key={job.id} className="text-helper text-muted-foreground">
                  {job.engine} · {job.status}
                  {job.message ? ` — ${job.message}` : ""}
                </p>
              ))}
              {fields.length === 0 ? (
                <p className="text-base text-muted-foreground">Nothing extracted yet.</p>
              ) : (
                <table className="ff-table mt-2">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Value</th>
                      <th>Conf.</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field) => (
                      <tr
                        key={field.id}
                        className={field.flagged && !field.appliedToRisk ? "bg-fit-flag-bg/40" : ""}
                      >
                        <td className="font-medium">{field.fieldKey.replaceAll("_", " ")}</td>
                        <td>{field.normalizedValue}</td>
                        <td>
                          <span
                            className={
                              Number(field.confidence) < CONFIDENCE_THRESHOLD
                                ? "font-semibold text-fit-flag"
                                : "text-fit-green"
                            }
                          >
                            {formatPct(Number(field.confidence))}
                          </span>
                        </td>
                        <td>
                          {field.appliedToRisk ? (
                            <span className="text-caption text-fit-green">On sheet</span>
                          ) : (
                            <form action={acceptExtractedField}>
                              <input type="hidden" name="fieldId" value={field.id} />
                              <input type="hidden" name="dealId" value={dealId} />
                              <Button type="submit" size="xs">
                                Accept
                              </Button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ) : null}
        </div>

        <div className="space-y-3">
          <MasterSheetCompare line={sheetLine} fields={fields} values={sheetValues} />
          <SheetApproveGate
            dealId={dealId}
            line={sheetLine}
            formLabel={formLabel}
            unlocked={unlocked}
            approvedBy={approvedBy}
          />
          {health ? (
            <p className="text-helper text-muted-foreground">
              {health.confirmed} confirmed · {health.check} needs review · {health.missing} missing.
              No approval, no quotes requested.
            </p>
          ) : null}
        </div>
      </div>
    </div>
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
    <li className="flex items-center gap-2 rounded-md border border-border/70 px-2 py-1.5">
      {isImageDoc(doc) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fileViewHref(doc.id)} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-secondary text-[10px] font-semibold uppercase text-muted-foreground">
          {doc.filename.split(".").pop()?.slice(0, 4) || "file"}
        </span>
      )}
      <a
        href={fileViewHref(doc.id)}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1 truncate text-sm font-medium text-navy hover:underline"
      >
        {doc.filename}
        {showType ? (
          <span className="ml-2 text-[11px] uppercase text-muted-foreground">
            {worksheetDocTypeLabel(doc.docType, true)}
          </span>
        ) : null}
      </a>
      {doc.slot === "source_doc" ? (
        <form action={extractExisting}>
          <input type="hidden" name="documentId" value={doc.id} />
          <input type="hidden" name="dealId" value={dealId} />
          <Button type="submit" variant="ghost" size="xs">
            Re-extract
          </Button>
        </form>
      ) : null}
      <DeleteUploadedFileButton
        documentId={doc.id}
        filename={doc.filename}
        slot={doc.slot}
        docType={doc.docType}
        dealId={dealId}
        icon
      />
    </li>
  );
}
