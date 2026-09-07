"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID, isLostBusinessReason } from "@/lib/domain";
import { db } from "@/lib/db";
import { quoteAttemptLogs, quotes } from "@/lib/db/schema";
import { flashAction } from "@/lib/flash-action";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function setLostReason(formData: FormData) {
  const dealId = str(formData, "dealId");
  const quoteId = str(formData, "quoteId");
  const logId = str(formData, "logId");
  const reason = str(formData, "lostReason");
  if (!dealId) throw new Error("Deal is required.");
  if (reason && !isLostBusinessReason(reason)) {
    throw new Error("Pick a lost-business reason from the list.");
  }
  const value = reason || null;

  if (quoteId) {
    await db
      .update(quotes)
      .set({ lostReason: value })
      .where(and(eq(quotes.tenantId, DEFAULT_TENANT_ID), eq(quotes.id, quoteId)));
  }
  if (logId) {
    await db
      .update(quoteAttemptLogs)
      .set({ lostReason: value })
      .where(and(eq(quoteAttemptLogs.tenantId, DEFAULT_TENANT_ID), eq(quoteAttemptLogs.id, logId)));
  }

  revalidatePath(`/deals/${dealId}`);
  revalidatePath(`/deals/${dealId}/compare`);
  revalidatePath("/quotes");
  revalidatePath("/");
  flashAction(`/deals/${dealId}`, "lost-reason-saved");
}
