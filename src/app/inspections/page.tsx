import { createPolicyInspection } from "@/app/actions/ams";
import { InspectionActions } from "@/components/ams/inspection-actions";
import { AppShell } from "@/components/app-shell";
import { DeskPageTrail } from "@/components/desk/desk-page-trail";
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
import { suggestInspectionDateIso } from "@/lib/ams/inspection-suggest";
import { listPolicyInspections } from "@/lib/ams/queries";
import { ELENA_POLICY_ID } from "@/lib/fixtures/ids";

export const dynamic = "force-dynamic";

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const policyIdParam = typeof params.policy === "string" ? params.policy : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const rows = await listPolicyInspections(policyIdParam, status);
  const error = typeof params.error === "string" ? params.error : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;
  const suggestPhoto = suggestInspectionDateIso({ kind: "photo", state: "FL" });
  const policyId = policyIdParam || ELENA_POLICY_ID;

  return (
    <AppShell title="Inspections">
      <DeskPageTrail
        backLabel={policyIdParam ? "Back to policy" : "Back"}
        fallbackHref={policyIdParam ? `/policies/${policyIdParam}` : "/policies"}
        crumbs={[
          { href: "/policies", label: "Policies" },
          ...(policyIdParam
            ? [{ href: `/policies/${policyIdParam}`, label: "Policy" }]
            : []),
          { label: "Inspections" },
        ]}
      />
      <p className="mb-4 text-base text-muted-foreground">{INSPECTION_DISCLAIMER}</p>
      <p className="mb-4 text-sm">
        Status pipeline:{" "}
        <RecordLink href="/inspections">All</RecordLink>
        {" · "}
        <RecordLink href="/inspections?status=requested">Requested</RecordLink>
        {" · "}
        <RecordLink href="/inspections?status=scheduled">Scheduled</RecordLink>
        {" · "}
        <RecordLink href="/inspections?status=completed">Completed</RecordLink>
        {" · "}
        <RecordLink href="/inspections?status=waived">Waived</RecordLink>

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
        <h2 className="text-base font-semibold text-navy">Schedule an inspection</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">
          Assign an inspector (vendor), auto-suggested next date by type/state (FL photo →{" "}
          {suggestPhoto}). Completing does not file an endorsement. Result + photos land on the
          policy documents when uploaded.
        </p>
        <form action={createPolicyInspection} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="policyId" value={policyId} />
          <input
            type="hidden"
            name="returnTo"
            value={policyIdParam ? `/policies/${policyIdParam}` : "/inspections"}
          />
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
            placeholder="Inspector / vendor assign"
            className="h-9 rounded-md border border-input bg-card px-2 text-sm"
          />
          <input
            name="scheduledOn"
            type="date"
            defaultValue={suggestPhoto}
            className="h-9 rounded-md border border-input bg-card px-2 text-sm"
          />
          <input
            name="notes"
            placeholder="Notes / result (optional)"
            className="h-9 rounded-md border border-input bg-card px-2 text-sm sm:col-span-2"
          />
          <Button type="submit" size="sm">
            Schedule / request
          </Button>
        </form>
      </section>

      <section className="ff-card overflow-hidden">
        <DeskColumnTable
          moduleId="inspections"
          columns={INSPECTIONS_LIST_COLUMNS}
          empty="No inspections in this view."
          rows={rows.map(({ inspection, policy, contact, account }) => ({
            key: inspection.id,
            cells: {
              policy: (
                <>
                  <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                  {inspection.notes || inspection.result ? (
                    <div className="text-sm text-muted-foreground">
                      {[inspection.result, inspection.notes].filter(Boolean).join(" · ")}
                    </div>
                  ) : null}
                  <div className="mt-1 text-xs">
                    <RecordLink href={`/policies/${policy.id}`}>Open policy</RecordLink>
                  </div>
                </>
              ),
              kind: inspectionKindLabel(inspection.kind),
              status: (
                <StatusBadge status={inspection.status}>
                  {inspectionStatusLabel(inspection.status)}
                </StatusBadge>
              ),
              next: inspectionNextStep(inspection.status),
              party: contact ? `${contact.lastName}, ${contact.firstName}` : account?.name ?? "—",
              when: inspection.scheduledOn ? formatDay(inspection.scheduledOn) : "—",
              actions: (
                <InspectionActions inspectionId={inspection.id} status={inspection.status} />
              ),
            },
          }))}
        />
      </section>
    </AppShell>
  );
}
