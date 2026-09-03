"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  assertContactOrPolicy,
  canCloseCall,
  completionFields,
  normalizeStatus,
  rescheduleEventBody,
  rescheduleFields,
} from "@/lib/activities/rules";
import { db } from "@/lib/db";
import {
  activities,
  activityAttendees,
  activityEvents,
  clientHistory,
  policies,
  users,
} from "@/lib/db/schema";
import { ADMIN_NAME, ADMIN_USER_ID } from "@/lib/fixtures/ids";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function emptyToNull(value: string) {
  return value ? value : null;
}

function when(form: FormData, key: string) {
  const raw = str(form, key);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function intOrNull(form: FormData, key: string) {
  const raw = str(form, key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function actorFrom(form: FormData) {
  const id = str(form, "assigneeId") || str(form, "actorId") || ADMIN_USER_ID;
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, id)));
  return {
    id: user?.id ?? ADMIN_USER_ID,
    name: user?.name ?? (str(form, "assignee") || ADMIN_NAME),
  };
}

async function resolveContactId(contactId: string | null, policyId: string | null) {
  if (contactId) return contactId;
  if (!policyId) return null;
  const [policy] = await db.select().from(policies).where(eq(policies.id, policyId));
  return policy?.contactId ?? null;
}

function revalidateWork(extra: string[] = []) {
  const paths = new Set([
    "/",
    "/tasks",
    "/calendar",
    "/contacts",
    "/policies",
    "/businesses",
    "/alerts",
    ...extra,
  ]);
  for (const path of paths) revalidatePath(path);
}

async function appendEvent(input: {
  activityId: string;
  eventType: string;
  body: string;
  actorId?: string | null;
  actorName?: string | null;
  oldDueAt?: Date | null;
  newDueAt?: Date | null;
  payload?: Record<string, unknown>;
  contactId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  businessId?: string | null;
}) {
  await db.insert(activityEvents).values({
    tenantId: DEFAULT_TENANT_ID,
    activityId: input.activityId,
    eventType: input.eventType,
    body: input.body,
    actorId: input.actorId ?? null,
    actorName: input.actorName ?? null,
    oldDueAt: input.oldDueAt ?? null,
    newDueAt: input.newDueAt ?? null,
    payload: input.payload ?? {},
  });

  const contactId = await resolveContactId(input.contactId ?? null, input.policyId ?? null);
  if (contactId) {
    await db.insert(clientHistory).values({
      tenantId: DEFAULT_TENANT_ID,
      contactId,
      policyId: input.policyId ?? null,
      dealId: input.dealId ?? null,
      businessId: input.businessId ?? null,
      activityId: input.activityId,
      eventType: input.eventType,
      body: input.body,
    });
  }
}

