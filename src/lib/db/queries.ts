import { and, asc, desc, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { canSeeOwned } from "@/lib/auth/rbac";
import { currentDeskSession, getActor, type DeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
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
import { bookFamily, isPcSubLine } from "@/lib/desk/policy-line";
import {
  fallbackPipelineSlug,
  matchesLifeOrHealthSub,
  visiblePipelineBoards,
} from "@/lib/desk/line-settings";
import { loadDeskLineSettings } from "./line-settings";
import { db, sql as rawSql } from "./index";
import {
  accounts,
  activities,
  agencySettings,
  activityLogs,
  alerts,
  appetiteRules,
  carrierAppointments,
  carriers,
  clientHistory,
  contactAccounts,
  contacts,
  deals,
  documents,
  emailSendJobs,
  emailTemplates,
  emailTriggers,
  extractedFields,
  formFills,
  formTemplates,
  claimAttachments,
  commissions,
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
  recordAsks,
  renewalCompareLogs,
  reviewTasks,
  risks,
  tenants,
  telephonySettings,
  esignSettings,
  users,
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
  leadId: string | null;
  activityTitle: string | null;
  activityStatus: string | null;
  direction: string | null;
  threadKey: string | null;
  subject: string | null;
  fromAddress: string | null;
  toAddress: string | null;
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
    filter.leadId ? eq(activityLogs.leadId, filter.leadId) : undefined,
  ].filter((clause): clause is SQL => Boolean(clause));
  const historyClauses = [
    filter.contactId ? eq(clientHistory.contactId, filter.contactId) : undefined,
    filter.accountId ? eq(clientHistory.accountId, filter.accountId) : undefined,
    filter.policyId ? eq(clientHistory.policyId, filter.policyId) : undefined,
    filter.dealId ? eq(clientHistory.dealId, filter.dealId) : undefined,
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
      leadId: log.leadId,
      activityTitle: activity.title,
      activityStatus: activity.status,
      direction: log.direction,
      threadKey: log.threadKey,
      subject: log.subject,
      fromAddress: log.fromAddress,
      toAddress: log.toAddress,
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
      leadId: null,
      activityTitle: null,
      activityStatus: null,
      direction: "internal" as const,
      threadKey: null,
      subject: null,
      fromAddress: null,
      toAddress: null,
    })),
  ];
  items.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  return items;
}

export async function listCommsForRecord(filter: {
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
}): Promise<TimelineItem[]> {
  const all = await listActivityTimeline(filter);
  return all.filter((item) =>
    ["email", "sms", "call", "meeting", "task"].includes(item.kind.toLowerCase()),
  );
}

export async function listRecordAsks(entityType: string, entityId: string) {
  if (!isUuid(entityId)) return [];
  return db
    .select()
    .from(recordAsks)
    .where(
      and(
        eq(recordAsks.tenantId, tenant()),
        eq(recordAsks.entityType, entityType),
        eq(recordAsks.entityId, entityId),
      ),
    )
    .orderBy(desc(recordAsks.createdAt));
}

export async function sumCommissionsForPolicies(policyIds: string[]) {
  if (policyIds.length === 0) return 0;
  const rows = await db
    .select()
    .from(commissions)
    .where(eq(commissions.tenantId, tenant()));
  return rows
    .filter((row) => row.policyId && policyIds.includes(row.policyId))
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
}

export async function listEmailTemplates() {
  return db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.tenantId, tenant()))
    .orderBy(asc(emailTemplates.name));
}

export async function listEmailTriggers() {
  return db
    .select()
    .from(emailTriggers)
    .where(eq(emailTriggers.tenantId, tenant()))
    .orderBy(asc(emailTriggers.delayDays));
}

export async function getCarrier(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({ carrier: carriers, rule: appetiteRules })
    .from(carriers)
    .leftJoin(appetiteRules, eq(appetiteRules.carrierId, carriers.id))
    .where(and(eq(carriers.tenantId, tenant()), eq(carriers.id, id)));
  return row ?? null;
}

