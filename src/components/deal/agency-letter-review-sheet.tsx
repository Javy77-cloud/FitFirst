"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  confirmAgencyLetterJob,
  fillAgencyLetterJob,
} from "@/app/actions/document-pipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { buildLetterReviewRows } from "@/lib/document-pipeline/review";
import { canFillLetterJob } from "@/lib/document-pipeline/status";
import {
  DOCUMENT_PIPELINE_STATUS_LABELS,
  DOCUMENT_PIPELINE_TYPE_LABELS,
  type DocumentPipelineExtractField,
  type DocumentPipelineJobType,
  type DocumentPipelineStatus,
} from "@/lib/document-pipeline/types";
import { flashAction } from "@/lib/flash-client";

export type AgencyLetterReviewJob = {
  id: string;
  type: DocumentPipelineJobType;
  status: DocumentPipelineStatus;
  extractFields: DocumentPipelineExtractField[];
  confirmedFields: Record<string, string>;
  confirmedAt: string | null;
  filledDocumentId: string | null;
  message: string | null;
};

export function AgencyLetterReviewSheet({
  open,
  onOpenChange,
  job,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: AgencyLetterReviewJob | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const rows = useMemo(
    () => (job ? buildLetterReviewRows(job.extractFields, job.confirmedFields) : []),
    [job],
  );
  const [edits, setEdits] = useState<Record<string, string>>({});
  const values = useMemo(() => {
    const next: Record<string, string> = {};
    for (const row of rows) next[row.key] = edits[row.key] ?? row.confirmed;
    return next;
  }, [rows, edits]);
  const confirmed = Boolean(job?.confirmedAt);
  const fillReady = job
    ? canFillLetterJob({
        status: job.status,
        confirmedAt: job.confirmedAt,
        confirmedFields: Object.keys(edits).length ? values : job.confirmedFields,
      })
    : false;

  function patch(key: string, value: string) {
    setEdits((current) => ({ ...current, [key]: value }));
  }

  if (!job) return null;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setEdits({});
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        data-ff-letter-review=""
      >
        <SheetHeader>
          <SheetTitle>{DOCUMENT_PIPELINE_TYPE_LABELS[job.type]}</SheetTitle>
          <SheetDescription>
            Confirm extracted fields before fill. {DOCUMENT_PIPELINE_STATUS_LABELS[job.status]}.
            DocuSign never auto-sends.
          </SheetDescription>
        </SheetHeader>
        {job.message ? (
          <p className="mx-4 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
            {job.message}
          </p>
        ) : null}
        <div className="min-h-0 flex-1 overflow-auto px-4">
          <table className="ff-table w-full text-sm" data-ff-letter-diff="">
            <thead>
              <tr>
                <th>Field</th>
                <th>Extracted</th>
                <th>Confirmed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} data-ff-letter-row={row.key}>
                  <td className="align-top">
                    <p className="font-medium text-navy">{row.label}</p>
                    <p className="text-[11px] text-muted-foreground">{row.group}</p>
                  </td>
                  <td className="align-top text-muted-foreground">{row.extracted || "—"}</td>
                  <td>
                    <Input
                      name={`value_${row.key}`}
                      value={values[row.key] ?? ""}
                      onChange={(event) => patch(row.key, event.target.value)}
                      aria-label={`Confirm ${row.label}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SheetFooter>
          <Button
            type="button"
            disabled={pending}
            data-ff-letter-confirm=""
            onClick={() => {
              const data = new FormData();
              data.set("jobId", job.id);
              for (const [key, value] of Object.entries(values)) {
                data.set(`value_${key}`, value);
              }
              startTransition(async () => {
                const result = await confirmAgencyLetterJob(data);
                if (!result.ok) {
                  flashAction(result.reason ?? "letter-need-confirm", "error");
                  return;
                }
                flashAction("letter-confirmed");
                router.refresh();
              });
            }}
          >
            {pending ? "Saving…" : confirmed ? "Update confirmed fields" : "Confirm fields"}
          </Button>
          <div className="space-y-1">
            <Button
              type="button"
              variant="outline"
              disabled={pending || !confirmed || !fillReady}
              data-ff-letter-fill=""
              onClick={() => {
                const data = new FormData();
                data.set("jobId", job.id);
                startTransition(async () => {
                  const result = await fillAgencyLetterJob(data);
                  if (!result.ok) {
                    flashAction(result.reason ?? "letter-need-confirm", "error");
                    return;
                  }
                  flashAction("letter-filled");
                  router.refresh();
                });
              }}
            >
              ACORD fill
            </Button>
            <p className="text-[11px] text-muted-foreground">
              {confirmed
                ? "Fills the agency cancellation / AOR template from confirmed fields. Not a licensed ACORD product."
                : "Confirm fields first. Fill uses the agency cancellation / AOR templates already in the desk."}
            </p>
          </div>
          <div className="space-y-1">
            <Button type="button" variant="outline" disabled data-ff-letter-sign="">
              Send for signature
            </Button>
            <p className="text-[11px] text-muted-foreground" data-ff-letter-sign-copy="">
              DocuSign sandbox is connected for identity only. Envelope send is not wired — never
              auto-sends.
            </p>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
