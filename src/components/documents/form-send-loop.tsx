"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  confirmAgencyLetterJob,
  refreshDocumentPipelineEnvelope,
  sendDocumentPipelineForSignature,
  startAgencyLetterJob,
} from "@/app/actions/document-pipeline";
import { ChooseFileButton } from "@/components/choose-file-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SOURCE_DOC_ACCEPT } from "@/lib/deals/source-doc-types";
import { buildLetterReviewRows } from "@/lib/document-pipeline/review";
import { letterStatusChipClass, letterStatusLabel } from "@/lib/document-pipeline/status";
import {
  DOCUMENT_PIPELINE_JOB_TYPES,
  DOCUMENT_PIPELINE_TYPE_LABELS,
  normalizePipelineStatus,
  type DocumentPipelineExtractField,
  type DocumentPipelineJobType,
  type DocumentPipelineStatus,
} from "@/lib/document-pipeline/types";
import { flashAction } from "@/lib/flash-client";
import { cn } from "@/lib/utils";

export type FormSendDeal = {
  id: string;
  title: string | null;
  partyName: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type FormSendJob = {
  id: string;
  dealId: string;
  type: DocumentPipelineJobType;
  status: DocumentPipelineStatus;
  extractFields: DocumentPipelineExtractField[];
  confirmedFields: Record<string, string>;
  confirmedAt: string | null;
  filledDocumentId: string | null;
  envelopeId: string | null;
  envelopeStatus: string | null;
  signerName: string | null;
  signerEmail: string | null;
  message: string | null;
  createdAt: string;
};

const FORM_BLURBS: Record<DocumentPipelineJobType, string> = {
  acord: "HO3-style application from deal + dec fields.",
  loss_run: "Loss-run request to the current carrier.",
  cancellation: "Cancel the current policy in writing.",
  aor: "Move the agent of record to this agency.",
};

export function FormSendLoop({
  deals,
  jobs,
  docusignReady,
  docusignLabel,
}: {
  deals: FormSendDeal[];
  jobs: FormSendJob[];
  docusignReady: boolean;
  docusignLabel: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<DocumentPipelineJobType>("acord");
  const [dealId, setDealId] = useState(deals[0]?.id ?? "");
  const [fileName, setFileName] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const deal = deals.find((row) => row.id === dealId) ?? null;
  const job = useMemo(() => {
    return (
      jobs
        .filter((row) => row.dealId === dealId && row.type === type)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null
    );
  }, [jobs, dealId, type]);
  const rows = useMemo(
    () => (job ? buildLetterReviewRows(job.extractFields, job.confirmedFields) : []),
    [job],
  );
  const values = useMemo(() => {
    const next: Record<string, string> = {};
    for (const row of rows) next[row.key] = edits[row.key] ?? row.confirmed;
    return next;
  }, [rows, edits]);
  const signerName =
    job?.signerName ||
    deal?.partyName ||
    [deal?.firstName, deal?.lastName].filter(Boolean).join(" ") ||
    "";
  const [signerNameEdit, setSignerNameEdit] = useState("");
  const [signerEmailEdit, setSignerEmailEdit] = useState("");
  const signerEmail = signerEmailEdit || job?.signerEmail || deal?.email || "";
  const extracting = job?.status === "extracting";
  const status = normalizePipelineStatus(job?.status ?? null);

  useEffect(() => {
    setEdits({});
    setSignerNameEdit("");
    setSignerEmailEdit("");
  }, [job?.id]);

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
    <section className="ff-card overflow-hidden" data-ff-form-send="">
      <div className="bg-navy px-5 py-4 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Documents</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Send a form</h2>
            <p className="mt-1 max-w-2xl text-sm text-white/80">
              Pick ACORD, No Run Loss, Cancellation, or AOR. Prefill from the deal and any uploaded
              declaration. Verify, then send to the client.
            </p>
          </div>
          <p className="text-xs text-white/70" data-ff-form-send-docusign="">
            {docusignReady
              ? `DocuSign sandbox ready${docusignLabel ? ` · ${docusignLabel}` : ""}`
              : "Connect DocuSign sandbox in Settings → E-sign"}
          </p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-ff-form-send-templates="">
          {DOCUMENT_PIPELINE_JOB_TYPES.map((key) => (
            <button
              key={key}
              type="button"
              data-ff-form-template={key}
              onClick={() => setType(key)}
              className={cn(
                "rounded-lg border px-3 py-3 text-left transition",
                type === key
                  ? "border-primary bg-fit-check-bg shadow-sm"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <p className="text-sm font-semibold text-navy">{DOCUMENT_PIPELINE_TYPE_LABELS[key]}</p>
              <p className="mt-1 text-xs text-muted-foreground">{FORM_BLURBS[key]}</p>
            </button>
          ))}
        </div>

        <form action={startAgencyLetterJob} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value="/documents" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Deal</Label>
              <select
                name="dealId"
                value={dealId}
                onChange={(event) => setDealId(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                required
              >
                {deals.length === 0 ? <option value="">No open deals</option> : null}
                {deals.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.title || row.partyName || row.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Declaration (optional)</Label>
              <div className="mt-1 flex items-center gap-2">
                <ChooseFileButton
                  name="file"
                  accept={SOURCE_DOC_ACCEPT}
                  keepLabel
                  className="h-9 shrink-0"
                  onFile={(file) => setFileName(file?.name ?? "")}
                />
                <span className="truncate text-xs text-muted-foreground">
                  {fileName || "Deal fields prefill if you skip this"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="outline" className="w-full" disabled={!dealId || pending}>
              Prefill & review
            </Button>
          </div>
        </form>

        {job ? (
          <div className="space-y-4 rounded-lg border border-border p-4" data-ff-form-send-review="">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-navy">
                  Verify {DOCUMENT_PIPELINE_TYPE_LABELS[job.type]}
                </p>
                <p className="text-xs text-muted-foreground">
                  Confirm every field before send. Nothing auto-sends.
                </p>
              </div>
              {status ? (
                <span
                  className={cn(
                    "rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    letterStatusChipClass(status),
                  )}
                  data-ff-form-send-status={status}
                >
                  {letterStatusLabel(status)}
                </span>
              ) : null}
            </div>
            {job.message ? <p className="text-xs text-muted-foreground">{job.message}</p> : null}
            {extracting ? (
              <p className="text-sm text-muted-foreground">Extracting from the declaration and deal…</p>
            ) : (
              <>
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
                            value={values[row.key] ?? ""}
                            onChange={(event) =>
                              setEdits((current) => ({ ...current, [row.key]: event.target.value }))
                            }
                            aria-label={`Confirm ${row.label}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Signer name</Label>
                    <Input
                      className="mt-1 h-8"
                      value={signerNameEdit || signerName}
                      onChange={(event) => setSignerNameEdit(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Signer email</Label>
                    <Input
                      className="mt-1 h-8"
                      type="email"
                      value={signerEmail}
                      onChange={(event) => setSignerEmailEdit(event.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    disabled={pending || extracting || !signerEmail}
                    data-ff-form-send-docusign-btn=""
                    onClick={() => {
                      const data = new FormData();
                      data.set("jobId", job.id);
                      data.set("signerName", signerNameEdit || signerName);
                      data.set("signerEmail", signerEmail);
                      for (const [key, value] of Object.entries(values)) {
                        data.set(`value_${key}`, value);
                      }
                      startTransition(async () => {
                        const result = await sendDocumentPipelineForSignature(data);
                        if (!result.ok) {
                          flashAction(result.reason ?? "letter-sandbox-error", "error");
                          return;
                        }
                        flashAction("letter-sent");
                        router.refresh();
                      });
                    }}
                  >
                    {pending ? "Sending…" : "Send to DocuSign"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
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
                    Save fields
                  </Button>
                  {job.envelopeId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => {
                        const data = new FormData();
                        data.set("jobId", job.id);
                        startTransition(async () => {
                          const result = await refreshDocumentPipelineEnvelope(data);
                          if (!result.ok) {
                            flashAction(result.reason ?? "letter-sandbox-error", "error");
                            return;
                          }
                          flashAction("letter-status-refreshed");
                          router.refresh();
                        });
                      }}
                    >
                      Refresh status
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Choose a deal, then Prefill & review. Cancellation and AOR are live templates here — not
            buried Agency Letters.
          </p>
        )}

        <div>
          <h3 className="mb-2 text-sm font-semibold text-navy">Recent sends</h3>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No form sends yet.</p>
          ) : (
            <ul className="space-y-2" data-ff-form-send-recent="">
              {jobs.slice(0, 8).map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="font-medium text-navy">
                    {DOCUMENT_PIPELINE_TYPE_LABELS[row.type]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.signerEmail || deals.find((dealRow) => dealRow.id === row.dealId)?.title || row.dealId}
                  </span>
                  <span
                    className={cn(
                      "rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      letterStatusChipClass(row.status),
                    )}
                  >
                    {letterStatusLabel(row.status) ?? row.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
