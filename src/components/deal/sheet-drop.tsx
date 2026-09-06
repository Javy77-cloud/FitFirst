"use client";

import { useRef, useState } from "react";
import { uploadDocument } from "@/app/actions/documents";
import { fillQuoteSheet } from "@/app/actions/quote-sheet";
import { DeleteUploadedFileButton } from "@/components/documents/delete-uploaded-file";
import { Button } from "@/components/ui/button";
import type { Document } from "@/lib/db/schema";
import type { ShopLine } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function SheetDrop({
  dealId,
  riskId,
  line,
  docs = [],
}: {
  dealId: string;
  riskId: string;
  line: ShopLine;
  docs?: Pick<Document, "id" | "filename" | "slot" | "docType">[];
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="ff-card space-y-3 p-4 print:hidden">
      <div>
        <h3 className="text-sm font-semibold text-navy">Upload once — dec, wind mit, or 4-point</h3>
        <p className="text-helper text-muted-foreground">
          PDF, photo, or text. We attach it, fill every blank the page contains, then gap-fill
          leftover blanks from public records with source tags. The uploaded page wins. Matching
          values copy onto Deal blanks (never overwrite what you typed).
        </p>
      </div>
      <form
        action={uploadDocument}
        className={cn(
          "rounded-md border border-dashed p-4",
          dragOver ? "border-primary bg-fit-check-bg/40" : "border-border",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files[0];
          const input = inputRef.current;
          if (!file || !input) return;
          const transfer = new DataTransfer();
          transfer.items.add(file);
          input.files = transfer.files;
          input.form?.requestSubmit();
        }}
      >
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="riskId" value={riskId} />
        <input type="hidden" name="line" value={line} />
        <input type="hidden" name="docType" value="auto" />
        <input type="hidden" name="after" value="fill-sheet" />
        <input type="hidden" name="returnTab" value="quote-sheet" />
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            id="sheet-file"
            name="file"
            type="file"
            accept=".pdf,.txt,.md,image/*"
            required
            className="block text-xs"
          />
          <Button type="submit" size="sm">
            Upload and fill
          </Button>
        </div>
      </form>
      <form action={fillQuoteSheet}>
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="line" value={line} />
        <Button type="submit" size="sm" variant="secondary">
          Fill from files already on this deal
        </Button>
      </form>
      {docs.length > 0 ? (
        <ul className="space-y-1 text-sm" data-ff-sheet-drop-files>
          {docs.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{doc.filename}</span>
              <DeleteUploadedFileButton
                documentId={doc.id}
                filename={doc.filename}
                slot={doc.slot}
                docType={doc.docType}
                dealId={dealId}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
