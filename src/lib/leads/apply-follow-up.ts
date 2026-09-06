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
} from "@/lib/db/schema";
import { writeDeskComms } from "@/lib/desk/write-comms";
import {
  dueAtFromStep,
  followUpMethodToActivityKind,
  isFollowUpDelayUnit,
  isFollowUpMethod,
  outboundStubLabel,
  PAID_API_WALL_REASON,
  pickTemplateForLead,
  type FollowUpMethod,
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
    const kind = followUpMethodToActivityKind(method);
    const title = `Follow-up · ${method} · ${leadName}`;
    const notes = [step.message, outboundStubLabel(method)].filter(Boolean).join("\n\n");
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
    await db.insert(leadFollowUpQueue).values({
      tenantId: DEFAULT_TENANT_ID,
      leadId,
      templateId: picked.id,
      stepId: step.id,
      method,
      message: step.message,
      dueAt,
      status: "queued",
      activityId: written.activity.id,
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
  let released = 0;
  for (const item of due) {
    const lead = byId.get(item.leadId);
    if (!lead) continue;
    const method = (isFollowUpMethod(item.method) ? item.method : "call") as FollowUpMethod;
    const leadName = `${lead.lastName}, ${lead.firstName}`;
    const [alert] = await db
      .insert(alerts)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        kind: "lead_follow_up",
        title: `Follow-up due · ${method} · ${leadName}`,
        body: `${item.message || `A ${method} follow-up is due.`} In-app only — nothing emailed Javy. ${outboundStubLabel(method)}`,
        severity: "warning",
        entityType: "lead",
        entityId: lead.id,
        userId: lead.ownerId,
        recipientUserId: lead.ownerId,
      })
      .returning();
    let outboundJobId: string | null = null;
    if (method === "email" || method === "text") {
      const [job] = await db
        .insert(commsOutboundJobs)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          channel: method === "text" ? "sms" : "email",
          status: "held",
          toAddress: method === "text" ? lead.phone : lead.email,
          subject: method === "email" ? `Follow-up · ${leadName}` : null,
          body: `${item.message || ""}\n\n${outboundStubLabel(method)}`,
          leadId: lead.id,
          activityId: item.activityId,
          holdReason: PAID_API_WALL_REASON,
          vendor: "stub",
          scheduledFor: item.dueAt,
        })
        .returning();
      outboundJobId = job.id;
    }
    await db
      .update(leadFollowUpQueue)
      .set({
        status: "released",
        releasedAt: now,
        alertId: alert.id,
        outboundJobId,
        updatedAt: now,
      })
      .where(eq(leadFollowUpQueue.id, item.id));
    released += 1;
  }
  return { released };
}

export function followUpDueSummary(count: number): string {
  if (count === 1) return "1 follow-up due";
  return `${count} follow-ups due`;
}

export function templateTriggerLabel(status: string): string {
  return leadStatusLabel(status);
}
