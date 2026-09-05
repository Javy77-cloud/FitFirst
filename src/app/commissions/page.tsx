import Link from "next/link";
import { eq } from "drizzle-orm";
import { markCommissionPaid, markCommissionStatus } from "@/app/actions/commissions";
import { AppShell } from "@/components/app-shell";
import { AskThread } from "@/components/ask-thread";
import { Button } from "@/components/ui/button";
import { currentDeskSession, getActor } from "@/lib/auth/session";
import {
  commissionBucket,
  commissionBucketLabel,
  pendingPaidTotals,
} from "@/lib/commissions/buckets";
import { DEFAULT_TENANT_ID, formatMoney } from "@/lib/domain";
import { db } from "@/lib/db";
import { listAsksForEntities } from "@/lib/db/queries";
import { commissions, policies } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string }>;
}) {
  const { bucket } = await searchParams;
  const [actor, session] = await Promise.all([getActor(), currentDeskSession()]);
  const rows = await db
    .select({ commission: commissions, policy: policies })
    .from(commissions)
    .leftJoin(policies, eq(commissions.policyId, policies.id))
    .where(eq(commissions.tenantId, DEFAULT_TENANT_ID));
  const totals = pendingPaidTotals(rows.map((row) => row.commission));
  const visible = rows.filter((row) => {
    if (bucket === "paid") return commissionBucket(row.commission.status) === "paid";
    if (bucket === "pending") return commissionBucket(row.commission.status) === "pending";
    return true;
  });
  const asks = await listAsksForEntities(
    "commission",
    rows.map((row) => row.commission.id),
  );
  const asksById = new Map<string, typeof asks>();
  for (const row of asks) {
    const list = asksById.get(row.ask.entityId) ?? [];
    list.push(row);
    asksById.set(row.ask.entityId, list);
  }

  return (
    <AppShell title="Commissions">
      <p className="mb-3 text-base text-muted-foreground">
        Per-policy agency earnings. Pending is still owed (pending, payable, or held). Paid is
        received. Marking paid does not change the Policy. Ana is $0 / unbound.
      </p>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Link
          href="/commissions?bucket=pending"
          className={cn("ff-card p-4 hover:border-primary", bucket === "pending" && "border-primary")}
        >
          <div className="text-xs text-muted-foreground">Pending — still owed</div>
          <div className="text-2xl font-semibold text-navy">{formatMoney(totals.pending)}</div>
          <div className="text-base text-muted-foreground">{totals.pendingCount} rows</div>
        </Link>
        <Link
          href="/commissions?bucket=paid"
          className={cn("ff-card p-4 hover:border-primary", bucket === "paid" && "border-primary")}
        >
          <div className="text-xs text-muted-foreground">Paid — received</div>
          <div className="text-2xl font-semibold text-navy">{formatMoney(totals.paid)}</div>
          <div className="text-base text-muted-foreground">{totals.paidCount} rows</div>
        </Link>
      </div>
      {bucket ? (
        <p className="mb-3 text-base">
          Showing {bucket === "paid" ? "paid" : "pending"} only.{" "}
          <Link href="/commissions" className="text-primary hover:underline">
            Show all
          </Link>
        </p>
      ) : null}
      <section className="ff-card overflow-hidden">
        {visible.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            No {bucket || "commission"} rows yet. Owner-book policies still show on Home written
            premium.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Bucket</th>
                <th>Desk status</th>
                <th>Amount</th>
                <th>Action</th>
                {session.isAdmin ? <th>Ask a teammate</th> : null}
              </tr>
            </thead>
            <tbody>
              {visible.map(({ commission, policy }) => {
                const paid = commissionBucket(commission.status) === "paid";
                return (
                  <tr key={commission.id}>
                    <td>
                      {policy ? (
                        <Link
                          href={`/policies/${policy.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {policy.policyNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span
                        className={cn(
                          "inline-flex rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase",
                          paid ? "bg-fit-green-bg text-fit-green" : "bg-fit-yellow-bg text-fit-yellow",
                        )}
                      >
                        {paid ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td>{commissionBucketLabel(commission.status)}</td>
                    <td>{formatMoney(commission.amount)}</td>
                    <td>
                      {paid ? (
                        <form action={markCommissionStatus}>
                          <input type="hidden" name="commissionId" value={commission.id} />
                          <input type="hidden" name="status" value="pending" />
                          <Button type="submit" size="xs" variant="outline">
                            Move back to pending
                          </Button>
                        </form>
                      ) : (
                        <form action={markCommissionPaid}>
                          <input type="hidden" name="commissionId" value={commission.id} />
                          <Button type="submit" size="xs">
                            Mark paid
                          </Button>
                        </form>
                      )}
                    </td>
                    {session.isAdmin ? (
                      <td>
                        <AskThread
                          entityType="commission"
                          entityId={commission.id}
                          actor={actor}
                          asks={asksById.get(commission.id) ?? []}
                          compact
                        />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
