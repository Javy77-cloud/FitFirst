"use client";

import { uploadDocument } from "@/app/actions/documents";
import { ChooseFiles } from "@/components/choose-files";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DEAL_WORKSHEET_SOURCE_DOC_TYPES,
  SOURCE_DOC_ACCEPT,
} from "@/lib/deals/source-doc-types";

export function SourceDocsUpload({
  dealId,
  riskId,
}: {
  dealId: string;
  riskId: string;
}) {
  return (
    <form
      action={uploadDocument}
      className="mb-3 grid gap-2 rounded-md border border-border p-2 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] sm:items-end"
      data-ff-source-docs-upload
    >
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="riskId" value={riskId} />
      <input type="hidden" name="rowCount" value="1" />
      <div>
        <Label htmlFor="docType_0" className="text-xs">
          Type
        </Label>
        <select
          id="docType_0"
          name="docType_0"
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          defaultValue="dec"
        >
          {DEAL_WORKSHEET_SOURCE_DOC_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="files_0" className="text-xs">
          File
        </Label>
        <ChooseFiles
          id="files_0"
          name="files_0"
          accept={SOURCE_DOC_ACCEPT}
          multiple
          className="mt-1"
        />
      </div>
      <Button type="submit" size="sm">
        Create
      </Button>
    </form>
  );
}
