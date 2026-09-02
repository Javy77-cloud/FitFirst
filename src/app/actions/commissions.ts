"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/rbac";
import { COMMISSION_STATUSES, DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { commissions } from "@/lib/db/schema";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function markCommissionStatus(formData: FormData) {
  const actor = await getActor();
  if (!isAdmin(actor)) return;
  const id = str(formData, "commissionId");
  const status = str(formData, "status");
  if (!id || !COMMISSION_STATUSES.includes(status as (typeof COMMISSION_STATUSES)[number])) {
    return;
  }
  await db
    .update(commissions)
    .set({
      status,
      paidDate: status === "paid" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(commissions.id, id), eq(commissions.tenantId, DEFAULT_TENANT_ID)));
  revalidatePath("/commissions");
  revalidatePath("/");
}
