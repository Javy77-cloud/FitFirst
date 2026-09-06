import { and, desc, eq, inArray, lte } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  alerts,
  commsOutboundJobs,
  leadFollowUpQueue,
  leadFollowUpSteps,
  leadFollowUpTemplates,
  leads,
  users,
} from "@/lib/db/schema";
import { followUpMethodFromTitle, followUpNotificationTitle } from "@/lib/desk/notifications";
import { writeDeskComms } from "@/lib/desk/write-comms";
import {
  canStartFollowUpClock,
  dueAtFromStep,
  followUpEmailSnoozeBody,
  followUpMethodToActivityKind,
  followUpTemplateChipName,
  isFollowUpDelayUnit,
  isFollowUpMethod,
  isSnoozeDelayUnit,
  nextTemplateStep,
  normalizeRemindVia,
  outboundStubLabel,
  PAID_API_WALL_REASON,
  pickTemplateForLead,
  remindViaLabel,
  shouldEmailAgentReminder,
  shouldHoldFollowUpUntilFirstContact,
  snoozeDueAt,
  type FollowUpMethod,
  type RemindViaChannel,
  type SnoozeDelayUnit,
} from "@/lib/leads/follow-up-templates";
import { ensureFollowUpPlaybooks } from "@/lib/leads/ensure-playbooks";
import { leadStatusLabel, normalizeLeadStatus } from "@/lib/leads/queue";

export async function cancelLeadFollowUps(leadId: string) {
  const open = await db
    .select()
    .from(leadFollowUpQueue)
    .where(
      and(
        eq(leadFollowUpQueue.tenantId, DEFAULT_TENANT_ID),
        eq(leadFollowUpQueue.leadId, leadId),
        inArray(leadFollowUpQueue.status, ["queued"]),
      ),
    );
  if (open.length === 0) return;
  const now = new Date();
  await db
    .update(leadFollowUpQueue)
    .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
    .where(
      inArray(
        leadFollowUpQueue.id,
        open.map((row) => row.id),
      ),
    );
}

async function loadEnabledTemplates() {
  const [templates, steps] = await Promise.all([
    db.select().from(leadFollowUpTemplates).where(eq(leadFollowUpTemplates.tenantId, DEFAULT_TENANT_ID)),
    db.select().from(leadFollowUpSteps).where(eq(leadFollowUpSteps.tenantId, DEFAULT_TENANT_ID)),
  ]);
  return { templates, steps };
}

async function enqueueLiveStep(input: {
  leadId: string;
  leadName: string;
  templateId: string;
  step: {
    id: string;
    method: string;
    delayAmount: number;
    delayUnit: string;
    message: string | null;
    remindVia: string;
  };
  now: Date;
}) {
  if (!isFollowUpMethod(input.step.method) || !isFollowUpDelayUnit(input.step.delayUnit)) {
    return { scheduled: 0 as const };
  }
  const dueAt = dueAtFromStep(input.now, input.step.delayAmount, input.step.delayUnit);
  const method = input.step.method;
  const remindVia = normalizeRemindVia(input.step.remindVia);
  await db.insert(leadFollowUpQueue).values({
    tenantId: DEFAULT_TENANT_ID,
    leadId: input.leadId,
    templateId: input.templateId,
    stepId: input.step.id,
    method,
    message: input.step.message,
    remindVia,
    dueAt,
    status: "queued",
    createdAt: input.now,
    updatedAt: input.now,
  });
  void followUpMethodToActivityKind(method);
  void input.leadName;
  return { scheduled: 1 as const, dueAt };
}

async function scheduleNextLiveStep(input: {
  leadId: string;
  templateId: string | null;
  afterSortOrder: number;
  now: Date;
}): Promise<{ scheduled: number; dueAt?: Date; templateId?: string; templateName?: string }> {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, input.leadId)));
  if (!lead || !canStartFollowUpClock(lead.status)) return { scheduled: 0 };
  const { templates, steps } = await loadEnabledTemplates();
  const picked = pickTemplateForLead(
    templates.map((row) => ({
      id: row.id,
      name: row.name,
      triggerStatus: row.triggerStatus,
      enabled: row.enabled,
    })),
    { followUpTemplateId: input.templateId ?? lead.followUpTemplateId, status: normalizeLeadStatus(lead.status) },
  );
  if (!picked) return { scheduled: 0 };
  const templateSteps = steps
    .filter((step) => step.templateId === picked.id)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 4);
  const next = nextTemplateStep(templateSteps, input.afterSortOrder);
  if (!next) return { scheduled: 0, templateId: picked.id, templateName: followUpTemplateChipName(picked) };
  const leadName = `${lead.lastName}, ${lead.firstName}`;
  const queued = await enqueueLiveStep({
    leadId: lead.id,
    leadName,
    templateId: picked.id,
    step: next,
    now: input.now,
  });
  return {
    scheduled: queued.scheduled,
    dueAt: queued.dueAt,
    templateId: picked.id,
    templateName: followUpTemplateChipName(picked),
  };
}

