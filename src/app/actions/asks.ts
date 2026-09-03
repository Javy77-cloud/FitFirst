"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getActor } from "@/lib/auth/session";
import { canPostAsk, canResolveAsk, isAdmin } from "@/lib/auth/rbac";
import { ASK_ENTITY_TYPES, ASK_KINDS, DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { commissions, policies, recordAsks } from "@/lib/db/schema";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

async function canSeeRecord(entityType: string, entityId: string) {
  const actor = await getActor();
  if (isAdmin(actor)) return true;
  if (entityType === "commission") {
    const [row] = await db.select().from(commissions).where(eq(commissions.id, entityId));
    return row?.agentId === actor.id;
  }
  if (entityType === "policy") {
    const [row] = await db.select().from(policies).where(eq(policies.id, entityId));
    return row?.ownerId === actor.id;
  }
  return false;
}

export async function postAsk(formData: FormData) {
  const actor = await getActor();
  if (!canPostAsk(actor)) return;

  const entityType = str(formData, "entityType");
  const entityId = str(formData, "entityId");
  const body = str(formData, "body");
  const kind = ASK_KINDS.includes(str(formData, "kind") as (typeof ASK_KINDS)[number])
    ? str(formData, "kind")
    : "question";
  if (!body || !entityId || !ASK_ENTITY_TYPES.includes(entityType as (typeof ASK_ENTITY_TYPES)[number])) {
    return;
  }
  if (!(await canSeeRecord(entityType, entityId))) return;

  await db.insert(recordAsks).values({
    tenantId: DEFAULT_TENANT_ID,
    entityType,
    entityId,
    authorId: actor.id,
    kind,
    body,
    status: "open",
  });

  revalidatePath("/commissions");
  revalidatePath("/policies");
}

export async function resolveAsk(formData: FormData) {
  const actor = await getActor();
  if (!canResolveAsk(actor)) return;
  const askId = str(formData, "askId");
  if (!askId) return;

  await db
    .update(recordAsks)
    .set({
      status: "done",
      resolvedBy: actor.id,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(recordAsks.id, askId), eq(recordAsks.tenantId, DEFAULT_TENANT_ID)));

  revalidatePath("/commissions");
  revalidatePath("/policies");
}
