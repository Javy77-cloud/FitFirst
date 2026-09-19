"use client";

import { replaceDocument } from "@/app/actions/document-versions";
import { ChooseFiles } from "@/components/choose-files";
import { DeleteUploadedFileButton } from "@/components/documents/delete-uploaded-file";
import { DocumentViewButton } from "@/components/documents/document-preview-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatDay } from "@/lib/domain";
import { currentVersionNumber, priorVersions, type DocumentVersionRow } from "@/lib/documents/versions";
import { fileVersionHref } from "@/lib/files/urls";

export function DocumentVersions({
  documentId,
  versions,
  dealId,
  policyId,
}: {
  documentId: string;
  versions: DocumentVersionRow[];
  dealId?: string | null;
  policyId?: string | null;
}) {
  const current = currentVersionNumber(versions);
  const prior = priorVersions(versions);

  return (
    <div className="space-y-2">
      {versions.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No versions yet. Replace keeps the current copy.</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Version {current}
          {prior.length ? ` · ${prior.length} prior kept` : " · first copy"}
        </p>
      )}
      {prior.length > 0 ? (
        <ol className="space-y-1 text-[11px]">
          {prior.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <span className="font-medium text-navy">v{row.versionNumber}</span>
              <DocumentViewButton
                documentId={documentId}
                filename={row.filename}
                mimeType={row.mimeType}
                src={fileVersionHref(documentId, row.id)}
                downloadHref={fileVersionHref(documentId, row.id, true)}
                className="text-[11px] hover:underline"
              >
                {row.filename}
              </DocumentViewButton>
              <span>{formatDay(row.createdAt)}</span>
              {row.uploadedByName ? <span>{row.uploadedByName}</span> : null}
              <a href={fileVersionHref(documentId, row.id, true)} className="hover:underline">
                Download
              </a>
            </li>
          ))}
        </ol>
      ) : null}
      <form action={replaceDocument} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="documentId" value={documentId} />
        {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
        {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
        <div>
          <Label className="text-[11px]">Replace (keeps prior)</Label>
          <ChooseFiles name="file" required className="mt-1 max-w-[22rem]" />
        </div>
        <Button type="submit" size="xs" variant="outline">
          Replace
        </Button>
      </form>
      <DeleteUploadedFileButton
        documentId={documentId}
        filename={versions.find((row) => row.versionNumber === current)?.filename ?? "this file"}
        dealId={dealId}
        policyId={policyId}
      />
    </div>
  );
}
