import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { clientStatusFromCounts, isInForcePolicyStatus } from "@/lib/lifecycle/client-status";
import { db } from "./index";
import {
  accounts,
  alerts,
  appetiteRules,
  carriers,
  clientHistory,
  contactAccounts,
  contacts,
  deals,
  documents,
  extractedFields,
  leads,
  policies,
  quoteAttemptLogs,
  quoteSheets,
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
  const rows = await db
    .select()
    .from(contacts)
    .where(eq(contacts.tenantId, tenant()))
    .orderBy(asc(contacts.lastName));
  const allPolicies = await db
    .select()
    .from(policies)
    .where(eq(policies.tenantId, tenant()));
  return rows.map((contact) => {
    const related = allPolicies.filter((p) => p.contactId === contact.id);
    const counts = {
      lifetime: related.length,
      inForce: related.filter((p) => isInForcePolicyStatus(p.status)).length,
    };
    return {
      ...contact,
      policyCount: counts.lifetime,
      activePolicyCount: counts.inForce,
      clientStatus: clientStatusFromCounts(counts.lifetime, counts.inForce),
    };
  });
}

export async function listAccounts() {
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.tenantId, tenant()))
    .orderBy(asc(accounts.name));
  const allPolicies = await db
    .select()
    .from(policies)
    .where(eq(policies.tenantId, tenant()));
  return rows.map((account) => {
    const related = allPolicies.filter((p) => p.accountId === account.id);
    const counts = {
      lifetime: related.length,
      inForce: related.filter((p) => isInForcePolicyStatus(p.status)).length,
    };
    return {
      ...account,
      policyCount: counts.lifetime,
      activePolicyCount: counts.inForce,
      clientStatus: clientStatusFromCounts(counts.lifetime, counts.inForce),
    };
  });
}

export async function listPolicies() {
  return db
    .select({
      policy: policies,
      contact: contacts,
      account: accounts,
      carrier: carriers,
    })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .where(eq(policies.tenantId, tenant()))
    .orderBy(asc(policies.expirationDate));
}

export async function getLead(id: string) {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, tenant()), eq(leads.id, id)));
  if (!lead) return null;
  const [deal] = lead.convertedDealId
    ? await db.select().from(deals).where(eq(deals.id, lead.convertedDealId))
    : [];
  return { lead, deal: deal ?? null };
}

export async function getContactWorkspace(id: string) {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenant()), eq(contacts.id, id)));
  if (!contact) return null;
  const relatedPolicies = await db
    .select({ policy: policies, carrier: carriers, deal: deals })
    .from(policies)
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .leftJoin(deals, eq(policies.dealId, deals.id))
    .where(and(eq(policies.tenantId, tenant()), eq(policies.contactId, id)))
    .orderBy(desc(policies.effectiveDate));
  const relatedDeals = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, tenant()), eq(deals.contactId, id)))
    .orderBy(desc(deals.updatedAt));
  const linked = await db
    .select({ account: accounts, link: contactAccounts })
    .from(contactAccounts)
    .innerJoin(accounts, eq(contactAccounts.accountId, accounts.id))
    .where(and(eq(contactAccounts.tenantId, tenant()), eq(contactAccounts.contactId, id)));
  const [originLead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, tenant()), eq(leads.convertedDealId, relatedDeals[0]?.id ?? "")));
  const lifetime = relatedPolicies.length;
  const inForce = relatedPolicies.filter((row) => isInForcePolicyStatus(row.policy.status)).length;
  return {
    contact,
    policies: relatedPolicies,
    deals: relatedDeals,
    businesses: linked.map((row) => row.account),
    lead: originLead ?? null,
    policyCount: lifetime,
    activePolicyCount: inForce,
    clientStatus: clientStatusFromCounts(lifetime, inForce),
  };
}

export async function getAccountWorkspace(id: string) {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.tenantId, tenant()), eq(accounts.id, id)));
  if (!account) return null;
  const relatedPolicies = await db
    .select({ policy: policies, carrier: carriers, deal: deals })
    .from(policies)
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .leftJoin(deals, eq(policies.dealId, deals.id))
    .where(and(eq(policies.tenantId, tenant()), eq(policies.accountId, id)))
    .orderBy(desc(policies.effectiveDate));
  const relatedDeals = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, tenant()), eq(deals.accountId, id)))
    .orderBy(desc(deals.updatedAt));
  const linked = await db
    .select({ contact: contacts, link: contactAccounts })
    .from(contactAccounts)
    .innerJoin(contacts, eq(contactAccounts.contactId, contacts.id))
    .where(and(eq(contactAccounts.tenantId, tenant()), eq(contactAccounts.accountId, id)));
  const lifetime = relatedPolicies.length;
  const inForce = relatedPolicies.filter((row) => isInForcePolicyStatus(row.policy.status)).length;
  return {
    account,
    policies: relatedPolicies,
    deals: relatedDeals,
    contacts: linked.map((row) => row.contact),
    policyCount: lifetime,
    activePolicyCount: inForce,
    clientStatus: clientStatusFromCounts(lifetime, inForce),
  };
}

export async function getPolicyWorkspace(id: string) {
  const [row] = await db
    .select({
      policy: policies,
      contact: contacts,
      account: accounts,
      carrier: carriers,
      deal: deals,
    })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .leftJoin(deals, eq(policies.dealId, deals.id))
    .where(and(eq(policies.tenantId, tenant()), eq(policies.id, id)));
  if (!row) return null;
  const files = await db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, tenant()), eq(documents.policyId, id)))
    .orderBy(desc(documents.createdAt));
  return { ...row, files };
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

  const docs = await db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, tenant()), eq(documents.dealId, dealId)))
    .orderBy(desc(documents.createdAt));

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
  const [account] = deal.accountId
    ? await db.select().from(accounts).where(eq(accounts.id, deal.accountId))
    : [];
  const [quoteSheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.tenantId, tenant()), eq(quoteSheets.dealId, dealId)));
  const boundPolicies = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, tenant()), eq(policies.dealId, dealId)));

  return {
    deal,
    risk,
    docs,
    fields,
    quotes: dealQuotes,
    logs,
    lead,
    contact,
    account: account ?? null,
    quoteSheet: quoteSheet ?? null,
    boundPolicies,
  };
}

export async function refreshPartyCounts(party: {
  contactId?: string | null;
  accountId?: string | null;
}) {
  if (party.contactId) {
    const rows = await db
      .select()
      .from(policies)
      .where(and(eq(policies.tenantId, tenant()), eq(policies.contactId, party.contactId)));
    const lifetime = rows.length;
    const inForce = rows.filter((p) => isInForcePolicyStatus(p.status)).length;
    await db
      .update(contacts)
      .set({ policyCount: lifetime, activePolicyCount: inForce, updatedAt: new Date() })
      .where(eq(contacts.id, party.contactId));
  }
  if (party.accountId) {
    const rows = await db
      .select()
      .from(policies)
      .where(and(eq(policies.tenantId, tenant()), eq(policies.accountId, party.accountId)));
    const lifetime = rows.length;
    const inForce = rows.filter((p) => isInForcePolicyStatus(p.status)).length;
    await db
      .update(accounts)
      .set({ policyCount: lifetime, activePolicyCount: inForce, updatedAt: new Date() })
      .where(eq(accounts.id, party.accountId));
  }
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