export async function listCalendarActivities(_from: Date, _to: Date) {
  const session = await currentDeskSession();
  const scope = session.isAdmin
    ? undefined
    : session.name
      ? or(eq(activities.assignee, session.name), eq(activities.assignee, session.userId ?? ""))
      : sql`false`;
  return db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, tenant()), scope))
    .orderBy(asc(activities.startAt), asc(activities.dueAt));
}

export async function listCallLog() {
  const session = await currentDeskSession();
  const scope = session.isAdmin
    ? undefined
    : session.name
      ? or(eq(activities.assignee, session.name), eq(activities.assignee, session.userId ?? ""))
      : sql`false`;
  return db
    .select({
      activity: activities,
      contact: contacts,
      policy: policies,
      deal: deals,
      lead: leads,
      business: accounts,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .leftJoin(policies, eq(activities.policyId, policies.id))
    .leftJoin(deals, eq(activities.dealId, deals.id))
    .leftJoin(leads, eq(activities.leadId, leads.id))
    .leftJoin(accounts, eq(activities.accountId, accounts.id))
    .where(and(eq(activities.tenantId, tenant()), eq(activities.kind, "call"), scope))
    .orderBy(desc(activities.startAt), desc(activities.updatedAt));
}

export async function getTelephonySettings() {
  const [row] = await db
    .select()
    .from(telephonySettings)
    .where(eq(telephonySettings.tenantId, tenant()));
  return row ?? null;
}

export async function getEsignSettings() {
  const [row] = await db
    .select()
    .from(esignSettings)
    .where(eq(esignSettings.tenantId, tenant()));
  return row ?? null;
}

const tenant = () => DEFAULT_TENANT_ID;

function ownerWhere(session: DeskSession, column: AnyPgColumn): SQL | undefined {
  if (session.isAdmin) return undefined;
  if (session.userId) return eq(column, session.userId);
  return sql`false`;
}

function canViewOwned(session: DeskSession, ownerId: string | null | undefined): boolean {
  if (session.isAdmin) return true;
  if (!session.signedIn || !session.userId) return false;
  return ownerId === session.userId;
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
  const session = await currentDeskSession();
  const scope = ownerWhere(session, leads.ownerId);
  const rows = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, tenant()), scope))
    .orderBy(desc(leads.createdAt));
  const relatedDeals = await db
    .select()
    .from(deals)
    .where(eq(deals.tenantId, tenant()))
    .orderBy(desc(deals.updatedAt));
  return rows.map((lead) => {
    const deal =
      relatedDeals.find((row) => row.id === lead.convertedDealId) ??
      relatedDeals.find((row) => row.leadId === lead.id) ??
      null;
    return {
      ...lead,
      dealStage: deal?.pipelineStage ?? null,
      relatedDealId: deal?.id ?? lead.convertedDealId ?? null,
    };
  });
}

export type DealListFilter = {
  stage?: string;
  attention?: string;
  ownerId?: string;
  family?: string;
  pcSub?: string;
  lifeSub?: string;
  healthSub?: string;
};

