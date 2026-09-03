import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
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

export type DealListFilter = {
  stage?: string;
  attention?: string;
};

export async function listDeals(filter: DealListFilter = {}) {
  const rows = await db
    .select()
    .from(deals)
    .where(eq(deals.tenantId, tenant()))
    .orderBy(desc(deals.updatedAt));

  return rows.filter((deal) => {
    const stage = deal.pipelineStage.toLowerCase();
    if (filter.attention === "bound_pending") {
      return WON_STAGES.has(stage);
    }
    if (filter.stage === "open") return OPEN_QUOTE_STAGES.has(stage);
    if (filter.stage === "quote_sent") return QUOTE_SENT_STAGES.has(stage);
    if (filter.stage === "won") return WON_STAGES.has(stage);
    if (filter.stage) return stage === filter.stage.toLowerCase();
    return true;
  });
}

export async function listContacts() {
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.tenantId, tenant()))
    .orderBy(asc(contacts.lastName));
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
      carrier: carriers,
    })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .where(eq(policies.tenantId, tenant()))
    .orderBy(asc(policies.expirationDate));

  const asOf = DESK_AS_OF;
  return rows.filter(({ policy }) => {
    const status = policy.status.toLowerCase();
    if (filter.attention === "lapse") return LAPSE_STATUSES.has(status);
    if (filter.status === "in_force") return IN_FORCE_STATUSES.has(status);
    if (filter.written === "this_month") {
      return IN_FORCE_STATUSES.has(status) && policy.effectiveDate >= startOfUtcMonth(asOf) && policy.effectiveDate <= endOfUtcMonth(asOf);
    }
    if (filter.written === "last_month") {
      const last = priorMonth(asOf);
      return IN_FORCE_STATUSES.has(status) && policy.effectiveDate >= startOfUtcMonth(last) && policy.effectiveDate <= endOfUtcMonth(last);
    }
    if (filter.renewal === "30" || filter.renewal === "60") {
      const days = filter.renewal === "30" ? 30 : 60;
      return (
        IN_FORCE_STATUSES.has(status) &&
        policy.expirationDate > asOf &&
        policy.expirationDate <= addUtcDays(asOf, days)
      );
    }
    if (filter.line) {
      return policy.lineOfBusiness.toUpperCase() === filter.line.toUpperCase();
    }
    if (filter.carrier) {
      return policy.carrierId === filter.carrier;
    }
    return true;
  });
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
    return {
      pending: Number(row?.pending ?? 0),
      paid: Number(row?.paid ?? 0),
    };
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

  const dealRows = await db
    .select()
    .from(deals)
    .where(eq(deals.tenantId, scope.tenantId));

  const taskRows = await db
    .select()
    .from(reviewTasks)
    .where(and(eq(reviewTasks.tenantId, scope.tenantId), eq(reviewTasks.status, "open")))
    .orderBy(asc(reviewTasks.dueDate));

  const homePolicies: HomePolicy[] = policyRows.map(({ policy, contact, carrier }) => ({
    id: policy.id,
    contactId: policy.contactId,
    carrierId: policy.carrierId,
    carrierName: carrier?.name ?? null,
    contactName: contactName(contact),
    policyNumber: policy.policyNumber,
    lineOfBusiness: policy.lineOfBusiness,
    status: policy.status,
    premium: policy.premium == null ? 0 : Number(policy.premium),
    effectiveDate: policy.effectiveDate,
    expirationDate: policy.expirationDate,
    ownerId: null,
  }));

  const homeDeals: HomeDeal[] = dealRows.map((deal) => ({
    id: deal.id,
    title: deal.title,
    pipelineStage: deal.pipelineStage,
    lineOfBusiness: deal.lineOfBusiness,
    boundAt: deal.boundAt,
    updatedAt: deal.updatedAt,
    contactId: deal.contactId,
    ownerId: null,
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

  const scopedPolicies = filterByAssignee(homePolicies, scope.agentUserId, Boolean(tables.assigneeColumn));
  const scopedDeals = filterByAssignee(homeDeals, scope.agentUserId, Boolean(tables.dealAssigneeColumn));

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

  if (opportunityCount != null) {
    snapshot.gapCount = opportunityCount;
  }

  return {
    snapshot,
    scope,
    tables,
    hasOpportunitiesRoute: tables.opportunities,
    hasCommissionsRoute: tables.commissions,
  };
}

export async function listBoundPendingDeals() {
  const [dealRows, policyRows] = await Promise.all([
    db.select().from(deals).where(eq(deals.tenantId, tenant())),
    db.select({ contactId: policies.contactId }).from(policies).where(eq(policies.tenantId, tenant())),
  ]);
  const covered = new Set(policyRows.map((p) => p.contactId));
  return dealRows.filter(
    (deal) => WON_STAGES.has(deal.pipelineStage.toLowerCase()) && (!deal.contactId || !covered.has(deal.contactId)),
  );
}
