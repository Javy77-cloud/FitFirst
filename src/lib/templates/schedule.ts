import { and, eq } from "drizzle-orm";
import {
  AGENCY_BRAND,
  DEFAULT_TENANT_ID,
  EMAIL_JOB_HOLD,
  type EmailDelayUnit,
  type SendFromProvider,
} from "@/lib/domain";
import { db } from "@/lib/db";
import {
  clientHistory,
  contacts,
  emailSendJobs,
  emailTemplates,
  emailTriggers,
  reviewTasks,
  type Contact,
  type EmailTemplate,
  type EmailTrigger,
} from "@/lib/db/schema";
import { CONTACT_ID } from "@/lib/fixtures/ids";
import { isProtectedAnaContact, pickEmailLocale } from "./locale";
import { mergeTemplate } from "./merge";

export type WonScheduleInput = {
  tenantId?: string;
  contactId: string;
  dealId: string;
  policyId?: string | null;
  wonAt: Date;
  policyType: string;
};

export type RenewalScheduleInput = {
  tenantId?: string;
  contactId: string;
  dealId?: string | null;
  policyId: string;
  expirationDate: Date;
  policyType: string;
  policyNumber?: string | null;
};

export function addDelay(anchor: Date, amount: number, unit: EmailDelayUnit): Date {
  const next = new Date(anchor.getTime());
  if (unit === "months") {
    next.setMonth(next.getMonth() + amount);
    return next;
  }
  next.setDate(next.getDate() + amount);
  return next;
}

function subtractDelay(anchor: Date, amount: number, unit: EmailDelayUnit): Date {
  const next = new Date(anchor.getTime());
  if (unit === "months") {
    next.setMonth(next.getMonth() - amount);
    return next;
  }
  next.setDate(next.getDate() - amount);
  return next;
}

async function loadContact(contactId: string, tenantId: string): Promise<Contact | null> {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenantId), eq(contacts.id, contactId)));
  return contact ?? null;
}

function blocked(contact: Contact): boolean {
  return contact.id === CONTACT_ID || isProtectedAnaContact(contact);
}

function render(template: EmailTemplate, locale: "en" | "es", values: Parameters<typeof mergeTemplate>[1]) {
  const subject = locale === "es" ? template.subjectEs : template.subjectEn;
  const body = locale === "es" ? template.bodyEs : template.bodyEn;
  return {
    subject: mergeTemplate(subject, values),
    body: mergeTemplate(body, values),
  };
}

async function alreadyScheduled(input: {
  tenantId: string;
  triggerId: string;
  contactId: string;
  dealId?: string | null;
  policyId?: string | null;
}): Promise<boolean> {
  const rows = await db
    .select({ id: emailSendJobs.id })
    .from(emailSendJobs)
    .where(
      and(
        eq(emailSendJobs.tenantId, input.tenantId),
        eq(emailSendJobs.triggerId, input.triggerId),
        eq(emailSendJobs.contactId, input.contactId),
      ),
    );
  if (rows.length === 0) return false;
  if (input.policyId) {
    const match = await db
      .select({ id: emailSendJobs.id })
      .from(emailSendJobs)
      .where(
        and(
          eq(emailSendJobs.tenantId, input.tenantId),
          eq(emailSendJobs.triggerId, input.triggerId),
          eq(emailSendJobs.policyId, input.policyId),
        ),
      );
    return match.length > 0;
  }
  if (input.dealId) {
    const match = await db
      .select({ id: emailSendJobs.id })
      .from(emailSendJobs)
      .where(
        and(
          eq(emailSendJobs.tenantId, input.tenantId),
          eq(emailSendJobs.triggerId, input.triggerId),
          eq(emailSendJobs.dealId, input.dealId),
        ),
      );
    return match.length > 0;
  }
  return rows.length > 0;
}

