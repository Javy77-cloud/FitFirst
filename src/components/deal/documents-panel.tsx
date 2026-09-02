import { CONFIDENCE_THRESHOLD, formatPct } from "@/lib/domain";
import type { Document, ExtractedFieldRow } from "@/lib/db/schema";
import {
  acceptExtractedField,
  extractExisting,
  uploadDocument,
  uploadSampleDocument,
} from "@/app/actions/documents";
import { SendForSignature } from "@/components/ops/entity-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DOC_TYPE_LABELS, DOC_TYPES } from "@/lib/domain";

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

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section className="ff-card p-4">
        <h3 className="mb-1 text-sm font-semibold text-navy">Source documents</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Dec pages, wind mit, 4-point, and photos stay attachments. Extracted values land on
          the master risk only after they clear the {Math.round(CONFIDENCE_THRESHOLD * 100)}%
          threshold — or after a 30-second glance.
        </p>

        <form action={uploadDocument} className="mb-3 space-y-2 rounded-md border border-border p-3">
          <input type="hidden" name="dealId" value={dealId} />
          <input type="hidden" name="riskId" value={riskId} />
          {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
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
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DOC_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="file" className="text-xs">
                File (PDF or text)
              </Label>
              <input
                id="file"
                name="file"
                type="file"
                required
                className="mt-1 block w-full text-xs"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="tags" className="text-xs">
              Tags
            </Label>
            <Input id="tags" name="tags" className="mt-1 h-8" placeholder="dec, wind-mit, photos" />
          </div>
          <Button type="submit" size="sm">
            Upload and extract
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

        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No attachments yet. Start with the sample dec or the messy wind mit to see confidence
            flags.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Type</th>
                <th>Tags</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id}>
                  <td className="font-medium">{doc.filename}</td>
                  <td className="uppercase">{doc.docType.replaceAll("_", " ")}</td>
                  <td className="text-xs">{(doc.tags ?? []).join(", ") || "—"}</td>
                  <td>{doc.status.replaceAll("_", " ")}</td>
                  <td className="space-y-1">
                    <form action={extractExisting}>
                      <input type="hidden" name="documentId" value={doc.id} />
                      <input type="hidden" name="dealId" value={dealId} />
                      <Button type="submit" variant="ghost" size="xs">
                        Re-extract
                      </Button>
                    </form>
                    <SendForSignature document={doc} returnTo={`/deals/${dealId}`} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="ff-card p-4">
        <h3 className="mb-1 text-sm font-semibold text-navy">Extracted fields</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          High-confidence values apply to the worksheet automatically. Flagged rows wait for a
          human glance — typical on handwritten wind mit and 4-point pages.
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
