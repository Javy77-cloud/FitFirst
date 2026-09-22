"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadPolicyIdCards } from "@/app/actions/policy-files";
import { ChooseFileButton } from "@/components/choose-file-button";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { flashAction } from "@/lib/flash-client";
import { applyPickedFilesToRows, emptyUploadRow, type UploadDocRow } from "@/lib/documents/upload-rows";

type IdCardRow = UploadDocRow & { displayName: string };

function emptyIdCardRow(id: number): IdCardRow {
  return { ...emptyUploadRow(id, "policy_id"), displayName: "" };
}

function basenameWithoutExt(name: string): string {
  const trimmed = name.trim();
  const idx = trimmed.lastIndexOf(".");
  if (idx <= 0) return trimmed;
  return trimmed.slice(0, idx) || trimmed;
}

function applyIdCardFiles(rows: IdCardRow[], rowId: number, files: File[]): IdCardRow[] {
  const before = new Map(rows.map((row) => [row.id, row]));
  const next = applyPickedFilesToRows(rows, rowId, files) as IdCardRow[];
  return next.map((row) => {
    const prev = before.get(row.id);
    if (!row.fileName) return { ...row, displayName: row.displayName ?? "" };
    if (prev && prev.fileName === row.fileName && prev.displayName) {
      return { ...row, displayName: prev.displayName };
    }
    return { ...row, displayName: basenameWithoutExt(row.fileName) };
  });
}

/** Quiet or modal-step upload: pick, clear, rename, multi-file, durable store. */
export function IdCardsUploadPanel({
  policyId,
  dealId,
  dismissOnSuccess = false,
  onSuccess,
  onCancel,
  compact = false,
}: {
  policyId: string;
  dealId?: string | null;
  dismissOnSuccess?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<IdCardRow[]>([emptyIdCardRow(0)]);
  const [error, setError] = useState<string | null>(null);

  const hasFile = useMemo(() => rows.some((row) => Boolean(row.file)), [rows]);

  function patchRow(id: number, patch: Partial<IdCardRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function clearRow(id: number) {
    setRows((current) => {
      if (current.length === 1) {
        return current.map((row) =>
          row.id === id
            ? { ...row, fileName: "", file: null, displayName: "", pick: row.pick + 1 }
            : row,
        );
      }
      return current.filter((row) => row.id !== id);
    });
  }

  function submit() {
    if (!hasFile) {
      setError("Choose at least one ID card file.");
      return;
    }
    setError(null);
    const data = new FormData();
    data.set("policyId", policyId);
    data.set("dealId", dealId ?? "");
    if (dismissOnSuccess) data.set("dismiss", "1");
    data.set("rowCount", String(rows.length));
    rows.forEach((row, index) => {
      if (!row.file) return;
      data.set(`file_${index}`, row.file);
      if (row.displayName.trim()) data.set(`displayName_${index}`, row.displayName.trim());
    });
    startTransition(async () => {
      const result = await uploadPolicyIdCards(data);
      if (!result.ok) {
        setError(result.reason === "choose-file" ? "Choose at least one ID card file." : "Could not upload ID cards.");
        return;
      }
      flashAction("document-uploaded");
      setRows([emptyIdCardRow(0)]);
      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <div
      className={compact ? "space-y-2" : "space-y-3 rounded-md border border-border bg-muted/10 p-3"}
      data-ff-id-cards-upload=""
    >
      {!compact ? (
        <p className="text-sm text-muted-foreground">
          Stores ID cards in this policy’s document folder with the DEC. You can clear a wrong file,
          rename the display name, and add more than one.
        </p>
      ) : null}
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={`${row.id}-${row.pick}`}
            className="flex flex-wrap items-end gap-2"
            data-ff-id-cards-row=""
          >
            <div className="min-w-[8rem]">
              <Label className="text-xs">File</Label>
              <ChooseFileButton
                name={`file_${row.id}`}
                accept="application/pdf,.pdf,image/*"
                keepLabel
                multiple
                assignedFile={row.file}
                className="mt-1 h-8"
                onFiles={(files) => setRows((current) => applyIdCardFiles(current, row.id, files))}
              />
            </div>
            {row.fileName ? (
              <>
                <div className="min-w-[10rem] flex-1">
                  <Label className="text-xs">Display name</Label>
                  <Input
                    className="mt-1 h-8"
                    value={row.displayName}
                    onChange={(event) => patchRow(row.id, { displayName: event.target.value })}
                    placeholder={row.fileName}
                    aria-label={`Display name for ${row.fileName}`}
                    data-ff-id-cards-rename=""
                  />
                </div>
                <span
                  className="mb-1 max-w-[12rem] truncate text-xs text-muted-foreground"
                  title={row.fileName}
                  data-ff-id-cards-filename=""
                >
                  {row.fileName}
                </span>
                <FileDeleteIcon
                  type="button"
                  className="mb-0.5"
                  label={`Clear ${row.fileName}`}
                  onClick={() => clearRow(row.id)}
                  data-ff-id-cards-clear=""
                />
              </>
            ) : null}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="text-sm font-medium text-primary hover:underline"
        data-ff-id-cards-add=""
        onClick={() =>
          setRows((current) => [
            ...current,
            emptyIdCardRow(Math.max(0, ...current.map((row) => row.id)) + 1),
          ])
        }
      >
        + Add another ID card
      </button>
      {error ? (
        <p className="text-xs text-destructive" role="alert" data-ff-id-cards-error="">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onCancel} data-ff-id-cards-cancel="">
            Cancel
          </Button>
        ) : null}
        <Button type="button" size="sm" disabled={pending || !hasFile} onClick={submit} data-ff-id-cards-upload-submit="">
          {pending ? "Uploading…" : "Upload"}
        </Button>
      </div>
    </div>
  );
}
