"use client";

import { Eye } from "lucide-react";
import { DocumentViewButton } from "@/components/documents/document-preview-dialog";

export type DeclarationDocumentLink = {
  id: string;
  filename: string;
  mimeType?: string | null;
};

/** Opens the policy declaration in the same document popup as roof and four-point. */
export function DecDocumentEye({ document }: { document: DeclarationDocumentLink }) {
  return (
    <span data-ff-home-dec-eye={document.id} className="inline-flex">
      <DocumentViewButton
        documentId={document.id}
        filename={document.filename}
        mimeType={document.mimeType}
        className="inline-flex size-8 items-center justify-center rounded-md text-navy no-underline hover:bg-muted hover:no-underline"
      >
        <Eye className="size-4" aria-hidden />
        <span className="sr-only">View declaration</span>
      </DocumentViewButton>
    </span>
  );
}
