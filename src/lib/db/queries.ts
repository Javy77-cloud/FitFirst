import { and, asc, desc, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import type { Activity } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { clientStatusFromCounts, isInForcePolicyStatus } from "@/lib/lifecycle/client-status";
import { addUtcDays, DESK_AS_OF, priorMonth, startOfUtcMonth, endOfUtcMonth } from "@/lib/home/as-of";
import {
  buildOwnerHome,
  filterByAssignee,
  IN_FORCE_STATUSES,
  LAPSE_STATUSES,
  OPEN_QUOTE_STAGES,
  QUOTE_SENT_STAGES,
  WON_STAGES,
  type CommissionTotals,
  type HomeDeal,
  type HomePolicy,
  type HomeTask,
} from "@/lib/home/aggregate";
import { detectOwnerHomeTables } from "@/lib/home/optional-tables";
import { currentOwnerHomeScope, type OwnerHomeScope } from "@/lib/home/scope";
import { db, sql as rawSql } from "./index";
import {
  accounts,
  activities,
  activityLogs,
  alerts,
  appetiteRules,
  carriers,
  clientHistory,
  contactAccounts,
  contacts,
  deals,
  documents,
  emailSendJobs,
  extractedFields,
  formTemplates,
  claimAttachments,
  issuedCertificates,
  leads,
  locations,
  mergeCandidates,
  pipelineStages,
  pipelines,
  policies,
  policyTerms,
  quoteAttemptLogs,
  quoteSheets,
  quotes,
  renewalCompareLogs,
  reviewTasks,
  risks,
  tenants,
  vehicles,
} from "./schema";
import { groupTrackingShops, buildTrackingRows } from "@/lib/quotes/tracking";
import {
  hitFromBusiness,
  hitFromContact,
  hitFromDeal,
  hitFromLead,
  hitFromPolicy,
  matchesQuery,
  rankHits,
  type SearchHit,
} from "@/lib/wire/search";

export type TimelineItem = {
  id: string;
  source: "activity_log" | "client_history";
  kind: string;
  eventType: string;
  body: string;
  occurredAt: Date;
  activityId: string | null;
  contactId: string | null;
  accountId: string | null;
  policyId: string | null;
  dealId: string | null;
  activityTitle: string | null;
  activityStatus: string | null;
};

export async function listActivityTimeline(filter: {
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
}): Promise<TimelineItem[]> {
  const logClauses = [
    filter.contactId ? eq(activityLogs.contactId, filter.contactId) : undefined,
    filter.accountId ? eq(activityLogs.accountId, filter.accountId) : undefined,
    filter.policyId ? eq(activityLogs.policyId, filter.policyId) : undefined,
    filter.dealId ? eq(activityLogs.dealId, filter.dealId) : undefined,
    filter.leadId ? eq(activities.leadId, filter.leadId) : undefined,
  ].filter((clause): clause is SQL => Boolean(clause));
  const historyClauses = [
    filter.contactId ? eq(clientHistory.contactId, filter.contactId) : undefined,
    filter.accountId ? eq(clientHistory.accountId, filter.accountId) : undefined,
    filter.policyId ? eq(clientHistory.policyId, filter.policyId) : undefined,
  ].filter((clause): clause is SQL => Boolean(clause));

  const logs = logClauses.length
    ? await db
        .select({ log: activityLogs, activity: activities })
        .from(activityLogs)
        .innerJoin(activities, eq(activityLogs.activityId, activities.id))
        .where(and(eq(activityLogs.tenantId, tenant()), or(...logClauses)))
        .orderBy(desc(activityLogs.occurredAt))
    : [];

  const history = historyClauses.length
    ? await db
        .select()
        .from(clientHistory)
        .where(and(eq(clientHistory.tenantId, tenant()), or(...historyClauses)))
        .orderBy(desc(clientHistory.occurredAt))
    : [];

  const items: TimelineItem[] = [
    ...logs.map(({ log, activity }) => ({
      id: log.id,
      source: "activity_log" as const,
      kind: log.kind,
      eventType: log.eventType,
      body: log.body,
      occurredAt: log.occurredAt,
      activityId: log.activityId,
      contactId: log.contactId,
      accountId: log.accountId,
      policyId: log.policyId,
      dealId: log.dealId,
      activityTitle: activity.title,
      activityStatus: activity.status,
    })),
    ...history.map((row) => ({
      id: row.id,
      source: "client_history" as const,
      kind: row.eventType,
      eventType: row.eventType,
      body: row.body,
      occurredAt: row.occurredAt,
      activityId: null,
      contactId: row.contactId,
      accountId: row.accountId,
      policyId: row.policyId,
      dealId: row.dealId,
      activityTitle: null,
      activityStatus: null,
    })),
  ];
  items.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  return items;
}

const tenant = () => DEFAULT_TENANT_ID;

export async function listLeads() {
  return db.select().from(leads).where(eq(leads.tenantId, tenant())).orderBy(desc(leads.createdAt));
}

export type DealListFilter = {
  stage?: string;
  attention?: string;
  line?: string;
  state?: string;
};

export async function listDeals(filter: DealListFilter = {}) {
  const rows = await db
    .select()
    .from(deals)
    .where(eq(deals.tenantId, tenant()))
    .orderBy(desc(deals.updatedAt));
  return rows.filter((deal) => {
    const stage = deal.pipelineStage.toLowerCase();
    if (filter.attention === "bound_pending" && !WON_STAGES.has(stage)) return false;
    if (filter.stage === "open" && !OPEN_QUOTE_STAGES.has(stage)) return false;
    else if (filter.stage === "quote_sent" && !QUOTE_SENT_STAGES.has(stage)) return false;
    else if (filter.stage === "won" && !WON_STAGES.has(stage)) return false;
    else if (
      filter.stage &&
      filter.stage !== "open" &&
      filter.stage !== "quote_sent" &&
      filter.stage !== "won" &&
      stage !== filter.stage.toLowerCase()
    ) {
      return false;
    }
    if (filter.line && deal.lineOfBusiness.toUpperCase() !== filter.line.toUpperCase()) return false;
    if (filter.state && deal.state.toUpperCase() !== filter.state.toUpperCase()) return false;
    return true;
  });
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

export type PolicyListFilter = {
  status?: string;
  written?: string;
  renewal?: string;
  line?: string;
  carrier?: string;
  attention?: string;
};

export async function listPolicies(filter: PolicyListFilter = {}) {
  const rows = await db
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

  const asOf = DESK_AS_OF;
  return rows.filter(({ policy }) => {
    const status = policy.status.toLowerCase();
    if (filter.attention === "lapse") return LAPSE_STATUSES.has(status);
    if (filter.status === "in_force") return IN_FORCE_STATUSES.has(status);
    if (filter.written === "this_month") {
      return (
        IN_FORCE_STATUSES.has(status) &&
        policy.effectiveDate >= startOfUtcMonth(asOf) &&
        policy.effectiveDate <= endOfUtcMonth(asOf)
      );
    }
    if (filter.written === "last_month") {
      const last = priorMonth(asOf);
      return (
        IN_FORCE_STATUSES.has(status) &&
        policy.effectiveDate >= startOfUtcMonth(last) &&
        policy.effectiveDate <= endOfUtcMonth(last)
      );
    }
    if (filter.renewal === "30" || filter.renewal === "60") {
      const days = filter.renewal === "30" ? 30 : 60;
      return (
        IN_FORCE_STATUSES.has(status) &&
        policy.expirationDate > asOf &&
        policy.expirationDate <= addUtcDays(asOf, days)
      );
    }
    if (filter.status && filter.status !== "in_force" && status !== filter.status.toLowerCase()) {
      return false;
    }
    if (filter.line && policy.lineOfBusiness.toUpperCase() !== filter.line.toUpperCase()) return false;
    if (filter.carrier && policy.carrierId !== filter.carrier) return false;
    return true;
  });
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
    timeline: await listActivityTimeline({ contactId: id }),
    locations: await db
      .select()
      .from(locations)
      .where(and(eq(locations.tenantId, tenant()), eq(locations.contactId, id))),
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
    timeline: await listActivityTimeline({ accountId: id }),
    locations: await db
      .select()
      .from(locations)
      .where(and(eq(locations.tenantId, tenant()), eq(locations.accountId, id))),
    certificates: await db
      .select()
      .from(issuedCertificates)
      .where(and(eq(issuedCertificates.tenantId, tenant()), eq(issuedCertificates.accountId, id))),
  };
}

export async function getBusinessWorkspace(id: string) {
  return getAccountWorkspace(id);
}

export async function getIssuedCertificate(accountId: string, certId: string) {
  const workspace = await getAccountWorkspace(accountId);
  if (!workspace) return null;
  const certificate = workspace.certificates.find((row) => row.id === certId);
  if (!certificate) return null;
  return {
    business: workspace.account,
    account: workspace.account,
    certificate,
  };
}

export async function getClaimAttachment(id: string) {
  const [row] = await db
    .select()
    .from(claimAttachments)
    .where(and(eq(claimAttachments.tenantId, tenant()), eq(claimAttachments.id, id)));
  return row ?? null;
}

export async function getLastQuoteSheetDealId() {
  const [sheet] = await db
    .select({ dealId: quoteSheets.dealId })
    .from(quoteSheets)
    .where(eq(quoteSheets.tenantId, tenant()))
    .orderBy(desc(quoteSheets.updatedAt))
    .limit(1);
  return sheet?.dealId ?? null;
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
  const [terms, compareLogs, vehicleRows] = await Promise.all([
    db
      .select()
      .from(policyTerms)
      .where(and(eq(policyTerms.tenantId, tenant()), eq(policyTerms.policyId, id))),
    db
      .select()
      .from(renewalCompareLogs)
      .where(and(eq(renewalCompareLogs.tenantId, tenant()), eq(renewalCompareLogs.policyId, id))),
    db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.tenantId, tenant()), eq(vehicles.policyId, id)))
      .orderBy(asc(vehicles.sortOrder)),
  ]);
  return {
    ...row,
    files,
    timeline: await listActivityTimeline({ policyId: id }),
    terms,
    compareLogs,
    vehicles: vehicleRows,
  };
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

