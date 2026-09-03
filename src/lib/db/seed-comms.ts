import { eq } from "drizzle-orm";
import { db } from "./index";
import { activities, activityLogs, emailSendJobs, recordAsks } from "./schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  ADMIN_USER_ID,
  AGENT_USER_ID,
  ELENA_CONTACT_ID,
  ELENA_DEAL_ID,
  ELENA_EMAIL_JOB_ID,
  ELENA_POLICY_ID,
  HARBOR_ACCOUNT_ID,
  HARBOR_CONTACT_ID,
  HARBOR_DEAL_ID,
  HARBOR_POLICY_ID,
} from "@/lib/fixtures/ids";
import { commsThreadKey } from "@/lib/desk/comms";

const ELENA_EMAIL_OUT_ID = "44444444-4444-4444-8444-444444444461";
const ELENA_EMAIL_IN_ID = "44444444-4444-4444-8444-444444444462";
const HARBOR_SMS_OUT_ID = "66666666-6666-4666-8666-666666666671";
const HARBOR_SMS_IN_ID = "66666666-6666-4666-8666-666666666672";

async function upsertComms(input: {
  id: string;
  kind: string;
  title: string;
  body: string;
  direction: string;
  eventType: string;
  subject?: string;
  fromAddress?: string;
  toAddress?: string;
  contactId?: string | null;
  accountId?: string | null;
  dealId?: string | null;
  policyId?: string | null;
  occurredAt: Date;
}) {
  const threadKey = commsThreadKey({
    channel: input.kind,
    subject: input.subject,
    related: {
      contactId: input.contactId,
      accountId: input.accountId,
      dealId: input.dealId,
      policyId: input.policyId,
    },
  });
  await db.delete(activityLogs).where(eq(activityLogs.activityId, input.id));
  await db.delete(activities).where(eq(activities.id, input.id));
  await db.insert(activities).values({
    id: input.id,
    tenantId: DEFAULT_TENANT_ID,
    kind: input.kind,
    title: input.title,
    notes: input.body,
    status: "completed",
    contactId: input.contactId ?? null,
    accountId: input.accountId ?? null,
    dealId: input.dealId ?? null,
    policyId: input.policyId ?? null,
    createdAt: input.occurredAt,
    updatedAt: input.occurredAt,
  });
  await db.insert(activityLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    activityId: input.id,
    kind: input.kind,
    eventType: input.eventType,
    body: `${input.title}\n\n${input.body}`,
    occurredAt: input.occurredAt,
    contactId: input.contactId ?? null,
    accountId: input.accountId ?? null,
    dealId: input.dealId ?? null,
    policyId: input.policyId ?? null,
    direction: input.direction,
    threadKey,
    subject: input.subject ?? null,
    fromAddress: input.fromAddress ?? null,
    toAddress: input.toAddress ?? null,
  });
}

export async function seedCommsDesk() {
  await upsertComms({
    id: ELENA_EMAIL_OUT_ID,
    kind: "email",
    title: "HO3 bind confirmation",
    subject: "HO3 bind confirmation",
    body: "Elena — thank you for binding the Melbourne HO3. Policy HO3-ELENA-2026 is on your contact record. This is the desk template stub, not a SendGrid send.",
    direction: "outbound",
    eventType: "sent",
    fromAddress: "desk@agency.local",
    toAddress: "elena.ruiz@example.com",
    contactId: ELENA_CONTACT_ID,
    dealId: ELENA_DEAL_ID,
    policyId: ELENA_POLICY_ID,
    occurredAt: new Date("2026-09-01T16:00:00.000Z"),
  });
  await upsertComms({
    id: ELENA_EMAIL_IN_ID,
    kind: "email",
    title: "Re: HO3 bind confirmation",
    subject: "Re: HO3 bind confirmation",
    body: "Received — please keep the dec on the policy. Elena Ruiz.",
    direction: "inbound",
    eventType: "received",
    fromAddress: "elena.ruiz@example.com",
    toAddress: "desk@agency.local",
    contactId: ELENA_CONTACT_ID,
    dealId: ELENA_DEAL_ID,
    policyId: ELENA_POLICY_ID,
    occurredAt: new Date("2026-09-02T14:30:00.000Z"),
  });
  await upsertComms({
    id: HARBOR_SMS_OUT_ID,
    kind: "sms",
    title: "SMS sent",
    body: "Harbor Key Marine — COI-20260820-0001 is on the business record. Reply if dockage needs a copy.",
    direction: "outbound",
    eventType: "sent",
    toAddress: "321-555-0144",
    contactId: HARBOR_CONTACT_ID,
    accountId: HARBOR_ACCOUNT_ID,
    dealId: HARBOR_DEAL_ID,
    policyId: HARBOR_POLICY_ID,
    occurredAt: new Date("2026-08-20T15:00:00.000Z"),
  });
  await upsertComms({
    id: HARBOR_SMS_IN_ID,
    kind: "sms",
    title: "SMS received",
    body: "Got it. Keep the COI on Harbor Key Marine LLC.",
    direction: "inbound",
    eventType: "received",
    fromAddress: "321-555-0144",
    contactId: HARBOR_CONTACT_ID,
    accountId: HARBOR_ACCOUNT_ID,
    dealId: HARBOR_DEAL_ID,
    policyId: HARBOR_POLICY_ID,
    occurredAt: new Date("2026-08-20T15:12:00.000Z"),
  });

  await db
    .update(emailSendJobs)
    .set({ status: "logged" })
    .where(eq(emailSendJobs.id, ELENA_EMAIL_JOB_ID));

  await db
    .insert(recordAsks)
    .values({
      id: "88888888-8888-4888-8888-888888888803",
      tenantId: DEFAULT_TENANT_ID,
      entityType: "policy",
      entityId: ELENA_POLICY_ID,
      authorId: ADMIN_USER_ID,
      assigneeId: AGENT_USER_ID,
      kind: "status",
      body: "What's the status on HO3-ELENA-2026?",
      status: "open",
    })
    .onConflictDoUpdate({
      target: recordAsks.id,
      set: {
        body: "What's the status on HO3-ELENA-2026?",
        assigneeId: AGENT_USER_ID,
        status: "open",
      },
    });
}
