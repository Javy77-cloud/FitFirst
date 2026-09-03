import { and, eq, inArray } from "drizzle-orm";
import { db } from "./index";
import {
  alerts,
  clientHistory,
  policyWorkFlags,
  policyWorkItems,
  policyWorkNotes,
  reviewTasks,
  users,
} from "./schema";
import {
  ADMIN_USER_ID,
  AGENT_USER_ID,
  DEMO_CONTACT_ID,
  DEMO_DEAL_ID,
  DEMO_POLICY_ID,
  DEMO_POLICY_NUMBER,
  DEMO_WORK_ALERT_ID,
  DEMO_WORK_FLAG_ID,
  DEMO_WORK_ITEM_ID,
  DEMO_WORK_NOTE_ID,
  DEMO_WORK_TASK_ID,
  TENANT_ID,
} from "../fixtures/ids";
import { WORK_PING_KIND, WORK_REMINDER_KIND } from "../work-queue/types";

/** Admin + agent users (same IDs as roles). Demo work sits on Ruiz Active, never Ana. */
export async function seedWorkQueue() {
  await db
    .insert(users)
    .values({
      id: ADMIN_USER_ID,
      tenantId: TENANT_ID,
      name: "Javy Rivera",
      email: "javy@fitfirst.local",
      role: "admin",
      active: true,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        name: "Javy Rivera",
        email: "javy@fitfirst.local",
        role: "admin",
        active: true,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(users)
    .values({
      id: AGENT_USER_ID,
      tenantId: TENANT_ID,
      name: "Maya Chen",
      email: "maya@fitfirst.local",
      role: "agent",
      active: true,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        name: "Maya Chen",
        email: "maya@fitfirst.local",
        role: "agent",
        active: true,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(policyWorkItems)
    .values({
      id: DEMO_WORK_ITEM_ID,
      tenantId: TENANT_ID,
      policyId: DEMO_POLICY_ID,
      assigneeId: ADMIN_USER_ID,
      workStatus: "waiting_on_docs",
    })
    .onConflictDoUpdate({
      target: policyWorkItems.id,
      set: {
        policyId: DEMO_POLICY_ID,
        assigneeId: ADMIN_USER_ID,
        workStatus: "waiting_on_docs",
        updatedAt: new Date(),
      },
    });

  await db
    .delete(policyWorkFlags)
    .where(eq(policyWorkFlags.workItemId, DEMO_WORK_ITEM_ID));
  await db.insert(policyWorkFlags).values({
    id: DEMO_WORK_FLAG_ID,
    tenantId: TENANT_ID,
    workItemId: DEMO_WORK_ITEM_ID,
    policyId: DEMO_POLICY_ID,
    flag: "carrier_requested_info",
    createdBy: ADMIN_USER_ID,
    createdAt: new Date("2026-09-03T14:00:00.000Z"),
  });

  await db
    .delete(policyWorkNotes)
    .where(eq(policyWorkNotes.workItemId, DEMO_WORK_ITEM_ID));
  await db.insert(policyWorkNotes).values({
    id: DEMO_WORK_NOTE_ID,
    tenantId: TENANT_ID,
    workItemId: DEMO_WORK_ITEM_ID,
    authorId: ADMIN_USER_ID,
    body: "American Integrity asked for an updated wind mit and roof photos before they will process the endorsement. Keep this on the work queue — in-desk ping only, do not email the broker.",
    createdAt: new Date("2026-09-03T14:05:00.000Z"),
  });

  await db
    .delete(reviewTasks)
    .where(
      and(
        eq(reviewTasks.tenantId, TENANT_ID),
        inArray(reviewTasks.id, [DEMO_WORK_TASK_ID]),
      ),
    );
  await db
    .delete(reviewTasks)
    .where(
      and(
        eq(reviewTasks.tenantId, TENANT_ID),
        eq(reviewTasks.kind, WORK_REMINDER_KIND),
        eq(reviewTasks.policyId, DEMO_POLICY_ID),
      ),
    );
  await db.insert(reviewTasks).values({
    id: DEMO_WORK_TASK_ID,
    tenantId: TENANT_ID,
    contactId: DEMO_CONTACT_ID,
    policyId: DEMO_POLICY_ID,
    dealId: DEMO_DEAL_ID,
    kind: WORK_REMINDER_KIND,
    title: `Carrier needs docs · ${DEMO_POLICY_NUMBER}`,
    dueDate: new Date("2026-09-10T16:00:00.000Z"),
    status: "open",
    workItemId: DEMO_WORK_ITEM_ID,
  });

  await db.delete(alerts).where(eq(alerts.id, DEMO_WORK_ALERT_ID));
  await db.insert(alerts).values({
    id: DEMO_WORK_ALERT_ID,
    tenantId: TENANT_ID,
    kind: WORK_PING_KIND,
    title: `Work ping · ${DEMO_POLICY_NUMBER}`,
    body: "Carrier needs an updated wind mit and roof photos on the Ruiz rewrite. In-desk Task due 2026-09-10. No broker email.",
    severity: "warning",
    entityType: "policy",
    entityId: DEMO_POLICY_ID,
  });

  await db
    .delete(clientHistory)
    .where(
      and(
        eq(clientHistory.contactId, DEMO_CONTACT_ID),
        eq(clientHistory.eventType, "work_ping"),
      ),
    );
  await db.insert(clientHistory).values({
    tenantId: TENANT_ID,
    contactId: DEMO_CONTACT_ID,
    dealId: DEMO_DEAL_ID,
    policyId: DEMO_POLICY_ID,
    eventType: "work_ping",
    body: `In-app Task for ${DEMO_POLICY_NUMBER}: carrier needs docs (wind mit + roof photos). Assigned to Javy Rivera.`,
    occurredAt: new Date("2026-09-03T14:06:00.000Z"),
  });
}
