"use client";

import { useRef, useState } from "react";
import { attachSampleMelbourneDec, attachSamplePhotoDec, fillQuoteSheet } from "@/app/actions/quote-sheet";
import { uploadDocument, uploadSampleDocument } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Document, ExtractedFieldRow, ExtractionJob } from "@/lib/db/schema";
import type { ShopLine } from "@/lib/domain";
import { cn } from "@/lib/utils";

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
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <section className="ff-card p-4">
        <h3 className="text-sm font-semibold text-navy">Source files</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Dec pages, wind mit, 4-point, competing quotes, photos, and notes stay attachments.
          They are never the copy packet. <span className="font-medium">Fill Quote Sheet</span>{" "}
          is in this product — it writes extracted values into{" "}
          <span className="font-medium">blank</span> fields only. Photo-a-dec is a selling
          point: drop a photo and Fill still opens a first-class OCR job. This pass the job is{" "}
          <span className="font-mono">not_implemented</span> (no paid vendor). Photos do not
          block the text/PDF path.
        </p>

        <form
          action={uploadDocument}
          className={cn(
            "mb-3 rounded-md border border-dashed p-4",
            dragOver ? "border-primary bg-fit-check-bg/40" : "border-border",
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            const file = event.dataTransfer.files[0];
            const input = inputRef.current;
            if (!file || !input) return;
            const transfer = new DataTransfer();
            transfer.items.add(file);
            input.files = transfer.files;
            input.form?.requestSubmit();
          }}
        >
          <input type="hidden" name="dealId" value={dealId} />
          <input type="hidden" name="riskId" value={riskId} />
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="docType" className="text-xs">
                Type
              </Label>
              <select
                id="docType"
                name="docType"
                className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                defaultValue="dec"
              >
                <option value="dec">Declarations</option>
                <option value="wind_mit">Wind mitigation</option>
                <option value="four_point">4-point</option>
                <option value="inspection">Inspection</option>
                <option value="photo">Photo</option>
                <option value="quote">Quote PDF (later — does not fill)</option>
                <option value="other">Other / competing quote</option>
              </select>
            </div>
            <div>
              <Label htmlFor="file" className="text-xs">
                File (PDF, text, or image)
              </Label>
              <input
                ref={inputRef}
                id="file"
                name="file"
                type="file"
                accept=".pdf,.txt,.md,image/*"
                required
                className="mt-1 block w-full text-xs"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Drop a file here or choose one. Upload stores it on Files — it does not overwrite the
            Quote Sheet.
          </p>
          <Button type="submit" size="sm" className="mt-2">
            Upload to Files
          </Button>
        </form>

        <div className="mb-3 flex flex-wrap gap-2">
          <form action={fillQuoteSheet}>
            <input type="hidden" name="dealId" value={dealId} />
            <input type="hidden" name="line" value={line} />
            <Button type="submit" size="sm">
              Fill Quote Sheet
            </Button>
          </form>
          <form action={attachSampleMelbourneDec}>
            <input type="hidden" name="dealId" value={dealId} />
            <input type="hidden" name="riskId" value={riskId} />
            <Button type="submit" variant="outline" size="sm">
              Attach sample Melbourne dec
            </Button>
          </form>
          <form action={uploadSampleDocument}>
            <input type="hidden" name="dealId" value={dealId} />
            <input type="hidden" name="riskId" value={riskId} />
            <input type="hidden" name="sample" value="clean" />
            <Button type="submit" variant="outline" size="sm">
              Attach Ana sample dec
            </Button>
          </form>
          <form action={uploadSampleDocument}>
            <input type="hidden" name="dealId" value={dealId} />
            <input type="hidden" name="riskId" value={riskId} />
            <input type="hidden" name="sample" value="messy" />
            <Button type="submit" variant="outline" size="sm">
              Attach handwritten wind mit
            </Button>
          </form>
          <form action={attachSamplePhotoDec}>
            <input type="hidden" name="dealId" value={dealId} />
            <input type="hidden" name="riskId" value={riskId} />
            <Button type="submit" variant="outline" size="sm">
              Attach sample photo-a-dec
            </Button>
          </form>
        </div>

        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No attachments yet. Drop a dec or attach the sample Melbourne text dec.
          </p>
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
      </section>

      <section className="ff-card p-4">
        <h3 className="mb-1 text-sm font-semibold text-navy">Fill jobs · photo OCR hook</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Text PDFs and .txt run the real parser. A photo-a-dec always gets an{" "}
          <span className="font-mono">ocr</span> job row. This pass that row is{" "}
          <span className="font-mono">not_implemented</span> — Photo OCR is the next slice,
          not a paid vendor. Fill is not blocked when a photo is on the deal.
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
                  <td>
                    <span
                      className={
                        job.status === "not_implemented"
                          ? "text-fit-check"
                          : job.status === "failed"
                            ? "text-fit-red"
                            : "text-fit-green"
                      }
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="text-xs">
                    {job.message}
                    {job.filledKeys.length ? (
                      <div className="mt-1 text-fit-check">Filled: {job.filledKeys.join(", ")}</div>
                    ) : null}
                    {job.skippedKeys.length ? (
                      <div className="text-muted-foreground">
                        Left alone: {job.skippedKeys.join(", ")}
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
          <h3 className="mb-2 text-sm font-semibold text-navy">Last extract audit</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Raw parse log. The Quote Sheet is what Super-Copy uses.
          </p>
          <table className="ff-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Normalized</th>
                <th>Applied to blanks</th>
              </tr>
            </thead>
            <tbody>
              {fields.slice(0, 24).map((field) => (
                <tr key={field.id}>
                  <td>{field.fieldKey.replaceAll("_", " ")}</td>
                  <td>{field.normalizedValue}</td>
                  <td>{field.appliedToRisk ? "Yes" : "Skipped / already filled"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