export async function listReviewTasks(filter: { status?: string; kind?: string } = {}) {
  const rows = await db
    .select()
    .from(reviewTasks)
    .where(eq(reviewTasks.tenantId, tenant()))
    .orderBy(asc(reviewTasks.dueDate));
  return rows.filter((task) => {
    if (filter.status) return task.status === filter.status && (!filter.kind || task.kind === filter.kind);
    if (task.status !== "open") return false;
    if (filter.kind && task.kind !== filter.kind) return false;
    return true;
  });
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

export async function listPipelines() {
  const boards = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.tenantId, tenant()))
    .orderBy(asc(pipelines.sortOrder));
  const stages = await db
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.tenantId, tenant()))
    .orderBy(asc(pipelineStages.sortOrder));
  return boards.map((board) => ({
    ...board,
    stages: stages.filter((stage) => stage.pipelineId === board.id),
  }));
}

export async function getPipelineBoard(slug: string) {
  const boards = await listPipelines();
  const board = boards.find((row) => row.slug === slug) ?? boards[0] ?? null;
  if (!board) return null;
  const cards = await db
    .select()
    .from(deals)
    .where(eq(deals.tenantId, tenant()))
    .orderBy(desc(deals.updatedAt));
  return {
    board,
    boards,
    cards: cards.filter((deal) => deal.pipelineId === board.id),
  };
}

