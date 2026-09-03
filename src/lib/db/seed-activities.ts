// @ts-nocheck — leftover ops seed; desk does not call this (no businesses / attendees tables).
import { and, eq, isNull } from "drizzle-orm";
import {
  ACTIVITY_CALL_ID,
  ACTIVITY_MEETING_ID,
  ACTIVITY_NOTE_ID,
  ACTIVITY_RENEWAL_ID,
  ACTIVITY_TASK_ID,
  ACTIVITY_TODAY_CALL_ID,
  ADMIN_EMAIL,
  ADMIN_NAME,
  ADMIN_USER_ID,
  AGENT_EMAIL,
  AGENT_NAME,
  AGENT_USER_ID,
  BUSINESS_HARBOR_ID,
  CARRIER_IDS,
  CONTACT_ID,
  DEAL_ID,
  PRIOR_POLICY_ID,
  RISK_ID,
  TENANT_ID,
} from "../fixtures/ids";
import { db } from "./index";
import {
  activities,
  activityEvents,
  activityAttendees,
  businesses,
  clientHistory,
  contacts,
  policies,
  users,
} from "./schema";

function startOfDay(base: Date) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate());
}

async function writeHistory(input: {
  activityId: string;
  contactId: string | null;
  policyId?: string | null;
  dealId?: string | null;
  businessId?: string | null;
  eventType: string;
  body: string;
  occurredAt: Date;
}) {
  if (!input.contactId) return;
  await db.insert(clientHistory).values({
    tenantId: TENANT_ID,
    contactId: input.contactId,
    policyId: input.policyId ?? null,
    dealId: input.dealId ?? null,
    businessId: input.businessId ?? null,
    activityId: input.activityId,
    eventType: input.eventType,
    body: input.body,
    occurredAt: input.occurredAt,
  });
}

async function writeEvent(input: {
  activityId: string;
  eventType: string;
  body: string;
  occurredAt: Date;
  actorId?: string;
  actorName?: string;
  payload?: Record<string, unknown>;
}) {
  await db.insert(activityEvents).values({
    tenantId: TENANT_ID,
    activityId: input.activityId,
    eventType: input.eventType,
    body: input.body,
    actorId: input.actorId ?? ADMIN_USER_ID,
    actorName: input.actorName ?? ADMIN_NAME,
    payload: input.payload ?? {},
    occurredAt: input.occurredAt,
  });
}

export async function seedDeskUsers() {
  await db
    .insert(users)
    .values({
      id: ADMIN_USER_ID,
      tenantId: TENANT_ID,
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      role: "admin",
      active: true,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { name: ADMIN_NAME, email: ADMIN_EMAIL, role: "admin", active: true, updatedAt: new Date() },
    });
  await db
    .insert(users)
    .values({
      id: AGENT_USER_ID,
      tenantId: TENANT_ID,
      name: AGENT_NAME,
      email: AGENT_EMAIL,
      role: "agent",
      active: true,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { name: AGENT_NAME, email: AGENT_EMAIL, role: "agent", active: true, updatedAt: new Date() },
    });
}

