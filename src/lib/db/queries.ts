import { cache } from "react";
import { and, asc, desc, eq, exists, gte, inArray, isNull, lte, ne, notInArray, or, sql, type SQL } from "drizzle-orm";
import { alias, type AnyPgColumn } from "drizzle-orm/pg-core";
import { canSeeOwned } from "@/lib/auth/rbac";
import { currentDeskSession, getActor, sessionSeesAgencyBook, type DeskSession } from "@/lib/auth/session";
import { alertVisibleWhere } from "@/lib/alerts/visibility";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { sessionCanRevealPortal } from "@/lib/policy/agent-policy-access-prefs";
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
import { rankAgents } from "@/lib/home/leaderboard";
import {
  hiddenForPreset,
  parseBookScope,
  parseDashboardPreset,
  parseHiddenWidgets,
  type BookScope,
  type DashboardPreset,
  type HomeWidgetId,
} from "@/lib/home/presets";
import { parseLeadOfferKind, parseLeadOfferStatus, type LeadOfferKind, type LeadOfferStatus } from "@/lib/home/lead-offers";
import { parseNamedHomeLayouts } from "@/lib/home/custom-layouts";
import type { NamedHomeLayout } from "@/lib/home/layout";
import { currentOwnerHomeScope, type OwnerHomeScope } from "@/lib/home/scope";
import { filterByBookScope, type BookScopeOption } from "@/lib/org/book-scope";
import { resolveBookScope } from "@/lib/org/queries";
import { bookFamily, isPcSubLine } from "@/lib/desk/policy-line";
import { dealMatchesStage, isKnownStageToken } from "@/lib/wire/pipeline";
import {
  fallbackPipelineSlug,
  matchesLifeOrHealthSub,
  visiblePipelineBoards,
} from "@/lib/desk/line-settings";
import { loadDeskLineSettings } from "./line-settings";
import { publicCarrierView } from "@/lib/carriers/secrets";
import {
  lineOfBusinessValuesForSheet,
  normalizeAppetiteLine,
} from "@/lib/appetite/training-datasheet";
import {
  AUTO_PREMIUM_LINE_VALUES,
  type AutoPremiumDatasheetFilters,
} from "@/lib/appetite/auto-premium-learning";
import type { PartyRecord } from "@/lib/crm/party-typeahead";
import { partyLabel } from "@/lib/deals/lookup";
import { db, sql as rawSql } from "./index";
import {
  accounts,
  activities,
  agencySettings,
  activityLogs,
  alerts,
  calendarInvites,
  appetiteRules,
  carrierActivityEvents,
  carrierAmBestHistory,
  carrierAppointments,
  carriers,
  carrierSecretRevealLogs,
  clientHistory,
  contactAccounts,
  contactCoapplicants,
  contacts,
  deals,
  documents,
  documentVersions,
  documentAccessLogs,
  emailSendJobs,
  emailTemplates,
  emailTriggers,
  extractedFields,
  fillLearningLogs,
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
  policyAttachments,
  policyChangeLogs,
  policyTerms,
  extractionJobs,
  fillFeedbackLogs,
  quoteAttemptLogs,
  quoteSheets,
  quotes,
  quoteNotes,
  recordAsks,
  renewalCompareLogs,
  reviewTasks,
  risks,
  tenants,
  telephonySettings,
  esignSettings,
  signatureEnvelopes,
  users,
  vehicles,
  contests,
  leadOfferClaims,
  leadOffers,
  userDashboardPrefs,
} from "./schema";
import { attachQuotePdfs } from "@/lib/quotes/board";
import { groupTrackingShops, buildTrackingRows } from "@/lib/quotes/tracking";
import {
  hitFromBusiness,
  hitFromCarrier,
  hitFromContact,
  hitFromDeal,
  hitFromLead,
  hitFromPolicy,
  matchesQuery,
  rankHits,
  type SearchHit,
} from "@/lib/wire/search";
import {
  inboxStubFromActivity,
  inboxStubFromLeadOffer,
  sortInboxStubs,
  type InboxStub,
} from "@/lib/desk/inbox";

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
  producerName: string | null;
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

  const [logs, history] = await Promise.all([
    logClauses.length
      ? db
          .select({ log: activityLogs, activity: activities })
          .from(activityLogs)
          .innerJoin(activities, eq(activityLogs.activityId, activities.id))
          .where(and(eq(activityLogs.tenantId, tenant()), or(...logClauses)))
          .orderBy(desc(activityLogs.occurredAt))
      : Promise.resolve([]),
    historyClauses.length
      ? db
          .select()
          .from(clientHistory)
          .where(and(eq(clientHistory.tenantId, tenant()), or(...historyClauses)))
          .orderBy(desc(clientHistory.occurredAt))
      : Promise.resolve([]),
  ]);

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
      producerName: log.producerName ?? null,
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
      producerName: null,
    })),
  ];
  items.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  return items;
}

export function commsFromTimeline(items: TimelineItem[]): TimelineItem[] {
  return items.filter((item) =>
    ["email", "sms", "call", "meeting", "task"].includes(item.kind.toLowerCase()),
  );
}

export async function listCommsForRecord(filter: {
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
}): Promise<TimelineItem[]> {
  return commsFromTimeline(await listActivityTimeline(filter));
}

export function serializeActivity(row: typeof activities.$inferSelect) {
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

export async function listRecordActivities(filter: {
  dealId?: string;
  leadId?: string;
  accountId?: string;
  contactId?: string;
  policyId?: string;
}) {
  const clauses = [eq(activities.tenantId, tenant())];
  if (filter.dealId) clauses.push(eq(activities.dealId, filter.dealId));
  if (filter.leadId) clauses.push(eq(activities.leadId, filter.leadId));
  if (filter.accountId) clauses.push(eq(activities.accountId, filter.accountId));
  if (filter.contactId) clauses.push(eq(activities.contactId, filter.contactId));
  if (filter.policyId) clauses.push(eq(activities.policyId, filter.policyId));
  const rows = await db
    .select()
    .from(activities)
    .where(and(...clauses))
    .orderBy(desc(activities.createdAt));
  return rows.map(serializeActivity);
}

export async function listAsksForEntities(entityType: string, entityIds: string[]) {
  const ids = entityIds.filter(isUuid);
  if (ids.length === 0) return [];
  const askAuthor = alias(users, "ask_author");
  const rows = await db
    .select({
      ask: recordAsks,
      author: askAuthor,
    })
    .from(recordAsks)
    .leftJoin(askAuthor, eq(recordAsks.authorId, askAuthor.id))
    .where(and(eq(recordAsks.tenantId, tenant()), eq(recordAsks.entityType, entityType)))
    .orderBy(desc(recordAsks.createdAt));
  return rows
    .filter((row) => ids.includes(row.ask.entityId))
    .map((row) => ({
      ask: row.ask,
      author: { name: row.author?.name ?? "Desk" },
    }));
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
  const session = await currentDeskSession();
  const [row] = await db
    .select({ carrier: carriers, rule: appetiteRules })
    .from(carriers)
    .leftJoin(appetiteRules, eq(appetiteRules.carrierId, carriers.id))
    .where(and(eq(carriers.tenantId, tenant()), eq(carriers.id, id)));
  if (!row) return null;
  const revealPortal = await sessionCanRevealPortal(session);
  return { carrier: publicCarrierView(row.carrier, { revealPortal }), rule: row.rule };
}

export async function listCalendarActivities(_from: Date, _to: Date) {
  const session = await currentDeskSession();
  const invited =
    session.userId
      ? exists(
          db
            .select({ id: calendarInvites.id })
            .from(calendarInvites)
            .where(
              and(
                eq(calendarInvites.activityId, activities.id),
                eq(calendarInvites.userId, session.userId),
                eq(calendarInvites.tenantId, tenant()),
              ),
            ),
        )
      : sql`false`;
  const scope = sessionSeesAgencyBook(session)
    ? undefined
    : session.name
      ? or(eq(activities.assignee, session.name), eq(activities.assignee, session.userId ?? ""), invited)
      : invited;
  return db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, tenant()), scope))
    .orderBy(asc(activities.startAt), asc(activities.dueAt));
}

export async function listCallLog() {
  const session = await currentDeskSession();
  const scope = sessionSeesAgencyBook(session)
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

export async function listInboxStubs(): Promise<InboxStub[]> {
  const [logRows, offerRows] = await Promise.all([
    db
      .select({
        id: activityLogs.id,
        kind: activityLogs.kind,
        fromAddress: activityLogs.fromAddress,
        subject: activityLogs.subject,
        body: activityLogs.body,
        occurredAt: activityLogs.occurredAt,
        contactId: activityLogs.contactId,
        accountId: activityLogs.accountId,
        policyId: activityLogs.policyId,
        dealId: activityLogs.dealId,
        leadId: activityLogs.leadId,
      })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.tenantId, tenant()),
          eq(activityLogs.direction, "inbound"),
          or(eq(activityLogs.kind, "email"), eq(activityLogs.kind, "sms")),
        ),
      )
      .orderBy(desc(activityLogs.occurredAt)),
    db
      .select()
      .from(leadOffers)
      .where(and(eq(leadOffers.tenantId, tenant()), eq(leadOffers.kind, "inbound_email")))
      .orderBy(desc(leadOffers.createdAt)),
  ]);

  return sortInboxStubs([
    ...logRows.map(inboxStubFromActivity),
    ...offerRows.map(inboxStubFromLeadOffer),
  ]);
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

export async function getInDeskEnvelopeByToken(token: string) {
  const [row] = await db
    .select({
      envelope: signatureEnvelopes,
      document: documents,
    })
    .from(signatureEnvelopes)
    .innerJoin(documents, eq(signatureEnvelopes.documentId, documents.id))
    .where(
      and(
        eq(signatureEnvelopes.tenantId, tenant()),
        eq(signatureEnvelopes.publicToken, token),
        eq(signatureEnvelopes.mode, "in_desk"),
      ),
    );
  return row ?? null;
}

export async function getLatestInDeskEnvelope(input: {
  dealId?: string | null;
  policyId?: string | null;
}) {
  const scope = input.policyId
    ? eq(signatureEnvelopes.policyId, input.policyId)
    : input.dealId
      ? eq(signatureEnvelopes.dealId, input.dealId)
      : null;
  if (!scope) return null;
  const [row] = await db
    .select()
    .from(signatureEnvelopes)
    .where(and(eq(signatureEnvelopes.tenantId, tenant()), eq(signatureEnvelopes.mode, "in_desk"), scope))
    .orderBy(desc(signatureEnvelopes.updatedAt))
    .limit(1);
  return row ?? null;
}

