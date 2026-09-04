import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { CommissionFilters } from "@/components/commissions/filters";
import { filterCommissionRows, isCommissionPeriod } from "@/lib/commissions/filters";
import { formatMoney } from "@/lib/domain";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { commissions, policies } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const family = first(params.family);
  const sub = first(params.sub);
  const rangeRaw = first(params.range);
  const range = isCommissionPeriod(rangeRaw) ? rangeRaw : "all";

  const loaded = await db
    .select({ commission: commissions, policy: policies })
    .from(commissions)
    .leftJoin(policies, eq(commissions.policyId, policies.id))
    .where(eq(commissions.tenantId, DEFAULT_TENANT_ID));

  const rows = filterCommissionRows(
    loaded.map(({ commission, policy }) => ({
      commission,
      policy,
      lineOfBusiness: commission.lineOfBusiness ?? policy?.lineOfBusiness,
      policyLineOfBusiness: policy?.lineOfBusiness,
      policySubType: policy?.policySubType,
      status: commission.status,
      dueDate: commission.dueDate,
      paidDate: commission.paidDate,
      createdAt: commission.createdAt,
    })),
    { family, sub, range },
  );

  const pending = rows
    .filter((r) => r.commission.status === "pending" || r.commission.status === "payable")
    .reduce((sum, r) => sum + Number(r.commission.amount ?? 0), 0);
  const paid = rows
    .filter((r) => r.commission.status === "paid")
    .reduce((sum, r) => sum + Number(r.commission.amount ?? 0), 0);

  const filtered = Boolean(family || (sub && sub !== "all") || (range && range !== "all"));

  return (
    <AppShell title="Commissions">
      <p className="mb-3 text-sm text-muted-foreground">
        Per-policy agency earnings. Filter Life, Health, or P&amp;C, then a line, then a look-back
        or look-ahead window. Ana Dib stays shopping — $0 here, no bind. No live carrier payouts.
      </p>
      <CommissionFilters family={family} sub={sub} range={range} />
      {filtered ? (
        <p className="mb-3 text-[12px] text-muted-foreground">
          Showing {rows.length} row{rows.length === 1 ? "" : "s"} for this cut.
        </p>
      ) : null}
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
            {filtered
              ? "No commission rows in this book or date window. Quotes are not earnings — Ana remains $0 / unbound."
              : "No commission rows yet. Owner-book policies still show on Home written premium. Ana stays $0."}
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Book</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ commission, policy, lineOfBusiness }) => (
                <tr key={commission.id}>
                  <td>{policy?.policyNumber ?? "—"}</td>
                  <td className="uppercase text-xs">{lineOfBusiness ?? "—"}</td>
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
