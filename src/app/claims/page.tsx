import Link from "next/link";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { ColumnTable } from "@/components/lists/column-table";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { claims, policies, contacts } from "@/lib/db/schema";
import { matchesField, pickFilterParams, uniqueOptions } from "@/lib/saved-filters";

export const dynamic = "force-dynamic";

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filter = pickFilterParams(await searchParams, ["status", "cause"]);
  const all = await db
    .select({ claim: claims, policy: policies, contact: contacts })
    .from(claims)
    .leftJoin(policies, eq(claims.policyId, policies.id))
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .where(eq(claims.tenantId, DEFAULT_TENANT_ID));
  const rows = all.filter(
    ({ claim }) => matchesField(claim.status, filter.status) && matchesField(claim.causeType, filter.cause),
  );

  return (
    <AppShell title="Claims log">
      <p className="mb-3 text-base text-muted-foreground">
        Desk log only — not a carrier claims system. Inquiry, referred to carrier, or closed.
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
      <section className="ff-card overflow-hidden">
        <ColumnTable
          moduleId="claims"
          columns={[
            { id: "status", label: "Status", locked: true },
            { id: "carrierClaim", label: "Carrier claim" },
            { id: "cause", label: "Cause" },
            { id: "policy", label: "Policy" },
            { id: "party", label: "Party" },
          ]}
          empty="No claims on the book yet. Log one from a policy record when the slice seed is wired."
          rows={rows.map(({ claim, policy, contact }) => ({
            key: claim.id,
            cells: {
              status: (
                <Link href={`/claims/${claim.id}`} className="font-medium text-primary hover:underline">
                  {claim.status}
                </Link>
              ),
              carrierClaim: (
                <span className="font-mono text-xs">{claim.carrierClaimNumber ?? "—"}</span>
              ),
              cause: claim.causeType ?? "—",
              policy: policy?.policyNumber ?? "—",
              party: contact ? `${contact.lastName}, ${contact.firstName}` : "—",
            },
          }))}
        />
      </section>
    </AppShell>
  );
}
