"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { leadFollowUpQueue, leadFollowUpSteps, leadFollowUpTemplates, leads } from "@/lib/db/schema";
import { writeDeskComms } from "@/lib/desk/write-comms";
import { enqueueOutboundJob } from "@/lib/desk/outbound-queue";
import {
  cancelLeadFollowUps,
  completeFollowUpFromAlert,
  completeLeadFollowUpAndAdvance,
  fireLeadFollowUpForStatus,
  releaseDueLeadFollowUps,
  rescheduleQueuedFromLiveTemplate,
  scheduleLeadNurtureReminder,
  snoozeLeadFollowUpAlert,
  snoozeLeadFollowUpByActivity,
  snoozeLeadFollowUpByQueue,
} from "@/lib/leads/apply-follow-up";
import {
  canStartFollowUpClock,
  FOLLOW_UP_HIDE_COOKIE,
  FOLLOW_UP_MODAL_REOPEN_MS,
  followUpTemplateChipName,
  isDefaultFollowUpTemplate,
  isFollowUpMethod,
  isSnoozeDelayUnit,
  normalizeFollowUpSteps,
  normalizeRemindVia,
  outboundStubLabel,
  PAID_API_WALL_REASON,
  pickTemplateForLead,
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

async function followUpResultForLead(
  _leadId: string,
  status: string,
  followUpTemplateId: string | null,
  scheduled?: { dueAt?: Date; templateName?: string },
) {
  const templates = await db
    .select()
    .from(leadFollowUpTemplates)
    .where(eq(leadFollowUpTemplates.tenantId, DEFAULT_TENANT_ID));
  const picked = pickTemplateForLead(
    templates.map((row) => ({
      id: row.id,
      name: row.name,
      triggerStatus: row.triggerStatus,
      enabled: row.enabled,
    })),
    { followUpTemplateId, status },
  );
  const followUpName = picked ? followUpTemplateChipName(picked) : "";
  if (scheduled?.dueAt) {
    return {
      dueAt: scheduled.dueAt.toISOString(),
      followUpName: scheduled.templateName || followUpName,
    };
  }
  return { dueAt: null as string | null, followUpName };
}

export async function updateLeadQueueStatus(formData: FormData) {
  const leadId = str(formData, "leadId");
  const status = normalizeLeadStatus(str(formData, "status"));
  if (!leadId || !status) return { dueAt: null as string | null, followUpName: "" };
  const [existing] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, leadId)));
  if (!existing) return { dueAt: null, followUpName: "" };
  if (status === "nurture") return { dueAt: null, followUpName: "" };
  const statusChanged = normalizeLeadStatus(existing.status) !== status;
  if (statusChanged) {
    await db
      .update(leads)
      .set({
        status,
        temperature: temperatureForStatus(status, existing.temperature),
        nurtureUntil: null,
        nurtureRemindVia: null,
        updatedAt: new Date(),
      })
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, leadId)));
  }
  const open = await db
    .select()
    .from(leadFollowUpQueue)
    .where(
      and(
        eq(leadFollowUpQueue.tenantId, DEFAULT_TENANT_ID),
        eq(leadFollowUpQueue.leadId, leadId),
        eq(leadFollowUpQueue.status, "queued"),
      ),
    );
  const needsSchedule = statusChanged || (canStartFollowUpClock(status) && open.length === 0);
  const scheduled = needsSchedule
    ? await fireLeadFollowUpForStatus(leadId, status)
    : { dueAt: open[0]?.dueAt };
  revalidateLeads(leadId);
  return followUpResultForLead(leadId, status, existing.followUpTemplateId, scheduled);
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
  let nextId = templateId;
  if (nextId) {
    const [picked] = await db
      .select()
      .from(leadFollowUpTemplates)
      .where(and(eq(leadFollowUpTemplates.tenantId, DEFAULT_TENANT_ID), eq(leadFollowUpTemplates.id, nextId)));
    if (picked && isDefaultFollowUpTemplate(picked)) nextId = null;
  }
  await db
    .update(leads)
    .set({ followUpTemplateId: nextId, updatedAt: new Date() })
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, leadId)));
  const scheduled = await fireLeadFollowUpForStatus(leadId, existing.status);
  revalidateLeads(leadId);
  return followUpResultForLead(leadId, existing.status, nextId, scheduled);
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
  const scheduled = await completeLeadFollowUpAndAdvance(leadId);
  revalidateLeads(leadId);
  return followUpResultForLead(leadId, lead.status, lead.followUpTemplateId, scheduled);
}

