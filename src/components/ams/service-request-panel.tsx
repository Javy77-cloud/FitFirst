import {
  advanceServiceRequest,
  createServiceRequest,
} from "@/app/actions/ams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDay } from "@/lib/domain";
import {
  CANCELLATION_REASONS,
  ENDORSEMENT_REASONS,
  NON_RENEWAL_REASONS,
} from "@/lib/policy/reasons";
import { serviceKindLabel } from "@/lib/ams/service-requests";
import { serviceRequestStatusLabel } from "@/lib/domain-ams";
import type { PolicyServiceRequest } from "@/lib/db/schema";
import { isInForceStatus } from "@/lib/policy/status";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ServiceRequestPanel({
  policyId,
  status,
  coverageA,
  premium,
  requests,
  error,
  notice,
}: {
  policyId: string;
  status: string;
  coverageA: number | null;
  premium: string | null;
  requests: PolicyServiceRequest[];
  error?: string;
  notice?: string;
}) {
  const open = requests.filter(
    (row) => row.status === "requested" || row.status === "in_progress",
  );
  const closed = requests.filter(
    (row) => row.status === "filed" || row.status === "withdrawn",
  );
  const inForce = isInForceStatus(status);

  return (
    <section className="ff-card mb-4 p-4">
      <h2 className="text-base font-semibold text-navy">Service request pipeline</h2>
      <p className="mt-1 text-base text-muted-foreground">
        Request an endorsement, cancellation, or non-renewal. Filing updates this Policy and
        writes the activity log. Does not open a Deal and does not create a new Policy.
      </p>
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-2 text-sm text-navy">Request {notice.replaceAll("_", " ")}.</p>
      ) : null}

      {open.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No open service requests on this Policy.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-md border border-border">
          {open.map((row) => (
            <li key={row.id} className="space-y-2 px-3 py-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium text-navy">{serviceKindLabel(row.kind)}</span>
                <span className="text-xs uppercase text-muted-foreground">
                  {serviceRequestStatusLabel(row.status)}
                </span>
                <span className="text-sm text-muted-foreground">
                  effective {formatDay(row.effectiveDate)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {row.reason.replaceAll("_", " ")}
                {row.summary ? ` · ${row.summary}` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {row.status === "requested" ? (
                  <form action={advanceServiceRequest}>
                    <input type="hidden" name="requestId" value={row.id} />
                    <input type="hidden" name="action" value="start" />
                    <Button type="submit" size="sm" variant="outline">
                      Start
                    </Button>
                  </form>
                ) : null}
                <form action={advanceServiceRequest}>
                  <input type="hidden" name="requestId" value={row.id} />
                  <input type="hidden" name="action" value="file" />
                  <Button type="submit" size="sm">
                    File on Policy
                  </Button>
                </form>
                <form action={advanceServiceRequest}>
                  <input type="hidden" name="requestId" value={row.id} />
                  <input type="hidden" name="action" value="withdraw" />
                  <Button type="submit" size="sm" variant="secondary">
                    Withdraw
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {inForce ? (
        <form action={createServiceRequest} className="mt-4 grid gap-3 border-t border-border pt-4">
          <input type="hidden" name="policyId" value={policyId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Request type</Label>
              <select
                name="kind"
                required
                defaultValue="endorsement"
                className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
              >
                <option value="endorsement">Endorsement</option>
                <option value="cancellation">Cancellation</option>
                <option value="non_renewal">Non-renewal</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Effective date</Label>
              <Input name="effectiveDate" type="date" required defaultValue={todayIso()} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Reason</Label>
            <select
              name="reason"
              required
              className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
              defaultValue="coverage_change"
            >
              {[...ENDORSEMENT_REASONS, ...CANCELLATION_REASONS, ...NON_RENEWAL_REASONS]
                .filter((row, index, list) => list.findIndex((item) => item.value === row.value) === index)
                .map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Coverage A (endorsement)</Label>
              <Input name="coverageA" type="number" defaultValue={coverageA ?? undefined} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Premium (endorsement)</Label>
              <Input name="premium" defaultValue={premium ?? undefined} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">What the insured asked for</Label>
            <Textarea name="summary" rows={2} className="mt-1" />
          </div>
          <Button type="submit" size="sm">
            Queue request
          </Button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          This Policy is off the book. Open requests can still be withdrawn; new ones are not
          queued.
        </p>
      )}

      {closed.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          {closed.map((row) => (
            <li key={row.id}>
              {serviceKindLabel(row.kind)} · {serviceRequestStatusLabel(row.status)} ·{" "}
              {formatDay(row.updatedAt)}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
