import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CommissionDeskTable } from "@/components/commissions/desk-table";
import { EarningsStrip } from "@/components/commissions/earnings-strip";
import { currentDeskSession } from "@/lib/auth/session";
import { isPendingCommissionStatus } from "@/lib/commissions/filters";
import { earningsTotals } from "@/lib/commissions/rollups";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { commissions, policies, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function AgentCommissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await currentDeskSession();
  const { id } = await params;
  if (!id) notFound();
  if (session.isAgent && session.userId && session.userId !== id) {
    notFound();
  }

  const [agent] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, id)));
  if (!agent) notFound();

  const loaded = await db
    .select({ commission: commissions, policy: policies })
    .from(commissions)
    .leftJoin(policies, eq(commissions.policyId, policies.id))
    .where(and(eq(commissions.tenantId, DEFAULT_TENANT_ID), eq(commissions.agentId, id)));

  const totals = earningsTotals(
    loaded.map((row) => ({
      amount: row.commission.amount ?? 0,
      agencyAmount: row.commission.agencyAmount,
      status: row.commission.status,
    })),
  );
  const rows = loaded.map((row) => ({
    id: row.commission.id,
    agentId: row.commission.agentId,
    policyId: row.policy?.id ?? row.commission.policyId,
    policyNumber: row.policy?.policyNumber ?? null,
    agentName: agent.name,
    insuranceType: row.commission.insuranceType ?? row.policy?.insuranceType,
    lineOfBusiness: row.commission.lineOfBusiness ?? row.policy?.lineOfBusiness,
    policyType: row.commission.policyType ?? row.policy?.policyType,
    policySubType: row.commission.policySubType ?? row.policy?.policySubType,
    status: row.commission.status,
    amount: row.commission.amount,
    dueDate: row.commission.dueDate,
    paidDate: row.commission.paidDate,
  }));
  const pending = rows.filter((row) => isPendingCommissionStatus(row.status));
  const paid = rows.filter((row) => row.status === "paid");

  return (
    <AppShell title={`${agent.name} · commissions`}>
      <p className="mb-3 text-base text-muted-foreground">
        Producer rollup for {agent.name}. Pending vs paid only — no teammate pings.{" "}
        <a href="/commissions" className="text-primary hover:underline">
          Back to Commissions
        </a>
        .
      </p>
      <EarningsStrip totals={totals} mode={session.isAdmin ? "agency" : "producer"} />
      <div className="space-y-4">
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-navy">Pending</h2>
          </div>
          <CommissionDeskTable
            rows={pending}
            empty={`${agent.name} has no pending commissions. Ana stays $0 / unbound.`}
          />
        </section>
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-navy">Paid</h2>
          </div>
          <CommissionDeskTable rows={paid} empty={`${agent.name} has no paid commissions yet.`} />
        </section>
      </div>
    </AppShell>
  );
}
