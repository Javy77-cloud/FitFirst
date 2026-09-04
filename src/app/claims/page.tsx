import Link from "next/link";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { claims, policies, contacts } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function ClaimsPage() {
  const rows = await db
    .select({ claim: claims, policy: policies, contact: contacts })
    .from(claims)
    .leftJoin(policies, eq(claims.policyId, policies.id))
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .where(eq(claims.tenantId, DEFAULT_TENANT_ID));

  return (
    <AppShell title="Claims log">
      <p className="mb-3 text-base text-muted-foreground">
        Desk log only — not a carrier claims system. Inquiry, referred to carrier, or closed.
      </p>
      <section className="ff-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            No claims on the book yet. Log one from a policy record when the slice seed is wired.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Carrier claim</th>
                <th>Cause</th>
                <th>Policy</th>
                <th>Party</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ claim, policy, contact }) => (
                <tr key={claim.id}>
                  <td>
                    <Link href={`/claims/${claim.id}`} className="font-medium text-primary hover:underline">
                      {claim.status}
                    </Link>
                  </td>
                  <td className="font-mono text-xs">{claim.carrierClaimNumber ?? "—"}</td>
                  <td>{claim.causeType ?? "—"}</td>
                  <td>{policy?.policyNumber ?? "—"}</td>
                  <td>
                    {contact ? `${contact.lastName}, ${contact.firstName}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
