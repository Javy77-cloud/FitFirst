"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveDealDocuments } from "@/app/actions/documents";
import { ChooseFileButton } from "@/components/choose-file-button";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { Button } from "@/components/ui/button";
import { DocSlotTabList } from "@/components/deal/doc-slot-tab-list";
import {
  DEAL_WORKSHEET_SOURCE_DOC_TYPES,
  SOURCE_DOC_ACCEPT,
} from "@/lib/deals/source-doc-types";
import { DEAL_DOCUMENTS_BODY_LIMIT_BYTES } from "@/lib/documents/deal-docs-save";
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
}) {
  const router = useRouter();
  const slots = requiredDocSlots({ product, quotingForm, shopLine: line });
  const filled = filledDocTypesForLine(savedDocs, line);
  const startingSlot = initialDocSlot(slots, filled, docSlot);
  const [activeSlot, setActiveSlot] = useState(startingSlot);
  const [rows, setRows] = useState<UploadDocRow[]>([emptyUploadRow(0, startingSlot)]);
  const [saving, setSaving] = useState(false);

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
    if (pending.some((row) => row.file.size > DEAL_DOCUMENTS_BODY_LIMIT_BYTES)) {
      flashAction("documents-too-large", "error");
      return;
    }
    setSaving(true);
    try {
      let saved = 0;
      let lastReason: "choose-file" | "documents-save-failed" | undefined;
      for (const row of pending) {
        const formData = buildDealDocumentRowForm({
          dealId,
          riskId,
          line,
          docType: row.docType,
          file: row.file,
        });
        try {
          const result = await saveDealDocuments(formData);
          if (result.ok) saved += result.count;
          else lastReason = result.reason;
        } catch (error) {
          console.error("[SourceDocsUpload]", error);
          lastReason = "documents-save-failed";
        }
      }
      const activeLabel = slots.find((slot) => slot.docType === activeSlot)?.label ?? null;
      if (saved === 0 || lastReason) {
        const stay = planDocSaveAdvance({
          ok: false,
          reason: lastReason ?? "documents-save-failed",
          slotLabel: activeLabel,
          slots,
          filledDocTypes: filled,
          dealId,
        });
        flashAction(stay.action === "stay" ? stay.error : "documents-save-failed", "error");
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
        flashAction(plan.error, "error");
        return;
      }
      if (plan.action === "slot") {
        setActiveSlot(plan.docType);
        setRows([emptyUploadRow(0, plan.docType)]);
        flashAction("documents-saved");
        router.replace(plan.href);
        router.refresh();
        return;
      }
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
