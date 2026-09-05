import { advanceServiceRequest } from "@/app/actions/ams";
import { ServiceRequestForm } from "@/components/ams/service-request-form";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/domain";
import { serviceKindLabel, serviceRequestNextStepCopy } from "@/lib/ams/service-requests";
import { isServiceRequestStatus, serviceRequestStatusLabel, workDeskLabel } from "@/lib/domain-ams";
import type { PolicyServiceRequest, PolicyServiceRequestEvent } from "@/lib/db/schema";
import { isInForceStatus } from "@/lib/policy/status";
import { reasonLabel } from "@/lib/policy/reasons";
import type { PolicyChangeKind } from "@/lib/policy/status";

export function ServiceRequestPanel({
  policyId,
  status,
  coverageA,
  premium,
  requests,
  events = [],
  error,
  notice,
}: {
  policyId: string;
  status: string;
  coverageA: number | null;
  premium: string | null;
  requests: PolicyServiceRequest[];
  events?: PolicyServiceRequestEvent[];
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
        Request → start → file. Required: type, reason, effective date, and what the insured
        asked for. Cancel / non-renew stay on the book until you file. Filing updates this
        Policy, writes the durable activity log plus an in-app Task, and a work-queue item.
        Does not open a Deal and does not create a new Policy.
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
          {open.map((row) => {
            const statusLabel = serviceRequestStatusLabel(row.status);
            const next = isServiceRequestStatus(row.status)
              ? serviceRequestNextStepCopy(row.status)
              : "";
            const kind = row.kind as PolicyChangeKind;
            return (
              <li key={row.id} className="space-y-2 px-3 py-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium text-navy">{serviceKindLabel(row.kind)}</span>
                  <span className="rounded-full bg-[var(--ff-sidebar)] px-2 py-0.5 text-xs font-semibold text-white">
                    {statusLabel}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    effective {formatDay(row.effectiveDate)}
                    {row.workDesk ? ` · ${workDeskLabel(row.workDesk)}` : ""}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {reasonLabel(kind, row.reason)}
                  {row.summary ? ` · ${row.summary}` : ""}
                </p>
                {next ? <p className="text-sm text-navy">{next}</p> : null}
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
            );
          })}
        </ul>
      )}

      {inForce ? (
        <ServiceRequestForm policyId={policyId} coverageA={coverageA} premium={premium} />
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

      {events.length > 0 ? (
        <div className="mt-4 border-t border-border pt-3">
          <h3 className="text-sm font-semibold text-navy">Service activity log</h3>
          <ol className="mt-2 space-y-2">
            {events.map((event) => (
              <li key={event.id} className="text-sm">
                <span className="uppercase text-muted-foreground">{event.action}</span>
                {" · "}
                <span>{formatDay(event.occurredAt)}</span>
                {event.actorName ? ` · ${event.actorName}` : ""}
                <div className="text-muted-foreground">{event.body}</div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
