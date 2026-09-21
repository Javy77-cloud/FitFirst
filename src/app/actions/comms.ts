"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/db/schema";
import { loadAgencyBrand } from "@/lib/desk/brand";
import { writeDeskComms } from "@/lib/desk/write-comms";
import { enqueueOutboundJob, loadContactOptOuts, decideOutboundStatus } from "@/lib/desk/outbound-queue";
import { writeCrmSignalsSafe } from "@/lib/crm/signals";
import {
  decideDeskEmailDelivery,
  GMAIL_NOT_CONNECTED_MESSAGE,
} from "@/lib/desk/desk-email-delivery";
import { gmailAccountEmail, gmailIsReady, sendGmailMessage } from "@/lib/integrations/gmail";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function related(form: FormData) {
  return {
    contactId: str(form, "contactId") || null,
    accountId: str(form, "accountId") || null,
    policyId: str(form, "policyId") || null,
    dealId: str(form, "dealId") || null,
    leadId: str(form, "leadId") || null,
  };
}

function revalidate(ids: ReturnType<typeof related>) {
  if (ids.contactId) revalidatePath(`/contacts/${ids.contactId}`);
  if (ids.accountId) revalidatePath(`/accounts/${ids.accountId}`);
  if (ids.policyId) revalidatePath(`/policies/${ids.policyId}`);
  if (ids.dealId) revalidatePath(`/deals/${ids.dealId}`);
  if (ids.leadId) revalidatePath(`/leads/${ids.leadId}`);
  revalidatePath("/quotes");
}

/** Send now / schedule-due-now through connected Gmail; remind and future schedule do not send. */
export async function sendDeskEmail(formData: FormData) {
  const ids = related(formData);
  const brand = await loadAgencyBrand();
  const templateId = str(formData, "templateId");
  let subject = str(formData, "subject");
  let body = str(formData, "body");
  if (templateId) {
    const [tpl] = await db
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.tenantId, DEFAULT_TENANT_ID), eq(emailTemplates.id, templateId)));
    if (tpl) {
      subject = subject || tpl.subject;
      body = body || tpl.body;
    }
  }
  if (brand.emailSignature && body && !body.includes(brand.emailSignature)) {
    body = `${body}\n\n${brand.emailSignature}`;
  }
  const toAddress = str(formData, "toAddress") || str(formData, "email");
  const optOuts = await loadContactOptOuts(ids.contactId);
  const dueAtRaw = str(formData, "dueAt");
  const dueAt = dueAtRaw ? new Date(dueAtRaw) : null;
  const dueAtSafe = dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null;
  const delivery = decideDeskEmailDelivery({
    intent: str(formData, "intent"),
    dueAt: dueAtSafe,
  });
  if (delivery === "remind") return;

  const hold = decideOutboundStatus({
    channel: "email",
    toAddress,
    emailOptOut: optOuts.emailOptOut,
  });
  const attachmentIds = formData
    .getAll("attachDoc")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  const mailbox = await gmailAccountEmail();
  const fromAddress = str(formData, "fromAddress") || mailbox || "desk@agency.local";

  const liveSend = delivery === "send" && hold.status !== "held";
  let gmailThreadId: string | undefined;
  if (liveSend) {
    if (!(await gmailIsReady())) {
      throw new Error(GMAIL_NOT_CONNECTED_MESSAGE);
    }
    const sent = await sendGmailMessage({
      to: toAddress,
      subject: subject || "Email",
      body,
    });
    gmailThreadId = sent.threadId;
  }

  const written = await writeDeskComms({
    kind: "email",
    title: subject || (liveSend ? "Email sent" : "Email queued"),
    subject: subject || "Email",
    body,
    direction: "outbound",
    eventType: liveSend ? "sent" : "queued",
    status: liveSend ? "completed" : "open",
    toAddress,
    fromAddress,
    dueAt: liveSend ? null : dueAtSafe,
    startAt: liveSend ? null : dueAtSafe,
    threadKey: gmailThreadId ? `gmail:${gmailThreadId}` : undefined,
    logEmailJob: false,
    ...ids,
  });
  if (!written.activity) return;
  const { job, decision } = await enqueueOutboundJob({
    channel: "email",
    toAddress,
    fromAddress,
    subject: subject || "Email",
    body,
    activityId: written.activity.id,
    attachmentIds,
    scheduledFor: delivery === "queue" ? dueAtSafe : new Date(),
    vendor: liveSend ? "gmail" : null,
    status: liveSend ? "sent" : hold.status,
    holdReason: hold.holdReason,
    ...ids,
    ...optOuts,
  });
  await writeCrmSignalsSafe({
    kind:
      decision.status === "held"
        ? "comms_held"
        : liveSend
          ? "comms_sent"
          : "comms_queued",
    title:
      decision.status === "held"
        ? `Email held · ${subject || "Email"}`
        : liveSend
          ? `Email sent · ${subject || "Email"}`
          : `Email queued · ${subject || "Email"}`,
    body: decision.holdReason
      ? `Held: ${decision.holdReason}. Nothing sent.`
      : liveSend
        ? `Sent through connected Gmail. Job ${job.id}.`
        : `Queued for later. Only Send now is live until a send worker exists. Job ${job.id}.`,
    entityType: ids.contactId ? "contact" : ids.dealId ? "deal" : "lead",
    entityId: ids.contactId || ids.dealId || ids.leadId || job.id,
    contactId: ids.contactId,
    accountId: ids.accountId,
    dealId: ids.dealId,
    policyId: ids.policyId,
  });
  revalidate(ids);
  revalidatePath("/settings/outbound");
  revalidatePath("/inbox");
}

