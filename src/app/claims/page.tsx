import Link from "next/link";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { ColumnPicker, Col } from "@/components/column-picker";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { buttonVariants } from "@/components/ui/button";
import { defaultColumns } from "@/lib/desk/columns";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { claims, policies, contacts } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClaimsPage() {
  const rows = await db
    .select({ claim: claims, policy: policies, contact: contacts })
    .from(claims)
    .leftJoin(policies, eq(claims.policyId, policies.id))
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .where(eq(claims.tenantId, DEFAULT_TENANT_ID));

  return (
    <AppShell
      title="Claims log"
      actions={
        <Link href="/claims/new" className={cn(buttonVariants({ size: "lg" }))}>
          Add new claim
        </Link>
      }
      columns={<ColumnPicker tableKey="claims" initial={defaultColumns("claims")} />}
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Desk log only — not a carrier claims system. Inquiry, referred to carrier, or closed.
        Use Add new claim to record a notice, then send the insured to the carrier site.
      </p>
      <section className="ff-card overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No claims on the book yet. Log a notice here — this does not file FNOL.
            </p>
            <Link
              href="/claims/new"
              className={cn(buttonVariants({ size: "lg" }), "mt-4")}
            >
              Add new claim
            </Link>
          </div>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="claims" col="status" as="th">Status</Col>
                <Col table="claims" col="carrierClaim" as="th">Carrier claim</Col>
                <Col table="claims" col="cause" as="th">Cause</Col>
                <Col table="claims" col="policy" as="th">Policy</Col>
                <Col table="claims" col="party" as="th">Party</Col>
              </tr>
            </thead>
            <SheetTbody>
              {rows.map(({ claim, policy, contact }) => (
                <tr key={claim.id}>
                  <Col table="claims" col="status">
                    <Link href={`/claims/${claim.id}`} className="font-medium text-primary hover:underline">
                      {claim.status}
                    </Link>
                  </Col>
                  <Col table="claims" col="carrierClaim" className="font-mono text-xs">
                    {claim.carrierClaimNumber ?? "—"}
                  </Col>
                  <Col table="claims" col="cause">{claim.causeType ?? "—"}</Col>
                  <Col table="claims" col="policy">{policy?.policyNumber ?? "—"}</Col>
                  <Col table="claims" col="party">
                    {contact ? `${contact.lastName}, ${contact.firstName}` : "—"}
                  </Col>
                </tr>
              ))}
            </SheetTbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
