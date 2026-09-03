import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { formatMoney } from "@/lib/domain";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { commissions, policies } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function CommissionsPage() {
  const rows = await db
    .select({ commission: commissions, policy: policies })
    .from(commissions)
    .leftJoin(policies, eq(commissions.policyId, policies.id))
    .where(eq(commissions.tenantId, DEFAULT_TENANT_ID));
  const pending = rows
    .filter((r) => r.commission.status === "pending" || r.commission.status === "payable")
    .reduce((sum, r) => sum + Number(r.commission.amount ?? 0), 0);
  const paid = rows
    .filter((r) => r.commission.status === "paid")
    .reduce((sum, r) => sum + Number(r.commission.amount ?? 0), 0);

  return (
    <AppShell title="Commissions">
      <p className="mb-3 text-sm text-muted-foreground">
        Per-policy agency earnings. Pending vs paid. No live carrier payouts.
      </p>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="ff-card p-4">
          <div className="text-xs text-muted-foreground">Pending</div>
          <div className="text-2xl font-semibold text-navy">{formatMoney(pending)}</div>
        </div>
        <div className="ff-card p-4">
          <div className="text-xs text-muted-foreground">Paid</div>
          <div className="text-2xl font-semibold text-navy">{formatMoney(paid)}</div>
        </div>
      </div>
      <section className="ff-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No commission rows yet. Owner-book policies still show on Home written premium.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ commission, policy }) => (
                <tr key={commission.id}>
                  <td>{policy?.policyNumber ?? "—"}</td>
                  <td className="uppercase">{commission.status}</td>
                  <td>{formatMoney(commission.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