export async function saveFollowUpTemplate(formData: FormData) {
  const id = str(formData, "templateId") || null;
  const name = str(formData, "name") || "Untitled template";
  const triggerRaw = str(formData, "triggerStatus") || "new";
  const triggerStatus = triggerRaw === "default" || triggerRaw === "contacted" ? "contacted" : normalizeLeadStatus(triggerRaw);
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
  const sortOrderByQueueId = new Map<string, number>();
  if (id) {
    const [queued, existingSteps] = await Promise.all([
      db
        .select()
        .from(leadFollowUpQueue)
        .where(and(eq(leadFollowUpQueue.tenantId, DEFAULT_TENANT_ID), eq(leadFollowUpQueue.templateId, id))),
      db.select().from(leadFollowUpSteps).where(eq(leadFollowUpSteps.templateId, id)),
    ]);
    const orderByStep = new Map(existingSteps.map((step) => [step.id, step.sortOrder]));
    for (const item of queued) {
      if (item.stepId && orderByStep.has(item.stepId)) {
        sortOrderByQueueId.set(item.id, orderByStep.get(item.stepId)!);
      }
    }
  }
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
  if (templateId) await rescheduleQueuedFromLiveTemplate(templateId, now, sortOrderByQueueId);
  revalidateLeads();
}

export async function snoozeLeadFollowUpReminder(formData: FormData) {
  const alertId = str(formData, "alertId");
  const amount = Number(str(formData, "amount"));
  const unitRaw = str(formData, "unit");
  if (!alertId || !Number.isFinite(amount) || amount < 1 || !isSnoozeDelayUnit(unitRaw)) {
    return { queued: false, dueAt: null as string | null, leadId: null as string | null };
  }
  const result = await snoozeLeadFollowUpAlert(alertId, amount, unitRaw);
  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/notifications");
  revalidatePath("/alerts");
  if (result.leadId) revalidatePath(`/leads/${result.leadId}`);
  return {
    queued: result.queued,
    dueAt: result.dueAt ? result.dueAt.toISOString() : null,
    leadId: result.leadId,
  };
}

export async function markFollowUpReadAndAdvance(formData: FormData) {
  const alertId = str(formData, "alertId");
  if (!alertId) return { dueAt: null as string | null, leadId: null as string | null, followUpName: "" };
  const result = await completeFollowUpFromAlert(alertId);
  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/notifications");
  revalidatePath("/alerts");
  if (result.leadId) revalidatePath(`/leads/${result.leadId}`);
  if (!result.leadId) return { dueAt: null, leadId: null, followUpName: "" };
  const [lead] = await db
    .select({ status: leads.status, followUpTemplateId: leads.followUpTemplateId })
    .from(leads)
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, result.leadId)));
  return followUpResultForLead(
    result.leadId,
    lead?.status ?? "",
    lead?.followUpTemplateId ?? null,
    result,
  );
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

export async function releaseDueLeadFollowUpsNow() {
  const result = await releaseDueLeadFollowUps();
  if (result.released > 0) {
    revalidatePath("/");
    revalidatePath("/leads");
    revalidatePath("/notifications");
  }
  return result;
}

export async function hideFollowUpModalForLead(formData: FormData) {
  const alertId = str(formData, "alertId");
  const leadId = str(formData, "leadId");
  if (!alertId) return;
  const until = Date.now() + FOLLOW_UP_MODAL_REOPEN_MS;
  const jar = await cookies();
  jar.set(FOLLOW_UP_HIDE_COOKIE, `${alertId}:${until}:${leadId}`, {
    path: "/",
    maxAge: Math.ceil(FOLLOW_UP_MODAL_REOPEN_MS / 1000),
    sameSite: "lax",
  });
}

export async function snoozeLeadFollowUpFromQueue(formData: FormData) {
  const queueId = str(formData, "queueId");
  const amount = Number(str(formData, "amount"));
  const unitRaw = str(formData, "unit");
  if (!queueId || !Number.isFinite(amount) || !isSnoozeDelayUnit(unitRaw)) return;
  const result = await snoozeLeadFollowUpByQueue(queueId, amount, unitRaw);
  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/tasks");
  if (result.leadId) revalidatePath(`/leads/${result.leadId}`);
}

export async function snoozeLeadFollowUpFromTask(formData: FormData) {
  const activityId = str(formData, "activityId");
  const amount = Number(str(formData, "amount"));
  const unitRaw = str(formData, "unit");
  if (!activityId || !Number.isFinite(amount) || !isSnoozeDelayUnit(unitRaw)) return;
  const result = await snoozeLeadFollowUpByActivity(activityId, amount, unitRaw);
  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/tasks");
  if (result.leadId) revalidatePath(`/leads/${result.leadId}`);
}
