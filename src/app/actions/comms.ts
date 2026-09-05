"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/db/schema";
import { loadAgencyBrand } from "@/lib/desk/brand";
import { writeDeskComms } from "@/lib/desk/write-comms";

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

/** Log an outbound email through the existing template stub. No SendGrid. */
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
  await writeDeskComms({
    kind: "email",
    title: subject || "Email sent",
    subject: subject || "Email",
    body,
    direction: "outbound",
    eventType: "sent",
    toAddress,
    fromAddress: str(formData, "fromAddress") || "desk@agency.local",
    ...ids,
  });
  revalidate(ids);
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
  await writeDeskComms({
    kind: "sms",
    title: direction === "inbound" ? "SMS received" : "SMS sent",
    body,
    direction,
    eventType: direction === "inbound" ? "received" : "sent",
    toAddress: str(formData, "toAddress") || str(formData, "phone"),
    fromAddress: str(formData, "fromAddress") || null,
    ...ids,
  });
  revalidate(ids);
}
