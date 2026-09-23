"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  attachPolicyFiles,
  preparePolicyBlobUpload,
  savePolicyDocumentFromBlob,
} from "@/app/actions/policy-files";
import { ChooseFiles } from "@/components/choose-files";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DOCUMENT_CATEGORIES } from "@/lib/desk/policy-family";
import { flashAction } from "@/lib/flash-client";
import { messageFromUploadError, planUpload } from "@/lib/files/upload-plan";

type UploadMode = { onVercel: boolean; directBlob: boolean };

/**
 * Policy Documents attach. Large inspection PDFs (4-point / wind mit) go
 * browser → Blob when over Vercel's ~4.5MB request body; small files still
 * use the Server Action. Failures stay on-tab as an alert — never the desk
 * error boundary — and a successful Blob commit persists before refresh.
 */
export function PolicyDocumentsAttach({
  policyId,
  dealId,
  uploadMode = { onVercel: false, directBlob: false },
}: {
  policyId: string;
  dealId?: string | null;
  uploadMode?: UploadMode;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("policy_dec");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState(0);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a file to attach. Nothing was saved.");
      return;
    }
    const plan = planUpload({
      filename: file.name,
      byteLength: file.size,
      mimeType: file.type,
      onVercel: uploadMode.onVercel,
      directBlob: uploadMode.directBlob,
    });
    if (!plan.ok) {
      setError(plan.error);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      let result: { ok: boolean; count: number; message?: string };
      if (plan.via === "blob-client") {
        const prep = new FormData();
        prep.set("policyId", policyId);
        if (dealId) prep.set("dealId", dealId);
        prep.set("filename", file.name);
        prep.set("byteLength", String(file.size));
        prep.set("mimeType", file.type);
        const prepared = await preparePolicyBlobUpload(prep);
        if (!prepared.ok) {
          setError(prepared.error);
          return;
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
        commit.set("docType", docType);
        if (expiresAt) commit.set("expiresAt", expiresAt);
        result = await savePolicyDocumentFromBlob(commit);
      } else {
        const formData = new FormData();
        formData.set("policyId", policyId);
        if (dealId) formData.set("dealId", dealId);
        formData.set("docType", docType);
        if (expiresAt) formData.set("expiresAt", expiresAt);
        formData.set("file", file);
        result = await attachPolicyFiles(formData);
      }
      if (!result.ok || result.count === 0) {
        setError(result.message ?? "Could not attach that file. Nothing was saved.");
        return;
      }
      setFile(null);
      setExpiresAt("");
      setPick((n) => n + 1);
      flashAction(result.count === 1 ? "Document attached" : `${result.count} documents attached`);
      router.refresh();
    } catch (saveError) {
      console.error("[PolicyDocumentsAttach]", saveError);
      setError(messageFromUploadError(saveError, file.name));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="my-3 grid gap-2 rounded-md border border-border p-3 sm:grid-cols-3"
      data-ff-policy-documents-attach=""
    >
      <input type="hidden" name="policyId" value={policyId} />
      <input type="hidden" name="dealId" value={dealId ?? ""} />
      {error ? (
        <p className="sm:col-span-3 text-sm text-destructive" role="alert" data-ff-policy-attach-error="">
          {error}
        </p>
      ) : null}
      <div>
        <Label className="text-xs">Type</Label>
        <select
          name="docType"
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          value={docType}
          onChange={(event) => setDocType(event.target.value)}
        >
          {DOCUMENT_CATEGORIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Expires (optional)</Label>
        <input
          type="date"
          name="expiresAt"
          value={expiresAt}
          onChange={(event) => setExpiresAt(event.target.value)}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        />
      </div>
      <div className="sm:col-span-2">
        <Label className="text-xs">File</Label>
        <ChooseFiles
          key={pick}
          name="file"
          required={!file}
          className="mt-1"
          onFiles={(files) => setFile(files[0] ?? null)}
        />
      </div>
      <Button type="submit" size="sm" disabled={saving}>
        {saving ? "Attaching…" : "Attach file"}
      </Button>
    </form>
  );
}
