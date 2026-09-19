"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { activities, activityLogs, alerts, calendarInvites } from "@/lib/db/schema";
import { canCloseCall } from "@/lib/activities/rules";
import {
  activityLogBody,
  assertRelatedRecord,
  defaultActivityTitle,
  hasRelatedRecord,
  shouldWriteCommsActivityLog,
} from "@/lib/lifecycle/activity";
import { and, eq } from "drizzle-orm";
import { flashAction } from "@/lib/flash-action";
import { resolvePolicyProducerName } from "@/lib/activity/producer";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function when(form: FormData, key: string) {
  const raw = str(form, key);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function optionalInt(form: FormData, key: string) {
  const raw = str(form, key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
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
  const duePreview = when(formData, "dueAt") ?? when(formData, "startAt");
  const status =
    kind === "call"
      ? duePreview && duePreview.getTime() > Date.now()
        ? "open"
        : str(formData, "status") || "completed"
      : str(formData, "status") || "open";
  const outcome = str(formData, "outcome") || null;
  const durationSeconds = optionalInt(formData, "durationSeconds");
  const phoneNumber = str(formData, "phone") || str(formData, "phoneNumber") || null;
  const direction =
    str(formData, "direction") || (kind === "call" ? "outbound" : kind === "email" || kind === "sms" ? "outbound" : null);

  const meetingLocation = str(formData, "meetingLocation") || str(formData, "location") || null;
  const meetingType = str(formData, "meetingType") || null;
  let videoProvider = str(formData, "videoProvider") || null;
  let videoUrl = str(formData, "videoUrl") || null;
  const reminderMinutes = optionalInt(formData, "reminderMinutes");
  const notifyChannel = str(formData, "notifyChannel") || str(formData, "notify") || "popup";
  const createReminder = str(formData, "createReminder") === "1";
  let notes = str(formData, "notes") || null;
  if ((kind === "task" || kind === "call") && reminderMinutes && reminderMinutes > 0) {
    const reminderLabel =
      reminderMinutes >= 1440 ? `${Math.round(reminderMinutes / 1440)}d` : `${reminderMinutes}m`;
    const line = `Reminder: ${reminderLabel}`;
    notes = notes ? `${notes}\n${line}` : line;
  }
  // Javy standing pref: CRM alerts stay in-app. Email option only stores preference — never emails the agent.
  if (kind === "task" && notifyChannel === "email") {
    const line = "Notify preference: email (in-app popup still used; agent not emailed)";
    notes = notes ? `${notes}\n${line}` : line;
  }

  const dueAt = when(formData, "dueAt");
  const startAt = when(formData, "startAt") ?? dueAt;
  const endAt = when(formData, "endAt") ?? (startAt ? new Date(startAt.getTime() + 30 * 60 * 1000) : null);
  const ignoreBusy = str(formData, "ignoreBusy") === "1";
  if ((kind === "meeting" || kind === "call") && startAt && endAt && !ignoreBusy) {
    const { busyConflictMessage, findBusyConflicts } = await import("@/lib/integrations/calendar-busy");
    const conflicts = await findBusyConflicts(startAt, endAt);
    if (conflicts.length) throw new Error(busyConflictMessage(conflicts));
  }
  if (kind === "meeting" && str(formData, "addGoogleMeet") === "1" && startAt && endAt) {
    const { createGoogleMeetLink } = await import("@/lib/integrations/google-meet");
    videoUrl = await createGoogleMeetLink({ title, startAt, endAt });
    videoProvider = "meet";
  }
  const writeLog = shouldWriteCommsActivityLog({ kind, eventType, status, outcome });
  const isScheduledComms =
    (kind === "call" || kind === "email" || kind === "sms") &&
    status === "open" &&
    Boolean(dueAt || startAt);
  if ((kind === "call" || kind === "email" || kind === "sms") && !writeLog && !isScheduledComms) {
    return;
  }

  const [activity] = await db
    .insert(activities)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      kind,
      title,
      notes,
      status,
      dueAt,
      startAt,
      endAt,
      assignee: str(formData, "assignee") || null,
      outcome,
      durationSeconds,
      phoneNumber,
      direction,
      meetingType,
      meetingLocation,
      videoProvider,
      videoUrl,
      ...related,
    })
    .returning();

  const producerName = await resolvePolicyProducerName(related.policyId);
  if (writeLog) {
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
      leadId: related.leadId,
      direction,
      durationSeconds,
      producerName,
    });
  }

  // In-app popup reminder (task / call / email draft). Always popup — never emails the agent by default.
  const due = activity.dueAt ?? activity.startAt;
  const wantsOffsetReminder =
    (kind === "task" || kind === "call") && reminderMinutes != null && reminderMinutes > 0 && due;
  const wantsDueReminder = createReminder && due && (kind === "email" || kind === "task" || kind === "call");
  if (wantsOffsetReminder || wantsDueReminder) {
    const fireAt = wantsOffsetReminder
      ? new Date(due!.getTime() - reminderMinutes! * 60 * 1000)
      : due!;
    const createdAt = fireAt.getTime() > Date.now() ? fireAt : new Date();
    const reminderLabel =
      wantsOffsetReminder
        ? reminderMinutes! >= 1440
          ? `${Math.round(reminderMinutes! / 1440)}d before`
          : `${reminderMinutes!}m before`
        : "at due time";
    const bodyKind =
      kind === "email" ? "email draft" : kind === "call" ? "call" : "task";
    await db.insert(alerts).values({
      tenantId: DEFAULT_TENANT_ID,
      kind: "task_reminder",
      title,
      body: `In-app ${bodyKind} reminder (${reminderLabel}). Nothing emailed.`,
      severity: "info",
      entityType: "activity",
      entityId: activity.id,
      createdAt,
    });
  }

  revalidateRelated(related);
  if (kind === "call") revalidatePath("/phone");
  revalidatePath("/notifications");
  revalidatePath("/alerts");
}

