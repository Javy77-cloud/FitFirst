import { notFound } from "next/navigation";
import { requestPortalPolicyChange } from "@/app/actions/portal";
import { PortalShell } from "@/components/portal/portal-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CANCELLATION_REASONS,
  ENDORSEMENT_REASONS,
  NON_RENEWAL_REASONS,
} from "@/lib/policy/reasons";
import { isInForceStatus } from "@/lib/policy/status";
import { resolvePortalToken } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function PortalChangePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; queued?: string }>;
}) {
  const { token } = await params;
  const { error, queued } = await searchParams;
  const resolved = await resolvePortalToken(decodeURIComponent(token));
  if (!resolved.ok) notFound();
  const session = resolved.session;
  const inForce = session.policies.filter((row) => isInForceStatus(row.policy.status));

  return (
    <PortalShell session={session} title="Request a policy change">
      <p className="mb-4 text-sm text-muted-foreground">
        This does not change the policy on the spot. The agency work queue receives
        the kind, reason, effective date, and your note so staff file it without
        rekeying.
      </p>
      {queued ? (
        <p className="mb-4 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-fit-green">
          Request is on the service queue. The desk already has every field you
          entered.
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red" role="alert">
          {error}
        </p>
      ) : null}

      {inForce.length === 0 ? (
        <p className="ff-card px-4 py-6 text-sm text-muted-foreground">
          No in-force policy on this link, so there is nothing to change.
        </p>
      ) : (
        <form action={requestPortalPolicyChange} className="ff-card space-y-3 p-4">
          <input type="hidden" name="token" value={session.token.token} />
          <div>
            <Label htmlFor="policyId" className="text-xs">
              Policy
            </Label>
            <select
              id="policyId"
              name="policyId"
              required
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              defaultValue={inForce[0]?.policy.id}
            >
              {inForce.map(({ policy, carrierName }) => (
                <option key={policy.id} value={policy.id}>
                  {policy.policyNumber} · {carrierName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="changeKind" className="text-xs">
              What do you need?
            </Label>
            <select
              id="changeKind"
              name="changeKind"
              required
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              defaultValue="endorsement"
            >
              <option value="endorsement">Change coverage (endorsement)</option>
              <option value="cancellation">Cancel this policy</option>
              <option value="non_renewal">Do not renew</option>
            </select>
          </div>
          <div>
            <Label htmlFor="reason" className="text-xs">
              Reason
            </Label>
            <select
              id="reason"
              name="reason"
              required
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              <optgroup label="Endorsement">
                {ENDORSEMENT_REASONS.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Cancellation">
                {CANCELLATION_REASONS.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Non-renewal">
                {NON_RENEWAL_REASONS.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <div>
            <Label htmlFor="effectiveDate" className="text-xs">
              Effective date
            </Label>
            <Input
              id="effectiveDate"
              name="effectiveDate"
              type="date"
              required
              defaultValue={todayIso()}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="summary" className="text-xs">
              What should change
            </Label>
            <Textarea
              id="summary"
              name="summary"
              rows={4}
              className="mt-1"
              placeholder="Add a driver, raise Coverage A, cancel after the sale — write it once."
            />
          </div>
          <Button type="submit" size="sm">
            Send to the agency queue
          </Button>
        </form>
      )}
    </PortalShell>
  );
}
