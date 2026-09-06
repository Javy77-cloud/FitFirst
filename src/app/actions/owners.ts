"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getActor } from "@/lib/auth/session";
import { canAssignOwner } from "@/lib/auth/rbac";
import { canTransferDeal, dealTransferNotification } from "@/lib/deals/transfer";
import { DEFAULT_TENANT_ID, OWNER_ENTITY_TYPES, type OwnerEntityType } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts, contacts, deals, leads, policies, users } from "@/lib/db/schema";

export async function assignOwner(formData: FormData) {
  const actor = await getActor();
  if (!canAssignOwner(actor)) return;

  const entityType = String(formData.get("entityType") ?? "") as OwnerEntityType;
  const entityId = String(formData.get("entityId") ?? "").trim();
  const ownerId = String(formData.get("ownerId") ?? "").trim() || null;
  if (!entityId || !OWNER_ENTITY_TYPES.includes(entityType)) return;

  const patch = { ownerId, updatedAt: new Date() };
  if (entityType === "lead") {
    await db.update(leads).set(patch).where(eq(leads.id, entityId));
  } else if (entityType === "contact") {
    await db.update(contacts).set(patch).where(eq(contacts.id, entityId));
  } else if (entityType === "deal") {
    await db.update(deals).set(patch).where(eq(deals.id, entityId));
  } else if (entityType === "policy") {
    await db.update(policies).set(patch).where(eq(policies.id, entityId));
  }

  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/contacts");
  revalidatePath("/deals");
  revalidatePath("/policies");
  if (entityType === "deal") revalidatePath(`/deals/${entityId}`);
}

/** Agents can hand a deal to a teammate. Receiver gets an in-app ping with one tap to open. */
export async function transferDealOwner(formData: FormData) {
  const actor = await getActor();
  if (!canTransferDeal(actor)) return;

  const dealId = String(formData.get("dealId") ?? "").trim();
  const ownerId = String(formData.get("ownerId") ?? "").trim();
  if (!dealId || !ownerId) return;

  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, dealId)));
  if (!deal) return;

  const [target] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, ownerId)));
  if (!target) return;

  await db
    .update(deals)
    .set({ ownerId: target.id, updatedAt: new Date() })
    .where(eq(deals.id, deal.id));

  if (target.id !== actor.id) {
    const ping = dealTransferNotification({ dealTitle: deal.title, fromName: actor.name });
    await db.insert(alerts).values({
      tenantId: DEFAULT_TENANT_ID,
      kind: "deal_transfer",
      title: ping.title,
      body: ping.body,
      severity: "info",
      entityType: "deal",
      entityId: deal.id,
      userId: target.id,
      recipientUserId: target.id,
    });
  }

  revalidatePath("/");
  revalidatePath("/deals");
  revalidatePath(`/deals/${deal.id}`);
  revalidatePath("/notifications");
  revalidatePath("/alerts");
}
