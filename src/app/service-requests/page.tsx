import { advanceServiceRequest } from "@/app/actions/ams";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/domain";
import { serviceKindLabel, serviceRequestNextStepCopy } from "@/lib/ams/service-requests";
import { isServiceRequestStatus, serviceRequestStatusLabel } from "@/lib/domain-ams";
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
  const rows = await listServiceRequests();
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <AppShell title="Service requests">
      <p className="mb-4 text-base text-muted-foreground">
        Endorsement, cancellation, and non-renewal queue. Status chips show the next desk step.
        Filing updates the existing Policy and writes the activity log. Quotes never become
        Policies. Elena and Hale stay in force until you file.
      </p>
      {error ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <section className="ff-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            No service requests yet. Open a Policy and queue one from the servicing panel.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Kind</th>
                <th>Status</th>
                <th>Next step</th>
                <th>Party</th>
                <th>Effective</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ request, policy, contact, account }) => {
                const kind = request.kind as PolicyChangeKind;
                return (
                  <tr key={request.id}>
                    <td className="font-medium">
                      <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                    </td>
                    <td>
                      {serviceKindLabel(request.kind)}
                      <div className="text-sm text-muted-foreground">{reasonLabel(kind, request.reason)}</div>
                    </td>
                    <td>
                      <span className="rounded-full bg-[var(--ff-sidebar)] px-2 py-0.5 text-xs font-semibold text-white">
                        {serviceRequestStatusLabel(request.status)}
                      </span>
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {isServiceRequestStatus(request.status)
                        ? serviceRequestNextStepCopy(request.status)
                        : "—"}
                    </td>
                    <td>
                      {contact
                        ? `${contact.lastName}, ${contact.firstName}`
                        : account?.name ?? "—"}
                    </td>
                    <td>{formatDay(request.effectiveDate)}</td>
                    <td className="whitespace-nowrap">
                      {request.status === "requested" || request.status === "in_progress" ? (
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
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
