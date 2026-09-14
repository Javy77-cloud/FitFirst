"use client";

import { useState } from "react";
import { advanceEndorsementDraft, createEndorsementDraft } from "@/app/actions/ams";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDay, formatMoney } from "@/lib/domain";
import {
  ENDORSEMENT_DRAFT_DISCLAIMER,
  ENDORSEMENT_FORM_CODES,
  ENDORSEMENT_PIPELINE_STATUSES,
  endorsementDraftNextStep,
  endorsementDraftStatusLabel,
  endorsementFormLabel,
  normalizeEndorsementDraftStatus,
} from "@/lib/domain-ams";
import { endorsementAdvanceLabel } from "@/lib/ams/endorsement-drafts";
import type { PolicyChangeLogRow } from "@/lib/policy/change-log";

type DraftRow = {
  id: string;
  status: string;
  formCode: string;
  wording: string;
  effectiveOn: Date | string;
  notes?: string | null;
  premiumImpact?: string | null;
};

function PipelineStrip({ status }: { status: string }) {
  const current = normalizeEndorsementDraftStatus(status);
  if (!current || current === "withdrawn") {
    return (
      <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
        {endorsementDraftStatusLabel(status)}
      </span>
    );
  }
  const idx = (ENDORSEMENT_PIPELINE_STATUSES as readonly string[]).indexOf(current);
  return (
    <ol className="flex flex-wrap gap-1" aria-label="Endorsement status pipeline">
      {ENDORSEMENT_PIPELINE_STATUSES.map((step, i) => {
        const reached = idx >= 0 && i <= idx;
        const active = step === current;
        return (
          <li key={step}>
            <span
              className={
                active
                  ? "rounded-sm bg-[#002868] px-1.5 py-0.5 text-[11px] font-semibold uppercase text-white"
                  : reached
                    ? "rounded-sm bg-[#002868]/15 px-1.5 py-0.5 text-[11px] font-medium uppercase text-[#002868]"
                    : "rounded-sm border border-border bg-white px-1.5 py-0.5 text-[11px] font-medium uppercase text-muted-foreground"
              }
            >
              {endorsementDraftStatusLabel(step)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function CreateEndorsementDialog({ policyId }: { policyId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="sm"
        className="ff-policy-primary-btn shrink-0"
        data-ff-create-endorsement=""
        style={{ backgroundColor: "#002868", color: "#ffffff", borderColor: "#002868" }}
        onClick={() => setOpen(true)}
      >
        Create
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md" data-ff-create-endorsement-dialog="">
        <DialogHeader>
          <DialogTitle>Create endorsement</DialogTitle>
          <DialogDescription>
            Starts a draft from this policy at Drafted. Advance through submitted → approved → filed
            → effective on the list.
          </DialogDescription>
        </DialogHeader>
        <form action={createEndorsementDraft} className="space-y-3">
          <input type="hidden" name="policyId" value={policyId} />
          <input type="hidden" name="returnTo" value={`/policies/${policyId}?tab=endorsements`} />
          <div>
            <Label htmlFor="ff-endorsement-form" className="text-xs">
              Form
            </Label>
            <select
              id="ff-endorsement-form"
              name="formCode"
              className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
              defaultValue="coverage_change"
            >
              {ENDORSEMENT_FORM_CODES.map((code) => (
                <option key={code} value={code}>
                  {endorsementFormLabel(code)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="ff-endorsement-effective" className="text-xs">
              Effective date
            </Label>
            <Input id="ff-endorsement-effective" name="effectiveOn" type="date" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="ff-endorsement-wording" className="text-xs">
              Wording
            </Label>
            <Textarea
              id="ff-endorsement-wording"
              name="wording"
              className="mt-1 min-h-16"
              required
              placeholder="What changes on this policy?"
            />
          </div>
          <div>
            <Label htmlFor="ff-endorsement-notes" className="text-xs">
              Notes
            </Label>
            <Textarea id="ff-endorsement-notes" name="notes" className="mt-1 min-h-12" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="ff-policy-primary-btn"
              data-ff-create-endorsement=""
              style={{ backgroundColor: "#002868", color: "#ffffff", borderColor: "#002868" }}
            >
              Start draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}

export function PolicyEndorsementsTab({
  policyId,
  drafts,
  changeLogs,
}: {
  policyId: string;
  drafts: DraftRow[];
  changeLogs: PolicyChangeLogRow[];
}) {
  const endorsementLogs = changeLogs.filter((log) => log.source === "endorsement");
  const returnTo = `/policies/${policyId}?tab=endorsements`;

  return (
    <div className="space-y-4" data-ff-policy-tab="endorsements">
      <section className="ff-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-navy">Endorsements</h2>
            <p className="mt-1 text-sm text-muted-foreground">{ENDORSEMENT_DRAFT_DISCLAIMER}</p>
          </div>
          <CreateEndorsementDialog policyId={policyId} />
        </div>
      </section>

      <section className="ff-card p-4" data-ff-endorsement-pipeline-list="">
        <h3 className="text-sm font-semibold text-navy">Pipeline</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Drafted → Submitted → Approved → Filed → Effective
        </p>
        {drafts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No endorsement drafts yet. Create one to start at Drafted.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-md border border-border">
            {drafts.map((draft) => {
              const advanceLabel = endorsementAdvanceLabel(draft.status);
              const normalized = normalizeEndorsementDraftStatus(draft.status);
              const canWithdraw =
                normalized != null &&
                normalized !== "withdrawn" &&
                normalized !== "effective";
              return (
                <li key={draft.id} className="space-y-2 px-3 py-3 text-sm" data-ff-endorsement-draft={draft.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-navy">{endorsementFormLabel(draft.formCode)}</div>
                      <p className="text-muted-foreground">
                        Effective {formatDay(new Date(draft.effectiveOn))}
                        {draft.notes ? ` · ${draft.notes}` : ""}
                      </p>
                    </div>
                    <PipelineStrip status={draft.status} />
                  </div>
                  <p className="text-muted-foreground line-clamp-3">{draft.wording}</p>
                  <p className="text-xs text-muted-foreground">
                    Premium impact:{" "}
                    {draft.premiumImpact != null && draft.premiumImpact !== ""
                      ? formatMoney(draft.premiumImpact)
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">{endorsementDraftNextStep(draft.status)}</p>
                  <div className="flex flex-wrap gap-2">
                    {advanceLabel ? (
                      <form action={advanceEndorsementDraft}>
                        <input type="hidden" name="draftId" value={draft.id} />
                        <input type="hidden" name="action" value="advance" />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <Button
                          type="submit"
                          size="sm"
                          className="ff-policy-primary-btn"
                          style={{ backgroundColor: "#002868", color: "#ffffff", borderColor: "#002868" }}
                        >
                          {advanceLabel}
                        </Button>
                      </form>
                    ) : null}
                    {canWithdraw ? (
                      <form action={advanceEndorsementDraft}>
                        <input type="hidden" name="draftId" value={draft.id} />
                        <input type="hidden" name="action" value="withdraw" />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <Button type="submit" size="sm" variant="outline">
                          Withdraw
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {endorsementLogs.length > 0 ? (
        <section className="ff-card p-4">
          <h3 className="text-sm font-semibold text-navy">Filed change history</h3>
          <ul className="mt-3 divide-y divide-border rounded-md border border-border">
            {endorsementLogs.map((log) => (
              <li key={log.id} className="px-3 py-2 text-sm">
                <div className="font-medium text-navy">
                  {log.fieldLabel}: {log.beforeValue ?? "—"} → {log.afterValue ?? "—"}
                </div>
                <p className="text-muted-foreground">
                  {formatDay(log.changedAt)} · {log.changedByName}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
