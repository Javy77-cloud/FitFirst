import { CONFIDENCE_THRESHOLD, formatPct } from "@/lib/domain";
import type { Document, ExtractedFieldRow } from "@/lib/db/schema";
import {
  acceptExtractedField,
  extractExisting,
  uploadDocument,
  uploadSampleDocument,
} from "@/app/actions/documents";
import { uploadDealSlot } from "@/app/actions/lifecycle";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DEAL_UPLOAD_DOC_TYPES, DOC_TYPE_LABELS } from "@/lib/domain";

export function DocumentsPanel({
  dealId,
  riskId,
  contactId,
  docs,
  fields,
}: {
  dealId: string;
  riskId: string;
  contactId?: string | null;
  docs: Document[];
  fields: ExtractedFieldRow[];
}) {
  const flagged = fields.filter((f) => f.flagged && !f.appliedToRisk);
  const sourceDocs = docs.filter(
    (d) => d.slot !== "quote_pdf" && d.slot !== "policy_file" && d.slot !== "signed_app",
  );
  const quotePdfs = docs.filter((d) => d.slot === "quote_pdf");
  const signedApps = docs.filter((d) => d.slot === "signed_app" || d.docType === "signed_app");

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="space-y-4">
        <section className="ff-card p-4">
          <h3 className="mb-1 text-sm font-semibold text-navy">Source documents</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Dec pages, wind mit, 4-point, and inspections stay on the deal. They feed the Quote
            Sheet. They are not issued policies.
          </p>

          <form action={uploadDocument} className="mb-3 space-y-2 rounded-md border border-border p-3">
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
            <Button type="submit" size="sm">
              Upload source doc
            </Button>
          </form>

          <div className="mb-3 flex flex-wrap gap-2">
            <form action={uploadSampleDocument}>
              <input type="hidden" name="dealId" value={dealId} />
              <input type="hidden" name="riskId" value={riskId} />
              <input type="hidden" name="sample" value="clean" />
              <Button type="submit" variant="outline" size="sm">
                Sample clean dec
              </Button>
            </form>
            <form action={uploadSampleDocument}>
              <input type="hidden" name="dealId" value={dealId} />
              <input type="hidden" name="riskId" value={riskId} />
              <input type="hidden" name="sample" value="messy" />
              <Button type="submit" variant="outline" size="sm">
                Sample handwritten wind mit
              </Button>
            </form>
          </div>
          <DocTable docs={sourceDocs} dealId={dealId} empty="No source documents yet." />
        </section>

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

      <section className="ff-card p-4">
        <h3 className="mb-1 text-sm font-semibold text-navy">Extracted fields</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          High-confidence values apply to the worksheet automatically. Flagged rows wait for a
          human glance. Use <span className="font-medium">Fill blanks from source docs</span> on
          the Quote Sheet to copy these into missing cells (yellow / blue CHECK).
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
