"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { leadFollowUpSteps, leadFollowUpTemplates, leads } from "@/lib/db/schema";
import { writeDeskComms } from "@/lib/desk/write-comms";
import { enqueueOutboundJob } from "@/lib/desk/outbound-queue";
import {
  cancelLeadFollowUps,
  fireLeadFollowUpForStatus,
  scheduleLeadNurtureReminder,
} from "@/lib/leads/apply-follow-up";
import {
  isFollowUpMethod,
  normalizeFollowUpSteps,
  normalizeRemindVia,
  outboundStubLabel,
  PAID_API_WALL_REASON,
} from "@/lib/leads/follow-up-templates";
import {
  isNurtureDelayUnit,
  normalizeLeadStatus,
  normalizeLeadTemperature,
  nurtureDueAt,
  temperatureForStatus,
} from "@/lib/leads/queue";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function revalidateLeads(leadId?: string) {
  revalidatePath("/leads");
  revalidatePath("/tasks");
  revalidatePath("/alerts");
  if (leadId) revalidatePath(`/leads/${leadId}`);
}

export async function updateLeadQueueStatus(formData: FormData) {
  const leadId = str(formData, "leadId");
  const status = normalizeLeadStatus(str(formData, "status"));
  if (!leadId || !status) return;
  const [existing] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, leadId)));
  if (!existing) return;
  if (normalizeLeadStatus(existing.status) === status) return;
  if (status === "nurture") return;
  await db
    .update(leads)
    .set({
      status,
      temperature: temperatureForStatus(status, existing.temperature),
      nurtureUntil: null,
      nurtureRemindVia: null,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));
  await fireLeadFollowUpForStatus(leadId, status);
  revalidateLeads(leadId);
}

export async function scheduleLeadNurture(formData: FormData) {
  const leadId = str(formData, "leadId");
  const amount = Number(str(formData, "nurtureAmount"));
  const unitRaw = str(formData, "nurtureUnit");
  const remindVia = normalizeRemindVia(str(formData, "remindVia"));
  if (!leadId || !Number.isFinite(amount) || !isNurtureDelayUnit(unitRaw)) return;
  const [existing] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, leadId)));
  if (!existing) return;
  const now = new Date();
  const dueAt = nurtureDueAt(now, amount, unitRaw);
  await db
    .update(leads)
    .set({
      status: "nurture",
      temperature: temperatureForStatus("nurture", existing.temperature),
      nurtureUntil: dueAt,
      nurtureRemindVia: remindVia,
      updatedAt: now,
    })
    .where(eq(leads.id, leadId));
  await scheduleLeadNurtureReminder(leadId, dueAt, remindVia, now);
  revalidateLeads(leadId);
}

export async function updateLeadTemperature(formData: FormData) {
  const leadId = str(formData, "leadId");
  const temperature = normalizeLeadTemperature(str(formData, "temperature"));
  if (!leadId) return;
  await db
    .update(leads)
    .set({ temperature, updatedAt: new Date() })
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, leadId)));
  revalidateLeads(leadId);
}

export async function overrideLeadFollowUpTemplate(formData: FormData) {
  const leadId = str(formData, "leadId");
  const templateId = str(formData, "templateId") || null;
  if (!leadId) return;
  const [existing] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, leadId)));
  if (!existing) return;
  await db
    .update(leads)
    .set({ followUpTemplateId: templateId, updatedAt: new Date() })
    .where(eq(leads.id, leadId));
  if (templateId) {
    await fireLeadFollowUpForStatus(leadId, existing.status);
  }
  revalidateLeads(leadId);
}

export async function logLeadQueueContact(formData: FormData) {
  const leadId = str(formData, "leadId");
  const methodRaw = str(formData, "method");
  if (!leadId || !isFollowUpMethod(methodRaw)) return;
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, leadId)));
  if (!lead) return;
  const leadName = `${lead.lastName}, ${lead.firstName}`;
  const kind = methodRaw === "text" ? "sms" : methodRaw;
  const message = str(formData, "message") || `Logged ${methodRaw} from the Leads queue.`;
  const written = await writeDeskComms({
    kind,
    title: `${methodRaw} · ${leadName}`,
    body: `${message}\n\n${outboundStubLabel(methodRaw)}`,
    direction: "outbound",
    eventType: "logged",
    status: "completed",
    leadId,
    phoneNumber: lead.phone,
    toAddress: methodRaw === "email" ? lead.email : methodRaw === "text" ? lead.phone : null,
    logEmailJob: false,
  });
  if (methodRaw === "email" || methodRaw === "text") {
    await enqueueOutboundJob({
      channel: methodRaw === "text" ? "sms" : "email",
      toAddress: methodRaw === "text" ? lead.phone : lead.email,
      subject: methodRaw === "email" ? `Desk follow-up · ${leadName}` : null,
      body: `${message}\n\n${outboundStubLabel(methodRaw)}`,
      leadId,
      activityId: written.activity.id,
    });
  }
  void PAID_API_WALL_REASON;
  revalidateLeads(leadId);
}

export async function saveFollowUpTemplate(formData: FormData) {
  const id = str(formData, "templateId") || null;
  const name = str(formData, "name") || "Untitled template";
  const triggerStatus = normalizeLeadStatus(str(formData, "triggerStatus") || "new");
  const enabled = str(formData, "enabled") !== "0";
  const steps = normalizeFollowUpSteps(
    [0, 1, 2, 3].map((index) => ({
      method: str(formData, `stepMethod${index}`) || null,
      delayAmount: str(formData, `stepDelay${index}`) || null,
      delayUnit: str(formData, `stepUnit${index}`) || null,
      message: str(formData, `stepMessage${index}`) || null,
      remindVia: str(formData, `stepRemindVia${index}`) || null,
    })),
  );
  const now = new Date();
  let templateId = id;
  if (id) {
    await db
      .update(leadFollowUpTemplates)
      .set({ name, triggerStatus, enabled, updatedAt: now })
      .where(and(eq(leadFollowUpTemplates.tenantId, DEFAULT_TENANT_ID), eq(leadFollowUpTemplates.id, id)));
    await db.delete(leadFollowUpSteps).where(eq(leadFollowUpSteps.templateId, id));
  } else {
    const [created] = await db
      .insert(leadFollowUpTemplates)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        name,
        triggerStatus,
        enabled,
      })
      .returning();
    templateId = created.id;
  }
  if (templateId && steps.length) {
    await db.insert(leadFollowUpSteps).values(
      steps.map((step, sortOrder) => ({
        tenantId: DEFAULT_TENANT_ID,
        templateId,
        sortOrder,
        method: step.method,
        delayAmount: step.delayAmount,
        delayUnit: step.delayUnit,
        message: step.message || null,
        remindVia: step.remindVia,
      })),
    );
  }
  revalidateLeads();
}

export async function deleteFollowUpTemplate(formData: FormData) {
  const id = str(formData, "templateId");
  if (!id) return;
  const queued = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.followUpTemplateId, id)));
  for (const row of queued) {
    await cancelLeadFollowUps(row.id);
  }
  await db
    .update(leads)
    .set({ followUpTemplateId: null, updatedAt: new Date() })
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.followUpTemplateId, id)));
  await db
    .delete(leadFollowUpTemplates)
    .where(and(eq(leadFollowUpTemplates.tenantId, DEFAULT_TENANT_ID), eq(leadFollowUpTemplates.id, id)));
  revalidateLeads();
}
