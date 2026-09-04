"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireSignedInAction } from "@/lib/auth/guards";
import { validateGuidedAutomation } from "@/lib/automations/types";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts, bulkSmsDrafts, guidedAutomations } from "@/lib/db/schema";
import { sendSms } from "@/lib/integrations/sms";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function refreshAutomations() {
  revalidatePath("/automations");
  revalidatePath("/automations/builder");
  revalidatePath("/automations/campaigns");
  revalidatePath("/automations/sms");
  revalidatePath("/automations/templates");
  revalidatePath("/automations/signatures");
  revalidatePath("/automations/sequences");
  revalidatePath("/alerts");
}

export async function saveGuidedAutomation(formData: FormData) {
  const session = await requireSignedInAction();
  const parsed = validateGuidedAutomation({
    name: str(formData, "name"),
    triggerKind: str(formData, "triggerKind"),
    triggerValue: str(formData, "triggerValue"),
    conditionKind: str(formData, "conditionKind"),
    conditionValue: str(formData, "conditionValue"),
    actionKind: str(formData, "actionKind"),
    actionValue: str(formData, "actionValue"),
  });
  if (!parsed.ok) {
    redirect(`/automations/builder?error=${encodeURIComponent(parsed.error)}`);
  }

  const id = str(formData, "id");
  const enabled = str(formData, "enabled") === "on" || str(formData, "enabled") === "true";
  const values = {
    name: parsed.value.name,
    triggerKind: parsed.value.triggerKind,
    triggerValue: parsed.value.triggerValue || null,
    conditionKind: parsed.value.conditionKind,
    conditionValue: parsed.value.conditionValue || null,
    actionKind: parsed.value.actionKind,
    actionValue: parsed.value.actionValue,
    enabled,
    updatedAt: new Date(),
  };

  if (id) {
    await db
      .update(guidedAutomations)
      .set(values)
      .where(and(eq(guidedAutomations.tenantId, DEFAULT_TENANT_ID), eq(guidedAutomations.id, id)));
  } else {
    await db.insert(guidedAutomations).values({
      tenantId: DEFAULT_TENANT_ID,
      createdBy: session.userId,
      isExample: false,
      ...values,
    });
  }

  refreshAutomations();
  redirect("/automations/builder?notice=automation-saved");
}

export async function toggleGuidedAutomation(formData: FormData) {
  await requireSignedInAction();
  const id = str(formData, "id");
  const enabled = str(formData, "enabled") === "true";
  await db
    .update(guidedAutomations)
    .set({ enabled, updatedAt: new Date() })
    .where(and(eq(guidedAutomations.tenantId, DEFAULT_TENANT_ID), eq(guidedAutomations.id, id)));
  refreshAutomations();
  redirect("/automations/builder?notice=automation-saved");
}

export async function previewAutomationNotify(formData: FormData) {
  await requireSignedInAction();
  const name = str(formData, "name") || "Automation";
  const body =
    str(formData, "actionValue") ||
    "In-app notify preview. Nothing emailed the broker.";
  await db.insert(alerts).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: "automation_preview",
    title: `${name} · in-app notify`,
    body,
    severity: "info",
    entityType: "automation",
  });
  refreshAutomations();
  redirect("/automations/builder?notice=notify-preview");
}

export async function saveBulkSmsDraft(formData: FormData) {
  const session = await requireSignedInAction();
  const name = str(formData, "name") || "Untitled SMS";
  const body = str(formData, "body");
  if (!body) {
    redirect("/automations/sms?error=Write%20the%20text%20first.");
  }
  const result = sendSms();
  await db.insert(bulkSmsDrafts).values({
    tenantId: DEFAULT_TENANT_ID,
    name,
    body,
    audienceLabel: str(formData, "audienceLabel") || "all opted-in contacts",
    status: "would_send",
    createdBy: session.userId,
  });
  refreshAutomations();
  redirect(
    `/automations/sms?notice=sms-would-send&detail=${encodeURIComponent(result.message)}`,
  );
}
