"use client";

import { useState } from "react";
import { uploadDocument } from "@/app/actions/documents";
import { ChooseFileButton } from "@/components/choose-file-button";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { Button } from "@/components/ui/button";
import {
  DEAL_WORKSHEET_SOURCE_DOC_TYPES,
  SOURCE_DOC_ACCEPT,
} from "@/lib/deals/source-doc-types";
import { applyPickedFilesToRows, emptyUploadRow, type UploadDocRow } from "@/lib/documents/upload-rows";

export function SourceDocsUpload({
  dealId,
  riskId,
  line,
}: {
  dealId: string;
  riskId: string;
  line?: string | null;
}) {
  const [rows, setRows] = useState<UploadDocRow[]>([emptyUploadRow(0)]);

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

  return (
    <form action={uploadDocument} className="mb-3 space-y-2" data-ff-source-docs-upload>
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="riskId" value={riskId} />
      {line ? <input type="hidden" name="line" value={line} /> : null}
      <input type="hidden" name="rowCount" value={rows.length} />
      <p className="text-helper text-muted-foreground" data-ff-source-doc-type-hint="">
        Set the type to match the page — Date inspected only fills from a <span className="font-medium text-navy">4-point</span> (not Declaration).
      </p>
      {rows.map((row, index) => (
        <div key={row.id} className="deal-doc-row flex w-full flex-nowrap items-center gap-2">
          <select
            name={`docType_${index}`}
            value={row.docType}
            onChange={(event) => patchRow(row.id, { docType: event.target.value })}
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
        <Button type="submit" size="sm">
          Create
        </Button>
      </div>
    </form>
  );
}
