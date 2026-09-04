"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireAdminAction } from "@/lib/auth/guards";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { leadRoutingRules } from "@/lib/db/schema";
import { isUuid } from "@/lib/ids";
import { applyLeadRouting } from "@/lib/leads/apply-routing";
import { parseRoutingLine } from "@/lib/leads/auto-route";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function refreshRouting() {
  revalidatePath("/settings/routing");
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/leads");
}

export async function saveLeadRoutingRule(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  const name = str(formData, "name");
  const territoryId = str(formData, "territoryId");
  const producerId = str(formData, "producerId");
  const writtenLine = parseRoutingLine(str(formData, "writtenLine"));
  const sortOrder = Number(str(formData, "sortOrder") || "10");
  const maxOpenDeals = Number(str(formData, "maxOpenDeals") || "12");
  if (!name) return;
  const values = {
    name,
    enabled: formData.get("enabled") === "1" || formData.get("enabled") === "on",
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 10,
    territoryId: isUuid(territoryId) ? territoryId : null,
    writtenLine,
    maxOpenDeals: Number.isFinite(maxOpenDeals) && maxOpenDeals > 0 ? Math.floor(maxOpenDeals) : 12,
    producerId: isUuid(producerId) ? producerId : null,
    updatedAt: new Date(),
  };
  if (isUuid(id)) {
    await db
      .update(leadRoutingRules)
      .set(values)
      .where(and(eq(leadRoutingRules.tenantId, DEFAULT_TENANT_ID), eq(leadRoutingRules.id, id)));
  } else {
    await db.insert(leadRoutingRules).values({
      tenantId: DEFAULT_TENANT_ID,
      ...values,
    });
  }
  refreshRouting();
  redirect("/settings/routing");
}

export async function deleteLeadRoutingRule(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  if (!isUuid(id)) return;
  await db
    .delete(leadRoutingRules)
    .where(and(eq(leadRoutingRules.tenantId, DEFAULT_TENANT_ID), eq(leadRoutingRules.id, id)));
  refreshRouting();
  redirect("/settings/routing");
}

export async function routeLeadNow(formData: FormData) {
  await requireAdminAction();
  const leadId = str(formData, "leadId");
  if (!isUuid(leadId)) return;
  await applyLeadRouting(leadId);
  refreshRouting();
  revalidatePath(`/leads/${leadId}`);
}
