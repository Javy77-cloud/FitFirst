import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  activityLogs,
  alerts,
  contacts,
  deals,
  experienceReviews,
  leads,
  policies,
  users,
} from "@/lib/db/schema";
import {
  assembleClientPair,
  type ClientHealthFacts,
  type HealthAlertRow,
  type HealthCommsRow,
  type HealthDealRow,
  type HealthLeadRow,
  type HealthPolicyRow,
  type HealthReviewRow,
} from "@/lib/health/assemble";
import {
  rollupHealthScores,
  type AgentHealthRollup,
  type HealthChipView,
} from "@/lib/health/model";

function tenant() {
  return DEFAULT_TENANT_ID;
}

function uniq(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

async function loadFactsForParties(input: {
  contactIds: string[];
  accountIds: string[];
  policyIds?: string[];
}): Promise<{
  policies: HealthPolicyRow[];
  deals: HealthDealRow[];
  leads: HealthLeadRow[];
  comms: HealthCommsRow[];
  reviews: HealthReviewRow[];
  alerts: HealthAlertRow[];
  owners: Map<string, string>;
  tenureStart: Map<string, Date | null>;
}> {
  const contactIds = uniq(input.contactIds);
  const accountIds = uniq(input.accountIds);
  const policyIds = uniq(input.policyIds ?? []);
  if (contactIds.length === 0 && accountIds.length === 0 && policyIds.length === 0) {
    return {
      policies: [],
      deals: [],
      leads: [],
      comms: [],
      reviews: [],
      alerts: [],
      owners: new Map(),
      tenureStart: new Map(),
    };
  }

  const partyMatch = [
    contactIds.length ? inArray(policies.contactId, contactIds) : undefined,
    accountIds.length ? inArray(policies.accountId, accountIds) : undefined,
    policyIds.length ? inArray(policies.id, policyIds) : undefined,
  ].filter(Boolean);

  const dealFilters = [
    ...(contactIds.length ? [inArray(deals.contactId, contactIds)] : []),
    ...(accountIds.length ? [inArray(deals.accountId, accountIds)] : []),
  ];
  const reviewFilters = [
    ...(contactIds.length ? [inArray(experienceReviews.contactId, contactIds)] : []),
    ...(accountIds.length ? [inArray(experienceReviews.accountId, accountIds)] : []),
    ...(policyIds.length ? [inArray(experienceReviews.policyId, policyIds)] : []),
  ];
  const [policyRows, dealRows, reviewRows, ownerRows] = await Promise.all([
    db
      .select({
        id: policies.id,
        contactId: policies.contactId,
        accountId: policies.accountId,
        dealId: policies.dealId,
        ownerId: policies.ownerId,
        status: policies.status,
        effectiveDate: policies.effectiveDate,
        originalEffectiveDate: policies.originalEffectiveDate,
        expirationDate: policies.expirationDate,
        endedAt: policies.endedAt,
        premium: policies.premium,
      })
      .from(policies)
      .where(and(eq(policies.tenantId, tenant()), partyMatch.length ? or(...partyMatch) : eq(policies.tenantId, tenant()))),
    dealFilters.length
      ? db
          .select({
            id: deals.id,
            contactId: deals.contactId,
            accountId: deals.accountId,
            leadId: deals.leadId,
            ownerId: deals.ownerId,
            createdAt: deals.createdAt,
            boundAt: deals.boundAt,
            wonAt: deals.wonAt,
            archivedAt: deals.archivedAt,
            pipelineStage: deals.pipelineStage,
          })
          .from(deals)
          .where(and(eq(deals.tenantId, tenant()), or(...dealFilters)))
          .catch(() => [])
      : Promise.resolve([]),
    reviewFilters.length
      ? db
          .select({
            stars: experienceReviews.stars,
            skipped: experienceReviews.skipped,
            contactId: experienceReviews.contactId,
            policyId: experienceReviews.policyId,
            dealId: experienceReviews.dealId,
          })
          .from(experienceReviews)
          .where(and(eq(experienceReviews.tenantId, tenant()), or(...reviewFilters)))
          .catch(() => [])
      : Promise.resolve([]),
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.tenantId, tenant())),
  ]);
  const tenureRows = contactIds.length
    ? await db
        .select({ id: contacts.id, tenureStart: contacts.tenureStart })
        .from(contacts)
        .where(and(eq(contacts.tenantId, tenant()), inArray(contacts.id, contactIds)))
        .catch(() => [])
    : [];

  const allPolicyIds = uniq([...policyRows.map((row) => row.id), ...policyIds]);
  const allDealIds = uniq(dealRows.map((row) => row.id));
  const leadIds = uniq(dealRows.map((row) => row.leadId));
  const entityIds = uniq([...contactIds, ...accountIds, ...allPolicyIds, ...allDealIds]);

  const [leadRows, commsRows, alertRows] = await Promise.all([
    leadIds.length
      ? db
          .select({
            id: leads.id,
            createdAt: leads.createdAt,
            convertedDealId: leads.convertedDealId,
          })
          .from(leads)
          .where(and(eq(leads.tenantId, tenant()), inArray(leads.id, leadIds)))
      : Promise.resolve([]),
    db
      .select({
        kind: activityLogs.kind,
        direction: activityLogs.direction,
        occurredAt: activityLogs.occurredAt,
        contactId: activityLogs.contactId,
        policyId: activityLogs.policyId,
        dealId: activityLogs.dealId,
        accountId: activityLogs.accountId,
      })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.tenantId, tenant()),
          or(
            ...(contactIds.length ? [inArray(activityLogs.contactId, contactIds)] : []),
            ...(accountIds.length ? [inArray(activityLogs.accountId, accountIds)] : []),
            ...(allPolicyIds.length ? [inArray(activityLogs.policyId, allPolicyIds)] : []),
            ...(allDealIds.length ? [inArray(activityLogs.dealId, allDealIds)] : []),
          ),
        ),
      )
      .catch(() => []),
    entityIds.length
      ? db
          .select({
            severity: alerts.severity,
            entityType: alerts.entityType,
            entityId: alerts.entityId,
            readAt: alerts.readAt,
          })
          .from(alerts)
          .where(
            and(
              eq(alerts.tenantId, tenant()),
              isNull(alerts.readAt),
              inArray(alerts.entityId, entityIds),
            ),
          )
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  return {
    policies: policyRows,
    deals: dealRows,
    leads: leadRows,
    comms: commsRows,
    reviews: reviewRows,
    alerts: alertRows,
    owners: new Map(ownerRows.map((row) => [row.id, row.name])),
    tenureStart: new Map(tenureRows.map((row) => [row.id, row.tenureStart])),
  };
}

