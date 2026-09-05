import { and, eq, inArray } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { activities, activityLogs, alerts, automationRuns, guidedAutomations } from "@/lib/db/schema";
import { activityLogBody, hasRelatedRecord, type RelatedRecordIds } from "@/lib/lifecycle/activity";
import { DESK_AS_OF } from "@/lib/home/as-of";
import { normalizeVisibility, planPlaybookFire, type PlannedPlaybookFire } from "./engine";
import type { PlaybookVisibility } from "./types";

export type FirePlaybookInput = {
  playbookId: string;
  related: RelatedRecordIds;
  assigneeName: string;
  alertUserId: string | null;
  audience?: PlaybookVisibility;
  summary?: string;
  ids?: { activityId?: string; alertId?: string; runId?: string };
  firedAt?: Date;
};

export type FirePlaybookResult = {
  emailed: false;
  planned: PlannedPlaybookFire;
  activityId: string | null;
  alertId: string | null;
  runId: string;
};

function primaryEntity(related: RelatedRecordIds): { entityType: string | null; entityId: string | null } {
  if (related.policyId) return { entityType: "policy", entityId: related.policyId };
  if (related.dealId) return { entityType: "deal", entityId: related.dealId };
  if (related.contactId) return { entityType: "contact", entityId: related.contactId };
  if (related.accountId) return { entityType: "account", entityId: related.accountId };
  if (related.leadId) return { entityType: "lead", entityId: related.leadId };
  return { entityType: "automation", entityId: null };
}

export async function firePlaybook(input: FirePlaybookInput): Promise<FirePlaybookResult> {
  const [playbook] = await db
    .select()
    .from(guidedAutomations)
    .where(
      and(eq(guidedAutomations.tenantId, DEFAULT_TENANT_ID), eq(guidedAutomations.id, input.playbookId)),
    );
  if (!playbook) throw new Error("Playbook not found.");
  if (!playbook.enabled) throw new Error("Playbook is off.");

  const planned = planPlaybookFire({
    name: playbook.name,
    actionKind: playbook.actionKind,
    actionValue: playbook.actionValue ?? playbook.name,
    visibility: playbook.visibility,
  });
  const audience = input.audience ?? normalizeVisibility(playbook.visibility);
  const related = input.related;
  const entity = primaryEntity(related);
  const firedAt = input.firedAt ?? new Date();

  let activityId: string | null = null;
  if (planned.createTask) {
    if (!hasRelatedRecord(related) && !related.dealId) {
      throw new Error("Playbook task needs a Contact, Policy, Business, Lead, or Deal.");
    }
    const [activity] = await db
      .insert(activities)
      .values({
        id: input.ids?.activityId,
        tenantId: DEFAULT_TENANT_ID,
        kind: "task",
        title: planned.taskTitle,
        notes: `In-desk playbook · ${playbook.name}. Nothing emailed.`,
        status: "open",
        dueAt: new Date(DESK_AS_OF.getTime() + 7 * 24 * 60 * 60 * 1000),
        startAt: firedAt,
        assignee: input.assigneeName,
        contactId: related.contactId ?? null,
        accountId: related.accountId ?? null,
        policyId: related.policyId ?? null,
        dealId: related.dealId ?? null,
        leadId: related.leadId ?? null,
      })
      .onConflictDoNothing()
      .returning();
    if (activity) {
      activityId = activity.id;
      await db.insert(activityLogs).values({
        tenantId: DEFAULT_TENANT_ID,
        activityId: activity.id,
        kind: "task",
        eventType: "created",
        body: activityLogBody("task", "created", planned.taskTitle),
        contactId: related.contactId ?? null,
        accountId: related.accountId ?? null,
        policyId: related.policyId ?? null,
        dealId: related.dealId ?? null,
        leadId: related.leadId ?? null,
      });
    } else if (input.ids?.activityId) {
      activityId = input.ids.activityId;
    }
  }

  let alertId: string | null = null;
  if (planned.createAlert) {
    const [alert] = await db
      .insert(alerts)
      .values({
        id: input.ids?.alertId,
        tenantId: DEFAULT_TENANT_ID,
        kind: planned.alertKind,
        title: planned.alertTitle,
        body: planned.alertBody,
        severity: "info",
        entityType: entity.entityType,
        entityId: entity.entityId,
        userId: input.alertUserId,
        recipientUserId: input.alertUserId,
      })
      .onConflictDoNothing()
      .returning();
    if (alert) {
      alertId = alert.id;
    } else if (input.ids?.alertId) {
      alertId = input.ids.alertId;
    }
  }

  const [run] = await db
    .insert(automationRuns)
    .values({
      id: input.ids?.runId,
      tenantId: DEFAULT_TENANT_ID,
      automationId: playbook.id,
      firedAt,
      triggerKind: playbook.triggerKind,
      actionKind: playbook.actionKind,
      createdTask: Boolean(activityId),
      createdAlert: Boolean(alertId),
      activityId,
      alertId,
      entityType: entity.entityType,
      entityId: entity.entityId,
      audience,
      summary: input.summary ?? planned.alertBody,
    })
    .onConflictDoNothing()
    .returning();

  return {
    emailed: false,
    planned,
    activityId,
    alertId,
    runId: run?.id ?? input.ids?.runId ?? "",
  };
}

export async function deleteSeededPlaybookFires(ids: {
  runIds: string[];
  activityIds: string[];
  alertIds: string[];
}) {
  if (ids.runIds.length) {
    await db.delete(automationRuns).where(inArray(automationRuns.id, ids.runIds));
  }
  if (ids.activityIds.length) {
    await db.delete(activityLogs).where(inArray(activityLogs.activityId, ids.activityIds));
    await db.delete(activities).where(inArray(activities.id, ids.activityIds));
  }
  if (ids.alertIds.length) {
    await db.delete(alerts).where(inArray(alerts.id, ids.alertIds));
  }
}