/** Persist selected quote PDFs on a reminder without queueing a send. */
export async function persistDealEmailAttachments(formData: FormData) {
  const ids = related(formData);
  const attachmentIds = formData
    .getAll("attachDoc")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  if (!attachmentIds.length) return;
  await enqueueOutboundJob({
    channel: "email",
    toAddress: str(formData, "toAddress") || str(formData, "email"),
    fromAddress: str(formData, "fromAddress") || "desk@agency.local",
    subject: str(formData, "subject") || "Email reminder",
    body: str(formData, "body") || str(formData, "notes"),
    attachmentIds,
    draft: true,
    ...ids,
  });
  revalidate(ids);
  revalidatePath("/settings/outbound");
}

/** Log an inbound email on the same thread (connector stub, not a mailbox product). */
export async function logInboundEmail(formData: FormData) {
  const ids = related(formData);
  await writeDeskComms({
    kind: "email",
    title: str(formData, "subject") || "Email received",
    subject: str(formData, "subject") || "Email",
    body: str(formData, "body"),
    direction: "inbound",
    eventType: "received",
    fromAddress: str(formData, "fromAddress") || str(formData, "email"),
    toAddress: str(formData, "toAddress") || "desk@agency.local",
    ...ids,
  });
  revalidate(ids);
}

export async function sendDeskSms(formData: FormData) {
  const ids = related(formData);
  const direction = str(formData, "direction") === "inbound" ? "inbound" : "outbound";
  const body = str(formData, "body") || str(formData, "notes");
  const toAddress = str(formData, "toAddress") || str(formData, "phone");
  if (direction === "inbound") {
    await writeDeskComms({
      kind: "sms",
      title: "SMS received",
      body,
      direction,
      eventType: "received",
      toAddress,
      fromAddress: str(formData, "fromAddress") || null,
      ...ids,
    });
    revalidate(ids);
    return;
  }
  const optOuts = await loadContactOptOuts(ids.contactId);
  const smsTitle = str(formData, "title") || "SMS queued";
  const dueAtRawSms = str(formData, "dueAt");
  const dueAtSms = dueAtRawSms ? new Date(dueAtRawSms) : null;
  const dueAtSafeSms = dueAtSms && !Number.isNaN(dueAtSms.getTime()) ? dueAtSms : null;
  const written = await writeDeskComms({
    kind: "sms",
    title: smsTitle,
    body,
    direction: "outbound",
    eventType: "queued",
    status: "open",
    toAddress,
    fromAddress: str(formData, "fromAddress") || null,
    dueAt: dueAtSafeSms,
    startAt: dueAtSafeSms,
    phoneNumber: toAddress || null,
    logEmailJob: false,
    ...ids,
  });
  if (!written.activity) return;
  const { job, decision } = await enqueueOutboundJob({
    channel: "sms",
    toAddress,
    fromAddress: str(formData, "fromAddress") || null,
    body,
    activityId: written.activity.id,
    ...ids,
    ...optOuts,
  });
  await writeCrmSignalsSafe({
    kind: decision.status === "held" ? "comms_held" : "comms_queued",
    title: decision.status === "held" ? "SMS held" : "SMS queued",
    body: decision.holdReason
      ? `Held: ${decision.holdReason}. Nothing texted.`
      : `Queued for later vendor send. Job ${job.id}.`,
    entityType: ids.contactId ? "contact" : ids.dealId ? "deal" : "lead",
    entityId: ids.contactId || ids.dealId || ids.leadId || job.id,
    contactId: ids.contactId,
    accountId: ids.accountId,
    dealId: ids.dealId,
    policyId: ids.policyId,
  });
  revalidate(ids);
  revalidatePath("/settings/outbound");
}
