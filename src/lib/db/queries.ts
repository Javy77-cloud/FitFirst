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
  pipelineStages,
  policies,
  quoteAttemptLogs,
  quotes,
  reviewTasks,
  risks,
  tenants,
} from "./schema";
import type { Contact, Deal, Lead, PipelineStageRow, Risk } from "./schema";

const tenant = () => DEFAULT_TENANT_ID;

export async function listLeads() {
  return db.select().from(leads).where(eq(leads.tenantId, tenant())).orderBy(desc(leads.createdAt));
}

export async function listDeals() {
  return db.select().from(deals).where(eq(deals.tenantId, tenant())).orderBy(desc(deals.updatedAt));
}

const DEFAULT_PIPELINE: Array<Pick<PipelineStageRow, "slug" | "label" | "sortOrder" | "locked">> = [
  { slug: "shopping", label: "Shopping", sortOrder: 0, locked: false },
  { slug: "quoting", label: "Quoting", sortOrder: 1, locked: false },
  { slug: "comparing", label: "Comparing", sortOrder: 2, locked: false },
  { slug: "bound", label: "Bound", sortOrder: 3, locked: true },
  { slug: "lost", label: "Lost", sortOrder: 4, locked: false },
];

export async function listPipelineStages() {
  return db
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.tenantId, tenant()))
    .orderBy(asc(pipelineStages.sortOrder), asc(pipelineStages.label));
}

export async function ensurePipelineStages() {
  const existing = await listPipelineStages();
  const have = new Set(existing.map((row) => row.slug));
  const missing = DEFAULT_PIPELINE.filter((row) => !have.has(row.slug));
  if (missing.length > 0) {
    await db.insert(pipelineStages).values(
      missing.map((row) => ({
        tenantId: tenant(),
        ...row,
      })),
    );
  }
  return listPipelineStages();
}

export type DealListRow = {
  deal: Deal;
  lead: Lead | null;
  contact: Contact | null;
  risk: Risk | null;
};

export async function listDealRows(): Promise<DealListRow[]> {
  const rows = await db
    .select({
      deal: deals,
      lead: leads,
      contact: contacts,
      risk: risks,
    })
    .from(deals)
    .leftJoin(leads, eq(deals.leadId, leads.id))
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(risks, eq(risks.dealId, deals.id))
    .where(eq(deals.tenantId, tenant()))
    .orderBy(desc(deals.updatedAt));

  const seen = new Set<string>();
  const out: DealListRow[] = [];
  for (const row of rows) {
    if (seen.has(row.deal.id)) continue;
    seen.add(row.deal.id);
    out.push(row);
  }
  return out;
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
      deal: deals,
    })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .leftJoin(deals, eq(policies.dealId, deals.id))
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

  const [boundPolicy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, tenant()), eq(policies.dealId, dealId)))
    .orderBy(desc(policies.createdAt));

  const dealTasks = await db
    .select()
    .from(reviewTasks)
    .where(and(eq(reviewTasks.tenantId, tenant()), eq(reviewTasks.dealId, dealId)))
    .orderBy(asc(reviewTasks.dueDate));

  return { deal, risk, docs, fields, quotes: dealQuotes, logs, lead, contact, boundPolicy, dealTasks };
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

  const tasks = await listReviewQueue();
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

export async function getLead(leadId: string) {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, tenant()), eq(leads.id, leadId)));
  return lead ?? null;
}

export async function getContactWorkspace(contactId: string) {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenant()), eq(contacts.id, contactId)));
  if (!contact) return null;

  const policyRows = await db
    .select({
      policy: policies,
      carrier: carriers,
      deal: deals,
    })
    .from(policies)
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .leftJoin(deals, eq(policies.dealId, deals.id))
    .where(and(eq(policies.tenantId, tenant()), eq(policies.contactId, contactId)))
    .orderBy(asc(policies.expirationDate));

  const history = await historyForContact(contactId);

  const tasks = await db
    .select()
    .from(reviewTasks)
    .where(and(eq(reviewTasks.tenantId, tenant()), eq(reviewTasks.contactId, contactId)))
    .orderBy(asc(reviewTasks.dueDate));

  const relatedDeals = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, tenant()), eq(deals.contactId, contactId)))
    .orderBy(desc(deals.updatedAt));

  return { contact, policies: policyRows, history, tasks, deals: relatedDeals };
}

export async function getPolicyWorkspace(policyId: string) {
  const [row] = await db
    .select({
      policy: policies,
      contact: contacts,
      carrier: carriers,
      deal: deals,
    })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .leftJoin(deals, eq(policies.dealId, deals.id))
    .where(and(eq(policies.tenantId, tenant()), eq(policies.id, policyId)));
  if (!row) return null;

  const tasks = await db
    .select()
    .from(reviewTasks)
    .where(and(eq(reviewTasks.tenantId, tenant()), eq(reviewTasks.policyId, policyId)))
    .orderBy(asc(reviewTasks.dueDate));

  return { ...row, tasks };
}

export async function listReviewQueue() {
  return db
    .select({
      task: reviewTasks,
      contact: contacts,
      policy: policies,
    })
    .from(reviewTasks)
    .leftJoin(contacts, eq(reviewTasks.contactId, contacts.id))
    .leftJoin(policies, eq(reviewTasks.policyId, policies.id))
    .where(and(eq(reviewTasks.tenantId, tenant()), eq(reviewTasks.status, "open")))
    .orderBy(asc(reviewTasks.dueDate));
}

export async function listAllTasks() {
  return db
    .select({
      task: reviewTasks,
      contact: contacts,
      policy: policies,
      deal: deals,
    })
    .from(reviewTasks)
    .leftJoin(contacts, eq(reviewTasks.contactId, contacts.id))
    .leftJoin(policies, eq(reviewTasks.policyId, policies.id))
    .leftJoin(deals, eq(reviewTasks.dealId, deals.id))
    .where(eq(reviewTasks.tenantId, tenant()))
    .orderBy(asc(reviewTasks.dueDate));
}
