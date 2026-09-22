"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { prepareDealBlobUpload, saveDealDocumentFromBlob, saveDealDocuments } from "@/app/actions/documents";
import { messageFromUploadError, planUpload } from "@/lib/files/upload-plan";
import { ChooseFileButton } from "@/components/choose-file-button";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { Button } from "@/components/ui/button";
import { DocSlotTabList } from "@/components/deal/doc-slot-tab-list";
import {
  DEAL_WORKSHEET_SOURCE_DOC_TYPES,
  SOURCE_DOC_ACCEPT,
} from "@/lib/deals/source-doc-types";
import {
  filledDocTypesForLine,
  initialDocSlot,
  planDocSaveAdvance,
  requiredDocSlots,
  type DocSlotDoc,
  type DocSlotProduct,
} from "@/lib/documents/doc-slot-advance";
import { flashAction } from "@/lib/flash-client";
import {
  applyPickedFilesToRows,
  buildDealDocumentRowForm,
  emptyUploadRow,
  filesToSave,
  type UploadDocRow,
} from "@/lib/documents/upload-rows";

export function SourceDocsUpload({
  dealId,
  riskId,
  line,
  product,
  quotingForm,
  surface = "documents",
  docSlot,
  marketsDone = false,
  quotesDone = false,
  savedDocs = [],
  packageProducts = [],
  uploadMode = { onVercel: false, directBlob: false },
}: {
  dealId: string;
  riskId: string;
  line?: string | null;
  product?: string | null;
  quotingForm?: string | null;
  surface?: "documents" | "quotes";
  docSlot?: string | null;
  marketsDone?: boolean;
  quotesDone?: boolean;
  savedDocs?: readonly DocSlotDoc[];
  packageProducts?: readonly DocSlotProduct[];
  uploadMode?: { onVercel: boolean; directBlob: boolean };
}) {
  const router = useRouter();
  const slots = requiredDocSlots({ product, quotingForm, shopLine: line });
  const filled = filledDocTypesForLine(savedDocs, line);
  const startingSlot = initialDocSlot(slots, filled, docSlot);
  const [activeSlot, setActiveSlot] = useState(startingSlot);
  const [rows, setRows] = useState<UploadDocRow[]>([emptyUploadRow(0, startingSlot)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectSlot(docType: string) {
    setActiveSlot(docType);
    setRows((current) => current.map((row) => (row.file ? row : { ...row, docType })));
  }

  function applyFiles(rowId: number, files: File[]) {
    setRows((current) => applyPickedFilesToRows(current, rowId, files));
  }

  function patchRow(id: number, patch: Partial<UploadDocRow>) {
    setRows((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeRow(id: number) {
    setRows((current) => {
      if (current.length === 1) {
        return current.map((item) =>
          item.id === id ? { ...item, fileName: "", file: null, pick: item.pick + 1 } : item,
        );
      }
      return current.filter((item) => item.id !== id);
    });
  }

  async function submitFromRows(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pending = filesToSave(rows);
    if (pending.length === 0) {
      flashAction("choose-file", "error");
      return;
    }
    for (const row of pending) {
      const plan = planUpload({
        filename: row.file.name,
        byteLength: row.file.size,
        mimeType: row.file.type,
        onVercel: uploadMode.onVercel,
        directBlob: uploadMode.directBlob,
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
        const plan = planUpload({
          filename: row.file.name,
          byteLength: row.file.size,
          mimeType: row.file.type,
          onVercel: uploadMode.onVercel,
          directBlob: uploadMode.directBlob,
        });
        try {
          if (plan.ok && plan.via === "blob-client") {
            const prep = new FormData();
            prep.set("dealId", dealId);
            prep.set("filename", row.file.name);
            prep.set("byteLength", String(row.file.size));
            prep.set("mimeType", row.file.type);
            const prepared = await prepareDealBlobUpload(prep);
            if (!prepared.ok) {
              lastMessage = prepared.error;
              continue;
            }
            const { uploadBytesToBlob } = await import("@/lib/files/direct-upload-client");
            const blob = await uploadBytesToBlob({
              pathname: prepared.pathname,
              file: row.file,
              contentType: prepared.mimeType,
              dealId,
            });
            const commit = new FormData();
            commit.set("dealId", dealId);
            commit.set("riskId", riskId);
            if (line) commit.set("line", line);
            commit.set("docType", row.docType);
            commit.set("filename", row.file.name);
            commit.set("byteLength", String(row.file.size));
            commit.set("mimeType", prepared.mimeType);
            commit.set("storageUrl", blob.url);
            const result = await saveDealDocumentFromBlob(commit);
            if (result.ok) saved += result.count;
            else lastMessage = result.message;
          } else {
            const formData = buildDealDocumentRowForm({
              dealId,
              riskId,
              line,
              docType: row.docType,
              file: row.file,
            });
            const result = await saveDealDocuments(formData);
            if (result.ok) saved += result.count;
            else lastMessage = result.message;
          }
        } catch (saveError) {
          console.error("[SourceDocsUpload]", saveError);
          lastMessage = messageFromUploadError(saveError, row.file.name);
        }
      }
      if (saved === 0 || lastMessage) {
        setError(lastMessage ?? "Could not save that file. Nothing was stored.");
        if (saved > 0) router.refresh();
        return;
      }
      const plan = planDocSaveAdvance({
        ok: true,
        savedDocTypes: pending.map((row) => row.docType),
        slots,
        filledDocTypes: filled,
        dealId,
        line,
        product,
        surface,
        marketsDone,
        quotesDone,
        packageProducts,
        docs: savedDocs,
      });
      if (plan.action === "stay") {
        setError(plan.error);
        return;
      }
      if (plan.action === "slot") {
        setActiveSlot(plan.docType);
        setRows([emptyUploadRow(0, plan.docType)]);
        setError(null);
        flashAction("documents-saved");
        router.replace(plan.href);
        router.refresh();
        return;
      }
      setError(null);
      flashAction(plan.toast);
      router.push(plan.href);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submitFromRows}
      className="mb-3 space-y-2"
      data-ff-source-docs-upload
    >
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="riskId" value={riskId} />
      {line ? <input type="hidden" name="line" value={line} /> : null}
      <input type="hidden" name="rowCount" value={rows.length} />
      <DocSlotTabList slots={slots} active={activeSlot} filled={filled} onSelect={selectSlot} />
      {error ? (
        <p className="text-sm text-destructive" role="alert" data-ff-doc-save-error="">
          {error}
        </p>
      ) : null}
      <p className="text-helper text-muted-foreground" data-ff-source-doc-type-hint="">
        Set the type to match the page — Date inspected only fills from a <span className="font-medium text-navy">4-point</span> (not Declaration).
      </p>
      {rows.map((row, index) => (
        <div key={row.id} className="deal-doc-row flex w-full flex-nowrap items-center gap-2">
          <select
            name={`docType_${index}`}
            value={row.docType}
            onChange={(event) => {
              const docType = event.target.value;
              patchRow(row.id, { docType });
              if (slots.some((slot) => slot.docType === docType)) setActiveSlot(docType);
            }}
            aria-label="Doc type"
            className="h-8 w-[10rem] shrink-0 rounded-md border border-input bg-card px-2 text-sm"
          >
            {DEAL_WORKSHEET_SOURCE_DOC_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <ChooseFileButton
            key={`${row.id}-${row.pick}`}
            name={`files_${index}`}
            accept={SOURCE_DOC_ACCEPT}
            keepLabel
            multiple
            assignedFile={row.file}
            className="h-8 shrink-0"
            onFiles={(files) => applyFiles(row.id, files)}
          />
          {row.fileName ? (
            <span className="deal-doc-filename min-w-0 flex-1 truncate text-sm text-navy" data-testid="deal-doc-filename">
              {row.fileName}
            </span>
          ) : (
            <span className="min-w-0 flex-1" aria-hidden />
          )}
          <FileDeleteIcon
            type="button"
            label={row.fileName ? `Remove ${row.fileName}` : "Remove file row"}
            onClick={() => removeRow(row.id)}
          />
        </div>
      ))}
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          data-testid="deal-add-document"
          onClick={() => {
            setRows((current) => [
              ...current,
              emptyUploadRow(Math.max(0, ...current.map((row) => row.id)) + 1),
            ]);
          }}
        >
          + Add another document
        </button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving…" : "Save files"}
        </Button>
      </div>
    </form>
  );
}
