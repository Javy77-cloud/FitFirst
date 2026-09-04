"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { currentDeskSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fillFeedbackLogs } from "@/lib/db/schema";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function logFillFeedback(formData: FormData) {
  const fieldKey = str(formData, "fieldKey");
  const wrongValue = str(formData, "wrongValue");
  const correctedValue = str(formData, "correctedValue");
  if (!fieldKey || !wrongValue || !correctedValue) {
    throw new Error("Field, wrong value, and corrected value are required.");
  }
  const session = await currentDeskSession();
  await db.insert(fillFeedbackLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: str(formData, "dealId") || null,
    documentId: str(formData, "documentId") || null,
    quoteSheetId: str(formData, "quoteSheetId") || null,
    docType: str(formData, "docType") || "dec",
    fieldKey,
    wrongValue,
    correctedValue,
    carrierId: str(formData, "carrierId") || null,
    reason: str(formData, "reason") || "agent_edit",
    line: str(formData, "line") || "home",
    createdBy: session.name || "desk",
  });
  const dealId = str(formData, "dealId");
  if (dealId) revalidatePath(`/deals/${dealId}`);
  revalidatePath("/quotes/fill-feedback");
}