export async function fireLeadFollowUpForStatus(leadId: string, status: string, now = new Date()) {
  await ensureFollowUpPlaybooks();
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, leadId)));
  if (!lead) return { scheduled: 0 };
  const normalized = normalizeLeadStatus(status);
  if (normalized === "lost" || normalized === "nurture" || normalized === "converted" || normalized === "new") {
    await cancelLeadFollowUps(leadId);
    return { scheduled: 0, held: true as const };
  }
  if (shouldHoldFollowUpUntilFirstContact({ status: normalized, firstContactAt: lead.firstContactAt })) {
    await cancelLeadFollowUps(leadId);
    return { scheduled: 0, held: true as const };
  }
  await cancelLeadFollowUps(leadId);
  return scheduleNextLiveStep({
    leadId,
    templateId: lead.followUpTemplateId,
    afterSortOrder: -1,
    now,
  });
}

export async function rescheduleQueuedFromLiveTemplate(
  templateId: string,
  now = new Date(),
  sortOrderByQueueId?: Map<string, number>,
) {
  const steps = await db
    .select()
    .from(leadFollowUpSteps)
    .where(and(eq(leadFollowUpSteps.tenantId, DEFAULT_TENANT_ID), eq(leadFollowUpSteps.templateId, templateId)));
  const queued = await db
    .select()
    .from(leadFollowUpQueue)
    .where(
      and(
        eq(leadFollowUpQueue.tenantId, DEFAULT_TENANT_ID),
        eq(leadFollowUpQueue.templateId, templateId),
        eq(leadFollowUpQueue.status, "queued"),
      ),
    );
  if (queued.length === 0) return { rescheduled: 0 };
  const sorted = [...steps].sort((a, b) => a.sortOrder - b.sortOrder);
  let rescheduled = 0;
  for (const item of queued) {
    const kept = sorted.find((step) => step.id === item.stepId);
    const byOrder = sorted.find((step) => step.sortOrder === sortOrderByQueueId?.get(item.id));
    const live = kept ?? byOrder ?? sorted[0];
    if (!live || !isFollowUpDelayUnit(live.delayUnit)) continue;
    const dueAt = dueAtFromStep(now, live.delayAmount, live.delayUnit);
    await db
      .update(leadFollowUpQueue)
      .set({
        stepId: live.id,
        method: live.method,
        message: live.message,
        remindVia: normalizeRemindVia(live.remindVia),
        dueAt,
        updatedAt: now,
      })
      .where(eq(leadFollowUpQueue.id, item.id));
    rescheduled += 1;
  }
  return { rescheduled };
}

async function sortOrderForQueueItem(item: { stepId: string | null; templateId: string | null }) {
  if (!item.stepId) return -1;
  const [step] = await db
    .select()
    .from(leadFollowUpSteps)
    .where(and(eq(leadFollowUpSteps.tenantId, DEFAULT_TENANT_ID), eq(leadFollowUpSteps.id, item.stepId)));
  return step?.sortOrder ?? -1;
}

export async function releaseDueLeadFollowUps(now = new Date()) {
  const due = await db
    .select()
    .from(leadFollowUpQueue)
    .where(
      and(
        eq(leadFollowUpQueue.tenantId, DEFAULT_TENANT_ID),
        eq(leadFollowUpQueue.status, "queued"),
        lte(leadFollowUpQueue.dueAt, now),
      ),
    );
  if (due.length === 0) return { released: 0 };
  const leadRows = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.tenantId, DEFAULT_TENANT_ID),
        inArray(
          leads.id,
          due.map((row) => row.leadId),
        ),
      ),
    );
  const byId = new Map(leadRows.map((row) => [row.id, row]));
  const ownerIds = [...new Set(leadRows.map((row) => row.ownerId).filter((id): id is string => Boolean(id)))];
  const ownerRows = ownerIds.length
    ? await db
        .select()
        .from(users)
        .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), inArray(users.id, ownerIds)))
    : [];
  const ownerById = new Map(ownerRows.map((row) => [row.id, row]));
  let released = 0;
  for (const item of due) {
    const lead = byId.get(item.leadId);
    if (!lead) continue;
    const method = (isFollowUpMethod(item.method) ? item.method : "call") as FollowUpMethod;
    const remindVia = normalizeRemindVia(item.remindVia) as RemindViaChannel;
    const leadName = `${lead.lastName}, ${lead.firstName}`;
    const owner = lead.ownerId ? ownerById.get(lead.ownerId) : undefined;
    const result = await notifyAgentFollowUpDue({
      lead,
      leadName,
      method,
      remindVia,
      message: item.message,
      activityId: item.activityId,
      dueAt: item.dueAt,
      ownerEmail: owner?.email ?? null,
      queueId: item.id,
    });
    await db
      .update(leadFollowUpQueue)
      .set({
        status: "released",
        releasedAt: now,
        alertId: result.alertId,
        outboundJobId: result.outboundJobId,
        activityId: result.activityId ?? item.activityId,
        updatedAt: now,
      })
      .where(eq(leadFollowUpQueue.id, item.id));
    released += 1;
  }
  return { released };
}

