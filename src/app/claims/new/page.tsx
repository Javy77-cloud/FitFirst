import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { LogClaimForm } from "@/components/claims/log-form";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, contacts, policies } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function NewClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ policy?: string }>;
}) {
  const { policy: policyId } = await searchParams;
  const rows = await db
    .select({ policy: policies, contact: contacts, account: accounts })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .where(eq(policies.tenantId, DEFAULT_TENANT_ID))
    .orderBy(asc(policies.policyNumber));

  const options = rows.map(({ policy, contact, account }) => ({
    id: policy.id,
    label: [
      policy.policyNumber,
      contact ? `${contact.lastName}, ${contact.firstName}` : account?.name,
      policy.lineOfBusiness,
    ]
      .filter(Boolean)
      .join(" · "),
  }));

  return (
    <AppShell title="Add new claim">
      <p className="mb-3 text-sm text-muted-foreground">
        Stub desk notice. Saves a claims row so the log is not empty. Handle FNOL on the carrier
        website — FitFirst does not take the claim, set reserves, or pay.
      </p>
      <p className="mb-4 text-xs">
        <Link href="/claims" className="text-primary hover:underline">
          Back to claims log
        </Link>
      </p>
      <LogClaimForm policyId={policyId} policies={options} />
    </AppShell>
  );
}