export async function upsertActivity(formData: FormData) {
  const id = str(formData, "id");
  const kind = str(formData, "kind") || "task";
  const title = str(formData, "title") || str(formData, "subject");
  if (!title) throw new Error("Subject is required.");

  const contactId = emptyToNull(str(formData, "contactId"));
  const policyId = emptyToNull(str(formData, "policyId"));
  const dealId = emptyToNull(str(formData, "dealId"));
  const businessId = emptyToNull(str(formData, "businessId"));
  assertContactOrPolicy({ contactId, policyId });

  const actor = await actorFrom(formData);
  const dueAt = when(formData, "dueAt") ?? when(formData, "startAt") ?? when(formData, "scheduledAt");
  const startAt = when(formData, "startAt") ?? (kind === "meeting" || kind === "call" ? dueAt : null);
  const scheduledAt = when(formData, "scheduledAt") ?? (kind === "call" ? dueAt : null);
  const status = normalizeStatus(str(formData, "status") || "incomplete");

  const values = {
    tenantId: DEFAULT_TENANT_ID,
    kind,
    title,
    notes: emptyToNull(str(formData, "notes")),
    status,
    dueAt,
    startAt,
    endAt: when(formData, "endAt"),
    scheduledAt,
    assignee: actor.name,
    assigneeId: actor.id,
    contactId,
    policyId,
    dealId,
    businessId,
    priority: str(formData, "priority") || "normal",
    pipelineStage: str(formData, "pipelineStage") || (kind === "task" ? "todo" : "todo"),
    reminderMinutes: intOrNull(formData, "reminderMinutes"),
    location: emptyToNull(str(formData, "location")),
    videoUrl: emptyToNull(str(formData, "videoUrl")),
    direction: kind === "call" ? str(formData, "direction") || "outbound" : null,
    phoneNumber: emptyToNull(str(formData, "phoneNumber")),
    updatedAt: new Date(),
  };

  let activityId = id;
  if (id) {
    const [existing] = await db
      .select()
      .from(activities)
      .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
    if (!existing) throw new Error("Activity not found.");
    if (existing.status === "canceled" || existing.status === "cancelled") {
      throw new Error("Canceled work stays on the log. Create a new item instead.");
    }
    await db
      .update(activities)
      .set(values)
      .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
    await appendEvent({
      activityId: id,
      eventType: "updated",
      body: `${actor.name} updated ${kind} “${title}”.`,
      actorId: actor.id,
      actorName: actor.name,
      contactId,
      policyId,
      dealId,
      businessId,
    });
  } else {
    const [row] = await db.insert(activities).values(values).returning();
    activityId = row.id;
    const eventType = kind === "meeting" || kind === "call" ? "scheduled" : "created";
    await appendEvent({
      activityId: row.id,
      eventType,
      body: `${actor.name} ${eventType} ${kind} “${title}”.`,
      actorId: actor.id,
      actorName: actor.name,
      contactId,
      policyId,
      dealId,
      businessId,
    });
  }

  const attendeeIds = formData.getAll("attendeeIds").map((value) => String(value).trim()).filter(Boolean);
  if (kind === "meeting" && activityId) {
    await db
      .delete(activityAttendees)
      .where(
        and(
          eq(activityAttendees.tenantId, DEFAULT_TENANT_ID),
          eq(activityAttendees.activityId, activityId),
        ),
      );
    if (contactId && !attendeeIds.includes(contactId)) attendeeIds.push(contactId);
    for (const attendeeId of attendeeIds) {
      await db.insert(activityAttendees).values({
        tenantId: DEFAULT_TENANT_ID,
        activityId,
        contactId: attendeeId,
      });
    }
  }

  const returnTo = str(formData, "returnTo") || `/tasks/${activityId}`;
  revalidateWork([returnTo, contactId ? `/contacts/${contactId}` : "", policyId ? `/policies/${policyId}` : ""]);
  redirect(returnTo);
}

export async function setActivityStatus(formData: FormData) {
  const id = str(formData, "id");
  const status = normalizeStatus(str(formData, "status") || "completed");
  const actor = await actorFrom(formData);
  const [existing] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  if (!existing) throw new Error("Activity not found.");

  const patch: Record<string, unknown> = { status, updatedAt: new Date() };
  if (status === "canceled") patch.canceledAt = new Date();
  if (status === "in_progress" && !existing.startedAt) patch.startedAt = new Date();
  if (status === "completed") {
    Object.assign(
      patch,
      completionFields({
        createdAt: existing.createdAt,
        startAt: existing.startedAt ?? existing.startAt,
        completedBy: actor.id,
        notes: str(formData, "notes") || existing.notes,
      }),
    );
  }

  await db
    .update(activities)
    .set(patch)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));

  await appendEvent({
    activityId: id,
    eventType: status === "canceled" ? "canceled" : status,
    body: `${actor.name} marked ${existing.kind} “${existing.title}” ${status}.`,
    actorId: actor.id,
    actorName: actor.name,
    contactId: existing.contactId,
    policyId: existing.policyId,
    dealId: existing.dealId,
    businessId: existing.businessId,
    payload: { from: existing.status, to: status },
  });

  const returnTo = str(formData, "returnTo") || `/tasks/${id}`;
  revalidateWork([returnTo]);
  redirect(returnTo);
}

export async function completeActivity(formData: FormData) {
  formData.set("status", "completed");
  await setActivityStatus(formData);
}

export async function cancelActivity(formData: FormData) {
  formData.set("status", "canceled");
  await setActivityStatus(formData);
}

