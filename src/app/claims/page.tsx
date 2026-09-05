import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ClaimsDeskNotice } from "@/components/claims/desk-notice";
import { ClaimStatusPipeline } from "@/components/claims/status-pipeline";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listDeskClaims } from "@/lib/db/claim-queries";

export const dynamic = "force-dynamic";

export default async function ClaimsPage() {
  const rows = await listDeskClaims();

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
      {rows.length === 0 ? (
        <section className="ff-card px-4 py-8 text-base text-muted-foreground">
          No claims on the book yet. Log FNOL from a Policy or Contact.
        </section>
      ) : (
        <ClaimStatusPipeline
          rows={rows.map(({ claim, policy, contact }) => ({
            id: claim.id,
            status: claim.status,
            causeType: claim.causeType,
            description: claim.description,
            dateOfLoss: claim.dateOfLoss,
            dateReported: claim.dateReported,
            carrierClaimNumber: claim.carrierClaimNumber,
            policyId: policy?.id ?? null,
            policyNumber: policy?.policyNumber ?? null,
            contactId: contact?.id ?? null,
            contactName: contact ? `${contact.lastName}, ${contact.firstName}` : null,
          }))}
        />
      )}
    </AppShell>
  );
}
