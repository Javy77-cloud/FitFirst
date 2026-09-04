"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { activities, activityLogs, alerts, calendarInvites } from "@/lib/db/schema";
import {
  activityLogBody,
  assertRelatedRecord,
  defaultActivityTitle,
  hasRelatedRecord,
} from "@/lib/lifecycle/activity";
import { and, eq } from "drizzle-orm";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function when(form: FormData, key: string) {
  const raw = str(form, key);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function relatedFromForm(form: FormData, requireRelated: boolean) {
  const related = {
    contactId: str(form, "contactId") || null,
    accountId: str(form, "accountId") || null,
    policyId: str(form, "policyId") || null,
    dealId: str(form, "dealId") || null,
    leadId: str(form, "leadId") || null,
  };
  if (requireRelated || hasRelatedRecord(related)) {
    return assertRelatedRecord(related);
  }
  return related;
}

function revalidateRelated(related: {
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
}) {
  revalidatePath("/calendar");
  revalidatePath("/tasks");
  revalidatePath("/meetings");
  if (related.contactId) revalidatePath(`/contacts/${related.contactId}`);
  if (related.accountId) revalidatePath(`/accounts/${related.accountId}`);
  if (related.policyId) revalidatePath(`/policies/${related.policyId}`);
  if (related.dealId) revalidatePath(`/deals/${related.dealId}`);
  if (related.leadId) revalidatePath(`/leads/${related.leadId}`);
}

export async function logDeskActivity(formData: FormData) {
  const kind = str(formData, "kind") || "task";
  const title = str(formData, "title") || defaultActivityTitle(kind);
  const requireRelated = str(formData, "allowOrphan") !== "1";
  const related = relatedFromForm(formData, requireRelated);
  const eventType = kind === "call" || kind === "email" || kind === "sms" ? "logged" : "created";
  const status = kind === "call" ? "completed" : str(formData, "status") || "open";

  const [activity] = await db
    .insert(activities)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      kind,
      title,
      notes: str(formData, "notes") || null,
      status,
      dueAt: when(formData, "dueAt"),
      startAt: when(formData, "startAt") ?? when(formData, "dueAt"),
      endAt: when(formData, "endAt"),
      assignee: str(formData, "assignee") || null,
      ...related,
    })
    .returning();

  await db.insert(activityLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    activityId: activity.id,
    kind,
    eventType,
    body: activityLogBody(kind, eventType, title),
    contactId: related.contactId,
    accountId: related.accountId,
    policyId: related.policyId,
    dealId: related.dealId,
  });

  revalidateRelated(related);
}

export async function completeDeskActivity(formData: FormData) {
  const id = str(formData, "activityId");
  const [activity] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  if (!activity) return;

  await db
    .update(activities)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(activities.id, id));

  await db.insert(activityLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    activityId: activity.id,
    kind: activity.kind,
    eventType: "completed",
    body: activityLogBody(activity.kind, "completed", activity.title),
    contactId: activity.contactId,
    accountId: activity.accountId,
    policyId: activity.policyId,
    dealId: activity.dealId,
  });

  revalidateRelated(activity);
  revalidatePath(`/tasks/${id}`);
  revalidatePath(`/meetings/${id}`);
}

export async function updateDeskActivity(formData: FormData) {
  const id = str(formData, "activityId");
  if (!id) return;
  const [activity] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  if (!activity) return;

  const title = str(formData, "title") || activity.title;
  const notes = str(formData, "notes") || null;
  const dueAt = when(formData, "dueAt");
  await db
    .update(activities)
    .set({
      title,
      notes,
      dueAt: dueAt ?? activity.dueAt,
      updatedAt: new Date(),
    })
    .where(eq(activities.id, id));

  await db.insert(activityLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    activityId: activity.id,
    kind: activity.kind,
    eventType: "logged",
    body: activityLogBody(activity.kind, "logged", title),
    contactId: activity.contactId,
    accountId: activity.accountId,
    policyId: activity.policyId,
    dealId: activity.dealId,
  });

  revalidateRelated(activity);
  revalidatePath(`/tasks/${id}`);
  revalidatePath(`/meetings/${id}`);
}

export async function rescheduleDeskActivity(formData: FormData) {
  const id = str(formData, "activityId") || str(formData, "id");
  const startAt = when(formData, "startAt");
  if (!id || !startAt) return { error: "Missing activity or time." };

  const [activity] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  if (!activity) return { error: "Activity not found." };

  const prevStart = activity.startAt ?? activity.dueAt ?? startAt;
  const prevEnd = activity.endAt;
  const durationMs = prevEnd
    ? Math.max(15 * 60 * 1000, prevEnd.getTime() - prevStart.getTime())
    : activity.kind === "meeting"
      ? 30 * 60 * 1000
      : 15 * 60 * 1000;
  const endAt = when(formData, "endAt") ?? new Date(startAt.getTime() + durationMs);
  const dueAt =
    activity.kind === "task" || activity.kind === "sms" || activity.kind === "email"
      ? startAt
      : activity.dueAt ?? startAt;

  await db
    .update(activities)
    .set({
      startAt,
      endAt,
      dueAt,
      updatedAt: new Date(),
    })
    .where(eq(activities.id, id));

  await db.insert(activityLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    activityId: id,
    kind: activity.kind,
    eventType: "rescheduled",
    body: `${activityLogBody(activity.kind, "updated", activity.title)} · moved on calendar`,
    contactId: activity.contactId,
    accountId: activity.accountId,
    policyId: activity.policyId,
    dealId: activity.dealId,
    leadId: activity.leadId,
    direction: "internal",
  });

  revalidateRelated(activity);
  revalidatePath("/phone");
  return { ok: true };
}

export async function deleteDeskActivity(formData: FormData) {
  const id = str(formData, "activityId");
  if (!id) return { error: "Missing activity." };
  const [activity] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  if (!activity) return { error: "Activity not found." };

  await db.delete(activityLogs).where(eq(activityLogs.activityId, id));
  await db.delete(calendarInvites).where(eq(calendarInvites.activityId, id));
  await db.delete(alerts).where(and(eq(alerts.entityType, "activity"), eq(alerts.entityId, id)));
  await db.delete(activities).where(eq(activities.id, id));
  revalidateRelated(activity);
  return { ok: true };
}

/** Desk call close — used by the phone stub finish-call route. Not a softphone. */
export async function saveCallOutcome(formData: FormData) {
  const id = str(formData, "id") || str(formData, "activityId");
  if (id) {
    formData.set("activityId", id);
    await completeDeskActivity(formData);
  } else {
    formData.set("kind", "call");
    await logDeskActivity(formData);
  }
  const returnTo =
    str(formData, "returnTo") ||
    (str(formData, "contactId") ? `/contacts/${str(formData, "contactId")}` : "/tasks");
  return { returnTo, contactId: str(formData, "contactId") || null, policyId: str(formData, "policyId") || null };
}