export async function listFormTemplates() {
  return db
    .select()
    .from(formTemplates)
    .where(eq(formTemplates.tenantId, tenant()))
    .orderBy(asc(formTemplates.name));
}

export async function getFormTemplate(slug: string) {
  const [row] = await db
    .select()
    .from(formTemplates)
    .where(and(eq(formTemplates.tenantId, tenant()), eq(formTemplates.slug, slug)));
  return row ?? null;
}

export async function listEmailJobsForDeal(dealId: string) {
  return db
    .select()
    .from(emailSendJobs)
    .where(and(eq(emailSendJobs.tenantId, tenant()), eq(emailSendJobs.dealId, dealId)))
    .orderBy(asc(emailSendJobs.scheduledFor));
}

export async function smartSearch(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  const [leadRows, dealRows, contactRows, accountRows, policyRows] = await Promise.all([
    db.select().from(leads).where(eq(leads.tenantId, tenant())),
    db.select().from(deals).where(eq(deals.tenantId, tenant())),
    db.select().from(contacts).where(eq(contacts.tenantId, tenant())),
    db.select().from(accounts).where(eq(accounts.tenantId, tenant())),
    db.select().from(policies).where(eq(policies.tenantId, tenant())),
  ]);
  const hits: SearchHit[] = [];
  for (const row of leadRows) {
    if (matchesQuery(q, row.firstName, row.lastName, row.email, row.phone)) hits.push(hitFromLead(row));
  }
  for (const row of dealRows) {
    if (matchesQuery(q, row.title, row.primaryNamedInsured, row.notes)) hits.push(hitFromDeal(row));
  }
  for (const row of contactRows) {
    if (matchesQuery(q, row.firstName, row.lastName, row.email, row.phone, row.mailingAddress)) {
      hits.push(hitFromContact(row));
    }
  }
  for (const row of accountRows) {
    if (matchesQuery(q, row.name, row.legalName, row.dba, row.ein, row.city)) {
      hits.push(hitFromBusiness(row));
    }
  }
  for (const row of policyRows) {
    if (matchesQuery(q, row.policyNumber, row.lineOfBusiness)) hits.push(hitFromPolicy(row));
  }
  return rankHits(hits, q).slice(0, 24);
}

