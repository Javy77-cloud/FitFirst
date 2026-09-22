"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { uploadAgencyQuoteFileAction } from "@/app/actions/quote-files";
import { deleteUploadedFile } from "@/app/actions/documents";
import { retagDocumentAsDeclarationAction } from "@/app/actions/declaration";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { deleteUploadedFileSubject, uploadedFileDeleteMode } from "@/lib/documents/delete-file";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/domain";
import { DocumentViewButton } from "@/components/documents/document-preview-dialog";
import { fileDownloadHref } from "@/lib/files/urls";
import {
  bindRequirementChips,
  normalizeRiskOutcome,
  riskOutcomeLabel,
} from "@/lib/quotes/outcomes";
import {
  ISSUED_POLICY_FOLDER_SAVED,
  type IssuedPolicyFolderSavedDetail,
} from "@/lib/policy/issued-upload";
import { cn } from "@/lib/utils";
import { Download, Eye, FolderOpen } from "lucide-react";

export type QuoteFileRow = {
  id: string;
  filename: string;
  displayName: string;
  uploadedByName: string | null;
  createdAt: string | Date;
  slot?: string | null;
  docType?: string | null;
};

export type QuoteQuickViewFields = {
  quoteNumber?: string | null;
  premium?: string | number | null;
  coverageA?: number | null;
  aopDeductible?: string | null;
  hurricaneDeductible?: string | null;
  bindable?: boolean | null;
  riskOutcome?: string | null;
  notes?: string | null;
  bindRequirements?: string[] | null;
  coverageGaps?: string[] | null;
};

type OpenDialog = "carrier" | "quick" | "agency" | null;