export async function listDeals(filter: DealListFilter = {}) {
  const lineOptions = await loadDeskLineSettings();
  const rows = await db
    .select({
      deal: deals,
      lead: leads,
      contact: contacts,
      account: accounts,
      risk: risks,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(leads, eq(deals.leadId, leads.id))
    .leftJoin(accounts, eq(deals.accountId, accounts.id))
    .leftJoin(risks, eq(risks.dealId, deals.id))
    .where(eq(deals.tenantId, tenant()))
    .orderBy(desc(deals.updatedAt));
  const session = await currentDeskSession();
  const seen = new Set<string>();
  return rows.filter(({ deal }) => {
    if (seen.has(deal.id)) return false;
    seen.add(deal.id);
    if (!canViewOwned(session, deal.ownerId)) return false;
    const family = bookFamily(deal.lineOfBusiness);
    if (family === "life" && !lineOptions.writeLife) return false;
    if (family === "health" && !lineOptions.writeHealth) return false;
    const stage = deal.pipelineStage.toLowerCase();
    if (filter.ownerId && deal.ownerId !== filter.ownerId) return false;
    if (filter.attention === "bound_pending") return WON_STAGES.has(stage);
    if (filter.stage === "open") return OPEN_QUOTE_STAGES.has(stage);
    if (filter.stage === "quote_sent") return QUOTE_SENT_STAGES.has(stage);
    if (filter.stage === "won") return WON_STAGES.has(stage);
    if (filter.stage && stage !== filter.stage.toLowerCase()) return false;
    if (filter.family && family !== filter.family) return false;
    if (filter.pcSub && filter.pcSub !== "all" && !isPcSubLine(deal.lineOfBusiness, filter.pcSub)) {
      return false;
    }
    if (filter.lifeSub && filter.lifeSub !== "all") {
      if (bookFamily(deal.lineOfBusiness) !== "life") return false;
      if (!matchesLifeOrHealthSub(deal.policySubType, filter.lifeSub, lineOptions.lifeOptions)) {
        return false;
      }
    }
    if (filter.healthSub && filter.healthSub !== "all") {
      if (bookFamily(deal.lineOfBusiness) !== "health") return false;
      if (!matchesLifeOrHealthSub(deal.policySubType, filter.healthSub, lineOptions.healthOptions)) {
        return false;
      }
    }
    return true;
  });
}

export type DealListRow = Awaited<ReturnType<typeof listDeals>>[number];

export async function listDealLookup() {
  const rows = await listDeals();
  return rows.map(({ deal, contact, account }) => ({
    id: deal.id,
    title: deal.title,
    partyName: contact
      ? `${contact.lastName}, ${contact.firstName}`
      : account?.name ?? null,
  }));
}

export async function listContacts(filter: { status?: string; ownerId?: string; city?: string } = {}) {
  const session = await currentDeskSession();
  const scope = ownerWhere(session, contacts.ownerId);
  const rows = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenant()), scope))
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
  }).filter((row) => {
    if (filter.ownerId && row.ownerId !== filter.ownerId) return false;
    if (filter.status && row.clientStatus !== filter.status) return false;
    if (filter.city && (row.city ?? "").toLowerCase() !== filter.city.toLowerCase()) return false;
    return true;
  });
}

export async function listAccounts(filter: { status?: string; city?: string } = {}) {
  const session = await currentDeskSession();
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.tenantId, tenant()))
    .orderBy(asc(accounts.name));
  const allPolicies = await db
    .select()
    .from(policies)
    .where(eq(policies.tenantId, tenant()));
  const linkedContacts = session.isAdmin
    ? []
    : await db
        .select({ accountId: contactAccounts.accountId, ownerId: contacts.ownerId })
        .from(contactAccounts)
        .innerJoin(contacts, eq(contactAccounts.contactId, contacts.id))
        .where(eq(contactAccounts.tenantId, tenant()));
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
  }).filter((row) => {
    if (!session.isAdmin) {
      const policyHit = allPolicies.some((p) => p.accountId === row.id && p.ownerId === session.userId);
      const contactHit = linkedContacts.some((link) => link.accountId === row.id && link.ownerId === session.userId);
      if (!policyHit && !contactHit) return false;
    }
    if (filter.status && row.clientStatus !== filter.status) return false;
    if (filter.city && (row.city ?? "").toLowerCase() !== filter.city.toLowerCase()) return false;
    return true;
  });
}

export type PolicyListFilter = {
  status?: string;
  written?: string;
  renewal?: string;
  line?: string;
  carrier?: string;
  attention?: string;
  family?: string;
  pcSub?: string;
  lifeSub?: string;
  healthSub?: string;
  ownerId?: string;
};

