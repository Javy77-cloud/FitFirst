"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts, recordAsks, users } from "@/lib/db/schema";
import { currentDeskSession } from "@/lib/auth/session";
import { parseRecordAsk } from "@/lib/desk/record-asks";
import { recordHref } from "@/lib/desk/record-href";
import { writeDeskComms } from "@/lib/desk/write-comms";
import { ADMIN_USER_ID } from "@/lib/fixtures/ids";
import { hasCommsRecord } from "@/lib/lifecycle/activity";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function relatedFromForm(form: FormData, entityType: string, entityId: string) {
  return {
    contactId: entityType === "contact" ? entityId : str(form, "contactId") || null,
    accountId: entityType === "account" ? entityId : str(form, "accountId") || null,
    policyId: entityType === "policy" ? entityId : str(form, "policyId") || null,
    dealId: entityType === "deal" ? entityId : str(form, "dealId") || null,
    leadId: entityType === "lead" ? entityId : str(form, "leadId") || null,
  };
}

/** Tag a teammate on this record. In-app ping + durable log. Not a chat product. */
export async function createRecordAsk(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.isAdmin) return { error: "Only an admin can tag a teammate." };
  const parsed = parseRecordAsk({
    entityType: str(formData, "entityType"),
    entityId: str(formData, "entityId"),
    assigneeId: str(formData, "assigneeId"),
    body: str(formData, "body"),
  });
  if (!parsed.ok) return { error: parsed.reason };

  const { entityType, entityId, assigneeId, body } = parsed.value;
  const [assignee] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, assigneeId)));
  if (!assignee) return { error: "Tag a teammate from the dropdown." };

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

  const related = relatedFromForm(formData, entityType, entityId);
  if (hasCommsRecord(related)) {
    await writeDeskComms({
      kind: "task",
      title: `Ask · ${assignee.name}`,
      body: `@${assignee.name}: ${body}`,
      direction: "internal",
      eventType: "logged",
      assignee: assignee.name,
      ...related,
    });
  }

  await db.insert(alerts).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: "record_ask",
    title: `${session.name} asked ${assignee.name} for status`,
    body,
    severity: "info",
    entityType,
    entityId,
  });

  const href = recordHref(entityType, entityId);
  if (href) revalidatePath(href);
  revalidatePath("/alerts");
  return { id: ask.id };
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
