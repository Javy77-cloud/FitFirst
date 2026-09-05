import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { CommissionFilters } from "@/components/commissions/filters";
import { CommissionDeskTable, type CommissionDeskRow } from "@/components/commissions/desk-table";
import { EarningsStrip } from "@/components/commissions/earnings-strip";
import { CommissionStatusTabs } from "@/components/commissions/status-tabs";
import { currentDeskSession } from "@/lib/auth/session";
import {
  filterCommissionRows,
  isCommissionPeriod,
  isCommissionStatusTab,
  isPendingCommissionStatus,
  matchesCommissionStatus,
  scopeCommissionRows,
  type CommissionStatusTab,
} from "@/lib/commissions/filters";
import { earningsTotals, rollupPendingPaidBy } from "@/lib/commissions/rollups";
import { formatMoney } from "@/lib/domain";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { commissions, policies, users } from "@/lib/db/schema";
import { RecordLink } from "@/components/record-links";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toDeskRow(row: {
  commission: typeof commissions.$inferSelect;
  policy: typeof policies.$inferSelect | null;
  agentName: string | null;
}): CommissionDeskRow {
  return {
    id: row.commission.id,
    agentId: row.commission.agentId,
    policyId: row.policy?.id ?? row.commission.policyId,
    policyNumber: row.policy?.policyNumber ?? null,
    agentName: row.agentName || "Unassigned",
    insuranceType: row.commission.insuranceType ?? row.policy?.insuranceType,
    lineOfBusiness: row.commission.lineOfBusiness ?? row.policy?.lineOfBusiness,
    policyType: row.commission.policyType ?? row.policy?.policyType,
    policySubType: row.commission.policySubType ?? row.policy?.policySubType,
    status: row.commission.status,
    amount: row.commission.amount,
    dueDate: row.commission.dueDate,
    paidDate: row.commission.paidDate,
  };
}

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await currentDeskSession();
  const params = await searchParams;
  const family = first(params.family);
  const sub = first(params.sub);
  const rangeRaw = first(params.range);
  const range = isCommissionPeriod(rangeRaw) ? rangeRaw : "all";
  const status: CommissionStatusTab = isCommissionStatusTab(first(params.status))
    ? (first(params.status) as CommissionStatusTab)
    : "all";

  const loaded = await db
    .select({
      commission: commissions,
      policy: policies,
      agentName: users.name,
    })
    .from(commissions)
    .leftJoin(policies, eq(commissions.policyId, policies.id))
    .leftJoin(users, eq(commissions.agentId, users.id))
    .where(eq(commissions.tenantId, DEFAULT_TENANT_ID));

  const scoped = scopeCommissionRows(
    loaded.map((row) => ({
      ...row,
      agentId: row.commission.agentId,
    })),
    { isAdmin: session.isAdmin, viewerId: session.userId },
  );

  const bookFiltered = filterCommissionRows(
    scoped.map((row) => ({
      ...row,
      lineOfBusiness: row.commission.lineOfBusiness ?? row.policy?.lineOfBusiness,
      policyLineOfBusiness: row.policy?.lineOfBusiness,
      insuranceType: row.commission.insuranceType ?? row.policy?.insuranceType,
      policyType: row.commission.policyType ?? row.policy?.policyType,
      policySubType: row.commission.policySubType ?? row.policy?.policySubType,
      status: row.commission.status,
      dueDate: row.commission.dueDate,
      paidDate: row.commission.paidDate,
      createdAt: row.commission.createdAt,
    })),
    { family, sub, range },
  );

  const visible = bookFiltered.filter((row) => matchesCommissionStatus(row.status, status));
  const pendingRows = bookFiltered.filter((row) => isPendingCommissionStatus(row.status));
  const paidRows = bookFiltered.filter((row) => row.status === "paid");
  const totals = earningsTotals(
    bookFiltered.map((row) => ({
      amount: row.commission.amount ?? 0,
      agencyAmount: row.commission.agencyAmount,
      status: row.commission.status,
    })),
  );
  const rollups = session.isAdmin
    ? rollupPendingPaidBy(
        bookFiltered.map((row) => ({
          agentId: row.commission.agentId ?? "none",
          agentName: row.agentName || "Unassigned",
          carrierId: row.commission.carrierId,
          carrierName: "",
          lineOfBusiness: row.commission.lineOfBusiness ?? "",
          premium: row.commission.premium ?? 0,
          amount: row.commission.amount ?? 0,
          status: row.commission.status,
        })),
        (row) => ({ key: row.agentId, label: row.agentName }),
      )
    : [];

  const filtered = Boolean(family || (sub && sub !== "all") || (range && range !== "all"));
  const showProducer = session.isAdmin;
  const pendingDesk = pendingRows.map(toDeskRow);
  const paidDesk = paidRows.map(toDeskRow);
  const visibleDesk = visible.map(toDeskRow);

  return (
    <AppShell title="Commissions">
      <p className="mb-3 text-base text-muted-foreground">
        {session.isAdmin
          ? "Agency earnings by policy. Pending vs paid. Filter Life, Health, or P&C, then a subtype. Ana Dib stays shopping — $0 here, no bind."
          : "Your commissions only. Pending vs paid. Filter Life, Health, or P&C, then a subtype to find a row. Ana Dib stays shopping — $0 / unbound."}
      </p>
      <CommissionStatusTabs
        status={status}
        family={family}
        sub={sub}
        range={range}
        allLabel={session.isAdmin ? "All" : "My commissions"}
        counts={{
          all: bookFiltered.length,
          pending: pendingRows.length,
          paid: paidRows.length,
        }}
      />
      <CommissionFilters family={family} sub={sub} range={range} status={status} />
      {filtered ? (
        <p className="mb-3 text-base text-muted-foreground">
          Showing {visible.length} row{visible.length === 1 ? "" : "s"} for this cut.
        </p>
      ) : null}
      <EarningsStrip totals={totals} mode={session.isAdmin ? "agency" : "producer"} />
      {session.isAdmin && rollups.length > 0 ? (
        <section className="ff-card mb-4 overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-navy">Agency by producer</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Producer</th>
                  <th>Pending</th>
                  <th>Paid</th>
                </tr>
              </thead>
              <tbody>
                {rollups.map((row) => (
                  <tr key={row.key}>
                    <td>
                      {row.key !== "none" ? (
                        <RecordLink href={`/commissions/agents/${row.key}`}>{row.label}</RecordLink>
                      ) : (
                        row.label
                      )}
                    </td>
                    <td>
                      {formatMoney(row.pending)}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {row.pendingCount}
                      </span>
                    </td>
                    <td>
                      {formatMoney(row.paid)}
                      <span className="ml-1 text-xs text-muted-foreground">{row.paidCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      {status === "all" ? (
        <div className="space-y-4">
          <section className="ff-card overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-navy">Pending</h2>
            </div>
            <CommissionDeskTable
              rows={pendingDesk}
              showProducer={showProducer}
              empty={
                filtered
                  ? "No pending commissions in this book or date window. Quotes are not earnings — Ana remains $0 / unbound."
                  : "Nothing pending. Owner-book policies still show on Home written premium. Ana stays $0."
              }
            />
          </section>
          <section className="ff-card overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-navy">Paid</h2>
            </div>
            <CommissionDeskTable
              rows={paidDesk}
              showProducer={showProducer}
              empty={
                filtered
                  ? "No paid commissions in this book or date window."
                  : "No paid rows yet."
              }
            />
          </section>
        </div>
      ) : (
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-navy">
              {status === "pending" ? "Pending" : "Paid"}
            </h2>
          </div>
          <CommissionDeskTable
            rows={visibleDesk}
            showProducer={showProducer}
            empty={
              filtered
                ? "No commission rows in this book or date window. Quotes are not earnings — Ana remains $0 / unbound."
                : status === "pending"
                  ? "Nothing pending on this book. Ana stays $0."
                  : "No paid rows on this book. Ana stays $0."
            }
          />
        </section>
      )}
    </AppShell>
  );
}
