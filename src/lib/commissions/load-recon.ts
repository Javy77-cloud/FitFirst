import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { commissionReconciliations, commissions, policies, users } from "@/lib/db/schema";
import { toNumber } from "./math";
import {
  filterAgentOwnRows,
  filterReconStatus,
  isReconStatus,
  type ReconWorkspaceRow,
} from "./reconcile";

export async function loadReconWorkspace(opts: {
  viewerId: string | null;
  isAdmin: boolean;
  status?: string;
}): Promise<ReconWorkspaceRow[]> {
  const loaded = await db
    .select({
      recon: commissionReconciliations,
      commission: commissions,
      policy: policies,
      agentName: users.name,
    })
    .from(commissionReconciliations)
    .innerJoin(commissions, eq(commissionReconciliations.commissionId, commissions.id))
    .leftJoin(policies, eq(commissionReconciliations.policyId, policies.id))
    .leftJoin(users, eq(commissionReconciliations.agentId, users.id))
    .where(eq(commissionReconciliations.tenantId, DEFAULT_TENANT_ID));

  const rows: ReconWorkspaceRow[] = loaded.map(({ recon, commission, policy, agentName }) => ({
    reconId: recon.id,
    commissionId: recon.commissionId,
    agentId: recon.agentId,
    agentName: agentName || "Unassigned",
    policyNumber: policy?.policyNumber ?? null,
    lineOfBusiness: recon.policyId
      ? (policy?.lineOfBusiness ?? commission.lineOfBusiness)
      : commission.lineOfBusiness,
    expected: toNumber(recon.expectedAmount),
    received: toNumber(recon.receivedAmount),
    variance: toNumber(recon.variance),
    status: isReconStatus(recon.status) ? recon.status : "pending",
    note: recon.note,
    paid: commission.status === "paid",
    dueDate: commission.dueDate,
    paidDate: commission.paidDate,
    createdAt: commission.createdAt,
  }));

  const scoped = opts.isAdmin ? rows : filterAgentOwnRows(rows, opts.viewerId);
  return filterReconStatus(scoped, opts.status);
}

export async function getReconById(reconId: string) {
  const [row] = await db
    .select()
    .from(commissionReconciliations)
    .where(
      and(
        eq(commissionReconciliations.id, reconId),
        eq(commissionReconciliations.tenantId, DEFAULT_TENANT_ID),
      ),
    );
  return row ?? null;
}
