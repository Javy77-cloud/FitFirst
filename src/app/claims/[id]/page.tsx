import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { claims, policies } from "@/lib/db/schema";
import { isUuid } from "@/lib/ids";

export const dynamic = "force-dynamic";

export default async function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [row] = await db
    .select({ claim: claims, policy: policies })
    .from(claims)
    .leftJoin(policies, eq(claims.policyId, policies.id))
    .where(eq(claims.id, id));
  if (!row) notFound();
  return (
    <AppShell title="Claim">
      <section className="ff-card p-4 text-sm">
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd>{row.claim.status}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Cause</dt>
            <dd>{row.claim.causeType ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Carrier claim</dt>
            <dd>{row.claim.carrierClaimNumber ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Policy</dt>
            <dd>{row.policy?.policyNumber ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Description</dt>
            <dd>{row.claim.description ?? "—"}</dd>
          </div>
        </dl>
      </section>
    </AppShell>
  );
}
