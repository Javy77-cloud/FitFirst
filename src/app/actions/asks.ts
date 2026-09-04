"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getActor } from "@/lib/auth/session";
import { canPostAsk, canResolveAsk } from "@/lib/auth/rbac";
import { ASK_ENTITY_TYPES, ASK_KINDS, DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { recordAsks } from "@/lib/db/schema";
import { isDeskUuid } from "@/lib/desk-id";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
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
  if (!body || !isDeskUuid(entityId) || !ASK_ENTITY_TYPES.includes(entityType as (typeof ASK_ENTITY_TYPES)[number])) {
    return;
  }

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
  if (entityType === "policy") revalidatePath(`/policies/${entityId}`);
}

export async function resolveAsk(formData: FormData) {
  const actor = await getActor();
  if (!canResolveAsk(actor)) return;
  const askId = str(formData, "askId");
  if (!isDeskUuid(askId)) return;

  await db
    .update(recordAsks)
    .set({
      status: "done",
      resolvedBy: actor.id,
      resolvedAt: new Date(),
    })
    .where(and(eq(recordAsks.id, askId), eq(recordAsks.tenantId, DEFAULT_TENANT_ID)));

  revalidatePath("/commissions");
  revalidatePath("/policies");
}
