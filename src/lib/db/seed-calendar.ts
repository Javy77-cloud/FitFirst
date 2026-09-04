import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  CAL_ELENA_EMAIL_ID,
  CAL_ELENA_FOLLOW_CALL_ID,
  CAL_HARBOR_MEETING_ID,
  ELENA_CALL_ID,
  ELENA_CONTACT_ID,
  ELENA_DEAL_ID,
  ELENA_MEETING_ID,
  ELENA_POLICY_ID,
  ELENA_TASK_ID,
  HARBOR_ACCOUNT_ID,
  HARBOR_CONTACT_ID,
  HARBOR_DEAL_ID,
  HARBOR_POLICY_ID,
} from "@/lib/fixtures/ids";
import { db } from "./index";
import { activities, activityLogs } from "./schema";

async function upsertTimed(input: {
  id: string;
  kind: string;
  title: string;
  notes: string;
  status: string;
  startAt: Date;
  endAt?: Date | null;
  dueAt?: Date | null;
  durationSeconds?: number | null;
  outcome?: string | null;
  direction?: string | null;
  phoneNumber?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  assignee?: string | null;
}) {
  await db
    .insert(activities)
    .values({
      id: input.id,
      tenantId: DEFAULT_TENANT_ID,
      kind: input.kind,
      title: input.title,
      notes: input.notes,
      status: input.status,
      startAt: input.startAt,
      endAt: input.endAt ?? null,
      dueAt: input.dueAt ?? input.startAt,
      durationSeconds: input.durationSeconds ?? null,
      outcome: input.outcome ?? null,
      direction: input.direction ?? null,
      phoneNumber: input.phoneNumber ?? null,
      contactId: input.contactId ?? null,
      accountId: input.accountId ?? null,
      policyId: input.policyId ?? null,
      dealId: input.dealId ?? null,
      assignee: input.assignee ?? "Javy Rivera",
    })
    .onConflictDoUpdate({
      target: activities.id,
      set: {
        title: input.title,
        notes: input.notes,
        status: input.status,
        startAt: input.startAt,
        endAt: input.endAt ?? null,
        dueAt: input.dueAt ?? input.startAt,
        durationSeconds: input.durationSeconds ?? null,
        outcome: input.outcome ?? null,
        direction: input.direction ?? null,
        phoneNumber: input.phoneNumber ?? null,
        updatedAt: new Date(),
      },
    });
}

/** Timed desk items for month / week / day. Does not touch Ana. */
export async function seedCalendarDesk() {
  await db
    .update(activities)
    .set({
      startAt: new Date("2026-09-02T14:00:00.000Z"),
      endAt: new Date("2026-09-02T14:30:00.000Z"),
      updatedAt: new Date(),
    })
    .where(eq(activities.id, ELENA_MEETING_ID));

  await db
    .update(activities)
    .set({
      startAt: new Date("2026-09-01T15:20:00.000Z"),
      endAt: new Date("2026-09-01T15:32:00.000Z"),
      durationSeconds: 12 * 60,
      outcome: "connected",
      direction: "outbound",
      phoneNumber: "(321) 555-0188",
      updatedAt: new Date(),
    })
    .where(eq(activities.id, ELENA_CALL_ID));

  await db
    .update(activities)
    .set({
      startAt: new Date("2026-10-01T15:00:00.000Z"),
      dueAt: new Date("2026-10-01T15:00:00.000Z"),
      updatedAt: new Date(),
    })
    .where(eq(activities.id, ELENA_TASK_ID));

  await upsertTimed({
    id: CAL_HARBOR_MEETING_ID,
    kind: "meeting",
    title: "Harbor Key GL review",
    notes: "In-desk meeting on the commercial Closed Won. Not a Google sync.",
    status: "open",
    startAt: new Date("2026-09-04T15:00:00.000Z"),
    endAt: new Date("2026-09-04T16:00:00.000Z"),
    contactId: HARBOR_CONTACT_ID,
    accountId: HARBOR_ACCOUNT_ID,
    policyId: HARBOR_POLICY_ID,
    dealId: HARBOR_DEAL_ID,
    assignee: "Javy Rivera",
  });

  await upsertTimed({
    id: CAL_ELENA_FOLLOW_CALL_ID,
    kind: "call",
    title: "Elena 30-day check-in call",
    notes: "Scheduled follow-up. Log duration and outcome when it happens.",
    status: "open",
    startAt: new Date("2026-09-03T18:00:00.000Z"),
    endAt: new Date("2026-09-03T18:15:00.000Z"),
    contactId: ELENA_CONTACT_ID,
    policyId: ELENA_POLICY_ID,
    dealId: ELENA_DEAL_ID,
    phoneNumber: "(321) 555-0188",
    direction: "outbound",
    assignee: "Maya Chen",
  });

  await upsertTimed({
    id: CAL_ELENA_EMAIL_ID,
    kind: "email",
    title: "Send HO3 dec recap to Elena",
    notes: "Desk email log — nothing sends.",
    status: "open",
    startAt: new Date("2026-09-03T13:00:00.000Z"),
    dueAt: new Date("2026-09-03T13:00:00.000Z"),
    contactId: ELENA_CONTACT_ID,
    policyId: ELENA_POLICY_ID,
    dealId: ELENA_DEAL_ID,
    assignee: "Maya Chen",
  });

  await db.delete(activityLogs).where(eq(activityLogs.activityId, CAL_HARBOR_MEETING_ID));
  await db.delete(activityLogs).where(eq(activityLogs.activityId, CAL_ELENA_FOLLOW_CALL_ID));
  await db.delete(activityLogs).where(eq(activityLogs.activityId, CAL_ELENA_EMAIL_ID));
  await db.insert(activityLogs).values([
    {
      tenantId: DEFAULT_TENANT_ID,
      activityId: CAL_HARBOR_MEETING_ID,
      kind: "meeting",
      eventType: "created",
      body: "Meeting created: Harbor Key GL review",
      contactId: HARBOR_CONTACT_ID,
      accountId: HARBOR_ACCOUNT_ID,
      policyId: HARBOR_POLICY_ID,
      dealId: HARBOR_DEAL_ID,
      occurredAt: new Date("2026-09-02T16:00:00.000Z"),
    },
    {
      tenantId: DEFAULT_TENANT_ID,
      activityId: CAL_ELENA_FOLLOW_CALL_ID,
      kind: "call",
      eventType: "created",
      body: "Call created: Elena 30-day check-in call",
      contactId: ELENA_CONTACT_ID,
      policyId: ELENA_POLICY_ID,
      dealId: ELENA_DEAL_ID,
      occurredAt: new Date("2026-09-02T16:05:00.000Z"),
    },
    {
      tenantId: DEFAULT_TENANT_ID,
      activityId: CAL_ELENA_EMAIL_ID,
      kind: "email",
      eventType: "created",
      body: "Email created: Send HO3 dec recap to Elena",
      contactId: ELENA_CONTACT_ID,
      policyId: ELENA_POLICY_ID,
      dealId: ELENA_DEAL_ID,
      occurredAt: new Date("2026-09-02T16:10:00.000Z"),
    },
  ]);
}
