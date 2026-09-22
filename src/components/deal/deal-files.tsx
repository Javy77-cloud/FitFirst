"use client";

import { SheetDrop } from "@/components/deal/sheet-drop";
import { FileActionMenu } from "@/components/documents/file-action-menu";
import type { Document, ExtractedFieldRow, ExtractionJob } from "@/lib/db/schema";
import type { ShopLine } from "@/lib/domain";

export function DealFiles({
  dealId,
  riskId,
  line,
  docs,
  jobs,
  fields,
}: {
  dealId: string;
  riskId: string;
  line: ShopLine;
  docs: Document[];
  jobs: ExtractionJob[];
  fields: ExtractedFieldRow[];
}) {
  return (
    <div className="space-y-4">
      <SheetDrop dealId={dealId} riskId={riskId} line={line} />

      <section className="ff-card p-4">
        <h3 className="text-sm font-semibold text-navy">Source files</h3>
        <p className="mb-3 text-helper text-muted-foreground">
          Decs, wind mits, Four-Points, and photos stay here. They are never the copy packet.
        </p>
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attachments yet. Drop a dec above.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Type</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id}>
                  <td className="font-medium">
                    <FileActionMenu
                      documentId={doc.id}
                      filename={doc.filename}
                      mimeType={doc.mimeType}
                      slot={doc.slot}
                      docType={doc.docType}
                      dealId={dealId}
                    >
                      {doc.filename}
                    </FileActionMenu>
                  </td>
                  <td className="uppercase">{doc.docType.replaceAll("_", " ")}</td>
                  <td>{doc.status.replaceAll("_", " ")}</td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="ff-card p-4">
        <h3 className="mb-1 text-sm font-semibold text-navy">Fill jobs</h3>
        <p className="mb-3 text-helper text-muted-foreground">
          Text/PDF maps every labeled field. Photo OCR is a sibling hook — a photo does not block
          the text path.
        </p>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No fill jobs yet.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Engine</th>
                <th>Status</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="whitespace-nowrap text-xs">
                    {job.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="font-mono text-xs">{job.engine}</td>
                  <td>{job.status}</td>
                  <td className="text-xs">
                    {job.message}
                    {job.filledKeys.length ? (
                      <div className="mt-1 text-fit-check">
                        Filled {job.filledKeys.length}: {job.filledKeys.slice(0, 12).join(", ")}
                        {job.filledKeys.length > 12 ? "…" : ""}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {fields.length > 0 ? (
        <section className="ff-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-navy">Last extract</h3>
          <table className="ff-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Normalized</th>
                <th>On the sheet</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field.id}>
                  <td>{field.fieldKey.replaceAll("_", " ")}</td>
                  <td>{field.normalizedValue}</td>
                  <td>{field.appliedToRisk ? "Yes" : "Left alone"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
