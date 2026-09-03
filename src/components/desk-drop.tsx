"use client";

import { useRef, useState } from "react";
import { ingestDroppedDocuments } from "@/app/actions/ingest";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
      <h2 className="text-sm font-semibold text-navy">Drop a dec / wind mit / 4-point</h2>
      <p className={cn("mt-1 text-xs text-muted-foreground", compact ? "mb-2" : "mb-3 max-w-2xl")}>
        FitFirst finds or creates a <span className="font-medium text-foreground">Lead</span>,
        converts it to a <span className="font-medium text-foreground">Deal</span>, attaches the
        files, and starts the Quote Sheet (Home first). Source docs never create a Policy. Quote
        PDFs can attach later. Personal bind later makes Contact + Policy; commercial later makes
        Business + Policy.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor="deskDocType" className="text-xs">
            Type
          </Label>
          <select
            id="deskDocType"
            name="docType"
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            defaultValue="dec"
          >
            <option value="dec">Declarations</option>
            <option value="wind_mit">Wind mitigation</option>
            <option value="four_point">4-point</option>
            <option value="inspection">Inspection</option>
            <option value="photo">Photo</option>
            <option value="quote">Quote PDF (later attachment)</option>
          </select>
        </div>
        <div>
          <Label htmlFor="deskFiles" className="text-xs">
            Files
          </Label>
          <input
            ref={inputRef}
            id="deskFiles"
            name="files"
            type="file"
            multiple
            required
            accept=".pdf,.txt,.md,image/*"
            className="mt-1 block w-full text-xs"
          />
        </div>
      </div>
      <Button type="submit" size="sm" className="mt-3">
        Ingest to Lead → Deal
      </Button>
    </form>
  );
}
