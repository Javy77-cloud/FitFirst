"use client";

import { useTransition } from "react";
import { linkDealDocumentToProduct } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { sourceDocUploadedListLabel } from "@/lib/documents/deal-docs-save";

type LibraryCandidate = {
  id: string;
  filename: string;
  docType?: string | null;
  tags?: string[] | null;
};

/** Attach an existing deal-library file to this product window without re-upload. */
export function LinkDealDocToProduct({
  dealId,
  line,
  quotingForm,
  productInstance,
  candidates,
}: {
  dealId: string;
  line?: string | null;
  quotingForm?: string | null;
  productInstance?: string | null;
  candidates: LibraryCandidate[];
}) {
  const [pending, startTransition] = useTransition();
  if (candidates.length === 0) return null;

  return (
    <div className="mb-2 rounded-md border border-dashed border-border/80 p-2" data-ff-link-deal-doc="" data-ff-deal-library="">
      <p className="text-xs font-semibold text-navy" data-ff-deal-library-heading="">
        Deal library ({candidates.length})
      </p>
      <p className="mb-2 text-helper text-muted-foreground">
        On this deal, not on this form yet. Link adds this form and leaves the file on any other form.
      </p>
      <ul className="space-y-1.5">
          {candidates.map((doc) => (
            <li key={doc.id} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {sourceDocUploadedListLabel({
                  filename: doc.filename,
                  docType: doc.docType,
                  mimeType: null,
                })}
              </span>
              <Button
                type="button"
                size="xs"
                variant="secondary"
                disabled={pending}
                data-ff-link-deal-doc-action={doc.id}
                onClick={() => {
                  const form = new FormData();
                  form.set("documentId", doc.id);
                  form.set("dealId", dealId);
                  if (line) form.set("line", line);
                  if (quotingForm) form.set("quotingForm", quotingForm);
                  if (productInstance) form.set("productInstance", productInstance);
                  startTransition(async () => {
                    await linkDealDocumentToProduct(form);
                  });
                }}
              >
                Link
              </Button>
            </li>
          ))}
      </ul>
    </div>
  );
}
