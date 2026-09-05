"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { emitDeskEvent } from "@/lib/developer-hub/events";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { reviewTasks } from "@/lib/db/schema";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function createReviewTask(formData: FormData) {
  const title = str(formData, "title");
  if (!title) return;
  const dueRaw = str(formData, "dueDate") || new Date().toISOString().slice(0, 10);
  await db.insert(reviewTasks).values({
    tenantId: DEFAULT_TENANT_ID,
    title,
    kind: str(formData, "kind") || "review",
    dueDate: new Date(`${dueRaw}T16:00:00.000Z`),
    status: str(formData, "status") || "open",
    contactId: str(formData, "contactId") || null,
    accountId: str(formData, "accountId") || null,
    policyId: str(formData, "policyId") || null,
    dealId: str(formData, "dealId") || null,
  });
  await emitDeskEvent("task.due", {
    title,
    dueDate: new Date(`${dueRaw}T16:00:00.000Z`).toISOString(),
  });
  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function updateReviewTask(formData: FormData) {
  const id = str(formData, "id");
  if (!id) return;
  const title = str(formData, "title");
  const dueRaw = str(formData, "dueDate");
  await db
    .update(reviewTasks)
    .set({
      title: title || "Task",
      kind: str(formData, "kind") || "review",
      status: str(formData, "status") || "open",
      dueDate: dueRaw ? new Date(`${dueRaw}T16:00:00.000Z`) : undefined,
      contactId: str(formData, "contactId") || null,
      accountId: str(formData, "accountId") || null,
      policyId: str(formData, "policyId") || null,
      dealId: str(formData, "dealId") || null,
    })
    .where(and(eq(reviewTasks.tenantId, DEFAULT_TENANT_ID), eq(reviewTasks.id, id)));
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
  redirect("/tasks");
}

export async function deleteReviewTask(formData: FormData) {
  const id = str(formData, "id");
  if (!id) return;
  await db
    .delete(reviewTasks)
    .where(and(eq(reviewTasks.tenantId, DEFAULT_TENANT_ID), eq(reviewTasks.id, id)));
  revalidatePath("/tasks");
  redirect("/tasks");
}