function partyKey(contactId: string | null, accountId: string | null): string {
  if (contactId) return `c:${contactId}`;
  if (accountId) return `a:${accountId}`;
  return "unknown";
}

function factsForParty(
  bundle: Awaited<ReturnType<typeof loadFactsForParties>>,
  contactId: string | null,
  accountId: string | null,
  extra?: Partial<ClientHealthFacts>,
): ClientHealthFacts {
  const partyPolicies = bundle.policies.filter(
    (row) => (contactId && row.contactId === contactId) || (accountId && row.accountId === accountId),
  );
  const ownerId =
    extra?.ownerId ??
    partyPolicies.find((row) => row.ownerId)?.ownerId ??
    bundle.deals.find(
      (row) => (contactId && row.contactId === contactId) || (accountId && row.accountId === accountId),
    )?.ownerId ??
    null;
  return {
    contactId,
    accountId,
    ownerId,
    ownerName: ownerId ? bundle.owners.get(ownerId) || "Producer" : "Unassigned",
    policies: partyPolicies,
    deals: bundle.deals.filter(
      (row) => (contactId && row.contactId === contactId) || (accountId && row.accountId === accountId),
    ),
    leads: bundle.leads,
    comms: bundle.comms.filter(
      (row) =>
        (contactId && row.contactId === contactId) ||
        (accountId && row.accountId === accountId) ||
        partyPolicies.some((policy) => policy.id === row.policyId),
    ),
    reviews: bundle.reviews.filter(
      (row) =>
        (contactId && row.contactId === contactId) ||
        partyPolicies.some((policy) => policy.id === row.policyId),
    ),
    alerts: bundle.alerts,
    ...extra,
    tenureStart: extra?.tenureStart ?? (contactId ? bundle.tenureStart.get(contactId) : null) ?? null,
  };
}

export type RenewalHealthAttach = {
  policyHealth: HealthChipView;
  clientHealth: HealthChipView;
  ownerId: string | null;
  ownerName: string;
};

