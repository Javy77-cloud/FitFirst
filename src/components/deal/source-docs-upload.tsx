"use client";

import { useState } from "react";
import { uploadDocument } from "@/app/actions/documents";
import { ChooseFiles } from "@/components/choose-files";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DEAL_WORKSHEET_SOURCE_DOC_TYPES,
  SOURCE_DOC_ACCEPT,
} from "@/lib/deals/source-doc-types";

type Row = { id: number; docType: string };

export function SourceDocsUpload({
  dealId,
  riskId,
}: {
  dealId: string;
  riskId: string;
}) {
  const [rows, setRows] = useState<Row[]>([{ id: 0, docType: "dec" }]);
  const [nextId, setNextId] = useState(1);

  return (
    <form
      action={uploadDocument}
      className="mb-3 space-y-2 rounded-md border border-border p-3"
      data-ff-source-docs-upload
    >
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="riskId" value={riskId} />
      <input type="hidden" name="rowCount" value={rows.length} />
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="grid gap-2 rounded-md border border-border/70 p-2 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]"
            data-ff-source-doc-row
          >
            <div>
              <Label htmlFor={`docType_${index}`} className="text-xs">
                Type
              </Label>
              <select
                id={`docType_${index}`}
                name={`docType_${index}`}
                className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                defaultValue={row.docType}
              >
                {DEAL_WORKSHEET_SOURCE_DOC_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor={`files_${index}`} className="text-xs">
                File (PDF, photo, or text)
              </Label>
              <ChooseFiles
                id={`files_${index}`}
                name={`files_${index}`}
                accept={SOURCE_DOC_ACCEPT}
                multiple
                className="mt-1"
              />
            </div>
            {rows.length > 1 ? (
              <div className="flex items-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                >
                  Remove
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setRows((current) => [...current, { id: nextId, docType: "dec" }]);
            setNextId((n) => n + 1);
          }}
        >
          Add another file
        </Button>
        <Button type="submit" size="sm">
          Create
        </Button>
      </div>
    </form>
  );
}
