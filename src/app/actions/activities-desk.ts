"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { activities, activityLogs } from "@/lib/db/schema";
import { activityLogBody, assertRelatedRecord } from "@/lib/lifecycle/activity";
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

function relatedFromForm(form: FormData) {
  return assertRelatedRecord({
    contactId: str(form, "contactId") || null,
    accountId: str(form, "accountId") || null,
    policyId: str(form, "policyId") || null,
    dealId: str(form, "dealId") || null,
  });
}

function revalidateRelated(related: {
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
}) {
  if (related.contactId) revalidatePath(`/contacts/${related.contactId}`);
  if (related.accountId) revalidatePath(`/accounts/${related.accountId}`);
  if (related.policyId) revalidatePath(`/policies/${related.policyId}`);
  if (related.dealId) revalidatePath(`/deals/${related.dealId}`);
}

function durationSecondsFromForm(form: FormData) {
  const raw = str(form, "durationMinutes") || str(form, "durationSeconds");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return str(form, "durationMinutes") ? Math.round(n * 60) : Math.round(n);
}

export async function logDeskActivity(formData: FormData) {
  const kind = str(formData, "kind") || "task";
  const title =
    str(formData, "title") ||
    (kind === "call" ? "Logged call" : kind === "meeting" ? "Meeting" : "Task");
  const related = relatedFromForm(formData);
  const eventType = kind === "call" ? "logged" : "created";
  const status = kind === "call" ? "completed" : str(formData, "status") || "open";
  const durationSeconds = durationSecondsFromForm(formData);
  const outcome = str(formData, "outcome") || null;
  if (kind === "call" && (!durationSeconds || !outcome)) {
    throw new Error("Call log needs a duration and an outcome.");
  }

  const [activity] = await db
    .insert(activities)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      kind,
      title,
      notes: str(formData, "notes") || null,
      status,
      dueAt: when(formData, "dueAt"),
      startAt: when(formData, "startAt"),
      endAt: when(formData, "endAt"),
      durationSeconds,
      outcome,
      assignee: str(formData, "assignee") || null,
      ...related,
    })
    .returning();

  await db.insert(activityLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    activityId: activity.id,
    kind,
    eventType,
    body: activityLogBody(kind, eventType, title, { durationSeconds, outcome }),
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
