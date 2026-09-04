"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { relatedIdsFromEntity } from "@/lib/desk/contact-sections";
import { recordHref } from "@/lib/desk/record-href";
import { writeDeskComms } from "@/lib/desk/write-comms";
import { hasCommsRecord } from "@/lib/lifecycle/activity";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

/** In-app click-to-call ping. Writes the call onto the record. No PSTN. Softphone stays a stub. */
export async function pingClickToCall(formData: FormData) {
  const entityType = str(formData, "entityType");
  const entityId = str(formData, "entityId");
  const name = str(formData, "name") || "record";
  const phone = str(formData, "phone") || "no number";
  const related = relatedIdsFromEntity(entityType, entityId);

  await db.insert(alerts).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: "click_to_call",
    title: `Click-to-call · ${name}`,
    body: `In-app ping only — desk would dial ${phone}. No email. No trunk.`,
    severity: "info",
    entityType: entityType || null,
    entityId: entityId || null,
  });

  if (hasCommsRecord(related)) {
    await writeDeskComms({
      kind: "call",
      title: `Click-to-call · ${name}`,
      body: `Desk ping to dial ${phone}. No trunk.`,
      direction: "outbound",
      eventType: "logged",
      ...related,
    });
  }

  const href = recordHref(entityType, entityId);
  if (href) revalidatePath(href);
  revalidatePath("/alerts");
  revalidatePath("/phone");
}
