import { CONFIDENCE_THRESHOLD, formatPct } from "@/lib/domain";
import type { Document, ExtractedFieldRow } from "@/lib/db/schema";
import {
  acceptExtractedField,
  extractExisting,
} from "@/app/actions/documents";
import { uploadDealSlot } from "@/app/actions/lifecycle";
import { ChooseFiles } from "@/components/choose-files";
import { DealUploadDesk } from "@/components/deal/deal-upload-desk";
import { SourceDocsUpload } from "@/components/deal/source-docs-upload";
import { worksheetDocTypeLabel } from "@/lib/deals/source-doc-types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { CompletenessReport } from "@/lib/completeness/report";
import type { ExtractionJob } from "@/lib/db/schema";
import type { ShopLine } from "@/lib/domain";
import type { RecordContextPayload } from "@/lib/record-context-types";

export function DocumentsPanel({
  dealId,
  riskId,
  docs,
  fields,
  jobs = [],
  context,
  health,
  sheetLine,
}: {
  dealId: string;
  riskId: string;
  docs: Document[];
  fields: ExtractedFieldRow[];
  jobs?: ExtractionJob[];
  context: RecordContextPayload;
  health: CompletenessReport | null;
  sheetLine: ShopLine;
}) {
  const flagged = fields.filter((f) => f.flagged && !f.appliedToRisk);
  const sourceDocs = docs.filter((d) => d.slot !== "quote_pdf" && d.slot !== "policy_file");
  const quotePdfs = docs.filter((d) => d.slot === "quote_pdf");
  const sourceDocTypes = sourceDocs.map((doc) => doc.docType);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2" data-ff-deal-upload-split>
        <div className="min-w-0 space-y-4" data-ff-deal-upload>
        <section className="ff-card p-4">
          <h3 className="mb-1 text-base font-semibold text-navy">Source documents</h3>
          <p className="mb-3 text-base text-muted-foreground">
            Dec pages, wind mit, 4-point, and inspections stay on the deal. They feed the Quote
            Sheet. They are not issued policies.
          </p>

          <SourceDocsUpload dealId={dealId} riskId={riskId} />

          <DocTable docs={sourceDocs} dealId={dealId} empty="No source documents yet." />
        </section>

        <section className="ff-card p-4">
          <h3 className="mb-1 text-base font-semibold text-navy">Issued quote PDFs</h3>
          <p className="mb-3 text-base text-muted-foreground">
            Ranked quote results live as a note on this deal. These slots are for the PDFs you
            issued while shopping. A quote never becomes a policy.
          </p>
          <form action={uploadDealSlot} className="mb-3 space-y-2 rounded-md border border-border p-3">
            <input type="hidden" name="dealId" value={dealId} />
            <input type="hidden" name="riskId" value={riskId} />
            <input type="hidden" name="slot" value="quote_pdf" />
            <input type="hidden" name="docType" value="quote_pdf" />
            <Label className="text-xs">Quote PDF</Label>
            <ChooseFiles name="file" required className="mt-1" />
            <Button type="submit" size="sm">
              Upload
            </Button>
          </form>
          <DocTable docs={quotePdfs} dealId={dealId} empty="No issued quote PDFs yet." />
        </section>
        </div>

        <DealUploadDesk
          context={context}
          health={health}
          dealId={dealId}
          sheetLine={sheetLine}
          sourceDocTypes={sourceDocTypes}
        />
      </div>

      <section className="ff-card p-4">
        <h3 className="mb-1 text-base font-semibold text-navy">Extracted fields</h3>
        <p className="mb-3 text-base text-muted-foreground">
          High-confidence values apply to the worksheet automatically. Flagged rows wait for a
          human glance. Use <span className="font-medium">Fill blanks from source docs</span> on
          the Quote Sheet to copy these into missing cells (yellow missing / Needs review).
        </p>
        {flagged.length > 0 ? (
          <div className="mb-3 rounded-md bg-fit-flag-bg px-3 py-2 text-base text-fit-flag">
            {flagged.length} field{flagged.length === 1 ? "" : "s"} below{" "}
            {Math.round(CONFIDENCE_THRESHOLD * 100)}% — glance and accept before they hit the
            master record.
          </div>
        ) : null}
        {jobs.length > 0 ? (
          <div className="mb-3 space-y-1 rounded-md border border-border px-3 py-2">
            <p className="text-sm font-semibold text-navy">Latest ingest</p>
            {jobs.slice(0, 4).map((job) => (
              <p key={job.id} className="text-helper text-muted-foreground">
                {job.engine} · {job.status}
                {job.message ? ` — ${job.message}` : ""}
              </p>
            ))}
          </div>
        ) : null}
        {fields.length === 0 ? (
          <p className="text-base text-muted-foreground">Nothing extracted yet.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Raw</th>
                <th>Normalized</th>
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
                  <td className="font-mono text-[11px]">{field.rawValue}</td>
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
                      <span className="text-caption text-fit-green">On worksheet</span>
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
    </div>
  );
}

function DocTable({
  docs,
  dealId,
  empty,
}: {
  docs: Document[];
  dealId: string;
  empty: string;
}) {
  if (docs.length === 0) {
    return <p className="text-base text-muted-foreground">{empty}</p>;
  }
  return (
    <table className="ff-table">
      <thead>
        <tr>
          <th>File</th>
          <th>Type</th>
          <th>Slot</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {docs.map((doc) => (
          <tr key={doc.id}>
            <td className="font-medium">{doc.filename}</td>
            <td className="uppercase">{worksheetDocTypeLabel(doc.docType, true)}</td>
            <td className="text-[11px] uppercase">{doc.slot.replaceAll("_", " ")}</td>
            <td>
              {doc.slot === "source_doc" ? (
                <form action={extractExisting}>
                  <input type="hidden" name="documentId" value={doc.id} />
                  <input type="hidden" name="dealId" value={dealId} />
                  <Button type="submit" variant="ghost" size="xs">
                    Re-extract
                  </Button>
                </form>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
