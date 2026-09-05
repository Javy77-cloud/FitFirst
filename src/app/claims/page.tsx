import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ClaimList } from "@/components/claims/claim-list";
import { ClaimsDeskNotice } from "@/components/claims/desk-notice";
import { ClaimStatusPipeline } from "@/components/claims/status-pipeline";
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
    <AppShell title="Claims log">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-base text-muted-foreground">
          FNOL desk intake and timeline. Inquiry → referred to carrier → closed. Handle the claim
          on the carrier website — FitFirst does not file FNOL, set reserves, or talk to a
          carrier claims API.
        </p>
        <Link href="/claims/new" className={cn(buttonVariants({ size: "sm" }))}>
          Log FNOL
        </Link>
      </div>
      <div className="mb-4">
        <ClaimsDeskNotice />
      </div>
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
              className={cn("ff-card p-4 hover:border-primary", active && "border-primary")}
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

      {rows.length === 0 ? (
        <section className="ff-card mb-4 px-4 py-8 text-base text-muted-foreground">
          No claims on the book yet. Log FNOL from a Policy or Contact.
        </section>
      ) : (
        <div className="mb-4">
          <ClaimStatusPipeline
            rows={rows.map(({ claim, policy, contact }) => ({
              id: claim.id,
              status: claim.status,
              causeType: claim.causeType,
              description: claim.description,
              dateOfLoss: claim.dateOfLoss,
              dateReported: claim.dateReported,
              carrierClaimNumber: claim.carrierClaimNumber,
              policyId: policy?.id ?? claim.policyId,
              policyNumber: policy?.policyNumber ?? null,
              contactId: contact?.id ?? claim.contactId,
              contactName: contact ? `${contact.lastName}, ${contact.firstName}` : null,
            }))}
          />
        </div>
      )}

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