function contactName(contact: { firstName: string; lastName: string } | null): string {
  if (!contact) return "Unknown account";
  if (contact.firstName.includes(" ")) return `${contact.firstName} ${contact.lastName}`.trim();
  return `${contact.lastName}, ${contact.firstName}`;
}

async function loadCommissionTotals(scope: OwnerHomeScope): Promise<CommissionTotals> {
  const tables = await detectOwnerHomeTables();
  if (!tables.commissions) return null;
  try {
    const rows = await rawSql<{ pending: string; paid: string }[]>`
      select
        coalesce(sum(amount) filter (where status = 'pending'), 0)::text as pending,
        coalesce(sum(amount) filter (where status = 'paid'), 0)::text as paid
      from commissions
      where tenant_id = ${scope.tenantId}
        and (
          ${scope.agentUserId}::uuid is null
          or agent_id = ${scope.agentUserId}::uuid
        )
    `;
    const row = rows[0];
    return { pending: Number(row?.pending ?? 0), paid: Number(row?.paid ?? 0) };
  } catch {
    return null;
  }
}

async function loadOpportunityGapCount(scope: OwnerHomeScope): Promise<number | null> {
  const tables = await detectOwnerHomeTables();
  if (!tables.opportunities) return null;
  try {
    const rows = await rawSql<{ n: number }[]>`
      select count(*)::int as n
      from opportunities
      where tenant_id = ${scope.tenantId}
        and coalesce(status, 'open') not in ('closed', 'won', 'lost', 'dismissed')
    `;
    return Number(rows[0]?.n ?? 0);
  } catch {
    return null;
  }
}

export async function ownerHomeDashboard() {
  const scope = await currentOwnerHomeScope();
  const tables = await detectOwnerHomeTables();

  const policyRows = await db
    .select({
      policy: policies,
      contact: contacts,
      carrier: carriers,
    })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .where(eq(policies.tenantId, scope.tenantId));

  const dealRows = await db.select().from(deals).where(eq(deals.tenantId, scope.tenantId));
  const taskRows = await db
    .select()
    .from(reviewTasks)
    .where(and(eq(reviewTasks.tenantId, scope.tenantId), eq(reviewTasks.status, "open")))
    .orderBy(asc(reviewTasks.dueDate));

  const homePolicies: HomePolicy[] = policyRows.map(({ policy, contact, carrier }) => ({
    id: policy.id,
    contactId: policy.contactId ?? "",
    dealId: policy.dealId,
    carrierId: policy.carrierId,
    carrierName: carrier?.name ?? null,
    contactName: contactName(contact),
    policyNumber: policy.policyNumber,
    lineOfBusiness: policy.lineOfBusiness,
    status: policy.status,
    premium: policy.premium == null ? 0 : Number(policy.premium),
    effectiveDate: policy.effectiveDate,
    expirationDate: policy.expirationDate,
    ownerId: policy.ownerId ?? null,
  }));

  const homeDeals: HomeDeal[] = dealRows.map((deal) => ({
    id: deal.id,
    title: deal.title,
    pipelineStage: deal.pipelineStage,
    lineOfBusiness: deal.lineOfBusiness,
    boundAt: deal.boundAt,
    updatedAt: deal.updatedAt,
    contactId: deal.contactId,
    ownerId: deal.ownerId ?? null,
  }));

  const homeTasks: HomeTask[] = taskRows.map((task) => ({
    id: task.id,
    title: task.title,
    dueDate: task.dueDate,
    kind: task.kind,
    dealId: task.dealId,
    policyId: task.policyId,
    contactId: task.contactId,
  }));

  const scopedPolicies = filterByAssignee(
    homePolicies,
    scope.agentUserId,
    Boolean(tables.assigneeColumn),
  );
  const scopedDeals = filterByAssignee(
    homeDeals,
    scope.agentUserId,
    Boolean(tables.dealAssigneeColumn),
  );

  const [commissions, opportunityCount] = await Promise.all([
    loadCommissionTotals(scope),
    loadOpportunityGapCount(scope),
  ]);

  const snapshot = buildOwnerHome({
    asOf: DESK_AS_OF,
    policies: scopedPolicies,
    deals: scopedDeals,
    tasks: homeTasks,
    commissions,
  });
  if (opportunityCount != null) snapshot.gapCount = opportunityCount;

  return { snapshot, scope, tables };
}

