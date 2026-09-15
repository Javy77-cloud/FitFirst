"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { emitDeskEvent } from "@/lib/developer-hub/events";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { reviewTasks } from "@/lib/db/schema";
import { flashAction } from "@/lib/flash-action";
import { taskDueFromForm } from "@/lib/tasks/due-at";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function createReviewTask(formData: FormData) {
  const title = str(formData, "title");
  if (!title) return;
  const dueDate = taskDueFromForm(formData);
  await db.insert(reviewTasks).values({
    tenantId: DEFAULT_TENANT_ID,
    title,
    kind: str(formData, "kind") || "review",
    dueDate,
    status: str(formData, "status") || "open",
    contactId: str(formData, "contactId") || null,
    accountId: str(formData, "accountId") || null,
    policyId: str(formData, "policyId") || null,
    dealId: str(formData, "dealId") || null,
  });
  await emitDeskEvent("task.due", {
    title,
    dueDate: dueDate.toISOString(),
  });
  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function updateReviewTask(formData: FormData) {
  const id = str(formData, "id");
  if (!id) return;
  const title = str(formData, "title");
  const dueDate = str(formData, "dueDate") ? taskDueFromForm(formData) : undefined;
  await db
    .update(reviewTasks)
    .set({
      title: title || "Task",
      kind: str(formData, "kind") || "review",
      status: str(formData, "status") || "open",
      dueDate,
      contactId: str(formData, "contactId") || null,
      accountId: str(formData, "accountId") || null,
      policyId: str(formData, "policyId") || null,
      dealId: str(formData, "dealId") || null,
    })
    .where(and(eq(reviewTasks.tenantId, DEFAULT_TENANT_ID), eq(reviewTasks.id, id)));
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
  flashAction("/tasks", "task-saved");
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
