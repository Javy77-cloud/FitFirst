"use client";

import { useRef, useState } from "react";
import { ingestDroppedDocuments } from "@/app/actions/ingest";
import { ChooseFiles } from "@/components/choose-files";
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
      <h2 className="text-sm font-semibold text-navy">Drop a dec, wind mit, or Four-Point</h2>
      <p className={cn("mt-1 text-xs text-muted-foreground", compact ? "mb-2" : "mb-3 max-w-2xl")}>
        Source docs live on the Deal. We match or create the person, open one shopping deal,
        attach the file, and fill Quote Sheet blanks. No policy until bind.
      </p>
      <input type="hidden" name="docType" value="dec" />
      <div className="flex flex-wrap items-center gap-3">
        <ChooseFiles
          inputRef={inputRef}
          id="deskFiles"
          name="files"
          multiple
          required
          accept=".pdf,.txt,.md,image/*"
          className="min-w-[16rem] flex-1"
        />
        <Button type="submit" size="sm">
          Upload and open the sheet
        </Button>
      </div>
    </form>
  );
}
