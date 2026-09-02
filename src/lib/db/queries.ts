import { and, asc, desc, eq, gte, inArray, isNull, lte, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { getActor } from "@/lib/auth/session";
import { isAdmin, type Actor } from "@/lib/auth/rbac";
import {
  DEFAULT_TENANT_ID,
  type CommissionRange,
  type CommissionView,
} from "@/lib/domain";
import { rangeWindow } from "@/lib/commissions/windows";
import { db } from "./index";
import {
  agencySettings,
  alerts,
  appetiteRules,
  carriers,
  clientHistory,
  commissions,
  contacts,
  deals,
  documents,
  extractedFields,
  leads,
  policies,
  quoteAttemptLogs,
  quotes,
  recordAsks,
  reviewTasks,
  risks,
  tenants,
  users,
} from "./schema";

const tenant = () => DEFAULT_TENANT_ID;

function ownerWhere(actor: Actor, column: AnyPgColumn): SQL | undefined {
  if (isAdmin(actor)) return undefined;
  return eq(column, actor.id);
}

export async function listUsers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.tenantId, tenant()))
    .orderBy(asc(users.name));
}

export async function getAgencySettings() {
  const [row] = await db
    .select()
    .from(agencySettings)
    .where(eq(agencySettings.tenantId, tenant()));
  return row ?? { fiscalYearStartMonth: 1 };
}

export async function listLeads() {
  const actor = await getActor();
  const scope = ownerWhere(actor, leads.ownerId);
  return db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, tenant()), scope))
    .orderBy(desc(leads.createdAt));
}

export async function listDeals() {
  const actor = await getActor();
  const scope = ownerWhere(actor, deals.ownerId);
  return db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, tenant()), scope))
    .orderBy(desc(deals.updatedAt));
}

export async function listContacts() {
  const actor = await getActor();
  const scope = ownerWhere(actor, contacts.ownerId);
  return db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenant()), scope))
    .orderBy(asc(contacts.lastName));
}

export async function listPolicies() {
  const actor = await getActor();
  const scope = ownerWhere(actor, policies.ownerId);
  return db
    .select({
      policy: policies,
      contact: contacts,
      carrier: carriers,
      owner: users,
    })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .leftJoin(users, eq(policies.ownerId, users.id))
    .where(and(eq(policies.tenantId, tenant()), scope))
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
  const actor = await getActor();
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, tenant()), eq(deals.id, dealId)));
  if (!deal) return null;
  if (!isAdmin(actor) && deal.ownerId !== actor.id) return null;

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
  const actor = await getActor();
  const ownerSql = isAdmin(actor) ? sql`` : sql` and owner_id = ${actor.id}`;
  const [row] = await db
    .select({
      leads: sql<number>`(select count(*) from leads where tenant_id = ${tenant()}${ownerSql})`,
      deals: sql<number>`(select count(*) from deals where tenant_id = ${tenant()}${ownerSql})`,
      shopping: sql<number>`(select count(*) from deals where tenant_id = ${tenant()} and pipeline_stage = 'shopping'${ownerSql})`,
      contacts: sql<number>`(select count(*) from contacts where tenant_id = ${tenant()}${ownerSql})`,
      policies: sql<number>`(select count(*) from policies where tenant_id = ${tenant()}${ownerSql})`,
      unreadAlerts: sql<number>`(select count(*) from alerts where tenant_id = ${tenant()} and read_at is null)`,
    })
    .from(tenants)
    .where(eq(tenants.id, tenant()));

  const dealScope = ownerWhere(actor, deals.ownerId);
  const recentDeals = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, tenant()), dealScope))
    .orderBy(desc(deals.updatedAt))
    .limit(8);

  const tasks = await listReviewTasks();
  const unread = await listAlerts(true);
  const policyScope = ownerWhere(actor, policies.ownerId);
  const expiring = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, tenant()), policyScope))
    .orderBy(asc(policies.expirationDate))
    .limit(8);

  return { stats: row, recentDeals, tasks, unread, expiring };
}

