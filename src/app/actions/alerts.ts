"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { alertVisibleWhere } from "@/lib/alerts/visibility";
import { currentDeskSession } from "@/lib/auth/session";
import { emitDeskEvent } from "@/lib/developer-hub/events";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isDeskUuid } from "@/lib/desk-id";
import { db } from "@/lib/db";
import { alerts, reviewTasks } from "@/lib/db/schema";

function revalidateNotificationSurfaces() {
  revalidatePath("/");
  revalidatePath("/alerts");
  revalidatePath("/notifications");
}

export async function markAlertRead(formData: FormData) {
  const id = String(formData.get("alertId") ?? "");
  if (!id) return;
  const session = await currentDeskSession();
  const visible = alertVisibleWhere(session, DEFAULT_TENANT_ID);
  await db.update(alerts).set({ readAt: new Date() }).where(and(eq(alerts.id, id), visible));
  revalidateNotificationSurfaces();
}

export async function markAllAlertsRead() {
  const session = await currentDeskSession();
  const visible = alertVisibleWhere(session, DEFAULT_TENANT_ID);
  await db
    .update(alerts)
    .set({ readAt: new Date() })
    .where(and(visible, isNull(alerts.readAt)));
  revalidateNotificationSurfaces();
}

export async function markSelectedAlertsRead(formData: FormData) {
  const raw = String(formData.get("alertIds") ?? "");
  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.length === 0) return { updated: 0 };
  const session = await currentDeskSession();
  const visible = alertVisibleWhere(session, DEFAULT_TENANT_ID);
  const now = new Date();
  let updated = 0;
  for (const id of ids) {
    const result = await db
      .update(alerts)
      .set({ readAt: now })
      .where(and(eq(alerts.id, id), visible, isNull(alerts.readAt)))
      .returning({ id: alerts.id });
    updated += result.length;
  }
  revalidateNotificationSurfaces();
  return { updated };
}

export async function completeTask(formData: FormData) {
  const id = String(formData.get("taskId") ?? "");
  await db
    .update(reviewTasks)
    .set({ status: "done", completedAt: new Date() })
    .where(eq(reviewTasks.id, id));
  revalidatePath("/");
  revalidatePath("/tasks");
  if (id) revalidatePath(`/tasks/${id}`);
}

export async function createReviewTask(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const contactRaw = String(formData.get("contactId") ?? "").trim();
  const dealRaw = String(formData.get("dealId") ?? "").trim();
  const policyRaw = String(formData.get("policyId") ?? "").trim();
  const contactId = isDeskUuid(contactRaw) ? contactRaw : null;
  const dealId = isDeskUuid(dealRaw) ? dealRaw : null;
  const policyId = isDeskUuid(policyRaw) ? policyRaw : null;
  const kind = String(formData.get("kind") ?? "30_day").trim() || "30_day";
  const dueRaw = String(formData.get("dueDate") ?? "").trim();
  const dueDate = dueRaw ? new Date(`${dueRaw}T16:00:00.000Z`) : new Date();
  if (!title) return;
  const [row] = await db
    .insert(reviewTasks)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      title,
      kind,
      dueDate,
      status: "open",
      contactId,
      dealId,
      policyId,
    })
    .returning();
  revalidatePath("/tasks");
  if (row) redirect(`/tasks/${row.id}`);
}

function revalidateTasks(task?: { contactId?: string | null; policyId?: string | null; dealId?: string | null }) {
  revalidatePath("/");
  revalidatePath("/reviews");
  revalidatePath("/tasks");
  revalidatePath("/alerts");
  revalidatePath("/policies");
  revalidatePath("/contacts");
  revalidatePath("/deals");
  if (task?.contactId) revalidatePath(`/contacts/${task.contactId}`);
  if (task?.policyId) revalidatePath(`/policies/${task.policyId}`);
  if (task?.dealId) revalidatePath(`/deals/${task.dealId}`);
}

function alertStr(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function createTask(formData: FormData) {
  const title = alertStr(formData, "title") || "Follow-up";
  const kind = alertStr(formData, "kind") || "task";
  const dueRaw = alertStr(formData, "dueDate");
  const dueDate = dueRaw ? new Date(`${dueRaw}T16:00:00.000Z`) : new Date();
  const dealId = alertStr(formData, "dealId") || null;
  const contactId = alertStr(formData, "contactId") || null;
  const policyId = alertStr(formData, "policyId") || null;

  await db.insert(reviewTasks).values({
    tenantId: DEFAULT_TENANT_ID,
    title,
    kind,
    dueDate,
    status: "open",
    dealId,
    contactId,
    policyId,
  });
  await emitDeskEvent("task.due", { title, dueDate: dueDate.toISOString(), dealId, contactId, policyId });
  revalidateTasks({ dealId, contactId, policyId });
}

export async function updateTask(formData: FormData) {
  const id = alertStr(formData, "taskId");
  const title = alertStr(formData, "title") || "Follow-up";
  const kind = alertStr(formData, "kind") || "task";
  const status = alertStr(formData, "status") || "open";
  const dueRaw = alertStr(formData, "dueDate");
  const dueDate = dueRaw ? new Date(`${dueRaw}T16:00:00.000Z`) : new Date();

  const [task] = await db.select().from(reviewTasks).where(eq(reviewTasks.id, id));
  await db
    .update(reviewTasks)
    .set({
      title,
      kind,
      status,
      dueDate,
      completedAt: status === "done" ? (task?.completedAt ?? new Date()) : null,
    })
    .where(eq(reviewTasks.id, id));
  revalidateTasks(task);
}

export async function deleteTask(formData: FormData) {
  const id = alertStr(formData, "taskId");
  const [task] = await db.select().from(reviewTasks).where(eq(reviewTasks.id, id));
  await db.delete(reviewTasks).where(eq(reviewTasks.id, id));
  revalidateTasks(task);
}

export async function updateReviewTask(formData: FormData) {
  const id = String(formData.get("taskId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const dueRaw = String(formData.get("dueDate") ?? "").trim();
  if (!id || !title) return;
  await db
    .update(reviewTasks)
    .set({
      title,
      status: status || "open",
      ...(dueRaw ? { dueDate: new Date(`${dueRaw}T16:00:00.000Z`) } : {}),
      completedAt: status === "done" || status === "completed" ? new Date() : null,
    })
    .where(eq(reviewTasks.id, id));
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
}
