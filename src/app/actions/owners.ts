"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getActor } from "@/lib/auth/session";
import { canAssignOwner } from "@/lib/auth/rbac";
import { OWNER_ENTITY_TYPES, type OwnerEntityType } from "@/lib/domain";
import { db } from "@/lib/db";
import { contacts, deals, leads, policies } from "@/lib/db/schema";

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