async function notifyAgentFollowUpDue(input: {
  lead: { id: string; ownerId: string | null };
  leadName: string;
  method: FollowUpMethod;
  remindVia: RemindViaChannel;
  message: string | null;
  activityId: string | null;
  dueAt: Date;
  ownerEmail: string | null;
  queueId: string;
}): Promise<{ alertId: string | null; outboundJobId: string | null; activityId: string | null }> {
  const title = followUpNotificationTitle(input.method, input.leadName);
  const body = input.leadName;
  const snoozeLines = followUpEmailSnoozeBody("", input.queueId);
  const emailBody = [
    input.message || `A ${input.method} follow-up is due.`,
    `Remind via ${remindViaLabel(input.remindVia)}.`,
    outboundStubLabel(input.method),
    snoozeLines,
  ].join("\n\n");
  let activityId = input.activityId;
  if (input.remindVia === "task" && !activityId) {
    const written = await writeDeskComms({
      kind: "task",
      title: `Follow-up · ${input.method} · ${input.leadName}`,
      notes: [input.message, outboundStubLabel(input.method), "Snooze presets: 15 min, 1 hour, 1 day.", snoozeLines]
        .filter(Boolean)
        .join("\n\n"),
      status: "open",
      dueAt: input.dueAt,
      leadId: input.lead.id,
      eventType: "created",
      logEmailJob: false,
    });
    activityId = written.activity.id;
  }
  if (input.remindVia === "email" && shouldEmailAgentReminder(input.ownerEmail)) {
    const [job] = await db
      .insert(commsOutboundJobs)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        channel: "email",
        status: "held",
        toAddress: input.ownerEmail,
        subject: `Agent reminder · ${input.leadName}`,
        body: emailBody,
        leadId: input.lead.id,
        activityId,
        holdReason: PAID_API_WALL_REASON,
        vendor: "stub",
        scheduledFor: input.dueAt,
      })
      .returning();
    return { alertId: null, outboundJobId: job.id, activityId };
  }
  const [alert] = await db
    .insert(alerts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      kind: "lead_follow_up",
      title,
      body,
      severity: "warning",
      entityType: "lead",
      entityId: input.lead.id,
      userId: input.lead.ownerId,
      recipientUserId: input.lead.ownerId,
    })
    .returning();
  return { alertId: alert.id, outboundJobId: null, activityId };
}

export async function scheduleLeadNurtureReminder(
  leadId: string,
  dueAt: Date,
  remindVia: RemindViaChannel,
  now = new Date(),
) {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, leadId)));
  if (!lead) return { scheduled: 0 };
  await cancelLeadFollowUps(leadId);
  const leadName = `${lead.lastName}, ${lead.firstName}`;
  const notes = `Contact again ${dueAt.toLocaleString()}. Remind via ${remindViaLabel(remindVia)}.`;
  let activityId: string | null = null;
  if (remindVia === "task") {
    const written = await writeDeskComms({
      kind: "task",
      title: `Nurture · ${leadName}`,
      notes,
      status: "open",
      dueAt,
      leadId,
      eventType: "created",
      logEmailJob: false,
    });
    activityId = written.activity.id;
  }
  await db.insert(leadFollowUpQueue).values({
    tenantId: DEFAULT_TENANT_ID,
    leadId,
    templateId: null,
    stepId: null,
    method: "call",
    message: notes,
    remindVia,
    dueAt,
    status: "queued",
    activityId,
    createdAt: now,
    updatedAt: now,
  });
  return { scheduled: 1 };
}

export async function markLeadFollowUpAlertsRead(leadId: string, now = new Date()) {
  await db
    .update(alerts)
    .set({ readAt: now })
    .where(
      and(eq(alerts.tenantId, DEFAULT_TENANT_ID), eq(alerts.kind, "lead_follow_up"), eq(alerts.entityId, leadId)),
    );
}

