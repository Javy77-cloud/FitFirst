import { and, desc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { commsOutboundJobs, contacts } from "@/lib/db/schema";

export const OUTBOUND_CHANNELS = ["email", "sms"] as const;
export type OutboundChannel = (typeof OUTBOUND_CHANNELS)[number];

export const OUTBOUND_STATUSES = ["queued", "held", "draft", "cancelled", "logged"] as const;
export type OutboundStatus = (typeof OUTBOUND_STATUSES)[number];

export type OutboundDecisionInput = {
  channel: OutboundChannel;
  toAddress?: string | null;
  emailOptOut?: boolean | null;
  smsOptOut?: boolean | null;
};

export function decideOutboundStatus(input: OutboundDecisionInput): {
  status: OutboundStatus;
  holdReason: string | null;
} {
  const to = (input.toAddress ?? "").trim();
  if (input.channel === "email" && input.emailOptOut) {
    return { status: "held", holdReason: "email_opt_out" };
  }
  if (input.channel === "sms" && input.smsOptOut) {
    return { status: "held", holdReason: "sms_opt_out" };
  }
  if (!to) {
    return {
      status: "held",
      holdReason: input.channel === "email" ? "missing_email" : "missing_phone",
    };
  }
  return { status: "queued", holdReason: null };
}

export type EnqueueOutboundInput = {
  channel: OutboundChannel;
  toAddress?: string | null;
  fromAddress?: string | null;
  subject?: string | null;
  body?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  dealId?: string | null;
  policyId?: string | null;
  leadId?: string | null;
  activityId?: string | null;
  emailOptOut?: boolean | null;
  smsOptOut?: boolean | null;
  attachmentIds?: string[] | null;
  draft?: boolean;
};

export async function enqueueOutboundJob(input: EnqueueOutboundInput) {
  const decision = input.draft
    ? { status: "draft" as OutboundStatus, holdReason: null }
    : decideOutboundStatus({
        channel: input.channel,
        toAddress: input.toAddress,
        emailOptOut: input.emailOptOut,
        smsOptOut: input.smsOptOut,
      });
  const now = new Date();
  const [job] = await db
    .insert(commsOutboundJobs)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      channel: input.channel,
      status: decision.status,
      toAddress: input.toAddress?.trim() || null,
      fromAddress: input.fromAddress?.trim() || null,
      subject: input.subject?.trim() || null,
      body: input.body?.trim() || null,
      contactId: input.contactId ?? null,
      accountId: input.accountId ?? null,
      dealId: input.dealId ?? null,
      policyId: input.policyId ?? null,
      leadId: input.leadId ?? null,
      activityId: input.activityId ?? null,
      holdReason: decision.holdReason,
      vendor: null,
      scheduledFor: now,
      attachmentIds: (input.attachmentIds ?? []).map((id) => String(id).trim()).filter(Boolean),
    })
    .returning();
  return { job, decision };
}

export async function loadContactOptOuts(contactId?: string | null) {
  if (!contactId) return { emailOptOut: false, smsOptOut: false };
  const [contact] = await db
    .select({ emailOptOut: contacts.emailOptOut, smsOptOut: contacts.smsOptOut })
    .from(contacts)
    .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, contactId)));
  return {
    emailOptOut: Boolean(contact?.emailOptOut),
    smsOptOut: Boolean(contact?.smsOptOut),
  };
}

export async function listOutboundJobs(limit = 80) {
  return db
    .select()
    .from(commsOutboundJobs)
    .where(eq(commsOutboundJobs.tenantId, DEFAULT_TENANT_ID))
    .orderBy(desc(commsOutboundJobs.createdAt))
    .limit(limit);
}