export async function listCommissions(opts: {
  view: CommissionView;
  range: CommissionRange;
  now?: Date;
}) {
  const actor = await getActor();
  const settings = await getAgencySettings();
  const now = opts.now ?? new Date();
  const window = rangeWindow(opts.range, now, settings.fiscalYearStartMonth);

  const filters: Array<SQL | undefined> = [eq(commissions.tenantId, tenant())];
  if (!isAdmin(actor) || opts.view === "mine") {
    filters.push(eq(commissions.agentId, actor.id));
  }
  if (window.statuses?.length) {
    filters.push(inArray(commissions.status, window.statuses));
  }
  if (window.upcoming) {
    filters.push(gte(commissions.dueDate, window.start ?? now));
  } else {
    const dateCol = window.statuses?.length === 1 && window.statuses[0] === "paid"
      ? commissions.paidDate
      : commissions.createdAt;
    if (window.start) filters.push(gte(dateCol, window.start));
    if (window.end) filters.push(lte(dateCol, window.end));
  }

  const rows = await db
    .select({
      commission: commissions,
      agent: users,
      policy: policies,
      contact: contacts,
      carrier: carriers,
    })
    .from(commissions)
    .innerJoin(users, eq(commissions.agentId, users.id))
    .leftJoin(policies, eq(commissions.policyId, policies.id))
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(carriers, eq(commissions.carrierId, carriers.id))
    .where(and(...filters))
    .orderBy(desc(commissions.dueDate), desc(commissions.createdAt));

  return { rows, actor, fiscalYearStartMonth: settings.fiscalYearStartMonth };
}

export async function listCommissionWidgets() {
  const actor = await getActor();
  const filters: Array<SQL | undefined> = [eq(commissions.tenantId, tenant())];
  if (!isAdmin(actor)) filters.push(eq(commissions.agentId, actor.id));
  return db
    .select({
      amount: commissions.amount,
      status: commissions.status,
      dueDate: commissions.dueDate,
      paidDate: commissions.paidDate,
    })
    .from(commissions)
    .where(and(...filters));
}

export async function getCommission(id: string) {
  const actor = await getActor();
  const [row] = await db
    .select({
      commission: commissions,
      agent: users,
      policy: policies,
      contact: contacts,
      carrier: carriers,
    })
    .from(commissions)
    .innerJoin(users, eq(commissions.agentId, users.id))
    .leftJoin(policies, eq(commissions.policyId, policies.id))
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(carriers, eq(commissions.carrierId, carriers.id))
    .where(and(eq(commissions.tenantId, tenant()), eq(commissions.id, id)));
  if (!row) return null;
  if (!isAdmin(actor) && row.commission.agentId !== actor.id) return null;
  return row;
}

export async function listAsksFor(entityType: "commission" | "policy", entityId: string) {
  return listAsksForEntities(entityType, [entityId]);
}

export async function listAsksForEntities(entityType: "commission" | "policy", entityIds: string[]) {
  if (entityIds.length === 0) return [];
  return db
    .select({
      ask: recordAsks,
      author: users,
    })
    .from(recordAsks)
    .innerJoin(users, eq(recordAsks.authorId, users.id))
    .where(
      and(
        eq(recordAsks.tenantId, tenant()),
        eq(recordAsks.entityType, entityType),
        inArray(recordAsks.entityId, entityIds),
      ),
    )
    .orderBy(asc(recordAsks.createdAt));
}

export async function listOpenAskCounts(entityType: "commission" | "policy", entityIds: string[]) {
  if (entityIds.length === 0) return new Map<string, number>();
  const rows = await db
    .select({
      entityId: recordAsks.entityId,
      n: sql<number>`count(*)`,
    })
    .from(recordAsks)
    .where(
      and(
        eq(recordAsks.tenantId, tenant()),
        eq(recordAsks.entityType, entityType),
        eq(recordAsks.status, "open"),
        inArray(recordAsks.entityId, entityIds),
      ),
    )
    .groupBy(recordAsks.entityId);
  return new Map(rows.map((r) => [r.entityId, Number(r.n)]));
}

export async function historyForContact(contactId: string) {
  return db
    .select()
    .from(clientHistory)
    .where(and(eq(clientHistory.tenantId, tenant()), eq(clientHistory.contactId, contactId)))
    .orderBy(desc(clientHistory.occurredAt));
}
