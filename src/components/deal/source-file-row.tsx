"use client";

import { useState } from "react";
import { extractExisting, unlinkDealDocumentFromProduct } from "@/app/actions/documents";
import { retagDocumentAsDeclarationAction } from "@/app/actions/declaration";
import { isDeclarationDocType } from "@/lib/policy/dec-prompt";
import { FileActionMenu } from "@/components/documents/file-action-menu";
import { dealDocumentsTabHref } from "@/lib/documents/deal-docs-save";
import { Button } from "@/components/ui/button";
import {
  sourceDocDisplayName,
  sourceDocExtensionLabel,
  sourceDocUploadedListLabel,
} from "@/lib/documents/deal-docs-save";
import { isImageDoc } from "@/lib/leads/line-documents";
import { fileViewHref } from "@/lib/files/urls";
import type { Document } from "@/lib/db/schema";

export function SourceFileRow({
  doc,
  dealId,
  line,
  quotingForm,
}: {
  doc: Document;
  dealId: string;
  line?: string | null;
  quotingForm?: string | null;
}) {
  const [gone, setGone] = useState(false);
  if (gone) return null;
  const filename = sourceDocDisplayName(doc.filename);
  const listLabel = sourceDocUploadedListLabel({
    filename: doc.filename,
    docType: doc.docType,
    mimeType: doc.mimeType,
  });
  const photo = (() => {
    try {
      return isImageDoc({ filename, mimeType: doc.mimeType });
    } catch {
      return false;
    }
  })();

  return (
    <li className="deal-doc-row flex w-full items-center gap-2 rounded-md border border-border/70 px-2 py-1.5">
      <FileActionMenu
        documentId={doc.id}
        filename={filename}
        mimeType={doc.mimeType}
        slot={doc.slot}
        docType={doc.docType}
        tags={doc.tags}
        dealId={dealId}
        line={line}
        quotingForm={quotingForm}
        returnTo={line ? dealDocumentsTabHref(dealId, line) : dealDocumentsTabHref(dealId)}
        className="min-w-0 flex-1"
        onDeleted={() => setGone(true)}
        onUnlinked={() => setGone(true)}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileViewHref(doc.id)} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-secondary text-[10px] font-semibold uppercase text-muted-foreground">
            {sourceDocExtensionLabel(filename)}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy">
          {listLabel}
        </span>
      </FileActionMenu>
      {line ? (
        <form action={unlinkDealDocumentFromProduct}>
          <input type="hidden" name="documentId" value={doc.id} />
          <input type="hidden" name="dealId" value={dealId} />
          <input type="hidden" name="line" value={line} />
          {quotingForm ? <input type="hidden" name="quotingForm" value={quotingForm} /> : null}
          <Button type="submit" variant="ghost" size="xs" data-ff-unlink-from-product="">
            Remove from product
          </Button>
        </form>
      ) : null}
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
          {line ? <input type="hidden" name="line" value={line} /> : null}
          <Button type="submit" variant="ghost" size="xs">
            Re-extract
          </Button>
        </form>
      ) : null}
    </li>
  );
}
