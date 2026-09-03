import { and, desc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "./index";
import {
  clientHistory,
  contacts,
  deals,
  emailSendJobs,
  emailTemplates,
  emailTriggers,
  policies,
} from "./schema";

const tenant = () => DEFAULT_TENANT_ID;

export async function listEmailTemplates() {
  return db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.tenantId, tenant()))
    .orderBy(emailTemplates.name);
}

export async function getEmailTemplate(id: string) {
  const [row] = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.tenantId, tenant()), eq(emailTemplates.id, id)));
  return row ?? null;
}

export async function listEmailTriggers() {
  return db
    .select({
      trigger: emailTriggers,
      template: emailTemplates,
    })
    .from(emailTriggers)
    .innerJoin(emailTemplates, eq(emailTriggers.templateId, emailTemplates.id))
    .where(eq(emailTriggers.tenantId, tenant()))
    .orderBy(emailTriggers.name);
}

export async function listEmailJobs(opts?: {
  contactId?: string;
  dealId?: string;
  policyId?: string;
}) {
  const filters = [eq(emailSendJobs.tenantId, tenant())];
  if (opts?.contactId) filters.push(eq(emailSendJobs.contactId, opts.contactId));
  if (opts?.dealId) filters.push(eq(emailSendJobs.dealId, opts.dealId));
  if (opts?.policyId) filters.push(eq(emailSendJobs.policyId, opts.policyId));
  return db
    .select({
      job: emailSendJobs,
      contact: contacts,
      template: emailTemplates,
    })
    .from(emailSendJobs)
    .innerJoin(contacts, eq(emailSendJobs.contactId, contacts.id))
    .leftJoin(emailTemplates, eq(emailSendJobs.templateId, emailTemplates.id))
    .where(and(...filters))
    .orderBy(desc(emailSendJobs.scheduledFor));
}

export async function getContactWorkspace(contactId: string) {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenant()), eq(contacts.id, contactId)));
  if (!contact) return null;
  const history = await db
    .select()
    .from(clientHistory)
    .where(and(eq(clientHistory.tenantId, tenant()), eq(clientHistory.contactId, contactId)))
    .orderBy(desc(clientHistory.occurredAt));
  const jobs = await listEmailJobs({ contactId });
  const contactDeals = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, tenant()), eq(deals.contactId, contactId)));
  const contactPolicies = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, tenant()), eq(policies.contactId, contactId)));
  return { contact, history, jobs, deals: contactDeals, policies: contactPolicies };
}

export async function getPolicyWorkspace(policyId: string) {
  const [row] = await db
    .select({
      policy: policies,
      contact: contacts,
    })
    .from(policies)
    .innerJoin(contacts, eq(policies.contactId, contacts.id))
    .where(and(eq(policies.tenantId, tenant()), eq(policies.id, policyId)));
  if (!row) return null;
  const history = await db
    .select()
    .from(clientHistory)
    .where(and(eq(clientHistory.tenantId, tenant()), eq(clientHistory.policyId, policyId)))
    .orderBy(desc(clientHistory.occurredAt));
  const jobs = await listEmailJobs({ policyId });
  return { ...row, history, jobs };
}
