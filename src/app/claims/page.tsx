import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ClaimList } from "@/components/claims/claim-list";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { buttonVariants } from "@/components/ui/button";
import { CLAIM_PIPELINE, CLAIM_STATUS_LABELS, claimStatusLabel } from "@/lib/claims";
import { listDeskClaims } from "@/lib/db/claim-queries";
import { matchesField, pickFilterParams, uniqueOptions } from "@/lib/saved-filters";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filter = pickFilterParams(await searchParams, ["status", "cause"]);
  const all = await listDeskClaims();
  const rows = all.filter(
    ({ claim }) =>
      matchesField(claim.status, filter.status) && matchesField(claim.causeType, filter.cause),
  );

  return (
    <AppShell
      title="Claims log"
      actions={
        <Link href="/claims/new" className={cn(buttonVariants({ size: "sm" }))}>
          Add FNOL
        </Link>
      }
    >
      <p className="mb-3 text-base text-muted-foreground">
        Agency FNOL log — inquiry, referred to carrier, or closed. Not a claims shop. No reserves
        or adjusters.
      </p>
      <SavedFiltersBar
        moduleId="claims"
        fields={[
          {
            key: "status",
            label: "Status",
            options: uniqueOptions(all.map(({ claim }) => claim.status)),
          },
          {
            key: "cause",
            label: "Cause",
            options: uniqueOptions(all.map(({ claim }) => claim.causeType)),
          },
        ]}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {CLAIM_PIPELINE.map((status) => {
          const count = all.filter((row) => row.claim.status === status).length;
          const active = filter.status === status;
          return (
            <Link
              key={status}
              href={active ? "/claims" : `/claims?status=${status}`}
              className={cn(
                "ff-card p-4 hover:border-primary",
                active && "border-primary",
              )}
            >
              <div className="text-xs uppercase text-muted-foreground">
                {CLAIM_STATUS_LABELS[status]}
              </div>
              <div className="text-2xl font-semibold text-navy">{count}</div>
              <div className="text-base text-muted-foreground">
                {active ? "Showing this column" : "Open this column"}
              </div>
            </Link>
          );
        })}
      </div>

      <section className="ff-card overflow-hidden">
        <ClaimList
          showPolicy
          empty="No claims on the book yet. Add FNOL from this page or a Policy record."
          rows={rows.map(({ claim, policy, contact }) => ({
            id: claim.id,
            status: claim.status,
            causeType: claim.causeType ?? "other",
            description: claim.description,
            reportedHow: claim.reportedHow ?? "phone",
            dateReported: claim.dateReported ?? claim.createdAt,
            dateOfLoss: claim.dateOfLoss,
            carrierClaimNumber: claim.carrierClaimNumber,
            policyId: policy?.id ?? claim.policyId,
            policyNumber: policy?.policyNumber,
            contactId: contact?.id ?? claim.contactId,
            contactName: contact ? `${contact.lastName}, ${contact.firstName}` : null,
          }))}
        />
        {filter.status ? (
          <p className="px-4 py-3 text-base text-muted-foreground">
            Showing {claimStatusLabel(filter.status)}. Clear the filter to see the full log.
          </p>
        ) : null}
      </section>
    </AppShell>
  );
}
