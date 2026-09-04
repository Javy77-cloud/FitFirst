import Link from "next/link";
import { CONFIDENCE_THRESHOLD, formatPct } from "@/lib/domain";
import type {
  Document,
  ExtractionJob,
  ExtractedFieldRow,
  FillFeedbackLog,
  QuoteSheetFieldValue,
} from "@/lib/db/schema";
import {
  acceptExtractedField,
  extractExisting,
  uploadDocument,
  uploadSampleDocument,
} from "@/app/actions/documents";
import { fillQuoteSheetBlanks } from "@/app/actions/lifecycle";
import { uploadDealSlot } from "@/app/actions/lifecycle";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DEAL_UPLOAD_DOC_TYPES, DOC_TYPE_LABELS, type ShopLine } from "@/lib/domain";
import { quotingFormById } from "@/lib/quoting/forms";
import { QuotingLinePicker } from "./quoting-line-picker";
import { FillSubmitButton } from "./fill-progress";
import { SourceVsSheet } from "./source-vs-sheet";
import { SheetApproveGate } from "./sheet-approve-gate";
import { QuoteHandoff } from "./quote-handoff";

export function DocumentsPanel({
  dealId,
  riskId,
  contactId,
  docs,
  fields,
  quotingForm,
  sheetValues,
  sheetLine = "home",
  unlocked,
  approvedBy,
  jobs = [],
  fillFeedback = [],
}: {
  dealId: string;
  riskId: string;
  contactId?: string | null;
  docs: Document[];
  fields: ExtractedFieldRow[];
  quotingForm?: string | null;
  sheetValues?: Record<string, QuoteSheetFieldValue> | null;
  sheetLine?: ShopLine;
  unlocked?: boolean;
  approvedBy?: string | null;
  jobs?: ExtractionJob[];
  fillFeedback?: FillFeedbackLog[];
}) {
  const flagged = fields.filter((f) => f.flagged && !f.appliedToRisk);
  const sourceDocs = docs.filter(
    (d) => d.slot !== "quote_pdf" && d.slot !== "policy_file" && d.slot !== "signed_app",
  );
  const quotePdfs = docs.filter((d) => d.slot === "quote_pdf");
  const signedApps = docs.filter((d) => d.slot === "signed_app" || d.docType === "signed_app");
  const form = quotingFormById(quotingForm ?? "");
  const lastJob = jobs[0];
  const failedJobs = jobs.filter((job) => job.status === "failed");
  const step =
    sourceDocs.length === 0
      ? 1
      : !quotingForm
        ? 2
        : !lastJob || lastJob.status === "failed"
          ? 3
          : unlocked
            ? 5
            : 4;

  return (
    <div className="space-y-4">
      <ol className="grid gap-2 sm:grid-cols-5">
        {[
          { n: 1, label: "Upload" },
          { n: 2, label: "Pick line" },
          { n: 3, label: "Fill master sheet" },
          { n: 4, label: "Review yellow / CHECK" },
          { n: 5, label: "Approve" },
        ].map((item) => (
          <li
            key={item.n}
            className={
              item.n === step
                ? "rounded-md border border-primary bg-fit-check-bg/50 px-2 py-1.5 text-xs font-semibold text-navy"
                : item.n < step
                  ? "rounded-md border border-border bg-fit-green-bg/40 px-2 py-1.5 text-xs text-fit-green"
                  : "rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground"
            }
          >
            {item.n}. {item.label}
          </li>
        ))}
      </ol>

      {lastJob ? (
        <p
          className={
            lastJob.status === "failed"
              ? "rounded-md bg-fit-flag-bg px-3 py-2 text-sm text-fit-flag"
              : "rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy"
          }
        >
          {lastJob.status === "failed" ? "Fill did not finish. " : "Last fill: "}
          {lastJob.message}
        </p>
      ) : null}
      {failedJobs.length > 1 ? (
        <p className="text-xs text-fit-flag">
          {failedJobs.length} fill errors on this deal. Scroll the job list below.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          <section className="ff-card p-4">
            <h3 className="mb-1 text-sm font-semibold text-navy">1 · Upload source documents</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Dec pages, wind mit, 4-point, and inspections stay on Deal Attachments. Detect type
              from the filename, or pick it. They never become the paste source.
            </p>

            <form action={uploadDocument} className="mb-3 space-y-2 rounded-md border border-border p-3">
              <input type="hidden" name="dealId" value={dealId} />
              <input type="hidden" name="riskId" value={riskId} />
              <input type="hidden" name="after" value="fill-sheet" />
              <input type="hidden" name="line" value={sheetLine} />
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="docType" className="text-xs">
                    Type
                  </Label>
                  <select
                    id="docType"
                    name="docType"
                    className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                    defaultValue="auto"
                  >
                    <option value="auto">Detect from filename</option>
                    {DEAL_UPLOAD_DOC_TYPES.filter((type) => type !== "signed_app" && type !== "quote").map(
                      (type) => (
                        <option key={type} value={type}>
                          {DOC_TYPE_LABELS[type]}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div>
                  <Label htmlFor="file" className="text-xs">
                    File (PDF or text)
                  </Label>
                  <input id="file" name="file" type="file" required className="mt-1 block w-full text-xs" />
                </div>
              </div>
              <FillSubmitButton label="Upload and fill master sheet" pendingLabel="Reading page…" />
            </form>

            <div className="mb-3 flex flex-wrap gap-2">
              <form action={uploadSampleDocument}>
                <input type="hidden" name="dealId" value={dealId} />
                <input type="hidden" name="riskId" value={riskId} />
                <input type="hidden" name="sample" value="clean" />
                <input type="hidden" name="line" value={sheetLine} />
                <FillSubmitButton label="Sample clean dec" pendingLabel="Filling…" variant="outline" />
              </form>
              <form action={uploadSampleDocument}>
                <input type="hidden" name="dealId" value={dealId} />
                <input type="hidden" name="riskId" value={riskId} />
                <input type="hidden" name="sample" value="messy" />
                <input type="hidden" name="line" value={sheetLine} />
                <FillSubmitButton
                  label="Sample handwritten wind mit"
                  pendingLabel="Filling…"
                  variant="outline"
                />
              </form>
              <form action={uploadSampleDocument}>
                <input type="hidden" name="dealId" value={dealId} />
                <input type="hidden" name="riskId" value={riskId} />
                <input type="hidden" name="sample" value="four_point" />
                <input type="hidden" name="line" value={sheetLine} />
                <FillSubmitButton label="Sample 4-point" pendingLabel="Filling…" variant="outline" />
              </form>
            </div>
            <DocTable docs={sourceDocs} dealId={dealId} empty="No source documents yet." />
          </section>

          <section className="ff-card p-4">
            <h3 className="mb-1 text-sm font-semibold text-navy">2 · Pick the line</h3>
            <QuotingLinePicker
              dealId={dealId}
              currentForm={quotingForm}
              sourceDocCount={sourceDocs.length}
            />
          </section>

          {quotingForm ? (
            <section className="ff-card p-4">
              <h3 className="mb-1 text-sm font-semibold text-navy">3 · Fill master sheet</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Parses every source doc on this deal into the {form?.label ?? "HO3"} Quote Sheet.
                Blanks only. Yellow missing / blue CHECK. Does not invent Coverage A from public
                listings.
              </p>
              <form action={fillQuoteSheetBlanks}>
                <input type="hidden" name="dealId" value={dealId} />
                <input type="hidden" name="line" value={sheetLine} />
                <FillSubmitButton
                  label={`Fill ${form?.label ?? "master"} sheet from source docs`}
                  pendingLabel="Reading source docs…"
                />
              </form>
            </section>
          ) : null}

          <section className="ff-card p-4">
            <h3 className="mb-1 text-sm font-semibold text-navy">Issued quote PDFs</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Ranked quote results live as a note on this deal. These slots are for the PDFs you
              issued while shopping. A quote never becomes a policy.
            </p>
            <form action={uploadDealSlot} className="mb-3 space-y-2 rounded-md border border-border p-3">
              <input type="hidden" name="dealId" value={dealId} />
              <input type="hidden" name="riskId" value={riskId} />
              <input type="hidden" name="slot" value="quote_pdf" />
              <input type="hidden" name="docType" value="quote_pdf" />
              <Label className="text-xs">Quote PDF</Label>
              <input name="file" type="file" required className="mt-1 block w-full text-xs" />
              <Button type="submit" size="sm">
                Attach quote PDF
              </Button>
            </form>
            <DocTable docs={quotePdfs} dealId={dealId} empty="No issued quote PDFs yet." />
          </section>

          <section className="ff-card p-4">
            <h3 className="mb-1 text-sm font-semibold text-navy">Signed app</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              E-sign returns land here — the signed application after DocuSign or Dropbox Sign.
              Connect a BYO provider in Settings. This is not a policy.
            </p>
            <form action={uploadDealSlot} className="mb-3 space-y-2 rounded-md border border-border p-3">
              <input type="hidden" name="dealId" value={dealId} />
              <input type="hidden" name="riskId" value={riskId} />
              <input type="hidden" name="slot" value="signed_app" />
              <input type="hidden" name="docType" value="signed_app" />
              <Label className="text-xs">Signed application</Label>
              <input name="file" type="file" required className="mt-1 block w-full text-xs" />
              <Button type="submit" size="sm">
                Attach signed app
              </Button>
            </form>
            <DocTable docs={signedApps} dealId={dealId} empty="No signed apps yet." />
          </section>
        </div>

        <div className="space-y-4">
          <section className="ff-card space-y-3 p-4">
            <h3 className="text-sm font-semibold text-navy">4 · Review source vs sheet</h3>
            <SourceVsSheet
              line={sheetLine}
              docs={sourceDocs}
              fields={fields}
              values={sheetValues ?? {}}
            />
            <SheetApproveGate
              dealId={dealId}
              line={sheetLine}
              formLabel={form?.label ?? "Master sheet"}
              unlocked={Boolean(unlocked)}
              approvedBy={approvedBy}
            />
            <QuoteHandoff
              dealId={dealId}
              line={sheetLine}
              formLabel={form?.label ?? "Master sheet"}
              unlocked={Boolean(unlocked)}
            />
            <p className="text-xs text-muted-foreground">
              Correct a mapped field on the{" "}
              <Link href={`/deals/${dealId}?tab=quote-sheet&line=${sheetLine}`} className="text-primary hover:underline">
                Quote Sheet
              </Link>
              . That writes the{" "}
              <Link href="/quotes/fill-feedback" className="text-primary hover:underline">
                Fill Feedback log
              </Link>
              {fillFeedback.length ? ` · ${fillFeedback.length} on this deal` : ""}.
            </p>
          </section>

          <section className="ff-card p-4">
            <h3 className="mb-1 text-sm font-semibold text-navy">Extracted fields</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              High-confidence values apply to the worksheet automatically. Flagged rows wait for a
              human glance. Fill master sheet copies these into missing cells (yellow / blue CHECK).
            </p>
            {flagged.length > 0 ? (
              <div className="mb-3 rounded-md bg-fit-flag-bg px-3 py-2 text-xs text-fit-flag">
                {flagged.length} field{flagged.length === 1 ? "" : "s"} below{" "}
                {Math.round(CONFIDENCE_THRESHOLD * 100)}% — glance and accept before they hit the
                master record.
              </div>
            ) : null}
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing extracted yet.</p>
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
                          <span className="text-[11px] text-fit-green">On worksheet</span>
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

          {jobs.length > 0 ? (
            <section className="ff-card p-4">
              <h3 className="mb-2 text-sm font-semibold text-navy">Fill jobs</h3>
              <ul className="space-y-2 text-xs">
                {jobs.map((job) => (
                  <li key={job.id}>
                    <span className="uppercase">{job.status}</span>
                    <span className="text-muted-foreground"> · {job.engine.replaceAll("_", " ")}</span>
                    {job.message ? <p className="text-muted-foreground">{job.message}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
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
    return <p className="text-sm text-muted-foreground">{empty}</p>;
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
            <td className="uppercase">{doc.docType.replaceAll("_", " ")}</td>
            <td className="text-[11px] uppercase">{doc.slot.replaceAll("_", " ")}</td>
            <td>
              {doc.slot === "source_doc" ? (
                <form action={extractExisting}>
                  <input type="hidden" name="documentId" value={doc.id} />
                  <input type="hidden" name="dealId" value={dealId} />
                  <Button type="submit" variant="ghost" size="xs">
                    Re-extract + fill
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