const tenant = () => DEFAULT_TENANT_ID;

function ownerWhere(session: DeskSession, column: AnyPgColumn): SQL | undefined {
  if (sessionSeesAgencyBook(session)) return undefined;
  if (session.userId) return eq(column, session.userId);
  return sql`false`;
}

function canViewOwned(session: DeskSession, ownerId: string | null | undefined): boolean {
  if (sessionSeesAgencyBook(session)) return true;
  if (!session.signedIn || !session.userId) return false;
  return ownerId === session.userId;
}

export const listUsers = cache(async function listUsers() {
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
});

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
    .where(and(eq(leads.tenantId, tenant()), scope, isNull(leads.archivedAt), isNull(leads.mergedIntoId)))
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
  const { ensureDealTitles } = await import("@/lib/deals/retitle");
  await ensureDealTitles().catch(() => null);
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
    // Tip sep7ga: stable pipeline list order — stage changes touch updatedAt, not createdAt.
    .orderBy(desc(deals.createdAt), asc(deals.id));
  const session = await currentDeskSession();
  const seen = new Set<string>();
  return rows.filter(({ deal }) => {
    if (seen.has(deal.id)) return false;
    seen.add(deal.id);
    if (!canViewOwned(session, deal.ownerId)) return false;
    if (deal.archivedAt) return false;
    const family = bookFamily(deal.lineOfBusiness);
    if (family === "life" && !lineOptions.writeLife) return false;
    if (family === "health" && !lineOptions.writeHealth) return false;
    const stage = deal.pipelineStage.toLowerCase();
    if (filter.ownerId && deal.ownerId !== filter.ownerId) return false;
    if (filter.attention === "bound_pending") return WON_STAGES.has(stage);
    if (filter.stage === "open") return OPEN_QUOTE_STAGES.has(stage);
    if (filter.stage === "quote_sent") return QUOTE_SENT_STAGES.has(stage);
    if (filter.stage === "won") return WON_STAGES.has(stage);
    if (filter.stage && isKnownStageToken(filter.stage)) return dealMatchesStage(deal, filter.stage);
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
  return rows.map(({ deal, contact, account, lead }) => ({
    id: deal.id,
    title: deal.title,
    partyName: partyLabel({ contact, account }) || [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") || null,
    email: contact?.email ?? account?.email ?? null,
    phone: contact?.phone ?? account?.phone ?? null,
    contactId: deal.contactId ?? contact?.id ?? null,
    accountId: deal.accountId ?? account?.id ?? null,
    firstName: contact?.firstName ?? lead?.firstName ?? null,
    lastName: contact?.lastName ?? lead?.lastName ?? null,
    lineOfBusiness: deal.lineOfBusiness,
  }));
}

export async function listPartyTypeahead(): Promise<PartyRecord[]> {
  const session = await currentDeskSession();
  const contactScope = ownerWhere(session, contacts.ownerId);
  const [contactRows, accountRows, policyRows, linkedContacts] = await Promise.all([
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
      })
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenant()), contactScope))
      .orderBy(asc(contacts.lastName), asc(contacts.firstName)),
    db
      .select({
        id: accounts.id,
        name: accounts.name,
        legalName: accounts.legalName,
        dba: accounts.dba,
        email: accounts.email,
        phone: accounts.phone,
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.tenantId, tenant()),
          isNull(accounts.archivedAt),
          isNull(accounts.mergedIntoId),
        ),
      )
      .orderBy(asc(accounts.name)),
    sessionSeesAgencyBook(session)
      ? Promise.resolve([] as Array<{ accountId: string | null; ownerId: string | null }>)
      : db
          .select({ accountId: policies.accountId, ownerId: policies.ownerId })
          .from(policies)
          .where(eq(policies.tenantId, tenant())),
    sessionSeesAgencyBook(session)
      ? Promise.resolve([] as Array<{ accountId: string | null; ownerId: string | null }>)
      : db
          .select({ accountId: contactAccounts.accountId, ownerId: contacts.ownerId })
          .from(contactAccounts)
          .innerJoin(contacts, eq(contactAccounts.contactId, contacts.id))
          .where(eq(contactAccounts.tenantId, tenant())),
  ]);

  const contactsBook: PartyRecord[] = contactRows.map((row) => ({
    kind: "contact",
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
  }));

  const businesses: PartyRecord[] = accountRows
    .filter((row) => {
      if (sessionSeesAgencyBook(session)) return true;
      const policyHit = policyRows.some((p) => p.accountId === row.id && p.ownerId === session.userId);
      const contactHit = linkedContacts.some(
        (link) => link.accountId === row.id && link.ownerId === session.userId,
      );
      return policyHit || contactHit;
    })
    .map((row) => ({
      kind: "business",
      id: row.id,
      name: row.name,
      legalName: row.legalName,
      dba: row.dba,
      email: row.email,
      phone: row.phone,
    }));

  return [...contactsBook, ...businesses];
}

export async function listContacts(filter: { status?: string; ownerId?: string; city?: string } = {}) {
  const session = await currentDeskSession();
  const scope = ownerWhere(session, contacts.ownerId);
  const rows = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenant()), scope, isNull(contacts.archivedAt), isNull(contacts.mergedIntoId)))
    .orderBy(asc(contacts.lastName));
  const allPolicies = await db
    .select()
    .from(policies)
    .where(eq(policies.tenantId, tenant()));
  const allDeals = await db
    .select({ id: deals.id, contactId: deals.contactId, updatedAt: deals.updatedAt })
    .from(deals)
    .where(eq(deals.tenantId, tenant()));
  const activityRows = await db
    .select({ contactId: activities.contactId, updatedAt: activities.updatedAt, startAt: activities.startAt })
    .from(activities)
    .where(eq(activities.tenantId, tenant()));
  const lastByContact = new Map<string, Date>();
  for (const row of activityRows) {
    if (!row.contactId) continue;
    const at = row.startAt ?? row.updatedAt;
    if (!at) continue;
    const prev = lastByContact.get(row.contactId);
    if (!prev || at.getTime() > prev.getTime()) lastByContact.set(row.contactId, at);
  }
  for (const row of allDeals) {
    if (!row.contactId || !row.updatedAt) continue;
    const prev = lastByContact.get(row.contactId);
    if (!prev || row.updatedAt.getTime() > prev.getTime()) lastByContact.set(row.contactId, row.updatedAt);
  }
  return rows.map((contact) => {
    const related = allPolicies.filter((p) => p.contactId === contact.id);
    const relatedDeals = allDeals.filter((d) => d.contactId === contact.id);
    const counts = {
      lifetime: related.length,
      inForce: related.filter((p) => isInForcePolicyStatus(p.status)).length,
      lifetimeDeals: relatedDeals.length,
    };
    const lastActivityAt = lastByContact.get(contact.id) ?? contact.updatedAt ?? null;
    return {
      ...contact,
      policyCount: counts.lifetime,
      activePolicyCount: counts.inForce,
      lifetimeDealCount: counts.lifetimeDeals,
      lastActivityAt,
      clientStatus: clientStatusFromCounts(counts.lifetime, counts.inForce),
    };
  }).filter((row) => {
    if (filter.ownerId && row.ownerId !== filter.ownerId) return false;
    if (filter.status && row.clientStatus !== filter.status) return false;
    if (filter.city && (row.city ?? "").toLowerCase() !== filter.city.toLowerCase()) return false;
    return true;
  });
}

