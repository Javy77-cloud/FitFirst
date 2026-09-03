"use client";

import { attachSampleMelbourneDec, attachSamplePhotoDec } from "@/app/actions/quote-sheet";
import { uploadSampleDocument } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { SheetDrop } from "@/components/deal/sheet-drop";
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
        <p className="mb-3 text-xs text-muted-foreground">
          Decs, wind mits, photos stay here. They are never the copy packet.
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
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id}>
                  <td className="font-medium">{doc.filename}</td>
                  <td className="uppercase">{doc.docType.replaceAll("_", " ")}</td>
                  <td>{doc.status.replaceAll("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-muted-foreground">Demo files</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            <form action={attachSampleMelbourneDec}>
              <input type="hidden" name="dealId" value={dealId} />
              <input type="hidden" name="riskId" value={riskId} />
              <Button type="submit" variant="outline" size="sm">
                Melbourne dec
              </Button>
            </form>
            <form action={uploadSampleDocument}>
              <input type="hidden" name="dealId" value={dealId} />
              <input type="hidden" name="riskId" value={riskId} />
              <input type="hidden" name="sample" value="clean" />
              <Button type="submit" variant="outline" size="sm">
                Ana sample dec
              </Button>
            </form>
            <form action={attachSamplePhotoDec}>
              <input type="hidden" name="dealId" value={dealId} />
              <input type="hidden" name="riskId" value={riskId} />
              <Button type="submit" variant="outline" size="sm">
                Photo-a-dec
              </Button>
            </form>
          </div>
        </details>
      </section>

      <section className="ff-card p-4">
        <h3 className="mb-1 text-sm font-semibold text-navy">Fill jobs</h3>
        <p className="mb-3 text-xs text-muted-foreground">
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
