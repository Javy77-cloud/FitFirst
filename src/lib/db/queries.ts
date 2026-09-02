import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "./index";
import {
  alerts,
  appetiteRules,
  carriers,
  clientHistory,
  contacts,
  deals,
  documents,
  extractedFields,
  leads,
  policies,
  quoteAttemptLogs,
  quotes,
  reviewTasks,
  risks,
  tenants,
} from "./schema";

const tenant = () => DEFAULT_TENANT_ID;

export async function listLeads() {
  return db.select().from(leads).where(eq(leads.tenantId, tenant())).orderBy(desc(leads.createdAt));
}

export async function listDeals() {
  return db.select().from(deals).where(eq(deals.tenantId, tenant())).orderBy(desc(deals.updatedAt));
}

export async function listContacts() {
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.tenantId, tenant()))
    .orderBy(asc(contacts.lastName));
}

export async function listPolicies() {
  return db
    .select({
      policy: policies,
      contact: contacts,
      carrier: carriers,
    })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .where(eq(policies.tenantId, tenant()))
    .orderBy(asc(policies.expirationDate));
}

export async function listCarriers() {
  return db
    .select({
      carrier: carriers,
      rule: appetiteRules,
    })
    .from(carriers)
    .leftJoin(appetiteRules, eq(appetiteRules.carrierId, carriers.id))
    .where(eq(carriers.tenantId, tenant()))
    .orderBy(asc(carriers.name));
}

export async function listQuoteLogs() {
  return db
    .select({
      log: quoteAttemptLogs,
      carrier: carriers,
      deal: deals,
    })
    .from(quoteAttemptLogs)
    .innerJoin(carriers, eq(quoteAttemptLogs.carrierId, carriers.id))
    .innerJoin(deals, eq(quoteAttemptLogs.dealId, deals.id))
    .where(eq(quoteAttemptLogs.tenantId, tenant()))
    .orderBy(desc(quoteAttemptLogs.attemptedAt));
}

export async function listAlerts(unreadOnly = false) {
  const where = unreadOnly
    ? and(eq(alerts.tenantId, tenant()), isNull(alerts.readAt))
    : eq(alerts.tenantId, tenant());
  return db.select().from(alerts).where(where).orderBy(desc(alerts.createdAt));
}

export async function listReviewTasks() {
  return db
    .select()
    .from(reviewTasks)
    .where(and(eq(reviewTasks.tenantId, tenant()), eq(reviewTasks.status, "open")))
    .orderBy(asc(reviewTasks.dueDate));
}

export async function getDealWorkspace(dealId: string) {
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, tenant()), eq(deals.id, dealId)));
  if (!deal) return null;

  const [risk] = await db
    .select()
    .from(risks)
    .where(and(eq(risks.tenantId, tenant()), eq(risks.dealId, dealId)));

  const docs = risk
    ? await db
        .select()
        .from(documents)
        .where(and(eq(documents.tenantId, tenant()), eq(documents.riskId, risk.id)))
        .orderBy(desc(documents.createdAt))
    : [];

  const fields = risk
    ? await db
        .select()
        .from(extractedFields)
        .where(and(eq(extractedFields.tenantId, tenant()), eq(extractedFields.riskId, risk.id)))
        .orderBy(desc(extractedFields.createdAt))
    : [];

  const dealQuotes = await db
    .select({
      quote: quotes,
      carrier: carriers,
    })
    .from(quotes)
    .innerJoin(carriers, eq(quotes.carrierId, carriers.id))
    .where(and(eq(quotes.tenantId, tenant()), eq(quotes.dealId, dealId)))
    .orderBy(asc(quotes.premium));

  const logs = await db
    .select({
      log: quoteAttemptLogs,
      carrier: carriers,
    })
    .from(quoteAttemptLogs)
    .innerJoin(carriers, eq(quoteAttemptLogs.carrierId, carriers.id))
    .where(and(eq(quoteAttemptLogs.tenantId, tenant()), eq(quoteAttemptLogs.dealId, dealId)))
    .orderBy(desc(quoteAttemptLogs.attemptedAt));

  const [lead] = deal.leadId
    ? await db.select().from(leads).where(eq(leads.id, deal.leadId))
    : [];
  const [contact] = deal.contactId
    ? await db.select().from(contacts).where(eq(contacts.id, deal.contactId))
    : [];

  return { deal, risk, docs, fields, quotes: dealQuotes, logs, lead, contact };
}

export async function dashboardStats() {
  const [row] = await db
    .select({
      leads: sql<number>`(select count(*) from leads where tenant_id = ${tenant()})`,
      deals: sql<number>`(select count(*) from deals where tenant_id = ${tenant()})`,
      shopping: sql<number>`(select count(*) from deals where tenant_id = ${tenant()} and pipeline_stage = 'shopping')`,
      contacts: sql<number>`(select count(*) from contacts where tenant_id = ${tenant()})`,
      policies: sql<number>`(select count(*) from policies where tenant_id = ${tenant()})`,
      unreadAlerts: sql<number>`(select count(*) from alerts where tenant_id = ${tenant()} and read_at is null)`,
    })
    .from(tenants)
    .where(eq(tenants.id, tenant()));

  const recentDeals = await db
    .select()
    .from(deals)
    .where(eq(deals.tenantId, tenant()))
    .orderBy(desc(deals.updatedAt))
    .limit(8);

  const tasks = await listReviewTasks();
  const unread = await listAlerts(true);
  const expiring = await db
    .select()
    .from(policies)
    .where(eq(policies.tenantId, tenant()))
    .orderBy(asc(policies.expirationDate))
    .limit(8);

  return { stats: row, recentDeals, tasks, unread, expiring };
}

export async function historyForContact(contactId: string) {
  return db
    .select()
    .from(clientHistory)
    .where(and(eq(clientHistory.tenantId, tenant()), eq(clientHistory.contactId, contactId)))
    .orderBy(desc(clientHistory.occurredAt));
}
