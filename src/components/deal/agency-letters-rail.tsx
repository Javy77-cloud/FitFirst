"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { startAgencyLetterJob } from "@/app/actions/document-pipeline";
import {
  AgencyLetterReviewSheet,
  type AgencyLetterReviewJob,
} from "@/components/deal/agency-letter-review-sheet";
import { CollapsibleSection } from "@/components/contacts/collapsible-section";
import { ChooseFileButton } from "@/components/choose-file-button";
import { Button } from "@/components/ui/button";
import { SOURCE_DOC_ACCEPT } from "@/lib/deals/source-doc-types";
import { letterJobCards, letterStatusChipClass } from "@/lib/document-pipeline/status";
import {
  DOCUMENT_PIPELINE_TYPE_LABELS,
  isDocumentPipelineJobType,
  isDocumentPipelineStatus,
  type DocumentPipelineExtractField,
  type DocumentPipelineJobType,
} from "@/lib/document-pipeline/types";
import { cn } from "@/lib/utils";

export type AgencyLetterJobView = {
  id: string;
  type: string;
  status: string;
  sourceDocumentIds: string[];
  extractPayload: { fields?: DocumentPipelineExtractField[] } | null;
  confirmedFields: Record<string, string>;
  confirmedAt: Date | string | null;
  filledDocumentId: string | null;
  message: string | null;
  createdAt: Date | string;
};

export function AgencyLettersRail({
  dealId,
  riskId,
  jobs,
}: {
  dealId: string;
  riskId: string;
  jobs: AgencyLetterJobView[];
}) {
  const router = useRouter();
  const cards = useMemo(() => letterJobCards(jobs), [jobs]);
  const extracting = jobs.some((job) => job.status === "extracting");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const reviewJob = useMemo(() => {
    const row = jobs.find((job) => job.id === reviewId);
    if (!row) return null;
    return toReviewJob(row);
  }, [jobs, reviewId]);

  useEffect(() => {
    if (!extracting) return;
    const started = Date.now();
    const id = window.setInterval(() => {
      if (Date.now() - started > 120_000) {
        window.clearInterval(id);
        return;
      }
      router.refresh();
    }, 4000);
    router.refresh();
    return () => window.clearInterval(id);
  }, [extracting, router]);

  return (
    <div data-ff-agency-letters="">
      <CollapsibleSection
        id="agency-letters"
        title="Agency letters"
        defaultOpen={false}
        data-ff="agency-letters"
        badge={extracting ? "Extracting" : undefined}
      >
        <p className="mb-3 text-helper text-muted-foreground">
          Drop a dec on ACORD, No Run Loss, Cancellation, or AOR. Gemini extracts. You confirm,
          then Send to DocuSign. Prefer the Documents send loop.
        </p>
        <div className="space-y-2" data-ff-letter-cards="">
          {cards.map((card) => {
            const job = jobs.find((row) => row.id === card.jobId) ?? null;
            return (
              <article
                key={card.type}
                className="rounded-md border border-border bg-card p-3"
                data-ff-letter-card={card.type}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy">{card.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {card.sourceCount
                        ? `${card.sourceCount} source file${card.sourceCount === 1 ? "" : "s"}`
                        : "No source file yet"}
                    </p>
                  </div>
                  {card.statusLabel ? (
                    <span
                      className={cn(
                        "rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        letterStatusChipClass(card.status),
                      )}
                      data-ff-letter-status={card.status ?? ""}
                    >
                      {card.statusLabel}
                    </span>
                  ) : null}
                </div>
                {card.message ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">{card.message}</p>
                ) : null}
                <LetterUploadForm dealId={dealId} riskId={riskId} type={card.type} disabled={card.status === "extracting"} />
                {job && card.status !== "extracting" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    data-ff-letter-open={card.type}
                    onClick={() => setReviewId(job.id)}
                  >
                    Review fields
                  </Button>
                ) : null}
              </article>
            );
          })}
        </div>
      </CollapsibleSection>
      <AgencyLetterReviewSheet
        open={Boolean(reviewJob)}
        onOpenChange={(open) => {
          if (!open) setReviewId(null);
        }}
        job={reviewJob}
      />
    </div>
  );
}

function LetterUploadForm({
  dealId,
  riskId,
  type,
  disabled,
}: {
  dealId: string;
  riskId: string;
  type: DocumentPipelineJobType;
  disabled: boolean;
}) {
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);

  return (
    <form
      action={startAgencyLetterJob}
      className={cn(
        "mt-3 rounded-md border border-dashed border-border p-2",
        dragging && "border-primary bg-muted/40",
      )}
      data-ff-letter-drop={type}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (!file) return;
        const input = event.currentTarget.querySelector<HTMLInputElement>('input[type="file"]');
        if (!input) return;
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
        setFileName(file.name);
      }}
    >
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="riskId" value={riskId} />
      <input type="hidden" name="type" value={type} />
      <div className="flex flex-wrap items-center gap-2">
        <ChooseFileButton
          name="file"
          accept={SOURCE_DOC_ACCEPT}
          keepLabel
          disabled={disabled}
          className="h-8 shrink-0"
          onFile={(file) => setFileName(file?.name ?? "")}
        />
        <span className="min-w-0 flex-1 truncate text-sm text-navy">
          {fileName || `Drop a file for ${DOCUMENT_PIPELINE_TYPE_LABELS[type]}`}
        </span>
        <Button type="submit" size="sm" disabled={disabled || !fileName}>
          Extract
        </Button>
      </div>
    </form>
  );
}

function toReviewJob(row: AgencyLetterJobView): AgencyLetterReviewJob | null {
  const type = isDocumentPipelineJobType(row.type) ? row.type : null;
  const status = isDocumentPipelineStatus(row.status) ? row.status : null;
  if (!type || !status) return null;
  return {
    id: row.id,
    type,
    status,
    extractFields: row.extractPayload?.fields ?? [],
    confirmedFields: row.confirmedFields ?? {},
    confirmedAt: row.confirmedAt ? String(row.confirmedAt) : null,
    filledDocumentId: row.filledDocumentId,
    message: row.message,
  };
}