export async function moveActivityDay(formData: FormData) {
  const id = str(formData, "id");
  const newDue = when(formData, "dueAt") ?? when(formData, "newDueAt");
  if (!newDue) throw new Error("Pick the new day.");
  const actor = await actorFrom(formData);
  const [existing] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  if (!existing) throw new Error("Activity not found.");

  const record = rescheduleFields({
    oldDueAt: existing.dueAt ?? existing.scheduledAt ?? existing.startAt,
    newDueAt: newDue,
    actorId: actor.id,
    actorName: actor.name,
  });

  await db
    .update(activities)
    .set({
      previousDueAt: record.previousDueAt,
      dueAt: newDue,
      scheduledAt: existing.kind === "call" ? newDue : existing.scheduledAt,
      startAt: existing.kind === "meeting" ? newDue : existing.startAt,
      status: "rescheduled",
      updatedAt: new Date(),
    })
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));

  await appendEvent({
    activityId: id,
    eventType: "rescheduled",
    body: rescheduleEventBody(record),
    actorId: actor.id,
    actorName: actor.name,
    oldDueAt: record.previousDueAt,
    newDueAt: record.dueAt,
    contactId: existing.contactId,
    policyId: existing.policyId,
    dealId: existing.dealId,
    businessId: existing.businessId,
  });

  const returnTo = str(formData, "returnTo") || `/tasks/${id}`;
  revalidateWork([returnTo]);
  redirect(returnTo);
}

export async function setPipelineStage(formData: FormData) {
  const id = str(formData, "id");
  const pipelineStage = str(formData, "pipelineStage") || "todo";
  const actor = await actorFrom(formData);
  const [existing] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  if (!existing) throw new Error("Activity not found.");

  const patch: Record<string, unknown> = { pipelineStage, updatedAt: new Date() };
  if (pipelineStage === "doing") {
    patch.status = "in_progress";
    if (!existing.startedAt) patch.startedAt = new Date();
  }
  if (pipelineStage === "done") {
    Object.assign(
      patch,
      completionFields({
        createdAt: existing.createdAt,
        startAt: existing.startedAt ?? existing.startAt,
        completedBy: actor.id,
        notes: existing.notes,
      }),
    );
  }
  if (pipelineStage === "todo" && existing.status === "completed") {
    patch.status = "incomplete";
    patch.completedAt = null;
    patch.completedBy = null;
  }

  await db
    .update(activities)
    .set(patch)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));

  await appendEvent({
    activityId: id,
    eventType: "pipeline_moved",
    body: `${actor.name} moved “${existing.title}” to ${pipelineStage}.`,
    actorId: actor.id,
    actorName: actor.name,
    contactId: existing.contactId,
    policyId: existing.policyId,
    dealId: existing.dealId,
    businessId: existing.businessId,
    payload: { from: existing.pipelineStage, to: pipelineStage },
  });

  const returnTo = str(formData, "returnTo") || "/tasks?view=board";
  revalidateWork([returnTo]);
  redirect(returnTo);
}

