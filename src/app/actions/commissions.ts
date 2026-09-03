"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { COMMISSION_STATUSES, DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { commissionEvents, commissions } from "@/lib/db/schema";
import { ADMIN_USER_ID } from "@/lib/fixtures/ids";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

async function writeStatus(commissionId: string, status: string, actorId: string, note: string) {
  const [current] = await db
    .select({
      id: commissions.id,
      status: commissions.status,
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
  const id = str(formData, "commissionId");
  const status = str(formData, "status");
  if (!id || !COMMISSION_STATUSES.includes(status as (typeof COMMISSION_STATUSES)[number])) {
    return;
  }
  await writeStatus(id, status, ADMIN_USER_ID, `Status set to ${status}`);
  revalidatePath("/commissions");
  revalidatePath("/");
}

export async function savePolicyCommission(formData: FormData) {
  const policyId = str(formData, "policyId");
  if (!policyId) return;
  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/commissions");
}

export async function markCommissionPaid(formData: FormData) {
  const id = str(formData, "commissionId");
  if (!id) return;
  await writeStatus(id, "paid", ADMIN_USER_ID, "Marked paid — policy status unchanged");
  revalidatePath("/commissions");
  revalidatePath("/");
}
