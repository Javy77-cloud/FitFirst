"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getActor } from "@/lib/auth/session";
import { canSeeOwned, isAdmin } from "@/lib/auth/rbac";
import { COMMISSION_STATUSES, DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { commissionEvents, commissions, policies } from "@/lib/db/schema";
import { fieldsFromForm, savePolicyCommissionFields } from "@/lib/commissions/persist";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

async function writeStatus(
  commissionId: string,
  status: string,
  actorId: string,
  note: string,
) {
  const [current] = await db
    .select({
      id: commissions.id,
      status: commissions.status,
      policyId: commissions.policyId,
    })
    .from(commissions)
    .where(and(eq(commissions.id, commissionId), eq(commissions.tenantId, DEFAULT_TENANT_ID)));
  if (!current) return;

  const paid = status === "paid";
  await db
    .update(commissions)
    .set({
      status,
      paidDate: paid ? new Date() : null,
      paidByUserId: paid ? actorId : null,
      updatedAt: new Date(),
    })
    .where(and(eq(commissions.id, commissionId), eq(commissions.tenantId, DEFAULT_TENANT_ID)));

  await db.insert(commissionEvents).values({
    tenantId: DEFAULT_TENANT_ID,
    commissionId,
    actorId,
    fromStatus: current.status,
    toStatus: status,
    note,
  });
}

export async function markCommissionStatus(formData: FormData) {
  const actor = await getActor();
  if (!isAdmin(actor)) return;
  const id = str(formData, "commissionId");
  const status = str(formData, "status");
  if (!id || !COMMISSION_STATUSES.includes(status as (typeof COMMISSION_STATUSES)[number])) {
    return;
  }
  await writeStatus(id, status, actor.id, `Status set to ${status}`);
  revalidatePaths(id);
}

async function revalidatePaths(commissionId: string) {
  const [row] = await db
    .select({ policyId: commissions.policyId })
    .from(commissions)
    .where(eq(commissions.id, commissionId));
  revalidatePath("/commissions");
  revalidatePath("/");
  revalidatePath("/policies");
  if (row?.policyId) revalidatePath(`/policies/${row.policyId}`);
}

export async function savePolicyCommission(formData: FormData) {
  const actor = await getActor();
  const policyId = str(formData, "policyId");
  if (!policyId) return;
  const [policy] = await db
    .select({ id: policies.id, ownerId: policies.ownerId })
    .from(policies)
    .where(and(eq(policies.id, policyId), eq(policies.tenantId, DEFAULT_TENANT_ID)));
  if (!policy || !canSeeOwned(actor, policy.ownerId)) return;
  await savePolicyCommissionFields(policyId, fieldsFromForm(formData), actor.id);
  revalidatePath("/commissions");
  revalidatePath("/");
  revalidatePath("/policies");
  revalidatePath(`/policies/${policyId}`);
}

export async function markCommissionPaid(formData: FormData) {
  const actor = await getActor();
  if (!isAdmin(actor)) return;
  const id = str(formData, "commissionId");
  if (!id) return;
  await writeStatus(id, "paid", actor.id, "Marked paid — policy status unchanged");
  revalidatePaths(id);
}
