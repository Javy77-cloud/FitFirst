"use client";

import { useRef, useState } from "react";
import { ingestDroppedDocuments } from "@/app/actions/ingest";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DeskDrop({ compact = false }: { compact?: boolean }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      action={ingestDroppedDocuments}
      className={cn(
        "rounded-md border border-dashed p-4",
        dragOver ? "border-primary bg-fit-check-bg/40" : "border-border",
        compact ? "" : "ff-card",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        const list = event.dataTransfer.files;
        const input = inputRef.current;
        if (!list?.length || !input) return;
        const transfer = new DataTransfer();
        for (const file of Array.from(list)) transfer.items.add(file);
        input.files = transfer.files;
        input.form?.requestSubmit();
      }}
    >
      <h2 className="text-sm font-semibold text-navy">Drop a dec, wind mit, or 4-point</h2>
      <p className={cn("mt-1 text-xs text-muted-foreground", compact ? "mb-2" : "mb-3 max-w-2xl")}>
        We find or create the Lead, open one shopping Deal, attach the file, and fill the master
        Quote Sheet. Matching values copy onto Deal blanks. No policy until bind.
      </p>
      <input type="hidden" name="docType" value="dec" />
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          id="deskFiles"
          name="files"
          type="file"
          multiple
          required
          accept=".pdf,.txt,.md,image/*"
          className="block text-xs"
        />
        <Button type="submit" size="sm">
          Upload and open the sheet
        </Button>
      </div>
    </form>
  );
}
