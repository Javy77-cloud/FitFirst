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

  revalidatePath("/");
  revalidatePath("/reviews");
  revalidatePath("/alerts");
  revalidatePath("/policies");
  revalidatePath("/contacts");
  if (task?.contactId) revalidatePath(`/contacts/${task.contactId}`);
  if (task?.policyId) revalidatePath(`/policies/${task.policyId}`);
  if (task?.dealId) revalidatePath(`/deals/${task.dealId}`);
}
