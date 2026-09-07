"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireAdminAction, requireSignedInAction } from "@/lib/auth/guards";
import { demoTargetForPlaybook } from "@/lib/automations/demo-targets";
import { firePlaybook } from "@/lib/automations/fire";
import { normalizeVisibility } from "@/lib/automations/engine";
import { validateGuidedAutomation } from "@/lib/automations/types";
import { flashAction } from "@/lib/flash-action";
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
  revalidatePath("/automations/playbooks");
  revalidatePath("/alerts");
  revalidatePath("/tasks");
}

export async function saveGuidedAutomation(formData: FormData) {
  const session = await requireAdminAction("Admin writes playbooks.");
  const parsed = validateGuidedAutomation({
    name: str(formData, "name"),
    triggerKind: str(formData, "triggerKind"),
    triggerValue: str(formData, "triggerValue"),
    conditionKind: str(formData, "conditionKind"),
    conditionValue: str(formData, "conditionValue"),
    actionKind: str(formData, "actionKind"),
    actionValue: str(formData, "actionValue"),
    visibility: str(formData, "visibility"),
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
    visibility: parsed.value.visibility,
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
  flashAction("/automations/builder", "automation-saved");
}

export async function toggleGuidedAutomation(formData: FormData) {
  await requireAdminAction("Admin toggles playbooks.");
  const id = str(formData, "id");
  const enabled = str(formData, "enabled") === "true";
  await db
    .update(guidedAutomations)
    .set({ enabled, updatedAt: new Date() })
    .where(and(eq(guidedAutomations.tenantId, DEFAULT_TENANT_ID), eq(guidedAutomations.id, id)));
  refreshAutomations();
  const next = str(formData, "next");
  redirect(
    next.startsWith("/automations/")
      ? `${next}?notice=automation-saved`
      : "/automations/playbooks?notice=automation-saved",
  );
}

export async function runPlaybookNow(formData: FormData) {
  await requireAdminAction("Admin runs playbook demos.");
  const id = str(formData, "id");
  const [playbook] = await db
    .select()
    .from(guidedAutomations)
    .where(and(eq(guidedAutomations.tenantId, DEFAULT_TENANT_ID), eq(guidedAutomations.id, id)));
  if (!playbook) {
    redirect("/automations/playbooks?error=Playbook%20not%20found.");
  }
  if (!playbook.enabled) {
    redirect("/automations/playbooks?error=Turn%20the%20playbook%20on%20first.");
  }
  const visibility = normalizeVisibility(playbook.visibility);
  const target = demoTargetForPlaybook({
    triggerKind: playbook.triggerKind,
    triggerValue: playbook.triggerValue,
    visibility,
  });
  const result = await firePlaybook({
    playbookId: playbook.id,
    related: target.related,
    assigneeName: target.assigneeName,
    alertUserId: target.alertUserId,
    audience: visibility,
    summary: target.summary,
  });
  refreshAutomations();
  redirect(
    result.emailed
      ? "/automations/playbooks?error=Playbooks%20must%20not%20email."
      : "/automations/playbooks?notice=playbook-fired",
  );
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
