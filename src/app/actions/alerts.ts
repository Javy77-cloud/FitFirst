"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { alerts, reviewTasks } from "@/lib/db/schema";

export async function markAlertRead(formData: FormData) {
  const id = String(formData.get("alertId") ?? "");
  await db.update(alerts).set({ readAt: new Date() }).where(eq(alerts.id, id));
  revalidatePath("/");
  revalidatePath("/alerts");
}

export async function completeTask(formData: FormData) {
  const id = String(formData.get("taskId") ?? "");
  await db
    .update(reviewTasks)
    .set({ status: "done", completedAt: new Date() })
    .where(eq(reviewTasks.id, id));
  revalidatePath("/");
}
