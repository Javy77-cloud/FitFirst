"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isDeskUuid } from "@/lib/desk-id";
import { db } from "@/lib/db";
import { activities, activityLogs, alerts, reviewTasks } from "@/lib/db/schema";
import { writeDeskComms } from "@/lib/desk/write-comms";
import { hasCommsRecord } from "@/lib/lifecycle/activity";
import { snoozeDeskAlert, markAlertRead } from "@/app/actions/alerts";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function refreshPanel(paths: string[] = []) {
  revalidatePath("/");
  revalidatePath("/notifications");
  revalidatePath("/alerts");
  revalidatePath("/deals");
  revalidatePath("/renewals");
  revalidatePath("/contacts");
  for (const path of paths) revalidatePath(path);
}

export async function dismissPanelCard(formData: FormData) {
  const alertId = str(formData, "alertId");
  if (!alertId) return;
  const fd = new FormData();
  fd.set("alertId", alertId);
  await markAlertRead(fd);
  refreshPanel();
}

export async function snoozePanelCard(formData: FormData) {
  if (!str(formData, "amount")) formData.set("amount", "1");
  if (!str(formData, "unit")) formData.set("unit", "days");
  await snoozeDeskAlert(formData);
  refreshPanel();
}

export async function sendRenewalSilenceReminder(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) return;
  const policyId = str(formData, "policyId");
  const contactId = str(formData, "contactId");
  const alertId = str(formData, "alertId");
  const name = str(formData, "entityLine") || "this renewal";
  if (!isDeskUuid(policyId)) {
    redirect("/renewals");
  }
  const title = `Renewal reminder · ${name}`;
  const related = {
    policyId,
    contactId: isDeskUuid(contactId) ? contactId : null,
    accountId: null,
    dealId: null,
    leadId: null,
  };
  if (hasCommsRecord(related)) {
    await writeDeskComms({
      kind: "email",
      title,
      body: "Renewal reminder sent from the Notification Panel. In-desk only — nothing emailed Javy.",
      direction: "outbound",
      eventType: "logged",
      ...related,
    });
  } else {
    const [activity] = await db
      .insert(activities)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        kind: "email",
        title,
        notes: "Renewal reminder from Notification Panel.",
        status: "completed",
        policyId,
        contactId: isDeskUuid(contactId) ? contactId : null,
        assignee: session.userId,
      })
      .returning();
    if (activity) {
      await db.insert(activityLogs).values({
        tenantId: DEFAULT_TENANT_ID,
        activityId: activity.id,
        kind: "email",
        eventType: "logged",
        body: title,
        policyId,
        contactId: isDeskUuid(contactId) ? contactId : null,
      });
    }
  }
  if (alertId) {
    await db
      .update(alerts)
      .set({ readAt: new Date() })
      .where(and(eq(alerts.id, alertId), eq(alerts.tenantId, DEFAULT_TENANT_ID)));
  }
  refreshPanel([`/policies/${policyId}`]);
  redirect(`/renewals?notice=reminder_set`);
}

export async function linkCommitmentToRecord(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) return;
  const id = str(formData, "commitmentId");
  const source = str(formData, "source");
  const recordType = str(formData, "recordType");
  const recordId = str(formData, "recordId");
  if (!isDeskUuid(id) || !isDeskUuid(recordId)) return;
  const patch = {
    contactId: recordType === "contact" ? recordId : null,
    dealId: recordType === "deal" ? recordId : null,
    policyId: recordType === "policy" ? recordId : null,
    leadId: recordType === "lead" ? recordId : null,
    accountId: recordType === "account" || recordType === "business" ? recordId : null,
  };
  if (source === "activity") {
    await db.update(activities).set(patch).where(eq(activities.id, id));
  } else {
    await db.update(reviewTasks).set(patch).where(eq(reviewTasks.id, id));
  }
  refreshPanel();
}
