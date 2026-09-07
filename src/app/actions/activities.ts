"use server";

/**
 * Isolated from the old ops calendar schema (businesses / attendees / events).
 * Desk Task / Call / Meeting on 360 uses activities-desk.ts against `activities`
 * + `activity_logs`. Calendar and phone stay stubs.
 */
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, activities, deals } from "@/lib/db/schema";
import { writeEin } from "@/lib/pii/write";
import { ADMIN_NAME, ADMIN_USER_ID } from "@/lib/fixtures/ids";
import {
  completeDeskActivity,
  logDeskActivity,
  saveCallOutcome as saveDeskCallOutcome,
} from "@/app/actions/activities-desk";
import { flashAction } from "@/lib/flash-action";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function upsertActivity(formData: FormData) {
  await logDeskActivity(formData);
  const { flashStay } = await import("@/lib/flash-action");
  flashStay(formData, "/tasks", "Activity saved");
}

export async function setActivityStatus(formData: FormData) {
  const id = str(formData, "activityId") || str(formData, "id");
  const status = str(formData, "status") || "open";
  if (!id) return;
  await db
    .update(activities)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
}

export async function completeActivity(formData: FormData) {
  if (!str(formData, "activityId") && str(formData, "id")) {
    formData.set("activityId", str(formData, "id"));
  }
  await completeDeskActivity(formData);
}

export async function cancelActivity(formData: FormData) {
  formData.set("status", "cancelled");
  await setActivityStatus(formData);
}

export async function moveActivityDay(formData: FormData) {
  const id = str(formData, "activityId") || str(formData, "id");
  const dueAt = str(formData, "dueAt");
  if (!id || !dueAt) return;
  const target = new Date(dueAt);
  if (Number.isNaN(target.getTime())) return;
  const [row] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  if (!row) return;

  const from = row.dueAt ?? row.startAt ?? target;
  const fromDay = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const toDay = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const delta = toDay - fromDay;
  const shift = (value: Date | null) => (value ? new Date(value.getTime() + delta) : null);

  await db
    .update(activities)
    .set({
      dueAt: shift(row.dueAt) ?? target,
      startAt: shift(row.startAt),
      endAt: shift(row.endAt),
      updatedAt: new Date(),
    })
    .where(eq(activities.id, id));

  revalidatePath("/calendar");
  revalidatePath("/tasks");
  if (row.dealId) revalidatePath(`/deals/${row.dealId}`);
  if (row.leadId) revalidatePath(`/leads/${row.leadId}`);
}

export async function setPipelineStage(formData: FormData) {
  const dealId = str(formData, "dealId");
  const stage = str(formData, "pipelineStage") || str(formData, "stage");
  if (!dealId || !stage) return;
  await db
    .update(deals)
    .set({ pipelineStage: stage, updatedAt: new Date() })
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, dealId)));
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
}

export async function startMeeting(formData: FormData) {
  formData.set("kind", "meeting");
  await logDeskActivity(formData);
}

export async function markMeetingOutcome(formData: FormData) {
  await completeDeskActivity(formData);
}

export async function saveCallOutcome(formData: FormData) {
  return saveDeskCallOutcome(formData);
}

export async function logCallDuration(formData: FormData): Promise<void> {
  await saveDeskCallOutcome(formData);
}

export async function finishCall(formData: FormData) {
  const { returnTo } = await saveDeskCallOutcome(formData);
  flashAction(returnTo, "outcome-saved");
}

export async function addTimelineNote(formData: FormData) {
  formData.set("kind", "task");
  if (!str(formData, "title")) formData.set("title", "Note");
  await logDeskActivity(formData);
}

export async function createBusiness(formData: FormData) {
  const name = str(formData, "name") || str(formData, "legalName");
  if (!name) throw new Error("Business name is required.");
  const [row] = await db
    .insert(accounts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      name,
      legalName: str(formData, "legalName") || name,
      ...writeEin(str(formData, "ein") || null),
      city: str(formData, "city") || null,
      state: str(formData, "state") || "FL",
    })
    .returning();
  revalidatePath("/accounts");
  revalidatePath("/businesses");
  flashAction("/accounts", "business-saved");
}

export async function currentDeskActor() {
  return { id: ADMIN_USER_ID, name: ADMIN_NAME };
}
