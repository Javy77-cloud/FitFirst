"use client";

import { useMemo, useRef, useState } from "react";
import { uploadLeadLineDocument } from "@/app/actions/documents";
import { ChooseFileButton } from "@/components/choose-file-button";
import { FileActionMenu } from "@/components/documents/file-action-menu";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { Button } from "@/components/ui/button";
import { fileViewHref } from "@/lib/files/urls";
import {
  desiredShopLine,
  documentLinesFromDocs,
  isImageDoc,
  leadDocumentCardLines,
  remainingShopLines,
} from "@/lib/leads/line-documents";
import { SHOP_LINE_LABELS, type ShopLine } from "@/lib/domain";

export type LeadLineDoc = {
  id: string;
  filename: string;
  mimeType: string;
  tags: string[] | null;
  slot: string;
  docType: string;
};

export function LeadLineDocuments({
  leadId,
  dealId,
  insuranceTypeDesired,
  docs,
  extraLines,
  onExtraLines,
  hiddenLines,
  onHiddenLines,
}: {
  leadId: string;
  dealId?: string | null;
  insuranceTypeDesired?: string | null;
  docs: LeadLineDoc[];
  extraLines: ShopLine[];
  onExtraLines: (lines: ShopLine[]) => void;
  hiddenLines: ShopLine[];
  onHiddenLines: (lines: ShopLine[]) => void;
}) {
  const documentLines = documentLinesFromDocs(docs);
  const hidden = new Set(hiddenLines);
  const lines = leadDocumentCardLines({
    insuranceTypeDesired,
    documentLines,
    extraLines,
  }).filter((line) => !hidden.has(line));
  const leftover = remainingShopLines(lines);
  const openLine = desiredShopLine(insuranceTypeDesired);

  return (
    <aside className="ff-card min-w-0 p-4" data-ff-lead-line-docs>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-navy">Documents by line</h2>
          <p className="text-xs text-muted-foreground">
            Each line has its own files. Convert carries them onto the deal in the same groups.
          </p>
        </div>
        {leftover.length > 0 ? (
          <label className="text-xs font-medium text-navy">
            Add line
            <select
              className="mt-1 h-8 w-40 rounded-md border border-input bg-card px-2 text-sm"
              defaultValue=""
              aria-label="Add line"
              data-ff-add-line=""
              onChange={(event) => {
                const next = event.target.value as ShopLine;
                if (!next) return;
                onExtraLines(extraLines.includes(next) ? extraLines : [...extraLines, next]);
                onHiddenLines(hiddenLines.filter((line) => line !== next));
                event.target.value = "";
              }}
            >
              <option value="">Choose a line</option>
              {leftover.map((line) => (
                <option key={line} value={line}>
                  {SHOP_LINE_LABELS[line]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="space-y-2">
        {lines.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-sm text-muted-foreground" data-ff-add-line-empty="">
            Add a line of interest.
          </p>
        ) : (
          lines.map((line) => (
            <LineCard
              key={line}
              line={line}
              leadId={leadId}
              dealId={dealId}
              docs={docs.filter((doc) => (doc.tags ?? []).includes(`line:${line}`))}
              defaultOpen={line === openLine}
              onRemove={() => {
                onExtraLines(extraLines.filter((item) => item !== line));
                onHiddenLines(hidden.includes(line) ? hiddenLines : [...hiddenLines, line]);
              }}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function LineCard({
  line,
  leadId,
  dealId,
  docs,
  defaultOpen,
  onRemove,
}: {
  line: ShopLine;
  leadId: string;
  dealId?: string | null;
  docs: LeadLineDoc[];
  defaultOpen: boolean;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [slots, setSlots] = useState([0]);
  const [nextSlot, setNextSlot] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  const label = SHOP_LINE_LABELS[line];

  const countLabel = useMemo(() => {
    if (docs.length === 1) return "1 file";
    return `${docs.length} files`;
  }, [docs.length]);

  function submitSoon() {
    window.setTimeout(() => formRef.current?.requestSubmit(), 0);
  }

  return (
    <article className="min-w-0 rounded-md border border-border" data-ff-line-card={line}>
      <div className="flex items-center gap-1 pr-1">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 text-left hover:bg-secondary/60"
          aria-expanded={open}
        >
          <span className="truncate text-sm font-semibold text-navy">{label}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {countLabel} · {open ? "Collapse" : "Expand"}
          </span>
        </button>
        <span className="shrink-0" data-ff-line-card-delete={line}>
          <FileDeleteIcon type="button" label={`Remove ${label}`} onClick={onRemove} />
        </span>
      </div>
      {open ? (
        <div className="space-y-3 border-t border-border px-3 py-3">
          <form ref={formRef} action={uploadLeadLineDocument} className="space-y-2">
            <input type="hidden" name="leadId" value={leadId} />
            {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
            <input type="hidden" name="line" value={line} />
            <input type="hidden" name="rowCount" value={slots.length} />
            <div
              data-ff-line-dropzone={line}
              className="rounded-md border border-dashed border-border bg-secondary/30 px-3 py-3"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const files = Array.from(event.dataTransfer.files);
                if (files.length === 0 || !formRef.current) return;
                const first = formRef.current.querySelector<HTMLInputElement>('input[type="file"]');
                if (!first) return;
                const transfer = new DataTransfer();
                for (const file of files) transfer.items.add(file);
                first.files = transfer.files;
                first.dispatchEvent(new Event("change", { bubbles: true }));
                formRef.current.requestSubmit();
              }}
            >
              <p className="mb-2 text-xs text-muted-foreground">
                Drop a {label.toLowerCase()} file here, or choose one below.
              </p>
              <div className="space-y-2">
                {slots.map((id, index) => (
                  <div key={id} className="flex min-w-0 items-center" data-ff-file-slot={index}>
                    <ChooseFileButton
                      name={`files_${index}`}
                      accept=".pdf,.txt,.md,.jpg,.jpeg,.png,.webp,.heic,.heif,image/*"
                      className="max-w-full min-w-0"
                      onFile={(file) => {
                        if (file) submitSoon();
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSlots((current) => [...current, nextSlot]);
                    setNextSlot((value) => value + 1);
                  }}
                >
                  + Add file
                </Button>
              </div>
            </div>
          </form>
          {docs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No files on {label} yet.</p>
          ) : (
            <ul className="min-w-0 space-y-1.5">
              {docs.map((doc) => (
                <li
                  key={doc.id}
                  className="ff-file-row min-w-0 overflow-hidden rounded-md border border-border/70 px-2 py-1.5"
                  data-ff-line-file={doc.id}
                >
                  <FileActionMenu
                    documentId={doc.id}
                    filename={doc.filename}
                    slot={doc.slot}
                    docType={doc.docType}
                    leadId={leadId}
                    dealId={dealId}
                    returnTo={`/leads/${leadId}`}
                    className="min-w-0 flex-1"
                  >
                    {isImageDoc(doc) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={fileViewHref(doc.id)}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-secondary text-[10px] font-semibold uppercase text-muted-foreground">
                        {doc.filename.split(".").pop()?.slice(0, 4) || "file"}
                      </span>
                    )}
                    <span
                      title={doc.filename}
                      className="min-w-0 flex-1 truncate whitespace-nowrap text-sm font-medium text-navy"
                    >
                      {doc.filename}
                    </span>
                  </FileActionMenu>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </article>
  );
}