export async function completeDeskActivity(formData: FormData) {
  const id = str(formData, "activityId");
  const [activity] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  if (!activity) return;

  const outcome = str(formData, "outcome") || activity.outcome;
  const notes = str(formData, "notes") || activity.notes;
  const durationSeconds = optionalInt(formData, "durationSeconds") ?? activity.durationSeconds;

  if (activity.kind === "call") {
    const close = canCloseCall({ outcome, notes });
    if (!close.ok) return;
  }

  await db
    .update(activities)
    .set({
      status: "completed",
      notes,
      outcome,
      durationSeconds,
      updatedAt: new Date(),
    })
    .where(eq(activities.id, id));

  const producerName = await resolvePolicyProducerName(activity.policyId);
  await db.insert(activityLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    activityId: activity.id,
    kind: activity.kind,
    eventType: "completed",
    body: activityLogBody(activity.kind, "completed", activity.title, { durationSeconds, outcome }),
    contactId: activity.contactId,
    accountId: activity.accountId,
    policyId: activity.policyId,
    dealId: activity.dealId,
    leadId: activity.leadId,
    durationSeconds,
    producerName,
  });

  if (activity.leadId && /follow-up/i.test(activity.title)) {
    const { completeLeadFollowUpAndAdvance } = await import("@/lib/leads/apply-follow-up");
    await completeLeadFollowUpAndAdvance(activity.leadId).catch(() => null);
  }

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

  const producerName = await resolvePolicyProducerName(activity.policyId);
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
    producerName,
  });

  revalidateRelated(activity);
  revalidatePath(`/tasks/${id}`);
  revalidatePath(`/meetings/${id}`);
  flashAction(activity.kind === "meeting" ? `/meetings/${id}` : `/tasks/${id}`, "changes-saved");
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
  if (str(formData, "ignoreBusy") !== "1") {
    const { busyConflictMessage, findBusyConflicts } = await import("@/lib/integrations/calendar-busy");
    const conflicts = await findBusyConflicts(startAt, endAt);
    if (conflicts.length) return { error: busyConflictMessage(conflicts) };
  }
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

  const producerName = await resolvePolicyProducerName(activity.policyId);
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
    producerName,
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

/** Push dueAt/startAt forward by snooze amount. Used by DueCallPopups + activity reminders. */
export async function snoozeDeskActivity(formData: FormData) {
  const id = str(formData, "activityId");
  const amount = Number(str(formData, "amount"));
  const unit = str(formData, "unit");
  if (!id || !Number.isFinite(amount) || amount < 1) return { ok: false as const };
  const ms =
    unit === "days"
      ? Math.min(30, Math.max(1, Math.round(amount))) * 24 * 60 * 60 * 1000
      : unit === "hours"
        ? Math.min(24 * 30, Math.max(1, Math.round(amount))) * 60 * 60 * 1000
        : Math.min(24 * 60 * 30, Math.max(1, Math.round(amount))) * 60 * 1000;
  const [activity] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  if (!activity) return { ok: false as const };
  const base = activity.dueAt ?? activity.startAt ?? new Date();
  const next = new Date(base.getTime() + ms);
  const endAt =
    activity.endAt && activity.startAt
      ? new Date(activity.endAt.getTime() + (next.getTime() - (activity.startAt ?? base).getTime()))
      : activity.endAt;
  await db
    .update(activities)
    .set({
      dueAt: next,
      startAt: activity.startAt ? next : activity.startAt,
      endAt,
      updatedAt: new Date(),
    })
    .where(eq(activities.id, id));
  revalidateRelated(activity);
  revalidatePath("/phone");
  revalidatePath("/calendar");
  return { ok: true as const, dueAt: next.toISOString() };
}

/** Desk call close — used by the phone stub finish-call route. Not a softphone. */
export async function saveCallOutcome(formData: FormData) {
  const id = str(formData, "id") || str(formData, "activityId");
  if (!id) {
    const close = canCloseCall({
      outcome: str(formData, "outcome"),
      notes: str(formData, "notes"),
    });
    if (!close.ok) throw new Error(close.reason);
  }
  if (id) {
    formData.set("activityId", id);
    await completeDeskActivity(formData);
  } else {
    formData.set("kind", "call");
    await logDeskActivity(formData);
  }
  revalidatePath("/phone");
  const policyId = str(formData, "policyId");
  const contactId = str(formData, "contactId");
  const returnTo =
    str(formData, "returnTo") ||
    (contactId ? `/contacts/${contactId}` : "/phone");
  return { returnTo, contactId: contactId || null, policyId: policyId || null };
}
