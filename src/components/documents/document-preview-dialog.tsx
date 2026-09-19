"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { documentPreviewKind } from "@/lib/files/document-preview";
import { fileDownloadHref, fileViewHref } from "@/lib/files/urls";
import { cn } from "@/lib/utils";

export type DocumentPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  filename: string;
  mimeType?: string | null;
  /** Override the inline src (prior versions). */
  src?: string;
  downloadHref?: string;
};

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  documentId,
  filename,
  mimeType,
  src,
  downloadHref,
}: DocumentPreviewDialogProps) {
  const kind = documentPreviewKind({ filename, mimeType });
  const href = src ?? (documentId ? fileViewHref(documentId) : "");
  const saveHref = downloadHref ?? (documentId ? fileDownloadHref(documentId) : "");
  const title = filename.trim() || "Document";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] w-[min(96vw,64rem)] max-w-[64rem] flex-col gap-3 overflow-hidden sm:max-w-[64rem]"
        data-ff-document-preview=""
        data-ff-document-preview-kind={kind}
      >
        <DialogHeader>
          <DialogTitle className="truncate text-navy">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            In-app document preview. Close to return to the page.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-muted/20">
          {kind === "pdf" && href ? (
            <iframe title={title} src={href} className="h-[70vh] w-full border-0 bg-white" />
          ) : null}
          {kind === "image" && href ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={href}
              alt={title}
              className="mx-auto max-h-[70vh] w-auto max-w-full object-contain"
            />
          ) : null}
          {kind === "unsupported" ? (
            <div className="space-y-3 px-6 py-16 text-center" data-ff-document-preview-unsupported="">
              <p className="text-sm font-semibold text-navy">This file type can’t be previewed here.</p>
              <p className="text-sm text-muted-foreground">
                Download {title} to open it on your computer. You stay on this page.
              </p>
              {saveHref ? (
                <a
                  href={saveHref}
                  className="inline-flex text-sm font-medium text-primary hover:underline"
                >
                  Download
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          {kind !== "unsupported" && saveHref ? (
            <a href={saveHref} className="text-sm text-primary hover:underline sm:mr-auto">
              Download
            </a>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DocumentViewButton({
  documentId,
  filename,
  mimeType,
  src,
  downloadHref,
  className,
  children,
}: {
  documentId: string;
  filename: string;
  mimeType?: string | null;
  src?: string;
  downloadHref?: string;
  className?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        data-ff-document-view=""
        className={cn("text-xs text-primary hover:underline", className)}
        onClick={() => setOpen(true)}
      >
        {children ?? "View"}
      </button>
      <DocumentPreviewDialog
        open={open}
        onOpenChange={setOpen}
        documentId={documentId}
        filename={filename}
        mimeType={mimeType}
        src={src}
        downloadHref={downloadHref}
      />
    </>
  );
}
