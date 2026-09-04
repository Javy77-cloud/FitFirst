"use client";

import { useState } from "react";
import { attachPolicyFiles } from "@/app/actions/policy-files";
import { DocumentVersions } from "@/components/documents/document-versions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DOCUMENT_CATEGORIES } from "@/lib/desk/policy-family";
import type { DocumentVersionRow } from "@/lib/documents/versions";
import { groupVersionsByDocument } from "@/lib/documents/versions";
import { filePreviewHref } from "@/lib/files/urls";

type FileRow = { id: number; category: string };

export function PolicyFileAttach({
  policyId,
  dealId,
  files,
  versions = [],
}: {
  policyId: string;
  dealId?: string | null;
  files: { id: string; filename: string; docType: string }[];
  versions?: DocumentVersionRow[];
}) {
  const [rows, setRows] = useState<FileRow[]>([{ id: 1, category: "policy_dec" }]);
  const byDoc = groupVersionsByDocument(versions);

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-navy">Attachments</h3>
        <p className="text-xs text-muted-foreground">
          Attach issued files here. This is not Save policy — drop one or more, add another row if
          you need a second category. Replace keeps the prior copy on the version timeline.
        </p>
      </div>
      <form action={attachPolicyFiles} className="space-y-3 rounded-md border border-border p-3">
        <input type="hidden" name="policyId" value={policyId} />
        {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
        {rows.map((row, index) => (
          <div key={row.id} className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
            <div>
              <Label className="text-xs">Category</Label>
              <select
                name="category"
                defaultValue={row.category}
                className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              >
                {DOCUMENT_CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">{index === 0 ? "File" : `File ${index + 1}`}</Label>
              <input name="file" type="file" className="mt-1 block w-full text-xs" />
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setRows((current) => [...current, { id: Date.now(), category: "other" }])
            }
          >
            + Add another
          </Button>
          <Button type="submit" size="sm">
            Attach files
          </Button>
        </div>
      </form>
      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">No files on this policy yet.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {files.map((file) => (
            <li key={file.id} className="rounded-md border border-border p-2">
              <a href={filePreviewHref(file.id)} className="font-medium text-navy hover:underline">
                {file.filename}
              </a>
              <span className="text-muted-foreground"> · {file.docType.replaceAll("_", " ")}</span>
              <DocumentVersions
                documentId={file.id}
                versions={byDoc.get(file.id) ?? []}
                dealId={dealId}
                policyId={policyId}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
