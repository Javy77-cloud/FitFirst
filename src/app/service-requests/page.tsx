import { advanceServiceRequest } from "@/app/actions/ams";
import { AppShell } from "@/components/app-shell";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { RecordLink } from "@/components/record-links";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/domain";
import { SERVICE_REQUESTS_LIST_COLUMNS } from "@/lib/list-columns";
import { serviceKindLabel, serviceRequestNextStepCopy } from "@/lib/ams/service-requests";
import { isServiceRequestStatus, serviceRequestStatusLabel, workDeskLabel } from "@/lib/domain-ams";
import { listServiceRequests } from "@/lib/ams/queries";
import { reasonLabel } from "@/lib/policy/reasons";
import type { PolicyChangeKind } from "@/lib/policy/status";

export const dynamic = "force-dynamic";

export default async function ServiceRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const desk = typeof params.desk === "string" ? params.desk : undefined;
  const rows = await listServiceRequests(undefined, desk);
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <AppShell title="Service requests">
      <p className="mb-4 text-base text-muted-foreground">
        Endorsement, cancellation, and non-renewal queue. Status chips show the next desk step.
        Filing updates the existing Policy, writes the durable activity log, and is never
        automatic — Hale stays in force until you file. Quotes never become Policies. Split
        the queue by producer vs CSR without changing status.
      </p>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <RecordLink href="/service-requests">All desks</RecordLink>
        <RecordLink href="/service-requests?desk=csr">CSR</RecordLink>
        <RecordLink href="/service-requests?desk=producer">Producer</RecordLink>
      </div>
      {error ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <section className="ff-card overflow-hidden">
        <DeskColumnTable
          moduleId="service-requests"
          columns={SERVICE_REQUESTS_LIST_COLUMNS}
          empty="No service requests yet. Open a Policy and queue one from the servicing panel."
          rows={rows.map(({ request, policy, contact, account }) => {
            const kind = request.kind as PolicyChangeKind;
            return {
              key: request.id,
              cells: {
                policy: <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>,
                kind: (
                  <>
                    {serviceKindLabel(request.kind)}
                    <div className="text-sm text-muted-foreground">{reasonLabel(kind, request.reason)}</div>
                  </>
                ),
                status: <StatusBadge status={request.status}>{serviceRequestStatusLabel(request.status)}</StatusBadge>,
                next: isServiceRequestStatus(request.status) ? serviceRequestNextStepCopy(request.status) : "—",
                desk: workDeskLabel(request.workDesk),
                party: contact ? `${contact.lastName}, ${contact.firstName}` : account?.name ?? "—",
                effective: formatDay(request.effectiveDate),
                actions:
                  request.status === "requested" || request.status === "in_progress" ? (
                    <div className="flex flex-wrap gap-1">
                      {request.status === "requested" ? (
                        <form action={advanceServiceRequest}>
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="action" value="start" />
                          <Button type="submit" size="sm" variant="outline">
                            Start
                          </Button>
                        </form>
                      ) : null}
                      <form action={advanceServiceRequest}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="action" value="file" />
                        <Button type="submit" size="sm">
                          File
                        </Button>
                      </form>
                    </div>
                  ) : null,
              },
            };
          })}
        />
      </section>
    </AppShell>
  );
}
