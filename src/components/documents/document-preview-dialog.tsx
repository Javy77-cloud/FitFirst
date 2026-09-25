"use client";

import { ProcessingLabel } from "@/components/desk/wait-hold";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  documentPreviewKind,
  interpretDocumentBytes,
  previewMimeFromResponse,
} from "@/lib/files/document-preview";
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

type LoadState = "idle" | "loading" | "ready" | "missing" | "error";

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
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  // Revoke prior blob: URLs when replaced or on unmount.
  useEffect(() => {
    return () => {
      if (previewSrc?.startsWith("blob:")) URL.revokeObjectURL(previewSrc);
    };
  }, [previewSrc]);

  useEffect(() => {
    if (!open) {
      setLoadState("idle");
      setPreviewSrc(null);
      return;
    }
    if (kind === "unsupported" || !href) {
      setLoadState("ready");
      setPreviewSrc(null);
      return;
    }

    let cancelled = false;
    setLoadState("loading");
    setPreviewSrc(null);

    // Authenticated full GET → blob: URL. Avoids blank Chrome PDF viewer when
    // iframe navigates to /api/files with Cache-Control: no-store, or when a
    // text/plain missing body carries a .pdf Content-Disposition filename.
    fetch(href, { method: "GET", credentials: "same-origin", cache: "no-store", redirect: "manual" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400)) {
          setLoadState("error");
          return;
        }
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        const head = new Uint8Array(buf.slice(0, 256));
        const verdict = interpretDocumentBytes({
          ok: res.ok,
          status: res.status,
          headers: res.headers,
          byteLength: buf.byteLength,
          head,
          kind,
        });
        if (verdict !== "ready") {
          setLoadState(verdict === "missing" ? "missing" : "error");
          return;
        }
        const mime =
          kind === "pdf" ? "application/pdf" : previewMimeFromResponse(res, kind);
        const objectUrl = URL.createObjectURL(new Blob([buf], { type: mime }));
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setPreviewSrc(objectUrl);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [open, href, kind]);

  const showMissing = loadState === "missing" || loadState === "error";
  const frameSrc = previewSrc;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] w-[min(96vw,64rem)] max-w-[64rem] flex-col gap-3 overflow-hidden sm:max-w-[64rem]"
        data-ff-document-preview=""
        data-ff-document-preview-kind={kind}
        data-ff-document-preview-state={loadState}
      >
        <DialogHeader>
          <DialogTitle className="truncate text-navy">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            In-app document preview. Close to return to the page.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-muted/20">
          {loadState === "loading" || loadState === "idle" ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground" data-ff-document-preview-loading="">
              <ProcessingLabel>Checking file…</ProcessingLabel>
            </div>
          ) : null}
          {showMissing ? (
            <div className="space-y-3 px-6 py-16 text-center" data-ff-document-preview-missing="">
              <p className="text-sm font-semibold text-navy">
                {title} is missing — re-upload
              </p>
              <p className="text-sm text-muted-foreground">
                The file is not in storage (empty or unreachable blob). Local disk uploads do not
                survive Vercel deploys. Re-upload the PDF from Policy documents.
              </p>
              {saveHref ? (
                <a
                  href={saveHref}
                  className="inline-flex text-sm font-medium text-primary hover:underline"
                >
                  Try download
                </a>
              ) : null}
            </div>
          ) : null}
          {!showMissing && loadState === "ready" && kind === "pdf" && frameSrc ? (
            <iframe title={title} src={frameSrc} className="h-[70vh] w-full border-0 bg-white" />
          ) : null}
          {!showMissing && loadState === "ready" && kind === "image" && frameSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={frameSrc}
              alt={title}
              className="mx-auto max-h-[70vh] w-auto max-w-full object-contain"
            />
          ) : null}
          {!showMissing && loadState === "ready" && kind === "unsupported" ? (
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
          {kind !== "unsupported" && !showMissing && saveHref ? (
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
