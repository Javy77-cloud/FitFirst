import { uploadDocument } from "@/app/actions/documents";
import { sendDocumentForSignature } from "@/app/actions/esign";
import { DeleteUploadedFileButton } from "@/components/documents/delete-uploaded-file";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Document } from "@/lib/db/schema";
import { DOC_TYPE_LABELS, DOC_TYPES, ESIGN_PROVIDERS } from "@/lib/domain";
import { ESIGN_PROVIDER_LABELS } from "@/lib/integrations/esign";

export function EntityUpload({
  dealId,
  riskId,
  contactId,
  policyId,
  returnTo,
}: {
  dealId?: string;
  riskId?: string;
  contactId?: string;
  policyId?: string;
  returnTo?: string;
}) {
  return (
    <form action={uploadDocument} className="space-y-2 rounded-md border border-border p-3">
      {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
      {riskId ? <input type="hidden" name="riskId" value={riskId} /> : null}
      {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
      {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Type</Label>
          <select
            name="docType"
            defaultValue="dec"
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {DOC_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Tags</Label>
          <Input name="tags" className="mt-1 h-8" placeholder="dec, wind-mit, photos" />
        </div>
      </div>
      <div>
        <Label className="text-xs">File</Label>
        <input name="file" type="file" required className="mt-1 block w-full text-xs" />
      </div>
      <Button type="submit" size="sm">
        Upload
      </Button>
    </form>
  );
}

export function DocumentTable({
  docs,
  returnTo = "/documents",
}: {
  docs: Document[];
  returnTo?: string;
}) {
  if (docs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No documents yet. Upload a dec, wind mit, 4-point, photo, or signed application.
      </p>
    );
  }
  return (
    <table className="ff-table">
      <thead>
        <tr>
          <th>File</th>
          <th>Type</th>
          <th>Tags</th>
          <th>Status</th>
          <th>E-sign</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {docs.map((doc) => (
          <tr key={doc.id}>
            <td className="font-medium">{doc.filename}</td>
            <td>{DOC_TYPE_LABELS[doc.docType as keyof typeof DOC_TYPE_LABELS] ?? doc.docType}</td>
            <td className="text-xs">{(doc.tags ?? []).join(", ") || "—"}</td>
            <td>{doc.status.replaceAll("_", " ")}</td>
            <td>
              <SendForSignature document={doc} returnTo={returnTo} compact />
            </td>
            <td>
              <DeleteUploadedFileButton
                documentId={doc.id}
                filename={doc.filename}
                slot={doc.slot}
                docType={doc.docType}
                dealId={doc.dealId}
                policyId={doc.policyId}
                contactId={doc.contactId}
                returnTo={returnTo}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SendForSignature({
  document,
  returnTo = "/esign",
  compact = false,
}: {
  document: Document;
  returnTo?: string;
  compact?: boolean;
}) {
  return (
    <form action={sendDocumentForSignature} className={compact ? "flex items-center gap-1" : "space-y-2"}>
      <input type="hidden" name="documentId" value={document.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {!compact ? (
        <>
          <Label className="text-xs">Provider (interface only)</Label>
          <select
            name="provider"
            defaultValue="docusign"
            className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {ESIGN_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {ESIGN_PROVIDER_LABELS[p]}
              </option>
            ))}
          </select>
          <Input name="signerName" className="h-8" placeholder="Signer name" />
          <Input name="signerEmail" className="h-8" placeholder="Signer email" />
        </>
      ) : (
        <input type="hidden" name="provider" value="docusign" />
      )}
      <Button type="submit" size="xs" variant="outline">
        Send for signature
      </Button>
    </form>
  );
}