export async function startMeeting(formData: FormData) {
  const id = str(formData, "id");
  const actor = await actorFrom(formData);
  await db
    .update(activities)
    .set({
      status: "in_progress",
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  const [existing] = await db.select().from(activities).where(eq(activities.id, id));
  if (existing) {
    await appendEvent({
      activityId: id,
      eventType: "started",
      body: `${actor.name} started meeting “${existing.title}”.`,
      actorId: actor.id,
      actorName: actor.name,
      contactId: existing.contactId,
      policyId: existing.policyId,
      dealId: existing.dealId,
      businessId: existing.businessId,
    });
  }
  const returnTo = str(formData, "returnTo") || `/tasks/${id}`;
  revalidateWork([returnTo]);
  redirect(returnTo);
}

export async function markMeetingOutcome(formData: FormData) {
  const id = str(formData, "id");
  const eventType = str(formData, "eventType") || "completed";
  const actor = await actorFrom(formData);
  const [existing] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  if (!existing) throw new Error("Activity not found.");

  const now = new Date();
  const from = existing.startedAt ?? existing.startAt ?? existing.createdAt;
  const durationSeconds = Math.max(0, Math.round((now.getTime() - from.getTime()) / 1000));
  const status =
    eventType === "canceled" ? "canceled" : eventType === "no_show" ? "canceled" : "completed";

  await db
    .update(activities)
    .set({
      status,
      completedAt: eventType === "completed" ? now : existing.completedAt,
      completedBy: eventType === "completed" ? actor.id : existing.completedBy,
      durationSeconds,
      canceledAt: eventType === "canceled" || eventType === "no_show" ? now : existing.canceledAt,
      notes: str(formData, "notes") || existing.notes,
      updatedAt: now,
    })
    .where(eq(activities.id, id));

  await appendEvent({
    activityId: id,
    eventType,
    body: `${actor.name} logged meeting ${eventType} (${durationSeconds}s).`,
    actorId: actor.id,
    actorName: actor.name,
    contactId: existing.contactId,
    policyId: existing.policyId,
    dealId: existing.dealId,
    businessId: existing.businessId,
    payload: { durationSeconds },
  });

  const returnTo = str(formData, "returnTo") || `/tasks/${id}`;
  revalidateWork([returnTo]);
  redirect(returnTo);
}

export async function saveCallOutcome(formData: FormData) {
  const id = str(formData, "id");
  const outcome = str(formData, "outcome");
  const notes = str(formData, "notes");
  const durationSeconds = intOrNull(formData, "durationSeconds") ?? 0;
  const closed = canCloseCall({ outcome, notes });
  if (!closed.ok) throw new Error(closed.reason);

  const actor = await actorFrom(formData);
  const [existing] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  if (!existing) throw new Error("Activity not found.");

  await db
    .update(activities)
    .set({
      outcome,
      notes,
      durationSeconds,
      status: "completed",
      pipelineStage: "done",
      completedAt: new Date(),
      completedBy: actor.id,
      updatedAt: new Date(),
    })
    .where(eq(activities.id, id));

  await appendEvent({
    activityId: id,
    eventType: "outcome_logged",
    body: `${actor.name} closed the call: ${outcome}, ${durationSeconds}s. ${notes}`,
    actorId: actor.id,
    actorName: actor.name,
    contactId: existing.contactId,
    policyId: existing.policyId,
    dealId: existing.dealId,
    businessId: existing.businessId,
    payload: { outcome, durationSeconds, notes },
  });

  const returnTo = str(formData, "returnTo") || `/tasks/${id}`;
  revalidateWork([
    returnTo,
    existing.contactId ? `/contacts/${existing.contactId}` : "",
    existing.policyId ? `/policies/${existing.policyId}` : "",
  ]);
  return { returnTo, contactId: existing.contactId, policyId: existing.policyId };
}

export async function finishCall(formData: FormData) {
  const { returnTo } = await saveCallOutcome(formData);
  redirect(returnTo);
}

export async function addTimelineNote(formData: FormData) {
  const title = str(formData, "title") || "Note";
  const notes = str(formData, "notes");
  if (!notes) throw new Error("Note body is required.");
  const contactId = emptyToNull(str(formData, "contactId"));
  const policyId = emptyToNull(str(formData, "policyId"));
  const dealId = emptyToNull(str(formData, "dealId"));
  const businessId = emptyToNull(str(formData, "businessId"));
  assertContactOrPolicy({ contactId, policyId });
  const actor = await actorFrom(formData);

  const [row] = await db
    .insert(activities)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      kind: "note",
      title,
      notes,
      status: "completed",
      pipelineStage: "done",
      contactId,
      policyId,
      dealId,
      businessId,
      assignee: actor.name,
      assigneeId: actor.id,
      completedAt: new Date(),
      completedBy: actor.id,
      durationSeconds: 0,
    })
    .returning();

  await appendEvent({
    activityId: row.id,
    eventType: "note_added",
    body: notes,
    actorId: actor.id,
    actorName: actor.name,
    contactId,
    policyId,
    dealId,
    businessId,
  });

  const returnTo = str(formData, "returnTo") || "/tasks";
  revalidateWork([returnTo]);
  redirect(returnTo);
}

export async function createBusiness(formData: FormData) {
  const { businesses } = await import("@/lib/db/schema");
  const name = str(formData, "name");
  if (!name) throw new Error("Business name is required.");
  const [row] = await db
    .insert(businesses)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      name,
      phone: emptyToNull(str(formData, "phone")),
      email: emptyToNull(str(formData, "email")),
      city: emptyToNull(str(formData, "city")),
      state: str(formData, "state") || "FL",
      notes: emptyToNull(str(formData, "notes")),
      primaryContactId: emptyToNull(str(formData, "primaryContactId")),
    })
    .returning();
  revalidatePath("/businesses");
  redirect(`/businesses/${row.id}`);
}

export async function currentDeskActor() {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, ADMIN_USER_ID)));
  return user ?? null;
}