export async function listBoundPendingDeals() {
  const [dealRows, policyRows] = await Promise.all([
    db.select().from(deals).where(eq(deals.tenantId, tenant())),
    db.select({ contactId: policies.contactId }).from(policies).where(eq(policies.tenantId, tenant())),
  ]);
  const covered = new Set(policyRows.map((p) => p.contactId));
  return dealRows.filter(
    (deal) =>
      WON_STAGES.has(deal.pipelineStage.toLowerCase()) &&
      (!deal.contactId || !covered.has(deal.contactId)),
  );
}

export async function listOpenMergeCandidates() {
  return db
    .select()
    .from(mergeCandidates)
    .where(and(eq(mergeCandidates.tenantId, tenant()), eq(mergeCandidates.status, "open")))
    .orderBy(desc(mergeCandidates.createdAt));
}

async function mergeBundle(entityType: string, id: string) {
  if (entityType === "lead") {
    const [person] = await db.select().from(leads).where(eq(leads.id, id));
    const relatedDeals = await db.select().from(deals).where(eq(deals.leadId, id));
    const locRows = await db.select().from(locations).where(eq(locations.leadId, id));
    const actRows = await db.select().from(activities).where(eq(activities.leadId, id));
    return {
      person: person ?? { id, firstName: "Unknown", lastName: "Lead", status: "active" },
      deals: relatedDeals,
      policies: [] as (typeof policies.$inferSelect)[],
      locations: locRows,
      activities: actRows,
    };
  }
  const [person] = await db.select().from(contacts).where(eq(contacts.id, id));
  const relatedDeals = await db.select().from(deals).where(eq(deals.contactId, id));
  const relatedPolicies = await db.select().from(policies).where(eq(policies.contactId, id));
  const locRows = await db.select().from(locations).where(eq(locations.contactId, id));
  const actRows = await db.select().from(activities).where(eq(activities.contactId, id));
  return {
    person: person ?? { id, firstName: "Unknown", lastName: "Contact", status: "active" },
    deals: relatedDeals,
    policies: relatedPolicies,
    locations: locRows,
    activities: actRows,
  };
}

export async function getMergeReview(id: string) {
  const [candidate] = await db
    .select()
    .from(mergeCandidates)
    .where(and(eq(mergeCandidates.tenantId, tenant()), eq(mergeCandidates.id, id)));
  if (!candidate) return null;
  const [left, right] = await Promise.all([
    mergeBundle(candidate.entityType, candidate.leftId),
    mergeBundle(candidate.entityType, candidate.rightId),
  ]);
  return { candidate, entityType: candidate.entityType, left, right };
}

