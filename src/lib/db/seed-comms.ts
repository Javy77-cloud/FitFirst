import { eq } from "drizzle-orm";
import { db } from "./index";
import { activities, activityLogs, alerts, recordAsks } from "./schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  ADMIN_USER_ID,
  AGENT_USER_ID,
  ELENA_ASK_ACTIVITY_ID,
  ELENA_ASK_ALERT_ID,
  ELENA_ASK_BODY,
  ELENA_ASK_ID,
  ELENA_CONTACT_ID,
  ELENA_DEAL_ID,
  ELENA_POLICY_ID,
  ELENA_WORK_ALERT_ID,
} from "@/lib/fixtures/ids";
import { activityLogBody } from "@/lib/lifecycle/activity";

/** Seeded Javy → Maya ask on HO3-ELENA-2026 plus a work-queue in-app ping. */
export async function seedCommsAsks() {
  await db
    .insert(recordAsks)
    .values({
      id: ELENA_ASK_ID,
      tenantId: DEFAULT_TENANT_ID,
      entityType: "policy",
      entityId: ELENA_POLICY_ID,
      authorId: ADMIN_USER_ID,
      assigneeId: AGENT_USER_ID,
      kind: "status",
      body: ELENA_ASK_BODY,
      status: "open",
    })
    .onConflictDoUpdate({
      target: recordAsks.id,
      set: {
        body: ELENA_ASK_BODY,
        assigneeId: AGENT_USER_ID,
        authorId: ADMIN_USER_ID,
        entityType: "policy",
        entityId: ELENA_POLICY_ID,
        status: "open",
        resolvedBy: null,
        resolvedAt: null,
      },
    });

  await db.delete(activityLogs).where(eq(activityLogs.activityId, ELENA_ASK_ACTIVITY_ID));
  await db.delete(activities).where(eq(activities.id, ELENA_ASK_ACTIVITY_ID));
  await db.insert(activities).values({
    id: ELENA_ASK_ACTIVITY_ID,
    tenantId: DEFAULT_TENANT_ID,
    kind: "task",
    title: "Ask · Maya Chen",
    notes: `@Maya Chen: ${ELENA_ASK_BODY}`,
    status: "open",
    assignee: "Maya Chen",
    contactId: ELENA_CONTACT_ID,
    dealId: ELENA_DEAL_ID,
    policyId: ELENA_POLICY_ID,
  });
  await db.insert(activityLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    activityId: ELENA_ASK_ACTIVITY_ID,
    kind: "task",
    eventType: "logged",
    body: activityLogBody("task", "logged", `Ask · Maya Chen: ${ELENA_ASK_BODY}`),
    contactId: ELENA_CONTACT_ID,
    dealId: ELENA_DEAL_ID,
    policyId: ELENA_POLICY_ID,
    occurredAt: new Date("2026-09-03T15:00:00.000Z"),
  });

  await db.delete(alerts).where(eq(alerts.id, ELENA_ASK_ALERT_ID));
  await db.insert(alerts).values({
    id: ELENA_ASK_ALERT_ID,
    tenantId: DEFAULT_TENANT_ID,
    kind: "record_ask",
    title: "Javy Rivera asked Maya Chen for status",
    body: ELENA_ASK_BODY,
    severity: "info",
    entityType: "policy",
    entityId: ELENA_POLICY_ID,
  });

  await db.delete(alerts).where(eq(alerts.id, ELENA_WORK_ALERT_ID));
  await db.insert(alerts).values({
    id: ELENA_WORK_ALERT_ID,
    tenantId: DEFAULT_TENANT_ID,
    kind: "work_ping",
    title: "Work ping · HO3-ELENA-2026",
    body: "In-desk reminder on the Melbourne HO3 file. Queue ping only — no broker email.",
    severity: "warning",
    entityType: "policy",
    entityId: ELENA_POLICY_ID,
  });
}