export async function seedActivities() {
  await seedDeskUsers();

  await db
    .update(contacts)
    .set({ phone: "(321) 555-0109", email: "ana.dib@example.com", updatedAt: new Date() })
    .where(and(eq(contacts.id, CONTACT_ID), isNull(contacts.phone)));

  await db
    .insert(policies)
    .values({
      id: PRIOR_POLICY_ID,
      tenantId: TENANT_ID,
      contactId: CONTACT_ID,
      dealId: null,
      riskId: RISK_ID,
      carrierId: CARRIER_IDS.americanIntegrity,
      policyNumber: "HO-DIB-2025-1098",
      lineOfBusiness: "HO",
      status: "inactive",
      effectiveDate: new Date("2025-08-01T04:00:00.000Z"),
      expirationDate: new Date("2026-08-01T04:00:00.000Z"),
      premium: "2140.00",
      coverageA: 321000,
    })
    .onConflictDoUpdate({
      target: policies.id,
      set: {
        policyNumber: "HO-DIB-2025-1098",
        status: "inactive",
        coverageA: 321000,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(businesses)
    .values({
      id: BUSINESS_HARBOR_ID,
      tenantId: TENANT_ID,
      name: "Harbor Plaza LLC",
      phone: "(321) 555-0188",
      city: "Melbourne",
      state: "FL",
      notes: "Commercial demo only. Not part of the Ana HO3 shop.",
      primaryContactId: CONTACT_ID,
    })
    .onConflictDoUpdate({
      target: businesses.id,
      set: { name: "Harbor Plaza LLC", updatedAt: new Date() },
    });

  const now = new Date();
  const today = startOfDay(now);
  const laterToday = new Date(today);
  laterToday.setHours(14, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const renewalDue = new Date(today);
  renewalDue.setDate(renewalDue.getDate() + 42);
  renewalDue.setHours(9, 0, 0, 0);

  const rows = [
    {
      id: ACTIVITY_TASK_ID,
      kind: "task",
      title: "Follow the 2026-09-02 HO3 shop",
      notes: "Ana's shop is filter-first: 10 skip / 0 green at $321k. No policy from those quotes.",
      status: "incomplete",
      pipelineStage: "todo",
      priority: "high",
      dueAt: new Date("2026-09-04T16:00:00.000Z"),
      scheduledAt: null as Date | null,
      startAt: null as Date | null,
      endAt: null as Date | null,
      contactId: CONTACT_ID,
      dealId: DEAL_ID,
      policyId: null as string | null,
      reminderMinutes: 60,
      phoneNumber: null as string | null,
      direction: null as string | null,
      location: null as string | null,
    },
    {
      id: ACTIVITY_MEETING_ID,
      kind: "meeting",
      title: "Dib shop recap",
      notes: "Walk Markets + Compare. No policy from these quotes.",
      status: "incomplete",
      pipelineStage: "todo",
      priority: "normal",
      dueAt: new Date("2026-09-03T15:00:00.000Z"),
      scheduledAt: new Date("2026-09-03T15:00:00.000Z"),
      startAt: new Date("2026-09-03T15:00:00.000Z"),
      endAt: new Date("2026-09-03T15:30:00.000Z"),
      contactId: CONTACT_ID,
      dealId: DEAL_ID,
      policyId: null,
      reminderMinutes: 15,
      phoneNumber: null,
      direction: null,
      location: "Video — desk softphone",
    },
    {
      id: ACTIVITY_TODAY_CALL_ID,
      kind: "call",
      title: "Hey, make this call — Ana Dib",
      notes: "Due today. Use the desk softphone (computer mic).",
      status: "incomplete",
      pipelineStage: "todo",
      priority: "urgent",
      dueAt: laterToday,
      scheduledAt: laterToday,
      startAt: laterToday,
      endAt: null,
      contactId: CONTACT_ID,
      dealId: DEAL_ID,
      policyId: PRIOR_POLICY_ID,
      reminderMinutes: 0,
      phoneNumber: "(321) 555-0109",
      direction: "outbound",
      location: null,
    },
    {
      id: ACTIVITY_CALL_ID,
      kind: "call",
      title: "Renewal check-in tomorrow",
      notes: "Assigned to Ana + prior HO. Click the phone when it comes due.",
      status: "incomplete",
      pipelineStage: "todo",
      priority: "high",
      dueAt: tomorrow,
      scheduledAt: tomorrow,
      startAt: tomorrow,
      endAt: null,
      contactId: CONTACT_ID,
      dealId: null,
      policyId: PRIOR_POLICY_ID,
      reminderMinutes: 24 * 60,
      phoneNumber: "(321) 555-0109",
      direction: "outbound",
      location: null,
    },
    {
      id: ACTIVITY_RENEWAL_ID,
      kind: "task",
      title: "HO-DIB-2025-1098 renewal worksheet",
      notes: "Policy-assigned. Prior-term HO — not created from the 2026-09-02 shop quotes.",
      status: "in_progress",
      pipelineStage: "doing",
      priority: "high",
      dueAt: renewalDue,
      scheduledAt: null,
      startAt: null,
      endAt: null,
      contactId: CONTACT_ID,
      dealId: null,
      policyId: PRIOR_POLICY_ID,
      reminderMinutes: 1440,
      phoneNumber: null,
      direction: null,
      location: null,
    },
    {
      id: ACTIVITY_NOTE_ID,
      kind: "note",
      title: "Named insured note",
      notes: "Portal sometimes dropped George on the quote. Logged on the contact.",
      status: "completed",
      pipelineStage: "done",
      priority: "normal",
      dueAt: new Date("2026-09-02T16:30:00.000Z"),
      scheduledAt: null,
      startAt: new Date("2026-09-02T16:30:00.000Z"),
      endAt: new Date("2026-09-02T16:32:00.000Z"),
      contactId: CONTACT_ID,
      dealId: DEAL_ID,
      policyId: null,
      reminderMinutes: null,
      phoneNumber: null,
      direction: null,
      location: null,
    },
  ] as const;

  for (const row of rows) {
    await db
      .insert(activities)
      .values({
        id: row.id,
        tenantId: TENANT_ID,
        kind: row.kind,
        title: row.title,
        notes: row.notes,
        status: row.status,
        pipelineStage: row.pipelineStage,
        priority: row.priority,
        dueAt: row.dueAt,
        scheduledAt: row.scheduledAt,
        startAt: row.startAt,
        endAt: row.endAt,
        contactId: row.contactId,
        dealId: row.dealId,
        policyId: row.policyId,
        reminderMinutes: row.reminderMinutes,
        phoneNumber: row.phoneNumber,
        direction: row.direction,
        location: row.location,
        assignee: ADMIN_NAME,
        assigneeId: ADMIN_USER_ID,
        completedAt: row.status === "completed" ? row.endAt : null,
        completedBy: row.status === "completed" ? ADMIN_USER_ID : null,
        durationSeconds: row.status === "completed" ? 120 : null,
      })
      .onConflictDoUpdate({
        target: activities.id,
        set: {
          title: row.title,
          notes: row.notes,
          status: row.status,
          pipelineStage: row.pipelineStage,
          priority: row.priority,
          dueAt: row.dueAt,
          scheduledAt: row.scheduledAt,
          startAt: row.startAt,
          policyId: row.policyId,
          contactId: row.contactId,
          reminderMinutes: row.reminderMinutes,
          phoneNumber: row.phoneNumber,
          direction: row.direction,
          assignee: ADMIN_NAME,
          assigneeId: ADMIN_USER_ID,
          updatedAt: new Date(),
        },
      });
  }

  await db.delete(activityEvents).where(eq(activityEvents.tenantId, TENANT_ID));
  await db.delete(activityAttendees).where(eq(activityAttendees.tenantId, TENANT_ID));
  await db.delete(clientHistory).where(eq(clientHistory.tenantId, TENANT_ID));

  await writeEvent({
    activityId: ACTIVITY_TASK_ID,
    eventType: "created",
    body: "Task created on Ana Dib and the Palm Bay HO3 shop.",
    occurredAt: new Date("2026-09-02T16:10:00.000Z"),
  });
  await writeEvent({
    activityId: ACTIVITY_MEETING_ID,
    eventType: "scheduled",
    body: "Meeting scheduled for the shop recap.",
    occurredAt: new Date("2026-09-02T16:15:00.000Z"),
  });
  await writeEvent({
    activityId: ACTIVITY_TODAY_CALL_ID,
    eventType: "scheduled",
    body: "Outbound call assigned to Ana + prior HO HO-DIB-2025-1098.",
    occurredAt: now,
  });
  await writeEvent({
    activityId: ACTIVITY_CALL_ID,
    eventType: "scheduled",
    body: "Call assigned to Ana Dib and policy HO-DIB-2025-1098 for tomorrow.",
    occurredAt: now,
  });
  await writeEvent({
    activityId: ACTIVITY_RENEWAL_ID,
    eventType: "created",
    body: "Renewal task assigned to policy HO-DIB-2025-1098 (policy-first).",
    occurredAt: now,
  });
  await writeEvent({
    activityId: ACTIVITY_NOTE_ID,
    eventType: "completed",
    body: "Note logged on Ana. Portal sometimes dropped George.",
    occurredAt: new Date("2026-09-02T16:32:00.000Z"),
  });

  await db.insert(activityAttendees).values({
    tenantId: TENANT_ID,
    activityId: ACTIVITY_MEETING_ID,
    contactId: CONTACT_ID,
  });

  await writeHistory({
    activityId: ACTIVITY_TASK_ID,
    contactId: CONTACT_ID,
    dealId: DEAL_ID,
    eventType: "task",
    body: "Task: Follow the 2026-09-02 HO3 shop. Assigned to Javy Rivera.",
    occurredAt: new Date("2026-09-02T16:10:00.000Z"),
  });
  await writeHistory({
    activityId: ACTIVITY_MEETING_ID,
    contactId: CONTACT_ID,
    dealId: DEAL_ID,
    eventType: "meeting",
    body: "Meeting scheduled: Dib shop recap.",
    occurredAt: new Date("2026-09-02T16:15:00.000Z"),
  });
  await writeHistory({
    activityId: ACTIVITY_TODAY_CALL_ID,
    contactId: CONTACT_ID,
    policyId: PRIOR_POLICY_ID,
    dealId: DEAL_ID,
    eventType: "call",
    body: "Call due today: Hey, make this call — Ana Dib · HO-DIB-2025-1098.",
    occurredAt: now,
  });
  await writeHistory({
    activityId: ACTIVITY_CALL_ID,
    contactId: CONTACT_ID,
    policyId: PRIOR_POLICY_ID,
    eventType: "call",
    body: "Call scheduled tomorrow on Ana + HO-DIB-2025-1098.",
    occurredAt: now,
  });
  await writeHistory({
    activityId: ACTIVITY_RENEWAL_ID,
    contactId: CONTACT_ID,
    policyId: PRIOR_POLICY_ID,
    eventType: "task",
    body: "Policy-assigned renewal task on HO-DIB-2025-1098.",
    occurredAt: now,
  });
  await writeHistory({
    activityId: ACTIVITY_NOTE_ID,
    contactId: CONTACT_ID,
    dealId: DEAL_ID,
    eventType: "note",
    body: "Note: Portal sometimes dropped George on the quote.",
    occurredAt: new Date("2026-09-02T16:32:00.000Z"),
  });
}