export async function completeLeadFollowUpAndAdvance(leadId: string, now = new Date()) {
  await markLeadFollowUpAlertsRead(leadId, now);
  const open = await db
    .select()
    .from(leadFollowUpQueue)
    .where(
      and(
        eq(leadFollowUpQueue.tenantId, DEFAULT_TENANT_ID),
        eq(leadFollowUpQueue.leadId, leadId),
        inArray(leadFollowUpQueue.status, ["queued", "released"]),
      ),
    )
    .orderBy(desc(leadFollowUpQueue.createdAt));
  const current = open[0];
  await cancelLeadFollowUps(leadId);
  if (!current) return { scheduled: 0 };
  const sortOrder = await sortOrderForQueueItem(current);
  return scheduleNextLiveStep({
    leadId,
    templateId: current.templateId,
    afterSortOrder: sortOrder,
    now,
  });
}

export async function snoozeLeadFollowUpAlert(
  alertId: string,
  amount: number,
  unit: SnoozeDelayUnit,
  now = new Date(),
): Promise<{ queued: boolean; dueAt: Date | null; leadId: string | null }> {
  if (!alertId || !isSnoozeDelayUnit(unit)) return { queued: false, dueAt: null, leadId: null };
  const dueAt = snoozeDueAt(now, amount, unit);
  const [alert] = await db
    .select()
    .from(alerts)
    .where(and(eq(alerts.tenantId, DEFAULT_TENANT_ID), eq(alerts.id, alertId)));
  if (!alert || alert.kind !== "lead_follow_up") return { queued: false, dueAt: null, leadId: null };

  const [released] = await db
    .select()
    .from(leadFollowUpQueue)
    .where(and(eq(leadFollowUpQueue.tenantId, DEFAULT_TENANT_ID), eq(leadFollowUpQueue.alertId, alertId)));

  const leadId = released?.leadId ?? alert.entityId;
  if (!leadId) return { queued: false, dueAt: null, leadId: null };

  const method = (
    released && isFollowUpMethod(released.method) ? released.method : followUpMethodFromTitle(alert.title)
  ) as FollowUpMethod;
  const remindVia = normalizeRemindVia(released?.remindVia ?? "popup");

  await db.update(alerts).set({ readAt: now }).where(eq(alerts.id, alertId));
  await cancelLeadFollowUps(leadId);
  await db.insert(leadFollowUpQueue).values({
    tenantId: DEFAULT_TENANT_ID,
    leadId,
    templateId: released?.templateId ?? null,
    stepId: released?.stepId ?? null,
    method,
    message: released?.message ?? alert.body,
    remindVia,
    dueAt,
    status: "queued",
    activityId: released?.activityId ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return { queued: true, dueAt, leadId };
}

export async function snoozeLeadFollowUpByQueue(
  queueId: string,
  amount: number,
  unit: SnoozeDelayUnit,
  now = new Date(),
): Promise<{ queued: boolean; dueAt: Date | null; leadId: string | null }> {
  if (!queueId || !isSnoozeDelayUnit(unit)) return { queued: false, dueAt: null, leadId: null };
  const [row] = await db
    .select()
    .from(leadFollowUpQueue)
    .where(and(eq(leadFollowUpQueue.tenantId, DEFAULT_TENANT_ID), eq(leadFollowUpQueue.id, queueId)));
  if (!row) return { queued: false, dueAt: null, leadId: null };
  if (row.alertId) return snoozeLeadFollowUpAlert(row.alertId, amount, unit, now);
  const dueAt = snoozeDueAt(now, amount, unit);
  if (row.leadId) await markLeadFollowUpAlertsRead(row.leadId, now);
  await cancelLeadFollowUps(row.leadId);
  await db.insert(leadFollowUpQueue).values({
    tenantId: DEFAULT_TENANT_ID,
    leadId: row.leadId,
    templateId: row.templateId,
    stepId: row.stepId,
    method: row.method,
    message: row.message,
    remindVia: row.remindVia,
    dueAt,
    status: "queued",
    activityId: row.activityId,
    createdAt: now,
    updatedAt: now,
  });
  return { queued: true, dueAt, leadId: row.leadId };
}

export async function snoozeLeadFollowUpByActivity(
  activityId: string,
  amount: number,
  unit: SnoozeDelayUnit,
  now = new Date(),
): Promise<{ queued: boolean; dueAt: Date | null; leadId: string | null }> {
  const [row] = await db
    .select()
    .from(leadFollowUpQueue)
    .where(and(eq(leadFollowUpQueue.tenantId, DEFAULT_TENANT_ID), eq(leadFollowUpQueue.activityId, activityId)));
  if (!row) return { queued: false, dueAt: null, leadId: null };
  if (row.alertId) return snoozeLeadFollowUpAlert(row.alertId, amount, unit, now);
  return snoozeLeadFollowUpByQueue(row.id, amount, unit, now);
}

export function followUpDueSummary(count: number): string {
  if (count === 1) return "1 follow-up due";
  return `${count} follow-ups due`;
}

export function templateTriggerLabel(status: string): string {
  return leadStatusLabel(status);
}