export async function listPolicies(filter: PolicyListFilter = {}) {
  const session = await currentDeskSession();
  const scope = ownerWhere(session, policies.ownerId);
  const lineOptions = await loadDeskLineSettings();
  const rows = await db
    .select({
      policy: policies,
      contact: contacts,
      account: accounts,
      carrier: carriers,
      owner: users,
    })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .leftJoin(users, eq(policies.ownerId, users.id))
    .where(and(eq(policies.tenantId, tenant()), scope))
    .orderBy(asc(policies.expirationDate));

  const asOf = DESK_AS_OF;
  return rows.filter(({ policy }) => {
    const family = bookFamily(policy.lineOfBusiness);
    if (family === "life" && !lineOptions.writeLife) return false;
    if (family === "health" && !lineOptions.writeHealth) return false;
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
    if (filter.ownerId && policy.ownerId !== filter.ownerId) return false;
    if (filter.family && family !== filter.family) return false;
    if (filter.pcSub && filter.pcSub !== "all" && !isPcSubLine(policy.lineOfBusiness, filter.pcSub)) {
      return false;
    }
    if (filter.lifeSub && filter.lifeSub !== "all") {
      if (bookFamily(policy.lineOfBusiness) !== "life") return false;
      if (!matchesLifeOrHealthSub(policy.policySubType ?? policy.formType, filter.lifeSub, lineOptions.lifeOptions)) {
        return false;
      }
    }
    if (filter.healthSub && filter.healthSub !== "all") {
      if (bookFamily(policy.lineOfBusiness) !== "health") return false;
      if (
        !matchesLifeOrHealthSub(
          policy.policySubType ?? policy.formType,
          filter.healthSub,
          lineOptions.healthOptions,
        )
      ) {
        return false;
      }
    }
    if (filter.line) return policy.lineOfBusiness.toUpperCase() === filter.line.toUpperCase();
    if (filter.carrier) return policy.carrierId === filter.carrier;
    return true;
  });
}

export async function getLead(id: string) {
  if (!isUuid(id)) return null;
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, tenant()), eq(leads.id, id)));
  if (!lead) return null;
  const session = await currentDeskSession();
  if (!canViewOwned(session, lead.ownerId)) return null;
  const [converted] = lead.convertedDealId
    ? await db.select().from(deals).where(eq(deals.id, lead.convertedDealId))
    : [];
  const [byLead] = converted
    ? []
    : await db
        .select()
        .from(deals)
        .where(and(eq(deals.tenantId, tenant()), eq(deals.leadId, id)))
        .orderBy(desc(deals.updatedAt))
        .limit(1);
  const deal = converted ?? byLead ?? null;
  return {
    lead,
    deal,
    timeline: await listActivityTimeline({ leadId: id }),
    comms: await listCommsForRecord({ leadId: id }),
  };
}

export async function getContactWorkspace(id: string) {
  if (!isUuid(id)) return null;
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenant()), eq(contacts.id, id)));
  if (!contact) return null;
  const session = await currentDeskSession();
  if (!canViewOwned(session, contact.ownerId)) return null;
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
  const originDealId = relatedDeals[0]?.id;
  const [originLead] = originDealId
    ? await db
        .select()
        .from(leads)
        .where(and(eq(leads.tenantId, tenant()), eq(leads.convertedDealId, originDealId)))
    : [];
  const [originRisk] = originDealId
    ? await db.select().from(risks).where(eq(risks.dealId, originDealId))
    : [];
  const lifetime = relatedPolicies.length;
  const inForce = relatedPolicies.filter((row) => isInForcePolicyStatus(row.policy.status)).length;
  return {
    contact,
    policies: relatedPolicies,
    deals: relatedDeals,
    businesses: linked.map((row) => row.account),
    lead: originLead ?? null,
    originRisk: originRisk ?? null,
    policyCount: lifetime,
    activePolicyCount: inForce,
    clientStatus: clientStatusFromCounts(lifetime, inForce),
    timeline: await listActivityTimeline({ contactId: id }),
    comms: await listCommsForRecord({ contactId: id }),
    locations: await db
      .select()
      .from(locations)
      .where(and(eq(locations.tenantId, tenant()), eq(locations.contactId, id))),
  };
}

