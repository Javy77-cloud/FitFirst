import { advanceEndorsementDraft, createEndorsementDraft } from "@/app/actions/ams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDay } from "@/lib/domain";
import {
  ENDORSEMENT_DRAFT_DISCLAIMER,
  ENDORSEMENT_FORM_CODES,
  endorsementDraftNextStep,
  endorsementDraftStatusLabel,
  endorsementFormLabel,
} from "@/lib/domain-ams";
import type { EndorsementDraft, PolicyServiceRequest } from "@/lib/db/schema";

export function EndorsementDraftPanel({
  policyId,
  drafts,
  requests,
  error,
}: {
  policyId: string;
  drafts: EndorsementDraft[];
  requests: PolicyServiceRequest[];
  error?: string;
}) {
  const openRequests = requests.filter(
    (row) => row.kind === "endorsement" && (row.status === "requested" || row.status === "in_progress"),
  );

  return (
    <section className="ff-card mb-4 p-4">
      <h2 className="text-base font-semibold text-navy">Endorsement draft stubs</h2>
      <p className="mt-1 text-base text-muted-foreground">{ENDORSEMENT_DRAFT_DISCLAIMER}</p>
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {drafts.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No endorsement wording stubs on this Policy. Draft one below — it does not file.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-md border border-border">
          {drafts.map((draft) => (
            <li key={draft.id} className="space-y-2 px-3 py-2">
              <div className="font-medium text-navy">{endorsementFormLabel(draft.formCode)}</div>
              <p className="text-sm text-muted-foreground">
                {endorsementDraftStatusLabel(draft.status)} · effective {formatDay(draft.effectiveOn)}
              </p>
              <p className="text-sm">{draft.wording}</p>
              <p className="text-sm text-muted-foreground">{endorsementDraftNextStep(draft.status)}</p>
              {draft.status === "drafted" || draft.status === "ready" ? (
                <div className="flex flex-wrap gap-2">
                  {draft.status === "drafted" ? (
                    <form action={advanceEndorsementDraft}>
                      <input type="hidden" name="draftId" value={draft.id} />
                      <input type="hidden" name="action" value="ready" />
                      <input type="hidden" name="returnTo" value={`/policies/${policyId}`} />
                      <Button type="submit" size="sm">
                        Mark ready
                      </Button>
                    </form>
                  ) : null}
                  <form action={advanceEndorsementDraft}>
                    <input type="hidden" name="draftId" value={draft.id} />
                    <input type="hidden" name="action" value="withdraw" />
                    <input type="hidden" name="returnTo" value={`/policies/${policyId}`} />
                    <Button type="submit" size="sm" variant="secondary">
                      Withdraw
                    </Button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <form action={createEndorsementDraft} className="mt-4 space-y-3 rounded-md border border-border p-3">
        <input type="hidden" name="policyId" value={policyId} />
        {openRequests[0] ? (
          <input type="hidden" name="serviceRequestId" value={openRequests[0].id} />
        ) : null}
        <div>
          <Label htmlFor={`endorsement-form-${policyId}`} className="text-xs">
            Form
          </Label>
          <select
            id={`endorsement-form-${policyId}`}
            name="formCode"
            className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
            defaultValue="mortgagee"
          >
            {ENDORSEMENT_FORM_CODES.map((code) => (
              <option key={code} value={code}>
                {endorsementFormLabel(code)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor={`endorsement-effective-${policyId}`} className="text-xs">
            Effective
          </Label>
          <Input
            id={`endorsement-effective-${policyId}`}
            name="effectiveOn"
            type="date"
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor={`endorsement-wording-${policyId}`} className="text-xs">
            Wording
          </Label>
          <Textarea
            id={`endorsement-wording-${policyId}`}
            name="wording"
            required
            className="mt-1 min-h-16"
            placeholder="Desk wording only. File still happens on the service request."
          />
        </div>
        <div>
          <Label htmlFor={`endorsement-notes-${policyId}`} className="text-xs">
            Notes
          </Label>
          <Textarea id={`endorsement-notes-${policyId}`} name="notes" className="mt-1 min-h-16" />
        </div>
        <Button type="submit" size="sm" variant="outline">
          Draft endorsement stub
        </Button>
      </form>
    </section>
  );
}