function formatWhen(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function displayOrDash(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  return String(value);
}

function IconBadgeButton({
  title,
  count,
  onClick,
  children,
  testId,
}: {
  title: string;
  count: number;
  onClick: () => void;
  children: ReactNode;
  testId: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      data-ff={testId}
      onClick={onClick}
      className={cn(
        "relative inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-navy shadow-sm transition-colors",
        "hover:bg-muted hover:text-navy",
      )}
    >
      {children}
      {count > 0 ? (
        <span
          className="pointer-events-none absolute top-0 right-0 z-10 inline-flex size-4 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-fit-flag text-[9px] font-semibold leading-none text-white shadow-sm"
          data-ff-quote-file-badge=""
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}

function FileList({
  files,
  empty,
  dealId,
  carrierName,
}: {
  files: QuoteFileRow[];
  empty: ReactNode;
  dealId: string;
  carrierName?: string | null;
}) {
  if (files.length === 0) return <>{empty}</>;
  return (
    <ul className="space-y-2" data-ff-quote-file-list="">
      {files.map((file) => (
        <li
          key={file.id}
          className="rounded-lg border border-border/70 bg-muted/20 px-2.5 py-2"
          data-ff-quote-file-row={file.id}
        >
          <div className="truncate text-sm font-medium text-navy">{file.displayName}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {file.filename}
            {file.uploadedByName || file.createdAt
              ? ` · ${file.uploadedByName ?? "—"} · ${formatWhen(file.createdAt)}`
              : null}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <DocumentViewButton documentId={file.id} filename={file.filename} />
            <a href={fileDownloadHref(file.id)} className="text-xs text-primary hover:underline">
              Download
            </a>
            <form action={retagDocumentAsDeclarationAction}>
              <input type="hidden" name="documentId" value={file.id} />
              <input type="hidden" name="dealId" value={dealId} />
              {carrierName ? <input type="hidden" name="carrierName" value={carrierName} /> : null}
              <button
                type="submit"
                className="text-xs text-primary hover:underline"
                data-ff-retag-as-declaration={file.id}
              >
                Use as declaration
              </button>
            </form>
            <HardDeleteForm
              action={deleteUploadedFile}
              subject={deleteUploadedFileSubject(
                file.filename,
                uploadedFileDeleteMode({
                  slot: file.slot || "quote_file",
                  docType: file.docType || "other",
                }),
              )}
              className="inline"
            >
              <input type="hidden" name="documentId" value={file.id} />
              <input type="hidden" name="dealId" value={dealId} />
              <input type="hidden" name="returnTo" value={`/deals/${dealId}?tab=quotes`} />
              <FileDeleteIcon
                label="Delete"
                data-ff-quote-file-delete={file.id}
              />
            </HardDeleteForm>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function QuoteFileActions({
  dealId,
  quoteId,
  carrierName,
  quote,
  carrierFiles,
  agencyFiles,
  requestedCoverageA = null,
}: {
  dealId: string;
  quoteId: string;
  carrierName: string;
  quote: QuoteQuickViewFields;
  carrierFiles: QuoteFileRow[];
  agencyFiles: QuoteFileRow[];
  requestedCoverageA?: number | null;
}) {
  const [open, setOpen] = useState<OpenDialog>(null);
  const [pending, startTransition] = useTransition();
  const [pendingFolderFile, setPendingFolderFile] = useState<IssuedPolicyFolderSavedDetail | null>(null);

  useEffect(() => {
    function onSaved(event: Event) {
      const detail = (event as CustomEvent<IssuedPolicyFolderSavedDetail>).detail;
      if (!detail || detail.quoteId !== quoteId) return;
      setPendingFolderFile(detail);
    }
    window.addEventListener(ISSUED_POLICY_FOLDER_SAVED, onSaved);
    return () => window.removeEventListener(ISSUED_POLICY_FOLDER_SAVED, onSaved);
  }, [quoteId]);

  const agencyCount =
    agencyFiles.length +
    (pendingFolderFile?.folder === "manual" && !agencyFiles.some((file) => file.id === pendingFolderFile.documentId)
      ? 1
      : 0);
  const carrierCount =
    carrierFiles.length +
    (pendingFolderFile?.folder === "carrier" &&
    !carrierFiles.some((file) => file.id === pendingFolderFile.documentId)
      ? 1
      : 0);

  const outcome =
    normalizeRiskOutcome(quote.riskOutcome) ?? (quote.bindable ? "bindable" : "conditional");
  const reqChips = useMemo(
    () =>
      bindRequirementChips({
        notes: quote.notes,
        gaps: quote.coverageGaps,
        bindRequirements: quote.bindRequirements,
        coverageA: quote.coverageA,
        hurricaneDeductible: quote.hurricaneDeductible,
        requestedCoverageA,
      }),
    [quote, requestedCoverageA],
  );
  const notesSnippet = (quote.notes ?? "").trim();

  function toggle(kind: Exclude<OpenDialog, null>) {
    setOpen((current) => (current === kind ? null : kind));
  }

  function onAgencyUpload(form: HTMLFormElement) {
    const data = new FormData(form);
    data.set("dealId", dealId);
    data.set("quoteId", quoteId);
    startTransition(async () => {
      await uploadAgencyQuoteFileAction(data);
    });
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-1" data-ff-quote-file-actions={quoteId}>
        <IconBadgeButton
          title="Download Quote File From Carrier"
          count={carrierCount}
          onClick={() => toggle("carrier")}
          testId={`quote-carrier-files-${quoteId}`}
        >
          <Download className="size-3.5" />
        </IconBadgeButton>
        <IconBadgeButton
          title="Quick Quote View"
          count={0}
          onClick={() => toggle("quick")}
          testId={`quote-quick-view-${quoteId}`}
        >
          <Eye className="size-3.5" />
        </IconBadgeButton>
        <IconBadgeButton
          title="Upload / View Our Quote Files"
          count={agencyCount}
          onClick={() => toggle("agency")}
          testId={`quote-agency-files-${quoteId}`}
        >
          <FolderOpen className="size-3.5" />
        </IconBadgeButton>
      </div>

      <Dialog open={open === "carrier"} onOpenChange={(next) => setOpen(next ? "carrier" : null)}>
        <DialogContent className="sm:max-w-md" data-ff-quote-carrier-files-dialog={quoteId}>
          <DialogHeader>
            <DialogTitle className="text-navy">Carrier Quote Files</DialogTitle>
            <DialogDescription>
              {carrierName} · files tagged from the carrier API or bot snapshot.
            </DialogDescription>
          </DialogHeader>
          <FileList
            dealId={dealId}
            carrierName={carrierName}
            files={carrierFiles}
            empty={
              <p className="text-sm text-muted-foreground" data-ff-quote-carrier-files-empty="">
                No carrier quote files yet. Waiting on carrier API or bot snapshot.
              </p>
            }
          />
          <DialogFooter>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "quick"} onOpenChange={(next) => setOpen(next ? "quick" : null)}>
        <DialogContent className="sm:max-w-lg" data-ff-quote-quick-view-dialog={quoteId}>
          <DialogHeader>
            <DialogTitle className="text-navy">Quick Quote View</DialogTitle>
            <DialogDescription>{carrierName}</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-2 text-sm" data-ff-quote-quick-view="">
            <dt className="text-muted-foreground">Carrier</dt>
            <dd className="font-medium text-navy">{carrierName || "—"}</dd>
            <dt className="text-muted-foreground">Quote #</dt>
            <dd className="text-navy">{displayOrDash(quote.quoteNumber)}</dd>
            <dt className="text-muted-foreground">Premium</dt>
            <dd className="font-semibold tabular-nums text-navy">{formatMoney(quote.premium)}</dd>
            <dt className="text-muted-foreground">Cov A</dt>
            <dd className="text-navy">{formatMoney(quote.coverageA)}</dd>
            <dt className="text-muted-foreground">AOP ded</dt>
            <dd className="text-navy">{displayOrDash(quote.aopDeductible)}</dd>
            <dt className="text-muted-foreground">Hurricane</dt>
            <dd className="text-navy">{displayOrDash(quote.hurricaneDeductible)}</dd>
            <dt className="text-muted-foreground">Outcome</dt>
            <dd className="text-navy">
              {riskOutcomeLabel(outcome)}
              {quote.bindable ? " · bindable" : ""}
            </dd>
            <dt className="text-muted-foreground">Bind reqs</dt>
            <dd className="text-navy">
              {reqChips.length ? (
                <div className="flex flex-wrap gap-1">
                  {reqChips.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center rounded-full border border-fit-green/30 bg-fit-green-bg px-2 py-0.5 text-[11px] font-medium"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              ) : (
                "—"
              )}
            </dd>
            <dt className="text-muted-foreground">Notes</dt>
            <dd className="whitespace-pre-wrap text-navy">
              {notesSnippet ? (notesSnippet.length > 280 ? `${notesSnippet.slice(0, 280)}…` : notesSnippet) : "—"}
            </dd>
          </dl>
          <DialogFooter>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "agency"} onOpenChange={(next) => setOpen(next ? "agency" : null)}>
        <DialogContent className="sm:max-w-md" data-ff-quote-agency-files-dialog={quoteId}>
          <DialogHeader>
            <DialogTitle className="text-navy">Our quote files</DialogTitle>
            <DialogDescription>
              Agency uploads for {carrierName}. View stored files or add another.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Stored
              </h4>
              <FileList
                dealId={dealId}
                carrierName={carrierName}
                files={agencyFiles}
                empty={
                  <p className="text-sm text-muted-foreground" data-ff-quote-agency-files-empty="">
                    No agency quote files uploaded yet.
                  </p>
                }
              />
            </div>
            <form
              className="space-y-2 rounded-lg border border-border/70 bg-muted/10 p-3"
              data-ff-quote-agency-upload=""
              onSubmit={(event) => {
                event.preventDefault();
                onAgencyUpload(event.currentTarget);
              }}
            >
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Upload
              </h4>
              <label className="block text-xs text-navy">
                Display name
                <input
                  name="displayName"
                  maxLength={180}
                  placeholder="e.g. Client-ready PDF"
                  className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                />
              </label>
              <label className="block text-xs text-navy">
                File
                <input
                  name="file"
                  type="file"
                  required
                  className="mt-1 block w-full text-sm"
                />
              </label>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Uploading…" : "Upload"}
              </Button>
            </form>
          </div>
          <DialogFooter>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
