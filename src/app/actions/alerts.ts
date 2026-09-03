"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts, clientHistory, reviewTasks } from "@/lib/db/schema";

export async function markAlertRead(formData: FormData) {
  const id = String(formData.get("alertId") ?? "");
  await db.update(alerts).set({ readAt: new Date() }).where(eq(alerts.id, id));
  revalidatePath("/");
  revalidatePath("/alerts");
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

export async function completeTask(formData: FormData) {
  const id = String(formData.get("taskId") ?? "");
  const [task] = await db.select().from(reviewTasks).where(eq(reviewTasks.id, id));
  await db
    .update(reviewTasks)
    .set({ status: "done", completedAt: new Date() })
    .where(eq(reviewTasks.id, id));

  if (task?.contactId) {
    await db.insert(clientHistory).values({
      tenantId: DEFAULT_TENANT_ID,
      contactId: task.contactId,
      dealId: task.dealId,
      policyId: task.policyId,
      eventType: "review_completed",
      body: `Completed ${task.title}.`,
    });
  }

  revalidateTasks(task);
}

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function createTask(formData: FormData) {
  const title = str(formData, "title") || "Follow-up";
  const kind = str(formData, "kind") || "task";
  const dueRaw = str(formData, "dueDate");
  const dueDate = dueRaw ? new Date(`${dueRaw}T16:00:00.000Z`) : new Date();
  const dealId = str(formData, "dealId") || null;
  const contactId = str(formData, "contactId") || null;
  const policyId = str(formData, "policyId") || null;

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
  revalidateTasks({ dealId, contactId, policyId });
}

export async function updateTask(formData: FormData) {
  const id = str(formData, "taskId");
  const title = str(formData, "title") || "Follow-up";
  const kind = str(formData, "kind") || "task";
  const status = str(formData, "status") || "open";
  const dueRaw = str(formData, "dueDate");
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
  const id = str(formData, "taskId");
  const [task] = await db.select().from(reviewTasks).where(eq(reviewTasks.id, id));
  await db.delete(reviewTasks).where(eq(reviewTasks.id, id));
  revalidateTasks(task);
}