export async function listQuoteTrackingShops(dealId?: string) {
  const logRows = await db
    .select({ log: quoteAttemptLogs, deal: deals, carrier: carriers })
    .from(quoteAttemptLogs)
    .innerJoin(deals, eq(quoteAttemptLogs.dealId, deals.id))
    .innerJoin(carriers, eq(quoteAttemptLogs.carrierId, carriers.id))
    .where(
      dealId
        ? and(eq(quoteAttemptLogs.tenantId, tenant()), eq(quoteAttemptLogs.dealId, dealId))
        : eq(quoteAttemptLogs.tenantId, tenant()),
    );
  const quoteRows = await db
    .select({ quote: quotes, deal: deals, carrier: carriers })
    .from(quotes)
    .innerJoin(deals, eq(quotes.dealId, deals.id))
    .innerJoin(carriers, eq(quotes.carrierId, carriers.id))
    .where(
      dealId ? and(eq(quotes.tenantId, tenant()), eq(quotes.dealId, dealId)) : eq(quotes.tenantId, tenant()),
    );
  const policyRows = await db
    .select()
    .from(policies)
    .where(eq(policies.tenantId, tenant()));

  const attempts = logRows.map(({ log, deal, carrier }) => ({
    id: log.id,
    dealId: deal.id,
    dealTitle: deal.title,
    dealStage: deal.pipelineStage,
    carrierId: carrier.id,
    carrierName: carrier.name,
    line: log.lineOfBusiness,
    result: log.result,
    bindable: log.bindable,
    premium: log.premium,
    quoteNumber: log.quoteNumber,
    attemptedAt: log.attemptedAt,
    why: log.why,
    quoteId: log.id,
  }));
  const comparison = quoteRows.map(({ quote, deal, carrier }) => ({
    id: quote.id,
    dealId: deal.id,
    dealTitle: deal.title,
    dealStage: deal.pipelineStage,
    carrierId: carrier.id,
    carrierName: carrier.name,
    line: deal.lineOfBusiness,
    bindable: quote.bindable,
    premium: quote.premium,
    quoteNumber: quote.quoteNumber,
    createdAt: quote.createdAt,
    notes: quote.notes,
    quoteAttemptLogId: quote.quoteAttemptLogId,
  }));
  const bound = policyRows
    .filter((p) => p.dealId && p.carrierId)
    .map((p) => ({ dealId: p.dealId!, carrierId: p.carrierId!, policyId: p.id }));
  return groupTrackingShops(buildTrackingRows(attempts, bound, comparison));
}

export async function historyForContact(contactId: string) {
  return db
    .select()
    .from(clientHistory)
    .where(and(eq(clientHistory.tenantId, tenant()), eq(clientHistory.contactId, contactId)))
    .orderBy(desc(clientHistory.occurredAt));
}

export function serializeActivity(row: Activity) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    notes: row.notes,
    status: row.status,
    dueAt: row.dueAt?.toISOString() ?? null,
    startAt: row.startAt?.toISOString() ?? null,
    endAt: row.endAt?.toISOString() ?? null,
    dealId: row.dealId,
    leadId: row.leadId,
    contactId: row.contactId,
    accountId: row.accountId,
    policyId: row.policyId,
  };
}

export type SerializedActivity = ReturnType<typeof serializeActivity>;

export async function listRecordActivities(filter: { dealId?: string; leadId?: string }) {
  const clauses = [eq(activities.tenantId, tenant())];
  if (filter.dealId) clauses.push(eq(activities.dealId, filter.dealId));
  if (filter.leadId) clauses.push(eq(activities.leadId, filter.leadId));
  const rows = await db
    .select()
    .from(activities)
    .where(and(...clauses))
    .orderBy(desc(activities.createdAt));
  return rows.map(serializeActivity);
}

export async function listCalendarActivities() {
  const rows = await db
    .select()
    .from(activities)
    .where(eq(activities.tenantId, tenant()))
    .orderBy(asc(activities.dueAt), asc(activities.startAt));
  return rows.map(serializeActivity);
}

export async function listCalendarRelatedOptions() {
  const [dealRows, leadRows] = await Promise.all([
    db
      .select({ id: deals.id, title: deals.title })
      .from(deals)
      .where(eq(deals.tenantId, tenant()))
      .orderBy(desc(deals.updatedAt)),
    db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
      })
      .from(leads)
      .where(eq(leads.tenantId, tenant()))
      .orderBy(desc(leads.createdAt)),
  ]);
  return {
    deals: dealRows,
    leads: leadRows.map((row) => ({
      id: row.id,
      title: `${row.lastName}, ${row.firstName}`,
    })),
  };
}