export async function getContact360(id: string) {
  const workspace = await getContactWorkspace(id);
  if (!workspace) return null;
  return {
    ...workspace,
    counts: { active: workspace.activePolicyCount, lifetime: workspace.policyCount },
  };
}

export async function matchReplacementNotice(input: {
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  policyNumber?: string | null;
}) {
  const rows = await db.select().from(policies).where(eq(policies.tenantId, tenant()));
  const wanted = (input.policyNumber ?? "").trim();
  const cancelled = rows.find(
    (row) =>
      wanted &&
      row.policyNumber === wanted &&
      (row.status === "cancelled" || row.status === "expired"),
  );
  const city = (input.city ?? "").trim().toLowerCase();
  const zip = (input.zip ?? "").trim();
  const matches = rows.filter((row) => {
    if (row.status === "cancelled" || row.status === "expired") return false;
    const sameCity = !city || (row.premisesCity ?? "").toLowerCase() === city;
    const sameZip = !zip || (row.premisesZip ?? "") === zip;
    return sameCity && sameZip;
  });
  return {
    ignoredCancelledNumber: cancelled?.policyNumber ?? null,
    matches: matches.map((policy) => ({ policy })),
  };
}

export async function getAccountWorkspace(id: string) {
  if (!isUuid(id)) return null;
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
  const [originRisk] = relatedDeals[0]
    ? await db.select().from(risks).where(eq(risks.dealId, relatedDeals[0].id))
    : [];
  const lifetime = relatedPolicies.length;
  const inForce = relatedPolicies.filter((row) => isInForcePolicyStatus(row.policy.status)).length;
  const session = await currentDeskSession();
  if (!session.isAdmin) {
    const ownsRelated =
      relatedPolicies.some((row) => row.policy.ownerId === session.userId) ||
      relatedDeals.some((deal) => deal.ownerId === session.userId) ||
      linked.some((row) => row.contact.ownerId === session.userId);
    if (!ownsRelated) return null;
  }
  return {
    account,
    policies: relatedPolicies,
    deals: relatedDeals,
    contacts: linked.map((row) => row.contact),
    originRisk: originRisk ?? null,
    policyCount: lifetime,
    activePolicyCount: inForce,
    clientStatus: clientStatusFromCounts(lifetime, inForce),
    timeline: await listActivityTimeline({ accountId: id }),
    comms: await listCommsForRecord({ accountId: id }),
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
  if (!isUuid(accountId) || !isUuid(certId)) return null;
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
  if (!isUuid(id)) return null;
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

export async function getPolicyRecord(id: string) {
  if (!isUuid(id)) return null;
  const actor = await getActor();
  const [row] = await db
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
    .where(and(eq(policies.tenantId, tenant()), eq(policies.id, id)));
  if (!row) return null;
  if (!canSeeOwned(actor, row.policy.ownerId)) return null;
  const commissionRows = await db
    .select({ commission: commissions })
    .from(commissions)
    .where(and(eq(commissions.tenantId, tenant()), eq(commissions.policyId, id)))
    .orderBy(desc(commissions.updatedAt));
  return { actor, ...row, commissions: commissionRows };
}

export async function getPolicyWorkspace(id: string) {
  if (!isUuid(id)) return null;
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
  const session = await currentDeskSession();
  if (!canViewOwned(session, row.policy.ownerId)) return null;
  const files = await db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, tenant()), eq(documents.policyId, id)))
    .orderBy(desc(documents.createdAt));
  const [risk] = row.policy.riskId
    ? await db.select().from(risks).where(eq(risks.id, row.policy.riskId))
    : row.policy.dealId
      ? await db.select().from(risks).where(eq(risks.dealId, row.policy.dealId))
      : [];
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
    risk: risk ?? null,
    files,
    timeline: await listActivityTimeline({ policyId: id }),
    comms: await listCommsForRecord({ policyId: id }),
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

