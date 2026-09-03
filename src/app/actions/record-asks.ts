"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts, recordAsks, users } from "@/lib/db/schema";
import { currentDeskSession } from "@/lib/auth/session";
import { recordHref } from "@/lib/desk/record-href";
import { writeDeskComms } from "@/lib/desk/write-comms";
import { ADMIN_USER_ID } from "@/lib/fixtures/ids";
import { hasCommsRecord } from "@/lib/lifecycle/activity";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

/** Tag a teammate on this record. In-app ping + durable log. Not a chat product. */
export async function createRecordAsk(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.isAdmin) return;
  const entityType = str(formData, "entityType");
  const entityId = str(formData, "entityId");
  const assigneeId = str(formData, "assigneeId");
  const body = str(formData, "body");
  if (!entityType || !entityId || !assigneeId || !body) return;

  const [assignee] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, assigneeId)));

  const [ask] = await db
    .insert(recordAsks)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      entityType,
      entityId,
      authorId: session.userId ?? ADMIN_USER_ID,
      assigneeId,
      kind: "status",
      body,
      status: "open",
    })
    .returning();

  const related = {
    contactId: entityType === "contact" ? entityId : str(formData, "contactId") || null,
    accountId: entityType === "account" ? entityId : str(formData, "accountId") || null,
    policyId: entityType === "policy" ? entityId : str(formData, "policyId") || null,
    dealId: entityType === "deal" ? entityId : str(formData, "dealId") || null,
    leadId: entityType === "lead" ? entityId : str(formData, "leadId") || null,
  };
  if (hasCommsRecord(related)) {
    await writeDeskComms({
      kind: "task",
      title: `Ask · ${assignee?.name ?? "teammate"}`,
      body: `@${assignee?.name ?? "teammate"}: ${body}`,
      direction: "internal",
      eventType: "logged",
      assignee: assignee?.name ?? null,
      ...related,
    });
  }

  await db.insert(alerts).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: "record_ask",
    title: `${session.name} asked ${assignee?.name ?? "you"} for status`,
    body,
    severity: "info",
    entityType,
    entityId,
  });

  const href = recordHref(entityType, entityId);
  if (href) revalidatePath(href);
  revalidatePath("/alerts");
  return ask.id;
}

export async function resolveRecordAsk(formData: FormData) {
  const session = await currentDeskSession();
  const id = str(formData, "askId");
  if (!id) return;
  const [ask] = await db
    .select()
    .from(recordAsks)
    .where(and(eq(recordAsks.tenantId, DEFAULT_TENANT_ID), eq(recordAsks.id, id)));
  if (!ask) return;
  await db
    .update(recordAsks)
    .set({ status: "resolved", resolvedBy: session.userId, resolvedAt: new Date() })
    .where(eq(recordAsks.id, id));
  const href = recordHref(ask.entityType, ask.entityId);
  if (href) revalidatePath(href);
  revalidatePath("/alerts");
}
