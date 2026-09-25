"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  attachPolicyFiles,
  preparePolicyBlobUpload,
  savePolicyDocumentFromBlob,
} from "@/app/actions/policy-files";
import { ChooseFiles } from "@/components/choose-files";
import { FileActionMenu } from "@/components/documents/file-action-menu";
import { DocumentVersions } from "@/components/documents/document-versions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DOCUMENT_CATEGORIES } from "@/lib/desk/policy-family";
import type { DocumentVersionRow } from "@/lib/documents/versions";
import { groupVersionsByDocument } from "@/lib/documents/versions";
import { flashAction } from "@/lib/flash-client";
import { messageFromUploadError, planUpload } from "@/lib/files/upload-plan";

type FileRow = { id: number; category: string; file: File | null; pick: number };

export function PolicyFileAttach({
  policyId,
  dealId,
  files,
  versions = [],
  uploadMode,
}: {
  policyId: string;
  dealId?: string | null;
  files: { id: string; filename: string; docType: string }[];
  versions?: DocumentVersionRow[];
  uploadMode?: { onVercel: boolean; directBlob: boolean };
}) {
  const router = useRouter();
  const resolvedMode = uploadMode ?? { onVercel: false, directBlob: false };
  const [rows, setRows] = useState<FileRow[]>([{ id: 1, category: "policy_dec", file: null, pick: 0 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const byDoc = groupVersionsByDocument(versions);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pending = rows.filter((row) => row.file);
    if (pending.length === 0) {
      setError("Choose a file to attach. Nothing was saved.");
      return;
    }
    for (const row of pending) {
      const file = row.file!;
      const plan = planUpload({
        filename: file.name,
        byteLength: file.size,
        mimeType: file.type,
        onVercel: resolvedMode.onVercel,
        directBlob: resolvedMode.directBlob,
      });
      if (!plan.ok) {
        setError(plan.error);
        return;
      }
    }
    setError(null);
    setSaving(true);
    try {
      let saved = 0;
      let lastMessage: string | undefined;
      for (const row of pending) {
        const file = row.file!;
        const plan = planUpload({
          filename: file.name,
          byteLength: file.size,
          mimeType: file.type,
          onVercel: resolvedMode.onVercel,
          directBlob: resolvedMode.directBlob,
        });
        try {
          if (plan.ok && plan.via === "blob-client") {
            const prep = new FormData();
            prep.set("policyId", policyId);
            if (dealId) prep.set("dealId", dealId);
            prep.set("filename", file.name);
            prep.set("byteLength", String(file.size));
            prep.set("mimeType", file.type);
            const prepared = await preparePolicyBlobUpload(prep);
            if (!prepared.ok) {
              lastMessage = prepared.error;
              continue;
            }
            const { uploadBytesToBlob } = await import("@/lib/files/direct-upload-client");
            const blob = await uploadBytesToBlob({
              pathname: prepared.pathname,
              file,
              contentType: prepared.mimeType,
              scopeId: prepared.scopeId,
            });
            const commit = new FormData();
            commit.set("policyId", policyId);
            if (dealId) commit.set("dealId", dealId);
            commit.set("filename", file.name);
            commit.set("byteLength", String(file.size));
            commit.set("mimeType", prepared.mimeType);
            commit.set("storageUrl", blob.url);
            commit.set("docType", row.category);
            const result = await savePolicyDocumentFromBlob(commit);
            if (result.ok) saved += result.count;
            else lastMessage = result.message;
          } else {
            const formData = new FormData();
            formData.set("policyId", policyId);
            if (dealId) formData.set("dealId", dealId);
            formData.set("category", row.category);
            formData.set("file", file);
            const result = await attachPolicyFiles(formData);
            if (result.ok) saved += result.count;
            else lastMessage = result.message;
          }
        } catch (saveError) {
          console.error("[PolicyFileAttach]", saveError);
          lastMessage = messageFromUploadError(saveError, file.name);
        }
      }
      if (saved === 0) {
        setError(lastMessage ?? "Could not attach that file. Nothing was saved.");
        return;
      }
      setRows([{ id: Date.now(), category: "policy_dec", file: null, pick: 0 }]);
      flashAction(saved === 1 ? "Document attached" : `${saved} documents attached`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-navy">Attachments</h3>

      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-md border border-border p-3" data-ff-policy-file-attach="">
        <input type="hidden" name="policyId" value={policyId} />
        {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert" data-ff-policy-attach-error="">
            {error}
          </p>
        ) : null}
        {rows.map((row, index) => (
          <div key={row.id} className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
            <div>
              <Label className="text-xs">Category</Label>
              <select
                name="category"
                value={row.category}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item) =>
                      item.id === row.id ? { ...item, category: event.target.value } : item,
                    ),
                  )
                }
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
              <ChooseFiles
                key={`${row.id}-${row.pick}`}
                name="file"
                className="mt-1"
                onFiles={(picked) =>
                  setRows((current) =>
                    current.map((item) =>
                      item.id === row.id ? { ...item, file: picked[0] ?? null } : item,
                    ),
                  )
                }
              />
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setRows((current) => [
                ...current,
                { id: Date.now(), category: "other", file: null, pick: 0 },
              ])
            }
          >
            + Add another
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Attaching…" : "Attach files"}
          </Button>
        </div>
      </form>
      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">No files on this policy yet.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {files.map((file) => (
            <li key={file.id} className="rounded-md border border-border p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FileActionMenu
                  documentId={file.id}
                  filename={file.filename}
                  slot="policy_file"
                  docType={file.docType}
                  dealId={dealId}
                  policyId={policyId}
                  returnTo={`/policies/${policyId}?tab=documents`}
                  className="min-w-0 flex-1"
                >
                  <span className="font-medium text-navy">{file.filename}</span>
                  <span className="text-muted-foreground"> · {file.docType.replaceAll("_", " ")}</span>
                </FileActionMenu>
              </div>
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