export async function listCarrierAppointments() {
  return db
    .select()
    .from(carrierAppointments)
    .where(eq(carrierAppointments.tenantId, tenant()))
    .orderBy(asc(carrierAppointments.writtenLine));
}

export async function appointedByCarrierLine() {
  const rows = await listCarrierAppointments();
  const map = new Map<string, boolean>();
  for (const row of rows) {
    map.set(`${row.carrierId}:${row.writtenLine}`, row.appointed);
  }
  return map;
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

export async function listReviewQueue() {
  return listReviewTasks();
}

export async function listReviewTasks(opts: { all?: boolean } = {}) {
  return db
    .select()
    .from(reviewTasks)
    .where(
      opts.all
        ? eq(reviewTasks.tenantId, tenant())
        : and(eq(reviewTasks.tenantId, tenant()), eq(reviewTasks.status, "open")),
    )
    .orderBy(asc(reviewTasks.dueDate));
}

export async function getReviewTask(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select()
    .from(reviewTasks)
    .where(and(eq(reviewTasks.tenantId, tenant()), eq(reviewTasks.id, id)));
  return row ?? null;
}

export async function listUsersById() {
  const rows = await db.select().from(users).where(eq(users.tenantId, tenant()));
  return new Map(rows.map((u) => [u.id, u.name]));
}

export async function getDealWorkspace(dealId: string) {
  if (!isUuid(dealId)) return null;
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, tenant()), eq(deals.id, dealId)));
  if (!deal) return null;
  const session = await currentDeskSession();
  if (!session.isAdmin && session.userId && deal.ownerId !== session.userId) return null;

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
  const sheets = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.tenantId, tenant()), eq(quoteSheets.dealId, dealId)));
  const quoteSheet = sheets[0];
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
    sheets,
    boundPolicies,
    timeline: await listActivityTimeline({ dealId }),
    comms: await listCommsForRecord({ dealId }),
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
  const session = await currentDeskSession();
  const ownerSql =
    session.isAdmin || !session.userId ? sql`` : sql` and owner_id = ${session.userId}`;
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

  const dealScope = ownerWhere(session, deals.ownerId);
  const recentDeals = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, tenant()), dealScope))
    .orderBy(desc(deals.updatedAt))
    .limit(8);

  const tasks = await listReviewQueue();
  const unread = await listAlerts(true);
  const policyScope = ownerWhere(session, policies.ownerId);
  const expiring = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, tenant()), policyScope))
    .orderBy(asc(policies.expirationDate))
    .limit(8);

  return { stats: row, recentDeals, tasks, unread, expiring };
}

export async function ensurePipelineStages() {
  return db
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.tenantId, tenant()))
    .orderBy(asc(pipelineStages.sortOrder));
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