async function queueJob(input: {
  tenantId: string;
  trigger: EmailTrigger;
  template: EmailTemplate;
  contact: Contact;
  dealId?: string | null;
  policyId?: string | null;
  scheduledFor: Date;
  anchorKind: "won_date" | "policy_expiration";
  anchorAt: Date;
  policyType: string;
  wonDate: Date | null;
}): Promise<string | null> {
  if (blocked(input.contact)) return null;
  if (
    await alreadyScheduled({
      tenantId: input.tenantId,
      triggerId: input.trigger.id,
      contactId: input.contact.id,
      dealId: input.dealId,
      policyId: input.policyId,
    })
  ) {
    return null;
  }

  const locale = pickEmailLocale(input.contact.preferredLanguage);
  const { subject, body } = render(input.template, locale, {
    contactFirstName: input.contact.firstName,
    agencyName: AGENCY_BRAND.name,
    policyType: input.policyType,
    wonDate: input.wonDate,
    reviewLink: AGENCY_BRAND.reviewLinkPlaceholder,
    agentPhone: AGENCY_BRAND.phone,
  });

  const holdReason = input.contact.email ? EMAIL_JOB_HOLD : "missing_contact_email";

  const [job] = await db
    .insert(emailSendJobs)
    .values({
      tenantId: input.tenantId,
      triggerId: input.trigger.id,
      templateId: input.template.id,
      contactId: input.contact.id,
      dealId: input.dealId ?? null,
      policyId: input.policyId ?? null,
      toEmail: input.contact.email,
      locale,
      subject,
      body,
      sendFromProvider: input.trigger.sendFromProvider as SendFromProvider,
      status: "queued",
      holdReason,
      scheduledFor: input.scheduledFor,
      anchorKind: input.anchorKind,
      anchorAt: input.anchorAt,
    })
    .returning();

  await db.insert(clientHistory).values({
    tenantId: input.tenantId,
    contactId: input.contact.id,
    dealId: input.dealId ?? null,
    policyId: input.policyId ?? null,
    eventType: "email_queued",
    body: `Queued “${subject}” (${input.trigger.name}) for ${formatWhen(input.scheduledFor)}. Status: queued — connect email to send.`,
    occurredAt: new Date(),
  });

  return job?.id ?? null;
}

function formatWhen(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function scheduleWonClientEmails(input: WonScheduleInput): Promise<string[]> {
  const tenantId = input.tenantId ?? DEFAULT_TENANT_ID;
  const contact = await loadContact(input.contactId, tenantId);
  if (!contact || blocked(contact)) return [];

  const triggers = await db
    .select()
    .from(emailTriggers)
    .where(and(eq(emailTriggers.tenantId, tenantId), eq(emailTriggers.eventKind, "closed_won")));

  const ids: string[] = [];
  for (const trigger of triggers) {
    if (!trigger.enabled || !trigger.emailClient) continue;
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, trigger.templateId));
    if (!template) continue;
    const scheduledFor = addDelay(
      input.wonAt,
      trigger.delayAmount,
      trigger.delayUnit as EmailDelayUnit,
    );
    const id = await queueJob({
      tenantId,
      trigger,
      template,
      contact,
      dealId: input.dealId,
      policyId: input.policyId,
      scheduledFor,
      anchorKind: "won_date",
      anchorAt: input.wonAt,
      policyType: input.policyType,
      wonDate: input.wonAt,
    });
    if (id) ids.push(id);
  }
  return ids;
}

export async function schedulePolicyRenewalEmails(
  input: RenewalScheduleInput,
): Promise<string[]> {
  const tenantId = input.tenantId ?? DEFAULT_TENANT_ID;
  const contact = await loadContact(input.contactId, tenantId);
  if (!contact || blocked(contact)) return [];

  const triggers = await db
    .select()
    .from(emailTriggers)
    .where(
      and(eq(emailTriggers.tenantId, tenantId), eq(emailTriggers.eventKind, "policy_renewal")),
    );

  const ids: string[] = [];
  for (const trigger of triggers) {
    if (!trigger.enabled) continue;
    const due = subtractDelay(
      input.expirationDate,
      trigger.delayAmount,
      trigger.delayUnit as EmailDelayUnit,
    );

    if (trigger.createBrokerTask) {
      const existing = await db
        .select({ id: reviewTasks.id })
        .from(reviewTasks)
        .where(
          and(
            eq(reviewTasks.tenantId, tenantId),
            eq(reviewTasks.policyId, input.policyId),
            eq(reviewTasks.kind, `renewal_${trigger.delayAmount}`),
          ),
        );
      if (existing.length === 0) {
        await db.insert(reviewTasks).values({
          tenantId,
          contactId: contact.id,
          policyId: input.policyId,
          dealId: input.dealId ?? null,
          kind: `renewal_${trigger.delayAmount}`,
          title: `${trigger.delayAmount}-day renewal · ${input.policyNumber ?? "policy"}`,
          dueDate: due,
          status: "open",
        });
      }
    }

    if (!trigger.emailClient) continue;
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, trigger.templateId));
    if (!template) continue;
    const id = await queueJob({
      tenantId,
      trigger,
      template,
      contact,
      dealId: input.dealId,
      policyId: input.policyId,
      scheduledFor: due,
      anchorKind: "policy_expiration",
      anchorAt: input.expirationDate,
      policyType: input.policyType,
      wonDate: null,
    });
    if (id) ids.push(id);
  }
  return ids;
}

/** ARCHIVE must not call this. Jobs stay on won / policy dates. */
export function archiveCancelsEmailJobs(): false {
  return false;
}
