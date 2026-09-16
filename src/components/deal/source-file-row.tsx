"use client";

import { useState } from "react";
import { extractExisting } from "@/app/actions/documents";
import { retagDocumentAsDeclarationAction } from "@/app/actions/declaration";
import { isDeclarationDocType } from "@/lib/policy/dec-prompt";
import { FileActionMenu } from "@/components/documents/file-action-menu";
import { Button } from "@/components/ui/button";
import { worksheetDocTypeLabel } from "@/lib/deals/source-doc-types";
import { isImageDoc } from "@/lib/leads/line-documents";
import { fileViewHref } from "@/lib/files/urls";
import type { Document } from "@/lib/db/schema";

export function SourceFileRow({
  doc,
  dealId,
  showType = false,
}: {
  doc: Document;
  dealId: string;
  showType?: boolean;
}) {
  const [gone, setGone] = useState(false);
  if (gone) return null;

  return (
    <li className="deal-doc-row flex w-full items-center gap-2 rounded-md border border-border/70 px-2 py-1.5">
      <FileActionMenu
        documentId={doc.id}
        filename={doc.filename}
        slot={doc.slot}
        docType={doc.docType}
        dealId={dealId}
        className="min-w-0 flex-1"
        onDeleted={() => setGone(true)}
      >
        {isImageDoc(doc) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileViewHref(doc.id)} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-secondary text-[10px] font-semibold uppercase text-muted-foreground">
            {doc.filename.split(".").pop()?.slice(0, 4) || "file"}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy">
          {doc.filename}
          {showType ? (
            <span className="ml-2 text-[11px] uppercase text-muted-foreground">
              {worksheetDocTypeLabel(doc.docType, true)}
            </span>
          ) : null}
        </span>
      </FileActionMenu>
      {!isDeclarationDocType(doc.docType) ? (
        <form action={retagDocumentAsDeclarationAction}>
          <input type="hidden" name="documentId" value={doc.id} />
          <input type="hidden" name="dealId" value={dealId} />
          <Button type="submit" variant="ghost" size="xs" data-ff-retag-as-declaration="">
            Use as declaration
          </Button>
        </form>
      ) : null}
      {doc.slot === "source_doc" ? (
        <form action={extractExisting}>
          <input type="hidden" name="documentId" value={doc.id} />
          <input type="hidden" name="dealId" value={dealId} />
          <Button type="submit" variant="ghost" size="xs">
            Re-extract
          </Button>
        </form>
      ) : null}
    </li>
  );
}