export async function listAccounts(filter: { status?: string; city?: string; industry?: string } = {}) {
  const session = await currentDeskSession();
  const rows = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.tenantId, tenant()),
        isNull(accounts.archivedAt),
        isNull(accounts.mergedIntoId),
      ),
    )
    .orderBy(asc(accounts.name));
  const allPolicies = await db
    .select()
    .from(policies)
    .where(eq(policies.tenantId, tenant()));
  const allLinks = await db
    .select({ accountId: contactAccounts.accountId, ownerId: contacts.ownerId })
    .from(contactAccounts)
    .innerJoin(contacts, eq(contactAccounts.contactId, contacts.id))
    .where(eq(contactAccounts.tenantId, tenant()));
  const linkCountByAccount = new Map<string, number>();
  for (const link of allLinks) {
    linkCountByAccount.set(link.accountId, (linkCountByAccount.get(link.accountId) ?? 0) + 1);
  }
  const activityRows = await db
    .select({
      accountId: activities.accountId,
      updatedAt: activities.updatedAt,
      startAt: activities.startAt,
    })
    .from(activities)
    .where(eq(activities.tenantId, tenant()));
  const lastByAccount = new Map<string, Date>();
  for (const row of activityRows) {
    if (!row.accountId) continue;
    const at = row.startAt ?? row.updatedAt;
    if (!at) continue;
    const prev = lastByAccount.get(row.accountId);
    if (!prev || at.getTime() > prev.getTime()) lastByAccount.set(row.accountId, at);
  }
  for (const p of allPolicies) {
    if (!p.accountId || !p.updatedAt) continue;
    const prev = lastByAccount.get(p.accountId);
    if (!prev || p.updatedAt.getTime() > prev.getTime()) lastByAccount.set(p.accountId, p.updatedAt);
  }
  return rows.map((account) => {
    const related = allPolicies.filter((p) => p.accountId === account.id);
    const counts = {
      lifetime: related.length,
      inForce: related.filter((p) => isInForcePolicyStatus(p.status)).length,
    };
    const industry = account.industry || account.naics || account.operations || null;
    const lastActivityAt = lastByAccount.get(account.id) ?? account.updatedAt ?? null;
    return {
      ...account,
      industry,
      policyCount: counts.lifetime,
      activePolicyCount: counts.inForce,
      linkedContactsCount: linkCountByAccount.get(account.id) ?? 0,
      lastActivityAt,
      clientStatus: clientStatusFromCounts(counts.lifetime, counts.inForce),
    };
  }).filter((row) => {
    if (!sessionSeesAgencyBook(session)) {
      const policyHit = allPolicies.some((p) => p.accountId === row.id && p.ownerId === session.userId);
      const contactHit = allLinks.some((link) => link.accountId === row.id && link.ownerId === session.userId);
      if (!policyHit && !contactHit) return false;
    }
    if (filter.status && row.clientStatus !== filter.status) return false;
    if (filter.city && (row.city ?? "").toLowerCase() !== filter.city.toLowerCase()) return false;
    if (filter.industry) {
      const ind = (row.industry ?? "").toLowerCase();
      if (ind !== filter.industry.toLowerCase()) return false;
    }
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
    if (filter.renewal) {
      const days = Number(filter.renewal);
      if (Number.isFinite(days) && days > 0) {
        return (
          IN_FORCE_STATUSES.has(status) &&
          policy.expirationDate > asOf &&
          policy.expirationDate <= addUtcDays(asOf, days)
        );
      }
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
  const docs = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.tenantId, tenant()),
        eq(documents.leadId, id),
        ne(documents.status, "hidden"),
      ),
    )
    .orderBy(desc(documents.createdAt));
  return {
    lead,
    deal,
    docs,
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
  const coLinks = await db
    .select({
      link: contactCoapplicants,
      linked: contacts,
    })
    .from(contactCoapplicants)
    .innerJoin(contacts, eq(contactCoapplicants.linkedContactId, contacts.id))
    .where(and(eq(contactCoapplicants.tenantId, tenant()), eq(contactCoapplicants.contactId, id)));
  const reverseCoLinks = await db
    .select({
      link: contactCoapplicants,
      linked: contacts,
    })
    .from(contactCoapplicants)
    .innerJoin(contacts, eq(contactCoapplicants.contactId, contacts.id))
    .where(and(eq(contactCoapplicants.tenantId, tenant()), eq(contactCoapplicants.linkedContactId, id)));
  const coApplicantsMap = new Map<string, (typeof coLinks)[number]["linked"]>();
  for (const row of [...coLinks, ...reverseCoLinks]) {
    if (row.linked.id === id) continue;
    coApplicantsMap.set(row.linked.id, row.linked);
  }
  const coApplicants = [...coApplicantsMap.values()];
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
    coApplicants,
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
  // Named-insured contacts on account policies (policy.contactId) — not contact_coapplicants.
  const namedInsuredIds = [
    ...new Set(
      relatedPolicies
        .map((row) => row.policy.contactId)
        .filter((cid): cid is string => Boolean(cid)),
    ),
  ];
  const namedInsuredRows =
    namedInsuredIds.length > 0
      ? await db
          .select({
            id: contacts.id,
            firstName: contacts.firstName,
            lastName: contacts.lastName,
          })
          .from(contacts)
          .where(and(eq(contacts.tenantId, tenant()), inArray(contacts.id, namedInsuredIds)))
      : [];
  const namedInsuredById = new Map(namedInsuredRows.map((row) => [row.id, row]));
  const [originRisk] = relatedDeals[0]
    ? await db.select().from(risks).where(eq(risks.dealId, relatedDeals[0].id))
    : [];
  const lifetime = relatedPolicies.length;
  const inForce = relatedPolicies.filter((row) => isInForcePolicyStatus(row.policy.status)).length;
  const session = await currentDeskSession();
  if (!sessionSeesAgencyBook(session)) {
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
    /** Policy named-insured contacts by contact id (for coAppliesWith reverse lookup). */
    namedInsuredById,
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

export async function listPolicyChangeLogs(policyId: string) {
  if (!isUuid(policyId)) return [];
  return db
    .select()
    .from(policyChangeLogs)
    .where(and(eq(policyChangeLogs.tenantId, tenant()), eq(policyChangeLogs.policyId, policyId)))
    .orderBy(desc(policyChangeLogs.changedAt), desc(policyChangeLogs.createdAt));
}

export async function listDocumentVersionsForIds(documentIds: string[]) {
  const ids = documentIds.filter((id) => isUuid(id));
  if (ids.length === 0) return [];
  return db
    .select()
    .from(documentVersions)
    .where(and(eq(documentVersions.tenantId, tenant()), inArray(documentVersions.documentId, ids)))
    .orderBy(desc(documentVersions.versionNumber));
}


export async function listDocumentAccessLogsForPolicy(policyId: string) {
  if (!isUuid(policyId)) return [];
  return db
    .select({
      id: documentAccessLogs.id,
      actorName: documentAccessLogs.actorName,
      action: documentAccessLogs.action,
      createdAt: documentAccessLogs.createdAt,
      documentId: documentAccessLogs.documentId,
    })
    .from(documentAccessLogs)
    .where(
      and(
        eq(documentAccessLogs.tenantId, tenant()),
        eq(documentAccessLogs.policyId, policyId),
      ),
    )
    .orderBy(desc(documentAccessLogs.createdAt))
    .limit(50);
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
    .where(
      and(
        eq(documents.tenantId, tenant()),
        eq(documents.policyId, id),
        ne(documents.status, "hidden"),
      ),
    )
    .orderBy(desc(documents.createdAt));
  const filingAttachments = await db
    .select()
    .from(policyAttachments)
    .where(and(eq(policyAttachments.tenantId, tenant()), eq(policyAttachments.policyId, id)))
    .orderBy(desc(policyAttachments.createdAt));
  const fileVersions = await listDocumentVersionsForIds(files.map((file) => file.id));
  const changeLogs = await listPolicyChangeLogs(id);
  const [risk] = row.policy.riskId
    ? await db.select().from(risks).where(eq(risks.id, row.policy.riskId))
    : row.policy.dealId
      ? await db.select().from(risks).where(eq(risks.dealId, row.policy.dealId))
      : [];
  const { getPolicyWorkBundle } = await import("@/lib/work-queue/list");
  const [location] = row.policy.locationId
    ? await db
        .select()
        .from(locations)
        .where(and(eq(locations.tenantId, tenant()), eq(locations.id, row.policy.locationId)))
    : [];
  const sheetRows = row.policy.dealId
    ? await db
        .select()
        .from(quoteSheets)
        .where(and(eq(quoteSheets.tenantId, tenant()), eq(quoteSheets.dealId, row.policy.dealId)))
    : [];
  const quoteSheet =
    sheetRows.find((row) => row.line === "home") ??
    sheetRows[0] ??
    null;
  const [terms, compareLogs, vehicleRows, work] = await Promise.all([
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
    getPolicyWorkBundle(id),
  ]);
  return {
    ...row,
    risk: risk ?? null,
    location: location ?? null,
    quoteSheet,
    files,
    filingAttachments,
    fileVersions,
    changeLogs,
    timeline: await listActivityTimeline({ policyId: id }),
    comms: await listCommsForRecord({ policyId: id }),
    terms,
    compareLogs,
    vehicles: vehicleRows,
    work,
  };
}

export async function listCarriers() {
  const session = await currentDeskSession();
  const rows = await db
    .select({
      carrier: carriers,
      rule: appetiteRules,
    })
    .from(carriers)
    .leftJoin(appetiteRules, eq(appetiteRules.carrierId, carriers.id))
    .where(eq(carriers.tenantId, tenant()))
    .orderBy(asc(carriers.name));
  const revealPortal = await sessionCanRevealPortal(session);
  return rows.map(({ carrier, rule }) => ({
    carrier: publicCarrierView(carrier, { revealPortal }),
    rule,
  }));
}


export type CarrierDeskRow = {
  carrier: Awaited<ReturnType<typeof listCarriers>>[number]["carrier"];
  rule: Awaited<ReturnType<typeof listCarriers>>[number]["rule"];
  activePolicyCount: number;
  premiumVolume: number;
  lastQuoteAt: Date | null;
  lastIssuedAt: Date | null;
  hasActiveBusiness: boolean;
  portalCredStatus: "connected" | "missing_credentials" | "no_portal";
  hitRate: number | null;
  avgDaysToBind: number | null;
  commissionEarned: number;
  autoLabel: string;
};

/** List carriers with policy/premium/last-quote aggregates for the desk list. */
export async function listCarriersDesk(): Promise<CarrierDeskRow[]> {
  const session = await currentDeskSession();
  const rows = await db
    .select({
      carrier: carriers,
      rule: appetiteRules,
    })
    .from(carriers)
    .leftJoin(appetiteRules, eq(appetiteRules.carrierId, carriers.id))
    .where(
      and(
        eq(carriers.tenantId, tenant()),
        sql`coalesce(${carriers.active}, true) = true`,
        sql`lower(${carriers.name}) not like '%(merged)%'`,
      ),
    )
    .orderBy(asc(carriers.name));

  const policyAgg = await db
    .select({
      carrierId: policies.carrierId,
      activeCount: sql<number>`count(*) filter (where lower(${policies.status}) in ('active', 'in_force', 'in-force'))::int`,
      premiumVolume: sql<string>`coalesce(sum(case when lower(${policies.status}) in ('active', 'in_force', 'in-force') then ${policies.premium}::numeric else 0 end), 0)`,
      lastIssuedAt: sql<Date>`max(${policies.effectiveDate})`,
    })
    .from(policies)
    .where(and(eq(policies.tenantId, tenant()), sql`${policies.carrierId} is not null`))
    .groupBy(policies.carrierId);

  const quoteAgg = await db
    .select({
      carrierId: quoteAttemptLogs.carrierId,
      lastQuoteAt: sql<Date>`max(${quoteAttemptLogs.attemptedAt})`,
    })
    .from(quoteAttemptLogs)
    .where(eq(quoteAttemptLogs.tenantId, tenant()))
    .groupBy(quoteAttemptLogs.carrierId);

  const policyMap = new Map(
    policyAgg
      .filter((r) => r.carrierId)
      .map((r) => [
        r.carrierId as string,
        {
          activeCount: Number(r.activeCount ?? 0),
          premiumVolume: Number(r.premiumVolume ?? 0),
          lastIssuedAt: r.lastIssuedAt ? new Date(r.lastIssuedAt) : null,
        },
      ]),
  );
  const quoteMap = new Map(
    quoteAgg.map((r) => [r.carrierId, r.lastQuoteAt ? new Date(r.lastQuoteAt) : null]),
  );

  const { portalCredentialStatus } = await import("@/lib/carriers/portal-status");

  const quoteStats = await db
    .select({
      carrierId: quoteAttemptLogs.carrierId,
      requested: sql<number>`count(*)::int`,
      bound: sql<number>`count(*) filter (where ${quoteAttemptLogs.bindable} = true or lower(${quoteAttemptLogs.result}) ~ '(bound|won|issued|bound_policy)')::int`,
    })
    .from(quoteAttemptLogs)
    .where(eq(quoteAttemptLogs.tenantId, tenant()))
    .groupBy(quoteAttemptLogs.carrierId);
  const quoteStatMap = new Map(
    quoteStats.map((r) => [
      r.carrierId,
      { requested: Number(r.requested ?? 0), bound: Number(r.bound ?? 0) },
    ]),
  );

  const daysAgg = await db
    .select({
      carrierId: policies.carrierId,
      avgDays: sql<string>`avg(extract(epoch from (${policies.createdAt} - ${quoteAttemptLogs.attemptedAt})) / 86400.0)`,
    })
    .from(policies)
    .innerJoin(
      quoteAttemptLogs,
      and(
        eq(quoteAttemptLogs.carrierId, policies.carrierId),
        eq(quoteAttemptLogs.tenantId, policies.tenantId),
        sql`${quoteAttemptLogs.dealId} is not null and ${quoteAttemptLogs.dealId} = ${policies.dealId}`,
      ),
    )
    .where(and(eq(policies.tenantId, tenant()), sql`${policies.carrierId} is not null`))
    .groupBy(policies.carrierId);
  const daysMap = new Map(
    daysAgg
      .filter((r) => r.carrierId)
      .map((r) => [r.carrierId as string, r.avgDays != null ? Number(r.avgDays) : null]),
  );

  const commAgg = await db
    .select({
      carrierId: policies.carrierId,
      earned: sql<string>`coalesce(sum(coalesce(${policies.commission4}::numeric, 0)), 0)`,
    })
    .from(policies)
    .where(and(eq(policies.tenantId, tenant()), sql`${policies.carrierId} is not null`))
    .groupBy(policies.carrierId);
  const commMap = new Map(
    commAgg
      .filter((r) => r.carrierId)
      .map((r) => [r.carrierId as string, Number(r.earned ?? 0)]),
  );

  const { computeHitRate } = await import("@/lib/carriers/metrics");

  const revealPortal = await sessionCanRevealPortal(session);
  return rows.map(({ carrier, rule }) => {
    const pub = publicCarrierView(carrier, { revealPortal });
    const agg = policyMap.get(carrier.id) ?? { activeCount: 0, premiumVolume: 0, lastIssuedAt: null as Date | null };
    const lastQuoteAt = quoteMap.get(carrier.id) ?? null;
    const lastIssuedAt = agg.lastIssuedAt ?? null;
    const portalCredStatus = portalCredentialStatus({
      portalUrl: carrier.portalUrl,
      hasPortalUsername: Boolean(carrier.portalUsernameEnc && carrier.portalUsernameIv),
      hasPortalPassword: Boolean(carrier.portalPasswordEnc && carrier.portalPasswordIv),
    });
    const hasActiveBusiness = agg.activeCount > 0 || agg.premiumVolume > 0;
    const qs = quoteStatMap.get(carrier.id) ?? { requested: 0, bound: 0 };
    const autoLabel = [
      carrier.name,
      carrier.agencyCode?.trim() || null,
      (carrier.writtenLines ?? []).slice(0, 2).join(", ") || null,
    ]
      .filter(Boolean)
      .join(" / ");
    return {
      carrier: pub,
      rule,
      activePolicyCount: agg.activeCount,
      premiumVolume: agg.premiumVolume,
      lastQuoteAt,
      lastIssuedAt,
      hasActiveBusiness,
      portalCredStatus,
      hitRate: computeHitRate(qs.requested, qs.bound),
      avgDaysToBind: daysMap.get(carrier.id) ?? null,
      commissionEarned: commMap.get(carrier.id) ?? 0,
      autoLabel,
    };
  });
}

export async function getCarrierWorkspace(id: string) {
  if (!isUuid(id)) return null;
  const session = await currentDeskSession();
  const [row] = await db
    .select({ carrier: carriers, rule: appetiteRules })
    .from(carriers)
    .leftJoin(appetiteRules, eq(appetiteRules.carrierId, carriers.id))
    .where(and(eq(carriers.tenantId, tenant()), eq(carriers.id, id)));
  if (!row) return null;

  const [policyStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      activeCount: sql<number>`count(*) filter (where lower(${policies.status}) in ('active', 'in_force', 'in-force'))::int`,
      premiumVolume: sql<string>`coalesce(sum(case when lower(${policies.status}) in ('active', 'in_force', 'in-force') then ${policies.premium}::numeric else 0 end), 0)`,
    })
    .from(policies)
    .where(and(eq(policies.tenantId, tenant()), eq(policies.carrierId, id)));

  let dealCount = 0;
  try {
    const byName = await db
      .select({ id: deals.id })
      .from(deals)
      .where(
        and(
          eq(deals.tenantId, tenant()),
          sql`lower(coalesce(${deals.currentCarrier}, '')) = lower(${row.carrier.name})`,
        ),
      );
    dealCount = byName.length;
  } catch {
    dealCount = 0;
  }

  const contactCountRows = await db
    .select({ contactId: policies.contactId })
    .from(policies)
    .where(
      and(
        eq(policies.tenantId, tenant()),
        eq(policies.carrierId, id),
        sql`${policies.contactId} is not null`,
      ),
    );
  const contactCount = new Set(contactCountRows.map((r) => r.contactId).filter(Boolean)).size;

  const revealLogs = session.isAdmin
    ? await db
        .select({
          id: carrierSecretRevealLogs.id,
          fieldKey: carrierSecretRevealLogs.fieldKey,
          actorName: carrierSecretRevealLogs.actorName,
          createdAt: carrierSecretRevealLogs.createdAt,
        })
        .from(carrierSecretRevealLogs)
        .where(
          and(
            eq(carrierSecretRevealLogs.tenantId, tenant()),
            eq(carrierSecretRevealLogs.carrierId, id),
          ),
        )
        .orderBy(desc(carrierSecretRevealLogs.createdAt))
        .limit(40)
    : [];

  const activityRows = await db
    .select({
      id: carrierActivityEvents.id,
      kind: carrierActivityEvents.kind,
      title: carrierActivityEvents.title,
      detail: carrierActivityEvents.detail,
      actorName: carrierActivityEvents.actorName,
      occurredAt: carrierActivityEvents.occurredAt,
    })
    .from(carrierActivityEvents)
    .where(
      and(
        eq(carrierActivityEvents.tenantId, tenant()),
        eq(carrierActivityEvents.carrierId, id),
      ),
    )
    .orderBy(desc(carrierActivityEvents.occurredAt))
    .limit(80);

  const amBestHistoryRows = await db
    .select({
      id: carrierAmBestHistory.id,
      rating: carrierAmBestHistory.rating,
      outlook: carrierAmBestHistory.outlook,
      ratedAt: carrierAmBestHistory.ratedAt,
      createdAt: carrierAmBestHistory.createdAt,
    })
    .from(carrierAmBestHistory)
    .where(
      and(
        eq(carrierAmBestHistory.tenantId, tenant()),
        eq(carrierAmBestHistory.carrierId, id),
      ),
    )
    .orderBy(desc(carrierAmBestHistory.createdAt))
    .limit(40);

  const timeline = [
    // Skip readiness_check_fail here — companion activity row carries the one-line reason.
    ...revealLogs
      .filter((log) => log.fieldKey !== "readiness_check_fail")
      .map((log) => {
      const key = log.fieldKey;
      const fail = key.endsWith("_reveal_fail") || /fail/i.test(key);
      const reason = fail ? key.replaceAll("_", " ") : null;
      return {
        id: log.id,
        kind: "credential" as const,
        title: key.replaceAll("_", " "),
        actorName: log.actorName,
        occurredAt: log.createdAt,
        reason,
        failed: fail,
      };
    }),
    ...activityRows.map((row) => {
      const detail = row.detail?.trim() || null;
      const failed =
        /fail|unreachable|error|denied|rejected/i.test(row.title) ||
        (row.kind === "credential" && /fail|unreachable|error/i.test(detail ?? ""));
      return {
        id: row.id,
        kind: row.kind,
        title: row.title,
        actorName: row.actorName,
        occurredAt: row.occurredAt,
        // One-line context for field updates; red failure line only when failed.
        reason: detail,
        failed,
      };
    }),
  ].sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));

  const amBestHistory = amBestHistoryRows.map((row) => ({
    rating: row.rating ?? "",
    outlook: row.outlook ?? "",
    date: row.ratedAt
      ? new Date(row.ratedAt).toISOString().slice(0, 10)
      : new Date(row.createdAt).toISOString().slice(0, 10),
  }));

  const [recentPolicyRow] = await db
    .select({
      id: policies.id,
      policyNumber: policies.policyNumber,
      lineOfBusiness: policies.lineOfBusiness,
      updatedAt: policies.updatedAt,
    })
    .from(policies)
    .where(and(eq(policies.tenantId, tenant()), eq(policies.carrierId, id)))
    .orderBy(desc(policies.updatedAt))
    .limit(1);

  let recentContact: { id: string; label: string } | null = null;
  if (recentPolicyRow) {
    const [polContact] = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
      })
      .from(policies)
      .innerJoin(contacts, eq(policies.contactId, contacts.id))
      .where(and(eq(policies.tenantId, tenant()), eq(policies.id, recentPolicyRow.id)))
      .limit(1);
    if (polContact) {
      recentContact = {
        id: polContact.id,
        label: `${polContact.lastName}, ${polContact.firstName}`.trim(),
      };
    }
  }

  let recentDeal: { id: string; label: string } | null = null;
  try {
    const [dealRow] = await db
      .select({ id: deals.id, title: deals.title, updatedAt: deals.updatedAt })
      .from(deals)
      .where(
        and(
          eq(deals.tenantId, tenant()),
          sql`lower(coalesce(${deals.currentCarrier}, '')) = lower(${row.carrier.name})`,
        ),
      )
      .orderBy(desc(deals.updatedAt))
      .limit(1);
    if (dealRow) {
      recentDeal = { id: dealRow.id, label: dealRow.title || "Deal" };
    }
  } catch {
    recentDeal = null;
  }

  const [quoteKpi] = await db
    .select({
      requested: sql<number>`count(*)::int`,
      bound: sql<number>`count(*) filter (where ${quoteAttemptLogs.bindable} = true or lower(${quoteAttemptLogs.result}) ~ '(bound|won|issued|bound_policy)')::int`,
    })
    .from(quoteAttemptLogs)
    .where(and(eq(quoteAttemptLogs.tenantId, tenant()), eq(quoteAttemptLogs.carrierId, id)));

  const [daysNow] = await db
    .select({
      avgDays: sql<string>`avg(extract(epoch from (${policies.createdAt} - ${quoteAttemptLogs.attemptedAt})) / 86400.0)`,
    })
    .from(policies)
    .innerJoin(
      quoteAttemptLogs,
      and(
        eq(quoteAttemptLogs.carrierId, policies.carrierId),
        eq(quoteAttemptLogs.tenantId, policies.tenantId),
        sql`${quoteAttemptLogs.dealId} is not null and ${quoteAttemptLogs.dealId} = ${policies.dealId}`,
      ),
    )
    .where(
      and(
        eq(policies.tenantId, tenant()),
        eq(policies.carrierId, id),
        sql`${policies.createdAt} >= date_trunc('quarter', now())`,
      ),
    );

  const [daysPrev] = await db
    .select({
      avgDays: sql<string>`avg(extract(epoch from (${policies.createdAt} - ${quoteAttemptLogs.attemptedAt})) / 86400.0)`,
    })
    .from(policies)
    .innerJoin(
      quoteAttemptLogs,
      and(
        eq(quoteAttemptLogs.carrierId, policies.carrierId),
        eq(quoteAttemptLogs.tenantId, policies.tenantId),
        sql`${quoteAttemptLogs.dealId} is not null and ${quoteAttemptLogs.dealId} = ${policies.dealId}`,
      ),
    )
    .where(
      and(
        eq(policies.tenantId, tenant()),
        eq(policies.carrierId, id),
        sql`${policies.createdAt} >= date_trunc('quarter', now()) - interval '3 months'`,
        sql`${policies.createdAt} < date_trunc('quarter', now())`,
      ),
    );

  const [commTotal] = await db
    .select({
      earned: sql<string>`coalesce(sum(coalesce(${policies.commission4}::numeric, 0)), 0)`,
    })
    .from(policies)
    .where(and(eq(policies.tenantId, tenant()), eq(policies.carrierId, id)));

  const commByLine = await db
    .select({
      lob: policies.lineOfBusiness,
      amount: sql<string>`coalesce(sum(coalesce(${policies.commission4}::numeric, 0)), 0)`,
    })
    .from(policies)
    .where(and(eq(policies.tenantId, tenant()), eq(policies.carrierId, id)))
    .groupBy(policies.lineOfBusiness);

  const sparkRows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${policies.createdAt}), 'YYYY-MM')`,
      amount: sql<string>`coalesce(sum(coalesce(${policies.commission4}::numeric, 0)), 0)`,
    })
    .from(policies)
    .where(
      and(
        eq(policies.tenantId, tenant()),
        eq(policies.carrierId, id),
        sql`${policies.createdAt} >= now() - interval '8 months'`,
      ),
    )
    .groupBy(sql`date_trunc('month', ${policies.createdAt})`)
    .orderBy(sql`date_trunc('month', ${policies.createdAt})`);

  const { buildCarrierKpi } = await import("@/lib/carriers/metrics");
  const kpi = buildCarrierKpi({
    quotesRequested: Number(quoteKpi?.requested ?? 0),
    quotesBound: Number(quoteKpi?.bound ?? 0),
    avgDaysToBind: daysNow?.avgDays != null ? Number(daysNow.avgDays) : null,
    avgDaysToBindPrevQuarter: daysPrev?.avgDays != null ? Number(daysPrev.avgDays) : null,
    commissionEarned: Number(commTotal?.earned ?? 0),
    commissionByLine: commByLine
      .filter((r) => r.lob)
      .map((r) => ({ lob: r.lob, amount: Number(r.amount ?? 0) }))
      .filter((r) => r.amount > 0),
    commissionSpark: sparkRows.map((r) => Number(r.amount ?? 0)),
  });

  const revealPortal = await sessionCanRevealPortal(session);
  return {
    carrier: publicCarrierView(row.carrier, { revealPortal }),
    rule: row.rule,
    activePolicyCount: Number(policyStats?.activeCount ?? 0),
    policyCount: Number(policyStats?.total ?? 0),
    premiumVolume: Number(policyStats?.premiumVolume ?? 0),
    dealCount,
    contactCount,
    kpi,
    recentPolicy: recentPolicyRow
      ? {
          id: recentPolicyRow.id,
          label:
            [recentPolicyRow.policyNumber, recentPolicyRow.lineOfBusiness]
              .filter(Boolean)
              .join(" · ") || "Policy",
        }
      : null,
    recentContact,
    recentDeal,
    timeline,
    amBestHistory,
    isAdmin: session.isAdmin,
  };
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

/** Platform-builder appetite training datasheet (quote_attempt_logs + optional quote outcome / risk address). Always line-scoped. */
export async function listAppetiteTrainingLogs(filters: {
  line: string;
  carrierId?: string;
  county?: string;
  result?: string;
  yearBuiltMin?: number;
  yearBuiltMax?: number;
}) {
  const line = normalizeAppetiteLine(filters.line);
  const lineValues = lineOfBusinessValuesForSheet(line);
  const clauses: SQL[] = [
    eq(quoteAttemptLogs.tenantId, tenant()),
    inArray(quoteAttemptLogs.lineOfBusiness, lineValues),
  ];
  if (filters.carrierId) clauses.push(eq(quoteAttemptLogs.carrierId, filters.carrierId));
  if (filters.county) clauses.push(eq(quoteAttemptLogs.snapCounty, filters.county));
  if (filters.result) clauses.push(eq(quoteAttemptLogs.result, filters.result));
  if (filters.yearBuiltMin != null) {
    clauses.push(gte(quoteAttemptLogs.snapYearBuilt, filters.yearBuiltMin));
  }
  if (filters.yearBuiltMax != null) {
    clauses.push(lte(quoteAttemptLogs.snapYearBuilt, filters.yearBuiltMax));
  }

  const rows = await db
    .select({
      log: quoteAttemptLogs,
      carrier: carriers,
      deal: deals,
      risk: risks,
      quote: quotes,
    })
    .from(quoteAttemptLogs)
    .innerJoin(carriers, eq(quoteAttemptLogs.carrierId, carriers.id))
    .innerJoin(deals, eq(quoteAttemptLogs.dealId, deals.id))
    .leftJoin(risks, eq(quoteAttemptLogs.riskId, risks.id))
    .leftJoin(quotes, eq(quotes.quoteAttemptLogId, quoteAttemptLogs.id))
    .where(and(...clauses))
    .orderBy(desc(quoteAttemptLogs.attemptedAt));

  // One row per attempt log (first linked quote wins when duplicates exist).
  const seen = new Set<string>();
  const deduped: typeof rows = [];
  for (const row of rows) {
    if (seen.has(row.log.id)) continue;
    seen.add(row.log.id);
    deduped.push(row);
  }
  return deduped;
}

/** Distinct filter values for one line sheet (+ counts per line for tabs). */
export async function listAppetiteTrainingFilterOptions(line: string) {
  const sheet = normalizeAppetiteLine(line);
  const lineValues = lineOfBusinessValuesForSheet(sheet);

  const [rows, lineCounts] = await Promise.all([
    db
      .select({
        result: quoteAttemptLogs.result,
        county: quoteAttemptLogs.snapCounty,
        carrierId: carriers.id,
        carrierName: carriers.name,
      })
      .from(quoteAttemptLogs)
      .innerJoin(carriers, eq(quoteAttemptLogs.carrierId, carriers.id))
      .where(
        and(
          eq(quoteAttemptLogs.tenantId, tenant()),
          inArray(quoteAttemptLogs.lineOfBusiness, lineValues),
        ),
      ),
    db
      .select({
        lineOfBusiness: quoteAttemptLogs.lineOfBusiness,
        count: sql<number>`count(*)::int`,
      })
      .from(quoteAttemptLogs)
      .where(eq(quoteAttemptLogs.tenantId, tenant()))
      .groupBy(quoteAttemptLogs.lineOfBusiness),
  ]);

  const results = new Set<string>();
  const counties = new Set<string>();
  const carrierMap = new Map<string, string>();
  for (const row of rows) {
    if (row.result) results.add(row.result);
    if (row.county?.trim()) counties.add(row.county.trim());
    carrierMap.set(row.carrierId, row.carrierName);
  }

  const countsByLine: Record<string, number> = {};
  for (const row of lineCounts) {
    const key = normalizeAppetiteLine(row.lineOfBusiness);
    countsByLine[key] = (countsByLine[key] ?? 0) + Number(row.count);
  }

  return {
    results: [...results].sort(),
    counties: [...counties].sort((a, b) => a.localeCompare(b)),
    carriers: [...carrierMap.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    countsByLine,
  };
}


/** Site-dev Auto premium-learning datasheet (Auto LOB rows with feature snapshots). */
export async function listAutoPremiumLearningLogs(filters: AutoPremiumDatasheetFilters = {}) {
  const lineValues = [...AUTO_PREMIUM_LINE_VALUES];
  const clauses: SQL[] = [
    eq(quoteAttemptLogs.tenantId, tenant()),
    inArray(quoteAttemptLogs.lineOfBusiness, lineValues),
  ];
  if (filters.carrierId) clauses.push(eq(quoteAttemptLogs.carrierId, filters.carrierId));

  const rows = await db
    .select({
      log: quoteAttemptLogs,
      carrier: carriers,
      deal: deals,
      risk: risks,
      quote: quotes,
    })
    .from(quoteAttemptLogs)
    .innerJoin(carriers, eq(quoteAttemptLogs.carrierId, carriers.id))
    .innerJoin(deals, eq(quoteAttemptLogs.dealId, deals.id))
    .leftJoin(risks, eq(quoteAttemptLogs.riskId, risks.id))
    .leftJoin(quotes, eq(quotes.quoteAttemptLogId, quoteAttemptLogs.id))
    .where(and(...clauses))
    .orderBy(desc(quoteAttemptLogs.attemptedAt));

  const seen = new Set<string>();
  const deduped: typeof rows = [];
  for (const row of rows) {
    if (seen.has(row.log.id)) continue;
    seen.add(row.log.id);
    const snap = row.log.autoFeatureSnapshot;
    if (filters.city) {
      const city = (snap?.city || row.log.snapCity || row.risk?.city || "").trim().toLowerCase();
      if (city !== filters.city.trim().toLowerCase()) continue;
    }
    if (filters.vehicleYearMin != null) {
      const y = snap?.vehicleYear ?? row.risk?.vehicleYear ?? null;
      if (y == null || y < filters.vehicleYearMin) continue;
    }
    if (filters.vehicleYearMax != null) {
      const y = snap?.vehicleYear ?? row.risk?.vehicleYear ?? null;
      if (y == null || y > filters.vehicleYearMax) continue;
    }
    deduped.push(row);
  }
  return deduped;
}

export async function listAutoPremiumLearningFilterOptions() {
  const lineValues = [...AUTO_PREMIUM_LINE_VALUES];
  const rows = await db
    .select({
      carrierId: carriers.id,
      carrierName: carriers.name,
      snap: quoteAttemptLogs.autoFeatureSnapshot,
      cityCol: quoteAttemptLogs.snapCity,
      riskCity: risks.city,
    })
    .from(quoteAttemptLogs)
    .innerJoin(carriers, eq(quoteAttemptLogs.carrierId, carriers.id))
    .leftJoin(risks, eq(quoteAttemptLogs.riskId, risks.id))
    .where(
      and(
        eq(quoteAttemptLogs.tenantId, tenant()),
        inArray(quoteAttemptLogs.lineOfBusiness, lineValues),
      ),
    );

  const carrierMap = new Map<string, string>();
  const cities = new Set<string>();
  for (const row of rows) {
    carrierMap.set(row.carrierId, row.carrierName);
    const city = (row.snap?.city || row.cityCol || row.riskCity || "").trim();
    if (city) cities.add(city);
  }
  return {
    carriers: [...carrierMap.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    cities: [...cities].sort((a, b) => a.localeCompare(b)),
  };
}

export async function listFillFeedbackLogs() {
  return db
    .select({
      log: fillFeedbackLogs,
      deal: deals,
      carrier: carriers,
    })
    .from(fillFeedbackLogs)
    .leftJoin(deals, eq(fillFeedbackLogs.dealId, deals.id))
    .leftJoin(carriers, eq(fillFeedbackLogs.carrierId, carriers.id))
    .where(eq(fillFeedbackLogs.tenantId, tenant()))
    .orderBy(desc(fillFeedbackLogs.createdAt));
}

export async function listFillLearningLogs() {
  return db
    .select({
      log: fillLearningLogs,
      deal: deals,
      carrier: carriers,
    })
    .from(fillLearningLogs)
    .leftJoin(deals, eq(fillLearningLogs.dealId, deals.id))
    .leftJoin(carriers, eq(fillLearningLogs.carrierId, carriers.id))
    .where(eq(fillLearningLogs.tenantId, tenant()))
    .orderBy(desc(fillLearningLogs.loggedAt));
}

export async function listFillLearningForLookup() {
  return db
    .select({
      docType: fillLearningLogs.docType,
      fieldKey: fillLearningLogs.fieldKey,
      extractedValue: fillLearningLogs.extractedValue,
      correctedValue: fillLearningLogs.correctedValue,
      dealId: fillLearningLogs.dealId,
      loggedAt: fillLearningLogs.loggedAt,
    })
    .from(fillLearningLogs)
    .where(eq(fillLearningLogs.tenantId, tenant()))
    .orderBy(desc(fillLearningLogs.loggedAt));
}

export const listAlerts = cache(async function listAlerts(unreadOnly = false) {
  const session = await currentDeskSession();
  const visible = alertVisibleWhere(session, tenant());
  /** Future createdAt = scheduled in-app reminder (not due yet). Hide until fire time. */
  const due = lte(alerts.createdAt, new Date());
  const where = unreadOnly
    ? and(visible, due, isNull(alerts.readAt))
    : and(visible, due);
  return db.select().from(alerts).where(where).orderBy(desc(alerts.createdAt));
});

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

/** Review items plus open activity tasks (playbook fires). Same /tasks columns. */
export async function listDeskTaskRows() {
  const session = await currentDeskSession();
  const review = await listReviewTasks();
  const clauses: SQL[] = [
    eq(activities.tenantId, tenant()),
    eq(activities.kind, "task"),
    notInArray(activities.status, ["completed", "cancelled", "done"]),
  ];
  if (!session.isAdmin) {
    clauses.push(
      session.name || session.userId
        ? or(eq(activities.assignee, session.name), eq(activities.assignee, session.userId ?? ""))!
        : sql`false`,
    );
  }
  const activityRows = await db
    .select()
    .from(activities)
    .where(and(...clauses))
    .orderBy(asc(activities.dueAt));
  return { review, activities: activityRows };
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
  if (!sessionSeesAgencyBook(session) && session.userId && deal.ownerId !== session.userId) return null;

  const { restoreDealSourceDocuments } = await import("@/lib/documents/restore-deal-docs");
  await restoreDealSourceDocuments(dealId).catch(() => null);
  const { lifeHealthShopRepair } = await import("@/lib/deals/deal-products");
  const shopRepair = lifeHealthShopRepair(deal);
  if (shopRepair) {
    await db
      .update(deals)
      .set({
        shopLines: shopRepair.shopLines,
        shopProducts: shopRepair.shopProducts,
      })
      .where(eq(deals.id, deal.id))
      .catch(() => null);
    deal.shopLines = shopRepair.shopLines;
    deal.shopProducts = shopRepair.shopProducts;
  }
  const {
    isHeatherCamirandDeal,
    parseProductStages,
    stripStaleCamirandProductNotices,
  } = await import("@/lib/deals/product-stages");
  const { parseShopFlow } = await import("@/lib/deals/shop-flow");
  if (isHeatherCamirandDeal(deal)) {
    const saved = parseShopFlow(deal.shopFlow);
    const stages = parseProductStages(saved.productStages);
    const cleaned = stripStaleCamirandProductNotices(stages);
    if (cleaned !== stages) {
      const nextFlow = { ...saved, productStages: cleaned };
      await db
        .update(deals)
        .set({ shopFlow: nextFlow, updatedAt: new Date() })
        .where(eq(deals.id, deal.id))
        .catch(() => null);
      deal.shopFlow = nextFlow;
    }
  }

  const [
    riskRows,
    docs,
    dealQuotes,
    logs,
    leadRows,
    contactRows,
    accountRows,
    sheets,
    jobs,
    fillFeedback,
    boundPolicies,
    timeline,
  ] = await Promise.all([
    db
      .select()
      .from(risks)
      .where(and(eq(risks.tenantId, tenant()), eq(risks.dealId, dealId))),
    db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.tenantId, tenant()),
          eq(documents.dealId, dealId),
          ne(documents.status, "hidden"),
        ),
      )
      .orderBy(desc(documents.createdAt)),
    db
      .select({
        quote: quotes,
        carrier: carriers,
      })
      .from(quotes)
      .innerJoin(carriers, eq(quotes.carrierId, carriers.id))
      .where(and(eq(quotes.tenantId, tenant()), eq(quotes.dealId, dealId)))
      .orderBy(asc(quotes.premium)),
    db
      .select({
        log: quoteAttemptLogs,
        carrier: carriers,
      })
      .from(quoteAttemptLogs)
      .innerJoin(carriers, eq(quoteAttemptLogs.carrierId, carriers.id))
      .where(and(eq(quoteAttemptLogs.tenantId, tenant()), eq(quoteAttemptLogs.dealId, dealId)))
      .orderBy(desc(quoteAttemptLogs.attemptedAt)),
    deal.leadId ? db.select().from(leads).where(eq(leads.id, deal.leadId)) : Promise.resolve([]),
    deal.contactId ? db.select().from(contacts).where(eq(contacts.id, deal.contactId)) : Promise.resolve([]),
    deal.accountId ? db.select().from(accounts).where(eq(accounts.id, deal.accountId)) : Promise.resolve([]),
    db
      .select()
      .from(quoteSheets)
      .where(and(eq(quoteSheets.tenantId, tenant()), eq(quoteSheets.dealId, dealId))),
    db
      .select()
      .from(extractionJobs)
      .where(and(eq(extractionJobs.tenantId, tenant()), eq(extractionJobs.dealId, dealId)))
      .orderBy(desc(extractionJobs.createdAt))
      .limit(20),
    db
      .select()
      .from(fillFeedbackLogs)
      .where(and(eq(fillFeedbackLogs.tenantId, tenant()), eq(fillFeedbackLogs.dealId, dealId)))
      .orderBy(desc(fillFeedbackLogs.createdAt))
      .limit(20),
    db
      .select()
      .from(policies)
      .where(and(eq(policies.tenantId, tenant()), eq(policies.dealId, dealId))),
    listActivityTimeline({ dealId }),
  ]);

  const risk = riskRows[0];
  const lead = leadRows[0];
  const contact = contactRows[0];
  const account = accountRows[0] ?? null;
  const quoteSheet = sheets[0];

  const partyFilters = [
    contact?.id ? eq(policies.contactId, contact.id) : undefined,
    account?.id ? eq(policies.accountId, account.id) : undefined,
  ].filter((clause): clause is SQL => Boolean(clause));

  const [fileVersions, fields, quoteNoteRows, partyPolicies] = await Promise.all([
    listDocumentVersionsForIds(docs.map((doc) => doc.id)),
    risk
      ? db
          .select()
          .from(extractedFields)
          .where(and(eq(extractedFields.tenantId, tenant()), eq(extractedFields.riskId, risk.id)))
          .orderBy(desc(extractedFields.createdAt))
      : Promise.resolve([]),
    dealQuotes.length === 0
      ? Promise.resolve([])
      : db
          .select()
          .from(quoteNotes)
          .where(
            and(
              eq(quoteNotes.tenantId, tenant()),
              inArray(
                quoteNotes.quoteId,
                dealQuotes.map((row) => row.quote.id),
              ),
            ),
          )
          .orderBy(asc(quoteNotes.createdAt)),
    partyFilters.length > 0
      ? db
          .select()
          .from(policies)
          .where(and(eq(policies.tenantId, tenant()), or(...partyFilters)))
      : Promise.resolve([]),
  ]);

  return {
    deal,
    risk,
    docs,
    fileVersions,
    fields,
    quotes: dealQuotes,
    quoteNotes: quoteNoteRows,
    logs,
    lead,
    contact,
    account,
    quoteSheet: quoteSheet ?? null,
    sheets,
    jobs,
    fillFeedback,
    boundPolicies,
    partyPolicies,
    timeline,
    comms: commsFromTimeline(timeline),
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
    sessionSeesAgencyBook(session) || !session.userId ? sql`` : sql` and owner_id = ${session.userId}`;
  const [row] = await db
    .select({
      leads: sql<number>`(select count(*) from leads where tenant_id = ${tenant()}${ownerSql})`,
      deals: sql<number>`(select count(*) from deals where tenant_id = ${tenant()}${ownerSql})`,
      shopping: sql<number>`(select count(*) from deals where tenant_id = ${tenant()} and pipeline_stage = 'shopping'${ownerSql})`,
      contacts: sql<number>`(select count(*) from contacts where tenant_id = ${tenant()}${ownerSql})`,
      policies: sql<number>`(select count(*) from policies where tenant_id = ${tenant()}${ownerSql})`,
      unreadAlerts: sql<number>`(select count(*) from alerts where tenant_id = ${tenant()} and read_at is null${
        sessionSeesAgencyBook(session) || !session.userId
          ? sql``
          : sql` and (user_id is null or user_id = ${session.userId})`
      })`,
    })
    .from(tenants)
    .where(eq(tenants.id, tenant()));

  const dealScope = ownerWhere(session, deals.ownerId);
  const policyScope = ownerWhere(session, policies.ownerId);
  const [recentDeals, tasks, unread, expiring] = await Promise.all([
    db
      .select()
      .from(deals)
      .where(and(eq(deals.tenantId, tenant()), dealScope))
      .orderBy(desc(deals.updatedAt))
      .limit(8),
    listReviewQueue(),
    listAlerts(true),
    db
      .select()
      .from(policies)
      .where(and(eq(policies.tenantId, tenant()), policyScope))
      .orderBy(asc(policies.expirationDate))
      .limit(8),
  ]);

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

export async function getPipelineBoard(
  slug: string,
  sub?: { lifeSub?: string; healthSub?: string; pcSub?: string; stage?: string },
) {
  const { ensureSeededPipelines } = await import("@/lib/wire/ensure-pipelines");
  const { dealMatchesBoard, switcherBoards } = await import("@/lib/wire/pipeline");
  await ensureSeededPipelines();
  const { ensureDealTitles } = await import("@/lib/deals/retitle");
  await ensureDealTitles().catch(() => null);
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
    // Tip sep7ga: stable board/list order — stage changes touch updatedAt, not createdAt.
    .orderBy(desc(deals.createdAt), asc(deals.id));
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
        if (!matchesLifeOrHealthSub(row.deal.policySubType, sub.lifeSub, lineSettings.lifeOptions)) {
          return false;
        }
      }
      if (board.slug === "health" && sub?.healthSub && sub.healthSub !== "all") {
        if (!matchesLifeOrHealthSub(row.deal.policySubType, sub.healthSub, lineSettings.healthOptions)) {
          return false;
        }
      }
      if (sub?.pcSub && sub.pcSub !== "all" && !isPcSubLine(row.deal.lineOfBusiness, sub.pcSub)) {
        return false;
      }
      if (sub?.stage && sub.stage !== "all" && isKnownStageToken(sub.stage)) {
        return dealMatchesStage(row.deal, sub.stage);
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
  if (!isUuid(id)) return null;
  const [row] = await db
    .select()
    .from(formFills)
    .where(and(eq(formFills.tenantId, tenant()), eq(formFills.id, id)));
  return row ?? null;
}

export async function latestFormFill(templateId: string) {
  if (!isUuid(templateId)) return null;
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
  const [leadRows, dealRows, contactRows, accountRows, policyRows, carrierRows] = await Promise.all([
    db.select().from(leads).where(eq(leads.tenantId, tenant())),
    db.select().from(deals).where(eq(deals.tenantId, tenant())),
    db.select().from(contacts).where(eq(contacts.tenantId, tenant())),
    db.select().from(accounts).where(eq(accounts.tenantId, tenant())),
    db.select().from(policies).where(eq(policies.tenantId, tenant())),
    db.select().from(carriers).where(eq(carriers.tenantId, tenant())),
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
    if (!sessionSeesAgencyBook(session)) {
      const owns = policyRows.some((policy) => policy.accountId === row.id && policy.ownerId === session.userId);
      if (!owns) continue;
    }
    if (matchesQuery(q, row.name, row.legalName, row.dba, row.einLast4, row.city)) {
      hits.push(hitFromBusiness(row));
    }
  }
  for (const row of policyRows) {
    if (!canViewOwned(session, row.ownerId)) continue;
    const contact = contactRows.find((item) => item.id === row.contactId);
    const account = accountRows.find((item) => item.id === row.accountId);
    const carrier = carrierRows.find((item) => item.id === row.carrierId);
    if (
      matchesQuery(
        q,
        row.policyNumber,
        row.lineOfBusiness,
        contact?.firstName,
        contact?.lastName,
        account?.name,
        carrier?.name,
      )
    ) {
      hits.push(hitFromPolicy(row));
    }
  }
  for (const row of carrierRows) {
    if (
      matchesQuery(
        q,
        row.name,
        row.naic,
        row.territory,
        row.amBestRating,
        ...(row.writtenLines ?? []),
      )
    ) {
      hits.push(hitFromCarrier(row));
    }
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
  if (scope.bookAgentIds && scope.bookAgentIds.length === 0) {
    return { pending: 0, paid: 0 };
  }
  try {
    if (scope.bookAgentIds) {
      const rows = await db
        .select({ amount: commissions.amount, status: commissions.status })
        .from(commissions)
        .where(
          and(eq(commissions.tenantId, scope.tenantId), inArray(commissions.agentId, scope.bookAgentIds)),
        );
      return {
        pending: rows
          .filter((row) => row.status === "pending")
          .reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
        paid: rows
          .filter((row) => row.status === "paid")
          .reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
      };
    }
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

export type HomeDashboardPrefs = {
  preset: DashboardPreset;
  hiddenWidgets: HomeWidgetId[];
  bookScope: BookScope;
  customLayouts: NamedHomeLayout[];
  activeLayoutId: string | null;
  resizeTiles: boolean;
};

export type HomeContestView = {
  id: string;
  title: string;
  rules: string;
  metric: "premium" | "policy_count";
  startsAt: Date;
  endsAt: Date;
  standings: ReturnType<typeof rankAgents>;
};

export type AgencyHomeHighlight = {
  writtenThisMonth: number;
  writtenCount: number;
  inForcePremium: number;
  inForceCount: number;
};

export type HomeLeadOfferView = {
  id: string;
  title: string;
  details: string;
  kind: LeadOfferKind;
  language: string | null;
  state: string | null;
  leadId: string | null;
  status: LeadOfferStatus;
  postedByName: string;
  awardedToId: string | null;
  awardedToName: string | null;
  claimedById: string | null;
  claimedByName: string | null;
  emailFrom: string | null;
  emailSubject: string | null;
  emailSnippet: string | null;
  emailBody: string | null;
  emailStubId: string | null;
  claims: { agentId: string; name: string; note: string | null; relation: string | null; createdAt: Date }[];
};

export type HomeAgentOption = { id: string; name: string; role: string };

export async function loadHomeDashboardPrefs(userId: string | null): Promise<HomeDashboardPrefs> {
  const fallbackPreset = parseDashboardPreset("my_production");
  if (!userId) {
    return {
      preset: fallbackPreset,
      hiddenWidgets: hiddenForPreset(fallbackPreset),
      bookScope: "agency",
      customLayouts: [],
      activeLayoutId: null,
      resizeTiles: false,
    };
  }
  const [row] = await db
    .select()
    .from(userDashboardPrefs)
    .where(and(eq(userDashboardPrefs.tenantId, tenant()), eq(userDashboardPrefs.userId, userId)));
  const preset = parseDashboardPreset(row?.preset);
  const customLayouts = parseNamedHomeLayouts(row?.customLayouts);
  const activeLayoutId = row?.activeLayoutId && customLayouts.some((item) => item.id === row.activeLayoutId)
    ? row.activeLayoutId
    : null;
  return {
    preset,
    hiddenWidgets: row ? parseHiddenWidgets(row.hiddenWidgets) : hiddenForPreset(preset),
    bookScope: parseBookScope(row?.bookScope),
    customLayouts,
    activeLayoutId,
    resizeTiles: Boolean(row?.resizeTiles),
  };
}

export async function ownerHomeDashboard(bookRaw?: string | null) {
  const session = await currentDeskSession();
  const prefs = await loadHomeDashboardPrefs(session.userId);
  const baseScope = await currentOwnerHomeScope(prefs.bookScope);
  const tables = await detectOwnerHomeTables();
  const applyOfficeLens = baseScope.role !== "agent" && baseScope.bookScope !== "my_book";
  const book = applyOfficeLens
    ? await resolveBookScope(bookRaw)
    : { scope: { kind: "company" as const }, agentIds: null, label: baseScope.label, options: [] as BookScopeOption[] };
  const scope: OwnerHomeScope = {
    ...baseScope,
    label: applyOfficeLens ? book.label : baseScope.label,
    bookKind: book.scope.kind,
    bookAgentIds: applyOfficeLens ? book.agentIds : null,
  };

  const [
    policyRows,
    dealRows,
    taskRows,
    leadRows,
    contactRows,
    agentRows,
    contestRows,
    settingsRows,
    offerRows,
    offerClaimRows,
  ] = await Promise.all([
      db
        .select({
          policy: policies,
          contact: contacts,
          carrier: carriers,
        })
        .from(policies)
        .leftJoin(contacts, eq(policies.contactId, contacts.id))
        .leftJoin(carriers, eq(policies.carrierId, carriers.id))
        .where(eq(policies.tenantId, scope.tenantId)),
      db.select().from(deals).where(eq(deals.tenantId, scope.tenantId)),
      db
        .select()
        .from(reviewTasks)
        .where(and(eq(reviewTasks.tenantId, scope.tenantId), eq(reviewTasks.status, "open")))
        .orderBy(asc(reviewTasks.dueDate)),
      db.select().from(leads).where(eq(leads.tenantId, scope.tenantId)),
      db.select().from(contacts).where(eq(contacts.tenantId, scope.tenantId)),
      db
        .select()
        .from(users)
        .where(and(eq(users.tenantId, scope.tenantId), eq(users.active, true))),
      db.select().from(contests).where(eq(contests.tenantId, scope.tenantId)).orderBy(desc(contests.startsAt)),
      db.select().from(agencySettings).where(eq(agencySettings.tenantId, scope.tenantId)),
      db.select().from(leadOffers).where(eq(leadOffers.tenantId, scope.tenantId)).orderBy(desc(leadOffers.createdAt)),
      db.select().from(leadOfferClaims).where(eq(leadOfferClaims.tenantId, scope.tenantId)),
    ]);

  const homePolicies: HomePolicy[] = policyRows.map(({ policy, contact, carrier }) => ({
    id: policy.id,
    contactId: policy.contactId ?? "",
    accountId: policy.accountId ?? null,
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
    originalEffectiveDate: policy.originalEffectiveDate ?? null,
    endedAt: policy.endedAt ?? null,
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

  const homeLeads = leadRows.map((lead) => ({
    id: lead.id,
    status: lead.status,
    ownerId: lead.ownerId ?? null,
  }));

  const homeContacts = contactRows.map((contact) => ({
    id: contact.id,
    name: contactName(contact),
    dateOfBirth: contact.dateOfBirth,
    href: `/contacts/${contact.id}`,
    ownerId: contact.ownerId ?? null,
  }));

  const agents = agentRows.map((user) => ({ id: user.id, name: user.name }));
  const names = new Map(agents.map((agent) => [agent.id, agent.name]));
  const agentOptions: HomeAgentOption[] = agentRows
    .map((user) => ({ id: user.id, name: user.name, role: user.role }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const leadOfferViews: HomeLeadOfferView[] = offerRows.map((row) => ({
    id: row.id,
    title: row.title,
    details: row.details,
    kind: parseLeadOfferKind(row.kind),
    language: row.language,
    state: row.state,
    leadId: row.leadId,
    status: parseLeadOfferStatus(row.status),
    postedByName: names.get(row.postedBy) ?? "Management",
    awardedToId: row.awardedTo,
    awardedToName: row.awardedTo ? names.get(row.awardedTo) ?? "Agent" : null,
    claimedById: row.claimedBy,
    claimedByName: row.claimedBy ? names.get(row.claimedBy) ?? "Agent" : null,
    emailFrom: row.emailFrom,
    emailSubject: row.emailSubject,
    emailSnippet: row.emailSnippet,
    emailBody: row.emailBody,
    emailStubId: row.emailStubId,
    claims: offerClaimRows
      .filter((claim) => claim.offerId === row.id)
      .map((claim) => ({
        agentId: claim.agentId,
        name: names.get(claim.agentId) ?? "Agent",
        note: claim.note,
        relation: claim.relation,
        createdAt: claim.createdAt,
      }))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
  }));

  const scopedPolicies = filterByBookScope(
    filterByAssignee(homePolicies, scope.agentUserId, Boolean(tables.assigneeColumn)),
    scope.bookAgentIds ?? null,
  );
  const scopedDeals = filterByBookScope(
    filterByAssignee(homeDeals, scope.agentUserId, Boolean(tables.dealAssigneeColumn)),
    scope.bookAgentIds ?? null,
  );
  const scopedLeads = filterByAssignee(homeLeads, scope.agentUserId, Boolean(tables.assigneeColumn));
  const scopedContacts = filterByAssignee(homeContacts, scope.agentUserId, Boolean(tables.assigneeColumn));

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
    leads: scopedLeads,
    contacts: scopedContacts,
    agents,
  });
  if (opportunityCount != null) snapshot.gapCount = opportunityCount;

  const showCompanyWidgets = Boolean(settingsRows[0]?.showCompanyWidgets);
  const agencySnap = buildOwnerHome({
    asOf: DESK_AS_OF,
    policies: homePolicies,
    deals: homeDeals,
    tasks: [],
    agents,
  });
  const agencyHighlight: AgencyHomeHighlight = {
    writtenThisMonth: agencySnap.written.thisMonth.premium,
    writtenCount: agencySnap.written.thisMonth.count,
    inForcePremium: agencySnap.inForcePremium,
    inForceCount: agencySnap.inForceCount,
  };

  const contestViews: HomeContestView[] = contestRows
    .filter((row) => row.active)
    .map((row) => ({
      id: row.id,
      title: row.title,
      rules: row.rules,
      metric: row.metric === "policy_count" ? "policy_count" : "premium",
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      standings: rankAgents(homePolicies, agents, DESK_AS_OF, "contest", {
        metric: row.metric === "policy_count" ? "policy_count" : "premium",
        startsAt: row.startsAt,
        endsAt: row.endsAt,
      }),
    }));

  return {
    snapshot,
    scope,
    tables,
    prefs,
    contests: contestViews,
    leadOffers: leadOfferViews,
    agents: agentOptions,
    currentUserId: session.userId,
    showCompanyWidgets,
    agencyHighlight,
    isAdmin: Boolean(session.isAdmin),
    isAgent: Boolean(session.isAgent),
    bookOptions: book.options,
  };
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
  const scope = dealId
    ? and(eq(quoteAttemptLogs.tenantId, tenant()), eq(quoteAttemptLogs.dealId, dealId))
    : eq(quoteAttemptLogs.tenantId, tenant());
  const quoteScope = dealId
    ? and(eq(quotes.tenantId, tenant()), eq(quotes.dealId, dealId))
    : eq(quotes.tenantId, tenant());

  const [logRows, quoteRows, policyRows, pdfRows] = await Promise.all([
    db
      .select({ log: quoteAttemptLogs, deal: deals, carrier: carriers, contact: contacts, lead: leads })
      .from(quoteAttemptLogs)
      .innerJoin(deals, eq(quoteAttemptLogs.dealId, deals.id))
      .innerJoin(carriers, eq(quoteAttemptLogs.carrierId, carriers.id))
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .leftJoin(leads, eq(deals.leadId, leads.id))
      .where(scope),
    db
      .select({ quote: quotes, deal: deals, carrier: carriers, contact: contacts, lead: leads })
      .from(quotes)
      .innerJoin(deals, eq(quotes.dealId, deals.id))
      .innerJoin(carriers, eq(quotes.carrierId, carriers.id))
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .leftJoin(leads, eq(deals.leadId, leads.id))
      .where(quoteScope),
    db.select().from(policies).where(eq(policies.tenantId, tenant())),
    db
      .select({
        id: documents.id,
        dealId: documents.dealId,
        filename: documents.filename,
        docType: documents.docType,
        slot: documents.slot,
      })
      .from(documents)
      .where(
        and(
          eq(documents.tenantId, tenant()),
          dealId ? eq(documents.dealId, dealId) : undefined,
          or(eq(documents.slot, "quote_pdf"), eq(documents.docType, "quote_pdf"), eq(documents.docType, "quote")),
        ),
      ),
  ]);

  const party = (contact: { id: string; email: string | null; phone: string | null } | null, lead: { email: string | null; phone: string | null } | null, accountId: string | null) => ({
    contactId: contact?.id ?? null,
    accountId,
    email: contact?.email ?? lead?.email ?? null,
    phone: contact?.phone ?? lead?.phone ?? null,
  });

  const attempts = logRows.map(({ log, deal, carrier, contact, lead }) => ({
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
    quoteId: null,
    lostReason: log.lostReason,
    coverageA: log.snapCoverageA ?? log.covATried,
    ...party(contact, lead, deal.accountId ?? null),
  }));
  const comparison = quoteRows.map(({ quote, deal, carrier, contact, lead }) => ({
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
    lostReason: quote.lostReason,
    coverageA: quote.coverageA,
    aopDeductible: quote.aopDeductible,
    hurricaneDeductible: quote.hurricaneDeductible,
    coverageGaps: quote.coverageGaps ?? [],
    ...party(contact, lead, deal.accountId ?? null),
  }));
  const bound = policyRows
    .filter((p) => p.dealId && p.carrierId)
    .map((p) => ({ dealId: p.dealId!, carrierId: p.carrierId!, policyId: p.id }));
  return attachQuotePdfs(groupTrackingShops(buildTrackingRows(attempts, bound, comparison)), pdfRows);
}

export async function historyForContact(contactId: string) {
  if (!isUuid(contactId)) return [];
  return db
    .select()
    .from(clientHistory)
    .where(and(eq(clientHistory.tenantId, tenant()), eq(clientHistory.contactId, contactId)))
    .orderBy(desc(clientHistory.occurredAt));
}

export type RecentRecordStub = {
  kind: "contact" | "deal" | "policy";
  id: string;
  title: string;
  href: string;
  at: number;
};

/** Last-touched contacts, deals, and policies — header Recently accessed fallback. */
export async function listRecentRecordStub(limit = 8): Promise<RecentRecordStub[]> {
  const session = await currentDeskSession();
  const contactScope = ownerWhere(session, contacts.ownerId);
  const policyScope = ownerWhere(session, policies.ownerId);
  const [contactRows, dealRows, policyRows] = await Promise.all([
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        updatedAt: contacts.updatedAt,
      })
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenant()), contactScope))
      .orderBy(desc(contacts.updatedAt))
      .limit(limit),
    db
      .select({
        id: deals.id,
        title: deals.title,
        ownerId: deals.ownerId,
        updatedAt: deals.updatedAt,
      })
      .from(deals)
      .where(eq(deals.tenantId, tenant()))
      .orderBy(desc(deals.updatedAt))
      .limit(limit * 2),
    db
      .select({
        id: policies.id,
        policyNumber: policies.policyNumber,
        updatedAt: policies.updatedAt,
      })
      .from(policies)
      .where(and(eq(policies.tenantId, tenant()), policyScope))
      .orderBy(desc(policies.updatedAt))
      .limit(limit),
  ]);

  const items: RecentRecordStub[] = [
    ...contactRows.map((row) => ({
      kind: "contact" as const,
      id: row.id,
      title: `${row.lastName}, ${row.firstName}`,
      href: `/contacts/${row.id}`,
      at: row.updatedAt.getTime(),
    })),
    ...dealRows
      .filter((row) => canViewOwned(session, row.ownerId))
      .slice(0, limit)
      .map((row) => ({
        kind: "deal" as const,
        id: row.id,
        title: row.title,
        href: `/deals/${row.id}`,
        at: row.updatedAt.getTime(),
      })),
    ...policyRows.map((row) => ({
      kind: "policy" as const,
      id: row.id,
      title: row.policyNumber,
      href: `/policies/${row.id}`,
      at: row.updatedAt.getTime(),
    })),
  ];

  return items.sort((a, b) => b.at - a.at).slice(0, limit);
}
