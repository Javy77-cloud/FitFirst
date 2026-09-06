import { and, eq, inArray, lte } from "drizzle-orm";
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
  dueAtFromStep,
  followUpMethodToActivityKind,
  isFollowUpDelayUnit,
  isFollowUpMethod,
  isSnoozeDelayUnit,
  normalizeRemindVia,
  snoozeDueAt,
  outboundStubLabel,
  PAID_API_WALL_REASON,
  pickTemplateForLead,
  remindViaLabel,
  shouldEmailAgentReminder,
  shouldHoldFollowUpUntilFirstContact,
  type FollowUpMethod,
  type RemindViaChannel,
  type SnoozeDelayUnit,
} from "@/lib/leads/follow-up-templates";
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

export async function fireLeadFollowUpForStatus(leadId: string, status: string, now = new Date()) {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, leadId)));
  if (!lead) return { scheduled: 0 };
  const normalized = normalizeLeadStatus(status);
  if (normalized === "lost" || normalized === "nurture" || normalized === "converted") {
    await cancelLeadFollowUps(leadId);
    return { scheduled: 0 };
  }
  if (shouldHoldFollowUpUntilFirstContact({ status: normalized, firstContactAt: lead.firstContactAt })) {
    await cancelLeadFollowUps(leadId);
    return { scheduled: 0, held: true };
  }
  await cancelLeadFollowUps(leadId);
  const [templates, steps] = await Promise.all([
    db.select().from(leadFollowUpTemplates).where(eq(leadFollowUpTemplates.tenantId, DEFAULT_TENANT_ID)),
    db.select().from(leadFollowUpSteps).where(eq(leadFollowUpSteps.tenantId, DEFAULT_TENANT_ID)),
  ]);
  const picked = pickTemplateForLead(
    templates.map((row) => ({
      id: row.id,
      name: row.name,
      triggerStatus: normalizeLeadStatus(row.triggerStatus),
      enabled: row.enabled,
    })),
    { followUpTemplateId: lead.followUpTemplateId, status: normalized },
  );
  if (!picked) return { scheduled: 0 };
  const templateSteps = steps
    .filter((step) => step.templateId === picked.id)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 4);
  const leadName = `${lead.lastName}, ${lead.firstName}`;
  let scheduled = 0;
  for (const step of templateSteps) {
    if (!isFollowUpMethod(step.method) || !isFollowUpDelayUnit(step.delayUnit)) continue;
    const dueAt = dueAtFromStep(now, step.delayAmount, step.delayUnit);
    const method = step.method;
    const remindVia = normalizeRemindVia(step.remindVia);
    const kind = followUpMethodToActivityKind(method);
    const title = `Follow-up · ${method} · ${leadName}`;
    const notes = [step.message, outboundStubLabel(method), `Remind via ${remindViaLabel(remindVia)}.`]
      .filter(Boolean)
      .join("\n\n");
    let activityId: string | null = null;
    if (remindVia === "task") {
      const written = await writeDeskComms({
        kind: "task",
        title,
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
      templateId: picked.id,
      stepId: step.id,
      method,
      message: step.message,
      remindVia,
      dueAt,
      status: "queued",
      activityId,
    });
    void kind;
    scheduled += 1;
  }
  return { scheduled, templateId: picked.id };
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
    });
    await db
      .update(leadFollowUpQueue)
      .set({
        status: "released",
        releasedAt: now,
        alertId: result.alertId,
        outboundJobId: result.outboundJobId,
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
}): Promise<{ alertId: string | null; outboundJobId: string | null }> {
  const title = followUpNotificationTitle(input.method, input.leadName);
  const body = input.leadName;
  const emailBody = `${input.message || `A ${input.method} follow-up is due.`} Remind via ${remindViaLabel(input.remindVia)}. In-app preferred — nothing emailed Javy. ${outboundStubLabel(input.method)}`;
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
        activityId: input.activityId,
        holdReason: PAID_API_WALL_REASON,
        vendor: "stub",
        scheduledFor: input.dueAt,
      })
      .returning();
    return { alertId: null, outboundJobId: job.id };
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
  return { alertId: alert.id, outboundJobId: null };
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

export function followUpDueSummary(count: number): string {
  if (count === 1) return "1 follow-up due";
  return `${count} follow-ups due`;
}

export function templateTriggerLabel(status: string): string {
  return leadStatusLabel(status);
}
