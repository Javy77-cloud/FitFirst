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

type Row = { id: number; docType: string; fileName: string; pick: number };

function emptyRow(id: number): Row {
  return { id, docType: "dec", fileName: "", pick: 0 };
}

export function SourceDocsUpload({
  dealId,
  riskId,
}: {
  dealId: string;
  riskId: string;
}) {
  const [rows, setRows] = useState<Row[]>([emptyRow(0)]);
  const [nextId, setNextId] = useState(1);

  function patchRow(id: number, patch: Partial<Row>) {
    setRows((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeRow(id: number) {
    setRows((current) => {
      if (current.length === 1) {
        return current.map((item) =>
          item.id === id ? { ...item, fileName: "", pick: item.pick + 1 } : item,
        );
      }
      return current.filter((item) => item.id !== id);
    });
  }

  return (
    <form action={uploadDocument} className="mb-3 space-y-2" data-ff-source-docs-upload>
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="riskId" value={riskId} />
      <input type="hidden" name="rowCount" value={rows.length} />
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
            className="h-8 shrink-0"
            onFile={(file) => patchRow(row.id, { fileName: file?.name ?? "" })}
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
            setRows((current) => [...current, emptyRow(nextId)]);
            setNextId((n) => n + 1);
          }}
        >
          + Add another document
        </button>
        <Button type="submit" size="sm">
          Save
        </Button>
      </div>
    </form>
  );
}
