"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/db/schema";
import { loadAgencyBrand } from "@/lib/desk/brand";
import { writeDeskComms } from "@/lib/desk/write-comms";
import { enqueueOutboundJob, loadContactOptOuts } from "@/lib/desk/outbound-queue";
import { writeCrmSignalsSafe } from "@/lib/crm/signals";

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

/** Queue an outbound email. Nothing leaves the desk — vendor send is later. */
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
  const written = await writeDeskComms({
    kind: "email",
    title: subject || "Email queued",
    subject: subject || "Email",
    body,
    direction: "outbound",
    eventType: "queued",
    status: "open",
    toAddress,
    fromAddress: str(formData, "fromAddress") || "desk@agency.local",
    logEmailJob: false,
    ...ids,
  });
  const { job, decision } = await enqueueOutboundJob({
    channel: "email",
    toAddress,
    fromAddress: str(formData, "fromAddress") || "desk@agency.local",
    subject: subject || "Email",
    body,
    activityId: written.activity.id,
    ...ids,
    ...optOuts,
  });
  await writeCrmSignalsSafe({
    kind: decision.status === "held" ? "comms_held" : "comms_queued",
    title: decision.status === "held" ? `Email held · ${subject || "Email"}` : `Email queued · ${subject || "Email"}`,
    body: decision.holdReason
      ? `Held: ${decision.holdReason}. Nothing sent.`
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
  const written = await writeDeskComms({
    kind: "sms",
    title: "SMS queued",
    body,
    direction: "outbound",
    eventType: "queued",
    status: "open",
    toAddress,
    fromAddress: str(formData, "fromAddress") || null,
    logEmailJob: false,
    ...ids,
  });
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