export async function loadRenewalHealthMap(
  cards: Array<{
    policyId: string;
    contactId: string | null;
    accountId: string | null;
    daysUntil: number;
    premiumDelta: number | null;
  }>,
): Promise<Map<string, RenewalHealthAttach>> {
  const bundle = await loadFactsForParties({
    contactIds: cards.map((card) => card.contactId),
    accountIds: cards.map((card) => card.accountId),
    policyIds: cards.map((card) => card.policyId),
  });
  const renewalDaysByPolicy: Record<string, number> = {};
  const premiumDeltaByPolicy: Record<string, number | null> = {};
  for (const card of cards) {
    renewalDaysByPolicy[card.policyId] = card.daysUntil;
    premiumDeltaByPolicy[card.policyId] = card.premiumDelta;
  }
  const clientCache = new Map<string, ReturnType<typeof assembleClientPair>>();
  const out = new Map<string, RenewalHealthAttach>();
  for (const card of cards) {
    const key = partyKey(card.contactId, card.accountId);
    let pair = clientCache.get(key);
    if (!pair) {
      const facts = factsForParty(bundle, card.contactId, card.accountId, {
        renewalDaysByPolicy,
        premiumDeltaByPolicy,
      });
      pair = assembleClientPair(facts);
      clientCache.set(key, pair);
    }
    const policyHealth = pair.policies[card.policyId] ?? pair.client;
    const ownerId =
      bundle.policies.find((row) => row.id === card.policyId)?.ownerId ??
      bundle.deals.find((row) => row.contactId === card.contactId)?.ownerId ??
      null;
    out.set(card.policyId, {
      policyHealth,
      clientHealth: pair.client,
      ownerId,
      ownerName: ownerId ? bundle.owners.get(ownerId) || "Producer" : "Unassigned",
    });
  }
  return out;
}

export async function loadPartyHealth(input: {
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  daysUntil?: number | null;
  premiumDelta?: number | null;
}): Promise<{ client: HealthChipView | null; policy: HealthChipView | null }> {
  if (!input.contactId && !input.accountId && !input.policyId) {
    return { client: null, policy: null };
  }
  const bundle = await loadFactsForParties({
    contactIds: input.contactId ? [input.contactId] : [],
    accountIds: input.accountId ? [input.accountId] : [],
    policyIds: input.policyId ? [input.policyId] : [],
  });
  const contactId = input.contactId ?? bundle.policies[0]?.contactId ?? null;
  const accountId = input.accountId ?? bundle.policies[0]?.accountId ?? null;
  const facts = factsForParty(bundle, contactId, accountId, {
    renewalDaysByPolicy: input.policyId && input.daysUntil != null ? { [input.policyId]: input.daysUntil } : {},
    premiumDeltaByPolicy:
      input.policyId && input.premiumDelta != null ? { [input.policyId]: input.premiumDelta } : {},
  });
  const pair = assembleClientPair(facts);
  return {
    client: pair.client,
    policy: input.policyId ? pair.policies[input.policyId] ?? null : null,
  };
}

export function rollupRenewalHealth(
  rows: Array<{
    ownerId: string | null;
    ownerName: string;
    clientHealth: HealthChipView;
    contactId?: string | null;
    accountId?: string | null;
  }>,
  scope?: { ownerId: string | null },
): { book: AgentHealthRollup; agents: AgentHealthRollup[] } {
  const seen = new Set<string>();
  const unique: Array<{ ownerId: string | null; ownerName: string; score: number }> = [];
  for (const row of rows) {
    const key = row.contactId
      ? `c:${row.contactId}`
      : row.accountId
        ? `a:${row.accountId}`
        : `${row.ownerId ?? "none"}:${row.clientHealth.score}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({
      ownerId: row.ownerId,
      ownerName: row.ownerName,
      score: row.clientHealth.score,
    });
  }
  const scoped = scope?.ownerId
    ? unique.filter((row) => row.ownerId === scope.ownerId)
    : unique;
  const byOwner = new Map<string, typeof unique>();
  for (const row of unique) {
    const key = row.ownerId ?? "unassigned";
    const list = byOwner.get(key) ?? [];
    list.push(row);
    byOwner.set(key, list);
  }
  const agents = [...byOwner.values()]
    .map((list) => rollupHealthScores(list))
    .sort((a, b) => a.averageScore - b.averageScore || a.ownerName.localeCompare(b.ownerName));
  return {
    book: rollupHealthScores(scoped.length ? scoped : unique),
    agents,
  };
}

export async function loadContactOwnerId(contactId: string | null): Promise<string | null> {
  if (!contactId) return null;
  const [row] = await db
    .select({ ownerId: contacts.ownerId })
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenant()), eq(contacts.id, contactId)));
  return row?.ownerId ?? null;
}

/** Batch client-health chips for list boards. Fail-closed — never take down the desk. */
export async function loadPartyHealthMap(input: {
  contactIds: string[];
  accountIds: string[];
}): Promise<Map<string, HealthChipView>> {
  const contactIds = uniq(input.contactIds);
  const accountIds = uniq(input.accountIds);
  const out = new Map<string, HealthChipView>();
  if (contactIds.length === 0 && accountIds.length === 0) return out;
  try {
    const bundle = await loadFactsForParties({ contactIds, accountIds });
    for (const contactId of contactIds) {
      const pair = assembleClientPair(factsForParty(bundle, contactId, null));
      out.set(`c:${contactId}`, pair.client);
    }
    for (const accountId of accountIds) {
      const pair = assembleClientPair(factsForParty(bundle, null, accountId));
      out.set(`a:${accountId}`, pair.client);
    }
  } catch {
    return out;
  }
  return out;
}
