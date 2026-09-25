import Link from "next/link";
import { logClaim } from "@/app/actions/claims";
import { ClaimList, type ClaimListRow } from "@/components/claims/claim-list";
import {
  ClaimCauseSelect,
  ClaimChannelSelect,
  ClaimStatusSelect,
} from "@/components/claims/field";
import { ClaimsDeskNotice } from "@/components/claims/desk-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { claimCauseLabel } from "@/lib/claims";
import { formatDay } from "@/lib/domain";

export type PolicyClaimActivity = {
  id: string;
  claimId: string;
  eventType: string;
  body: string;
  actor: string | null;
  createdAt: Date;
};

export function PolicyClaimsPanel({
  policyId,
  contactId,
  policyNumber,
  partyName,
  postedBy,
  claims,
  activity,
}: {
  policyId: string;
  contactId?: string | null;
  policyNumber: string;
  partyName: string;
  postedBy: string;
  claims: ClaimListRow[];
  activity: PolicyClaimActivity[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <section className="ff-card mb-4 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-navy">Claims / FNOL</h2>
        <Link href="/claims" className="text-sm text-primary hover:underline">
          Claims log
        </Link>
      </div>

      <ClaimsDeskNotice compact />

      <div className="mt-3 overflow-hidden rounded-md border border-border">
        <ClaimList
          rows={claims}
          empty="No claims on this Policy. Log a first notice below — no carrier API."
        />
      </div>

      {activity.length > 0 ? (
        <ol className="mt-3 space-y-2 border-t border-border pt-3">
          {activity.map((event) => (
            <li key={event.id} className="text-sm">
              <span className="uppercase text-muted-foreground">
                {event.eventType.replaceAll("_", " ")}
              </span>
              {" · "}
              {formatDay(event.createdAt)}
              {event.actor ? ` · ${event.actor}` : ""}
              <div className="text-muted-foreground">{event.body}</div>
            </li>
          ))}
        </ol>
      ) : null}

      <form action={logClaim} className="mt-4 grid gap-3 border-t border-border pt-4">
        <input type="hidden" name="policyId" value={policyId} />
        <input type="hidden" name="contactId" value={contactId ?? ""} />
        <input type="hidden" name="postedBy" value={postedBy} />
        <input type="hidden" name="returnTo" value={`/policies/${policyId}`} />
        <input type="hidden" name="notifyProducer" value="1" />
        <p className="text-sm font-medium text-navy">
          Log FNOL on {policyNumber} · {partyName}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Date reported</Label>
            <Input name="dateReported" type="date" required defaultValue={today} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Date of loss</Label>
            <Input name="dateOfLoss" type="date" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Cause</Label>
            <ClaimCauseSelect name="causeType" defaultValue="other" />
          </div>
          <div>
            <Label className="text-xs">How reported</Label>
            <ClaimChannelSelect name="reportedHow" defaultValue="phone" />
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <ClaimStatusSelect name="status" defaultValue="inquiry" />
          </div>
          <div>
            <Label className="text-xs">Carrier claim #</Label>
            <Input name="carrierClaimNumber" className="mt-1" placeholder="Optional until assigned" />
          </div>
        </div>
        <div>
          <Label className="text-xs">What happened</Label>
          <Textarea name="description" rows={2} className="mt-1" />
        </div>
        <Button type="submit" size="sm">
          Save FNOL on this Policy
        </Button>
        <p className="text-xs text-muted-foreground">
          Cause labels are desk-only ({claimCauseLabel("wind")} / water / hail…). No IVANS
          download.
        </p>
      </form>
    </section>
  );
}
