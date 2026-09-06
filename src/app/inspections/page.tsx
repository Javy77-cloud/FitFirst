import { createPolicyInspection } from "@/app/actions/ams";
import { InspectionActions } from "@/components/ams/inspection-actions";
import { AppShell } from "@/components/app-shell";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { RecordLink } from "@/components/record-links";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/domain";
import { INSPECTIONS_LIST_COLUMNS } from "@/lib/list-columns";
import {
  INSPECTION_DISCLAIMER,
  INSPECTION_KINDS,
  inspectionKindLabel,
  inspectionNextStep,
  inspectionStatusLabel,
} from "@/lib/domain-ams";
import { listPolicyInspections } from "@/lib/ams/queries";
import { ELENA_POLICY_ID } from "@/lib/fixtures/ids";

export const dynamic = "force-dynamic";

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;
  const rows = await listPolicyInspections(undefined, status);
  const error = typeof params.error === "string" ? params.error : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;

  return (
    <AppShell title="Inspections">
      <p className="mb-4 text-base text-muted-foreground">{INSPECTION_DISCLAIMER}</p>
      <p className="mb-4 text-sm">
        <RecordLink href="/inspections">All</RecordLink>
        {" · "}
        <RecordLink href="/inspections?status=requested">Requested</RecordLink>
        {" · "}
        <RecordLink href="/inspections?status=scheduled">Scheduled</RecordLink>
        {" · "}
        <RecordLink href="/service-timeline">Service timeline</RecordLink>
        {" · "}
        <RecordLink href="/installments">Installments</RecordLink>
      </p>
      {error ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-3 text-sm text-navy">Inspection {notice.replaceAll("_", " ")}.</p>
      ) : null}

      <section className="ff-card mb-4 p-4">
        <h2 className="text-base font-semibold text-navy">Request an inspection</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">
          Default Policy is Elena HO3. Completing later does not file the endorsement.
        </p>
        <form action={createPolicyInspection} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="policyId" value={ELENA_POLICY_ID} />
          <input type="hidden" name="returnTo" value="/inspections" />
          <select
            name="kind"
            className="h-9 rounded-md border border-input bg-card px-2 text-sm"
            defaultValue="photo"
          >
            {INSPECTION_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {inspectionKindLabel(kind)}
              </option>
            ))}
          </select>
          <input
            name="vendor"
            placeholder="Vendor"
            className="h-9 rounded-md border border-input bg-card px-2 text-sm"
          />
          <input name="scheduledOn" type="date" className="h-9 rounded-md border border-input bg-card px-2 text-sm" />
          <Button type="submit" size="sm">
            Request
          </Button>
        </form>
      </section>

      <section className="ff-card overflow-hidden">
        <DeskColumnTable
          moduleId="inspections"
          columns={INSPECTIONS_LIST_COLUMNS}
          empty="No inspections in this view. Elena roof is scheduled; Hale wind mit is requested."
          rows={rows.map(({ inspection, policy, contact, account }) => ({
            key: inspection.id,
            cells: {
              policy: (
                <>
                  <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                  {inspection.notes ? (
                    <div className="text-sm text-muted-foreground">{inspection.notes}</div>
                  ) : null}
                </>
              ),
              kind: inspectionKindLabel(inspection.kind),
              status: <StatusBadge status={inspection.status}>{inspectionStatusLabel(inspection.status)}</StatusBadge>,
              next: inspectionNextStep(inspection.status),
              party: contact ? `${contact.lastName}, ${contact.firstName}` : account?.name ?? "—",
              when: inspection.scheduledOn ? formatDay(inspection.scheduledOn) : "—",
              actions: <InspectionActions inspectionId={inspection.id} status={inspection.status} />,
            },
          }))}
        />
      </section>
    </AppShell>
  );
}
