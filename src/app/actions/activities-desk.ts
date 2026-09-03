"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { activities, activityLogs } from "@/lib/db/schema";
import { activityLogBody, assertRelatedRecord, hasCommsRecord } from "@/lib/lifecycle/activity";
import { writeDeskComms } from "@/lib/desk/write-comms";
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

function relatedFromForm(form: FormData, kind: string) {
  const related = {
    contactId: str(form, "contactId") || null,
    accountId: str(form, "accountId") || null,
    policyId: str(form, "policyId") || null,
    dealId: str(form, "dealId") || null,
    leadId: str(form, "leadId") || null,
  };
  if (kind === "email" || kind === "sms" || kind === "call") {
    if (!hasCommsRecord(related)) {
      throw new Error("Call, email, and text need a Deal, Contact, Policy, Business, or Lead.");
    }
    return related;
  }
  return assertRelatedRecord(related);
}

function revalidateRelated(related: {
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
}) {
  if (related.contactId) revalidatePath(`/contacts/${related.contactId}`);
  if (related.accountId) revalidatePath(`/accounts/${related.accountId}`);
  if (related.policyId) revalidatePath(`/policies/${related.policyId}`);
  if (related.dealId) revalidatePath(`/deals/${related.dealId}`);
  if (related.leadId) revalidatePath(`/leads/${related.leadId}`);
  revalidatePath("/calendar");
  revalidatePath("/tasks");
}

export async function logDeskActivity(formData: FormData) {
  const kind = str(formData, "kind") || "task";
  const title =
    str(formData, "title") ||
    (kind === "call" ? "Logged call" : kind === "meeting" ? "Meeting" : kind === "email" ? "Email" : kind === "sms" ? "Text" : "Task");
  const related = relatedFromForm(formData, kind);

  await writeDeskComms({
    kind,
    title,
    notes: str(formData, "notes") || str(formData, "body") || null,
    body: str(formData, "body") || str(formData, "notes") || null,
    subject: str(formData, "subject") || null,
    fromAddress: str(formData, "fromAddress") || null,
    toAddress: str(formData, "toAddress") || null,
    direction: str(formData, "direction") || undefined,
    eventType: str(formData, "eventType") || null,
    status: kind === "call" || kind === "email" || kind === "sms" ? "completed" : str(formData, "status") || "open",
    dueAt: when(formData, "dueAt"),
    startAt: when(formData, "startAt"),
    endAt: when(formData, "endAt"),
    assignee: str(formData, "assignee") || null,
    ...related,
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
    leadId: activity.leadId,
    direction: "internal",
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