export async function getPipelineBoard(slug: string, sub?: { lifeSub?: string; healthSub?: string }) {
  const { ensureSeededPipelines } = await import("@/lib/wire/ensure-pipelines");
  const { dealMatchesBoard, switcherBoards } = await import("@/lib/wire/pipeline");
  await ensureSeededPipelines();
  const lineSettings = await loadDeskLineSettings();
  const boards = visiblePipelineBoards(switcherBoards(await listPipelines()), lineSettings);
  const wanted = fallbackPipelineSlug(slug, lineSettings);
  const board = boards.find((row) => row.slug === wanted) ?? boards[0] ?? null;
  if (!board) return null;
  const rows = await db
    .select({
      deal: deals,
      contact: contacts,
      lead: leads,
      risk: risks,
      account: accounts,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(leads, eq(deals.leadId, leads.id))
    .leftJoin(accounts, eq(deals.accountId, accounts.id))
    .leftJoin(risks, eq(risks.dealId, deals.id))
    .where(eq(deals.tenantId, tenant()))
    .orderBy(desc(deals.updatedAt));
  const session = await currentDeskSession();
  const seen = new Set<string>();
  const cards = [];
  for (const row of rows) {
    if (seen.has(row.deal.id)) continue;
    if (!canViewOwned(session, row.deal.ownerId)) continue;
    if (!dealMatchesBoard(row.deal, board)) continue;
    seen.add(row.deal.id);
    cards.push(row);
  }
  return {
    board,
    boards,
    lineSettings,
    cards: cards.filter((row) => {
      if (board.slug === "life" && sub?.lifeSub && sub.lifeSub !== "all") {
        return matchesLifeOrHealthSub(row.deal.policySubType, sub.lifeSub, lineSettings.lifeOptions);
      }
      if (board.slug === "health" && sub?.healthSub && sub.healthSub !== "all") {
        return matchesLifeOrHealthSub(row.deal.policySubType, sub.healthSub, lineSettings.healthOptions);
      }
      return true;
    }),
  };
}

export type PipelineCardRow = Awaited<NonNullable<Awaited<ReturnType<typeof getPipelineBoard>>>>["cards"][number];

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

export async function getFormFill(id: string) {
  const [row] = await db
    .select()
    .from(formFills)
    .where(and(eq(formFills.tenantId, tenant()), eq(formFills.id, id)));
  return row ?? null;
}

export async function latestFormFill(templateId: string) {
  const [row] = await db
    .select()
    .from(formFills)
    .where(and(eq(formFills.tenantId, tenant()), eq(formFills.formTemplateId, templateId)))
    .orderBy(desc(formFills.updatedAt))
    .limit(1);
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
  const session = await currentDeskSession();
  const [leadRows, dealRows, contactRows, accountRows, policyRows] = await Promise.all([
    db.select().from(leads).where(eq(leads.tenantId, tenant())),
    db.select().from(deals).where(eq(deals.tenantId, tenant())),
    db.select().from(contacts).where(eq(contacts.tenantId, tenant())),
    db.select().from(accounts).where(eq(accounts.tenantId, tenant())),
    db.select().from(policies).where(eq(policies.tenantId, tenant())),
  ]);
  const hits: SearchHit[] = [];
  for (const row of leadRows) {
    if (!canViewOwned(session, row.ownerId)) continue;
    if (matchesQuery(q, row.firstName, row.middleName, row.lastName, row.email, row.phone)) hits.push(hitFromLead(row));
  }
  for (const row of dealRows) {
    if (!canViewOwned(session, row.ownerId)) continue;
    if (matchesQuery(q, row.title, row.primaryNamedInsured, row.notes)) hits.push(hitFromDeal(row));
  }
  for (const row of contactRows) {
    if (!canViewOwned(session, row.ownerId)) continue;
    if (matchesQuery(q, row.firstName, row.lastName, row.email, row.phone, row.mailingAddress)) {
      hits.push(hitFromContact(row));
    }
  }
  for (const row of accountRows) {
    if (!session.isAdmin) {
      const owns = policyRows.some((policy) => policy.accountId === row.id && policy.ownerId === session.userId);
      if (!owns) continue;
    }
    if (matchesQuery(q, row.name, row.legalName, row.dba, row.ein, row.city)) {
      hits.push(hitFromBusiness(row));
    }
  }
  for (const row of policyRows) {
    if (!canViewOwned(session, row.ownerId)) continue;
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
  const rows = await listDeals({ attention: "bound_pending" });
  const policyRows = await db
    .select({ contactId: policies.contactId })
    .from(policies)
    .where(eq(policies.tenantId, tenant()));
  const covered = new Set(policyRows.map((p) => p.contactId));
  return rows.filter(
    ({ deal }) => !deal.contactId || !covered.has(deal.contactId),
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
  if (!isUuid(id)) return null;
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
  if (dealId && !isUuid(dealId)) return [];
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
  if (!isUuid(contactId)) return [];
  return db
    .select()
    .from(clientHistory)
    .where(and(eq(clientHistory.tenantId, tenant()), eq(clientHistory.contactId, contactId)))
    .orderBy(desc(clientHistory.occurredAt));
}
