"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID, normalizeActivityStatus } from "@/lib/domain";
import { writeActivityLog } from "@/lib/db/activity-log";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function when(form: FormData, key: string) {
  const raw = str(form, key);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function relatedIds(form: FormData) {
  const raw = str(form, "relatedId");
  const prefixed = /^(contact|deal|policy):(.+)$/.exec(raw);
  return {
    contactId: str(form, "contactId") || (prefixed?.[1] === "contact" ? prefixed[2] : null) || null,
    dealId: str(form, "dealId") || (prefixed?.[1] === "deal" ? prefixed[2] : null) || null,
    policyId: str(form, "policyId") || (prefixed?.[1] === "policy" ? prefixed[2] : null) || null,
  };
}

function revalidateOps(paths: string[] = []) {
  for (const path of ["/calendar", "/tasks", "/contacts", "/policies", ...paths]) {
    revalidatePath(path);
  }
}

export async function upsertActivity(formData: FormData) {
  const id = str(formData, "id");
  const kind = str(formData, "kind") || "task";
  const title = str(formData, "title") || (kind === "task" ? "Untitled task" : `Untitled ${kind}`);
  const status = normalizeActivityStatus(str(formData, "status") || "incomplete");
  const dueAt = when(formData, "dueAt");
  const startAt = when(formData, "startAt");
  const endAt = when(formData, "endAt");
  const related = relatedIds(formData);
  const values = {
    tenantId: DEFAULT_TENANT_ID,
    kind,
    title,
    notes: str(formData, "notes") || null,
    status,
    dueAt,
    startAt,
    endAt,
    assignee: str(formData, "assignee") || null,
    ...related,
    updatedAt: new Date(),
  };

  if (id) {
    const [prev] = await db
      .select()
      .from(activities)
      .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
    await db
      .update(activities)
      .set(values)
      .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
    const prevStatus = prev ? normalizeActivityStatus(prev.status) : null;
    if (prevStatus && prevStatus !== status) {
      await writeActivityLog({
        activityId: id,
        eventType: "status_changed",
        body: `Status ${prevStatus} → ${status}`,
        fromStatus: prevStatus,
        toStatus: status,
      });
    }
    const prevDue = prev?.dueAt?.toISOString() ?? "";
    const nextDue = dueAt?.toISOString() ?? "";
    const prevStart = prev?.startAt?.toISOString() ?? "";
    const nextStart = startAt?.toISOString() ?? "";
    if (prev && (prevDue !== nextDue || prevStart !== nextStart)) {
      await writeActivityLog({
        activityId: id,
        eventType: "rescheduled",
        body: `Rescheduled ${kind} "${title}"`,
        fromStatus: prevStatus,
        toStatus: status,
      });
    }
    if (prev && prevStatus === status && prevDue === nextDue && prevStart === nextStart) {
      await writeActivityLog({
        activityId: id,
        eventType: "updated",
        body: `Updated ${kind} "${title}"`,
        toStatus: status,
      });
    }
  } else {
    const [row] = await db.insert(activities).values(values).returning();
    await writeActivityLog({
      activityId: row.id,
      eventType: "created",
      body: `Created ${kind} "${title}" assigned to contact and/or policy`,
      toStatus: status,
    });
  }

  const returnTo = str(formData, "returnTo") || "/calendar";
  revalidateOps([returnTo]);
  redirect(returnTo);
}

export async function setActivityStatus(formData: FormData) {
  const id = str(formData, "id");
  const status = normalizeActivityStatus(str(formData, "status") || "completed");
  const [prev] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  await db
    .update(activities)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  await writeActivityLog({
    activityId: id,
    eventType: "status_changed",
    body: `Status ${prev ? normalizeActivityStatus(prev.status) : "?"} → ${status}`,
    fromStatus: prev ? normalizeActivityStatus(prev.status) : null,
    toStatus: status,
  });
  const returnTo = str(formData, "returnTo") || "/tasks";
  revalidateOps([returnTo]);
  redirect(returnTo);
}

export async function moveActivityDay(formData: FormData) {
  const id = str(formData, "id");
  const next = when(formData, "newDay");
  if (!next) throw new Error("Pick a new day.");
  const [prev] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  if (!prev) throw new Error("Activity not found");
  const patch: { dueAt?: Date | null; startAt?: Date | null; endAt?: Date | null; status: string; updatedAt: Date } = {
    status: "moved",
    updatedAt: new Date(),
  };
  if (prev.kind === "task" || prev.dueAt) patch.dueAt = next;
  if (prev.startAt) {
    const end = prev.endAt;
    const span = end && prev.startAt ? end.getTime() - prev.startAt.getTime() : 45 * 60 * 1000;
    patch.startAt = next;
    patch.endAt = new Date(next.getTime() + span);
  }
  await db
    .update(activities)
    .set(patch)
    .where(eq(activities.id, id));
  await writeActivityLog({
    activityId: id,
    eventType: "rescheduled",
    body: `Moved to another day (${next.toISOString().slice(0, 10)})`,
    fromStatus: normalizeActivityStatus(prev.status),
    toStatus: "moved",
  });
  const returnTo = str(formData, "returnTo") || "/tasks";
  revalidateOps([returnTo]);
  redirect(returnTo);
}

export async function logCallDuration(formData: FormData) {
  const id = str(formData, "id");
  const minutes = Number(str(formData, "minutes") || "0");
  const seconds = Number(str(formData, "seconds") || "0");
  const duration = Math.max(0, Math.round(minutes * 60 + seconds));
  const [row] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  if (!row) throw new Error("Call not found");
  await writeActivityLog({
    activityId: id,
    eventType: "call_logged",
    body: `Call logged (${duration}s). In-app only — no Twilio.`,
    durationSeconds: duration,
    toStatus: normalizeActivityStatus(row.status),
  });
  const returnTo = str(formData, "returnTo") || "/calendar";
  revalidateOps([returnTo]);
  redirect(returnTo);
}
