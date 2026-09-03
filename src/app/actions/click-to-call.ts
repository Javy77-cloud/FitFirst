"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { recordHref } from "@/lib/desk/record-href";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

/** In-app click-to-call ping. No email, no PSTN. Softphone stays a stub. */
export async function pingClickToCall(formData: FormData) {
  const entityType = str(formData, "entityType");
  const entityId = str(formData, "entityId");
  const name = str(formData, "name") || "record";
  const phone = str(formData, "phone") || "no number";

  await db.insert(alerts).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: "click_to_call",
    title: `Click-to-call · ${name}`,
    body: `In-app ping only — desk would dial ${phone}. No email. No trunk.`,
    severity: "info",
    entityType: entityType || null,
    entityId: entityId || null,
  });

  const href = recordHref(entityType, entityId);
  if (href) revalidatePath(href);
  revalidatePath("/alerts");
  revalidatePath("/phone");
}
