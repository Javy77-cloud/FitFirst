import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EarningsStrip } from "@/components/commissions/earnings-strip";
import { isAdmin } from "@/lib/auth/rbac";
import {
  earningsTotals,
  goalProgress,
  rollupPendingPaidBy,
} from "@/lib/commissions/rollups";
import { formatMoney } from "@/lib/domain";
import {
  getAgentForReport,
  listCarrierGoals,
  listCommissions,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function AgentCommissionReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { actor, agent } = await getAgentForReport(id);
  if (!agent) notFound();
  if (!isAdmin(actor) && agent.id !== actor.id) notFound();

  const [{ rows }, goalRows] = await Promise.all([
    listCommissions({ view: "agency", range: "all", agentId: agent.id }),
    listCarrierGoals(2026),
  ]);

  const rollupSource = rows.map((row) => ({
    agentId: row.commission.agentId,
    agentName: row.agent.name,
    carrierId: row.commission.carrierId,
    carrierName: row.carrier?.name ?? "Unassigned",
    lineOfBusiness: row.commission.lineOfBusiness,
    premium: row.commission.premium,
    amount: row.commission.amount,
    agencyAmount: row.commission.agencyAmount,
    status: row.commission.status,
  }));
  const earnings = earningsTotals(rollupSource);
  const byCarrier = rollupPendingPaidBy(rollupSource, (row) => ({
    key: row.carrierId ?? "none",
    label: row.carrierName || "Unassigned",
  }));
  const byLine = rollupPendingPaidBy(rollupSource, (row) => ({
    key: row.lineOfBusiness,
    label: row.lineOfBusiness,
  }));
  const goals = goalProgress(
    rollupSource,
    goalRows.map((row) => ({
      carrierId: row.goal.carrierId,
      carrierName: row.carrier.name,
      year: row.goal.year,
      premiumGoal: row.goal.premiumGoal,
      policyGoal: row.goal.policyGoal,
    })),
  );

  return (
    <AppShell title={`${agent.name} · producer report`}>
      <p className="mb-3 text-sm text-muted-foreground">
        Pending vs paid for this producer. Goal bars use seeded carrier premium targets only —
        no invented score.{" "}
        <Link href="/commissions" className="text-primary hover:underline">
          Back to commissions
        </Link>
      </p>

      <EarningsStrip totals={earnings} mode="producer" />

      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
            By carrier
          </div>
          <SplitTable rows={byCarrier} empty="No carrier rows for this producer." />
        </section>
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
            By policy type
          </div>
          <SplitTable rows={byLine} empty="No line rows for this producer." />
        </section>
      </div>

      {goals.length > 0 ? (
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
            Written vs carrier goal (2026)
          </div>
          <table className="ff-table">
            <thead>
              <tr>
                <th>Carrier</th>
                <th>Written premium</th>
                <th>Goal</th>
                <th>Policies</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((goal) => {
                const pct =
                  goal.premiumGoal > 0
                    ? Math.min(100, Math.round((goal.writtenPremium / goal.premiumGoal) * 100))
                    : 0;
                return (
                  <tr key={goal.carrierId}>
                    <td>
                      {goal.label}
                      <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-secondary">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${Math.max(goal.writtenPremium > 0 ? 6 : 0, pct)}%` }}
                        />
                      </div>
                    </td>
                    <td>{formatMoney(goal.writtenPremium)}</td>
                    <td>{formatMoney(goal.premiumGoal)}</td>
                    <td>
                      {goal.writtenPolicies}
                      {goal.policyGoal != null ? ` / ${goal.policyGoal}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          No carrier goals on the book yet — progress is hidden instead of faked.
        </p>
      )}
    </AppShell>
  );
}

function SplitTable({
  rows,
  empty,
}: {
  rows: Array<{ key: string; label: string; pending: number; paid: number; pendingCount: number; paidCount: number }>;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <table className="ff-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Pending</th>
          <th>Paid</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td>
              {row.label}
              <div className="text-[11px] text-muted-foreground">
                {row.pendingCount} unpaid · {row.paidCount} paid
              </div>
            </td>
            <td>{formatMoney(row.pending)}</td>
            <td className="font-medium">{formatMoney(row.paid)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
