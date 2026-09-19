import { isEndedStatus, isInForceStatus } from "@/lib/policy/status";
import { deskNow } from "@/lib/home/as-of";
import {
  computeClientHealth,
  computePolicyHealth,
  toHealthChip,
  type BookShapeInput,
  type DeskSignalsInput,
  type EngagementInput,
  type HealthChipView,
  type HealthScore,
  type OpenRiskInput,
  type RatingsInput,
  type VelocityInput,
} from "@/lib/health/model";

export const COLD_DEAL_DAYS = 14;
export const HIGH_ALERT_SEVERITIES = new Set(["high", "critical", "urgent"]);
const COMMS_KINDS = new Set(["call", "email", "sms", "meeting"]);

export type HealthCommsRow = {
  kind: string;
  direction: string | null;
  occurredAt: Date | string;
  contactId: string | null;
  policyId: string | null;
  dealId: string | null;
  accountId: string | null;
};

export type HealthPolicyRow = {
  id: string;
  contactId: string | null;
  accountId: string | null;
  dealId: string | null;
  ownerId: string | null;
  status: string;
  effectiveDate: Date | string | null;
  expirationDate: Date | string | null;
  endedAt: Date | string | null;
  premium: string | number | null;
};

export type HealthDealRow = {
  id: string;
  contactId: string | null;
  accountId: string | null;
  leadId: string | null;
  ownerId: string | null;
  createdAt: Date | string;
  boundAt: Date | string | null;
  wonAt: Date | string | null;
  archivedAt: Date | string | null;
  pipelineStage: string | null;
};

export type HealthLeadRow = {
  id: string;
  createdAt: Date | string;
  convertedDealId: string | null;
};

export type HealthReviewRow = {
  stars: number | null;
  skipped: boolean;
  contactId: string | null;
  policyId: string | null;
  dealId: string | null;
};

export type HealthAlertRow = {
  severity: string;
  entityType: string | null;
  entityId: string | null;
  readAt: Date | string | null;
};

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function daysBetween(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / (24 * 60 * 60 * 1000));
}

export function isCommsKind(kind: string): boolean {
  return COMMS_KINDS.has(kind.toLowerCase());
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

export function filterEntityComms(
  rows: HealthCommsRow[],
  ids: { contactId?: string | null; policyId?: string | null; dealId?: string | null; accountId?: string | null },
): HealthCommsRow[] {
  return rows.filter((row) => {
    if (!isCommsKind(row.kind)) return false;
    if (ids.policyId && row.policyId === ids.policyId) return true;
    if (ids.dealId && row.dealId === ids.dealId) return true;
    if (ids.contactId && row.contactId === ids.contactId) return true;
    if (ids.accountId && row.accountId === ids.accountId) return true;
    return false;
  });
}

export function engagementFromComms(rows: HealthCommsRow[], now = deskNow()): EngagementInput {
  const dated = rows
    .map((row) => ({ ...row, at: asDate(row.occurredAt) }))
    .filter((row): row is HealthCommsRow & { at: Date } => Boolean(row.at))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  const last = dated.at(-1)?.at ?? null;
  const lastCommsDaysAgo = last ? Math.max(0, daysBetween(now, last)) : null;
  const commsLast30 = dated.filter((row) => daysBetween(now, row.at) <= 30).length;
  const commsLast90 = dated.filter((row) => daysBetween(now, row.at) <= 90).length;

  const replyHours: number[] = [];
  for (let i = 0; i < dated.length; i += 1) {
    const outbound = dated[i]!;
    if ((outbound.direction ?? "outbound") !== "outbound") continue;
    const inbound = dated.slice(i + 1).find((row) => (row.direction ?? "") === "inbound");
    if (!inbound) continue;
    replyHours.push((inbound.at.getTime() - outbound.at.getTime()) / (60 * 60 * 1000));
  }

  return {
    lastCommsDaysAgo,
    commsLast30,
    commsLast90,
    medianReplyHours: median(replyHours),
  };
}

export function bookShapeFromPolicies(rows: HealthPolicyRow[], now = deskNow()): BookShapeInput {
  const inForceCount = rows.filter((row) => isInForceStatus(row.status)).length;
  const addedLast180 = rows.filter((row) => {
    const start = asDate(row.effectiveDate);
    return start ? daysBetween(now, start) <= 180 && daysBetween(now, start) >= 0 : false;
  }).length;
  const endedLast180 = rows.filter((row) => {
    if (!isEndedStatus(row.status)) return false;
    const ended = asDate(row.endedAt) ?? asDate(row.expirationDate);
    return ended ? daysBetween(now, ended) <= 180 : false;
  }).length;
  return {
    inForceCount,
    lifetimeCount: rows.length,
    addedLast180,
    endedLast180,
  };
}

export function velocityFromRecords(input: {
  leads: HealthLeadRow[];
  deals: HealthDealRow[];
  comms: HealthCommsRow[];
  daysUntilRenewal?: number | null;
  now?: Date;
}): VelocityInput {
  const now = input.now ?? deskNow();
  const leadDays: number[] = [];
  const closeDays: number[] = [];
  const openAges: number[] = [];
  for (const deal of input.deals) {
    const created = asDate(deal.createdAt);
    const closed = asDate(deal.boundAt) ?? asDate(deal.wonAt);
    const lead = input.leads.find((row) => row.convertedDealId === deal.id || row.id === deal.leadId);
    const leadCreated = lead ? asDate(lead.createdAt) : null;
    if (created && leadCreated) leadDays.push(Math.max(0, daysBetween(created, leadCreated)));
    if (created && closed) closeDays.push(Math.max(0, daysBetween(closed, created)));
    else if (created && !deal.archivedAt) openAges.push(Math.max(0, daysBetween(now, created)));
  }
  const lastComms = input.comms
    .map((row) => asDate(row.occurredAt))
    .filter((row): row is Date => Boolean(row))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  return {
    leadToDealDays: median(leadDays),
    dealToCloseDays: median(closeDays),
    openDealAgeDays: openAges.length ? Math.max(...openAges) : null,
    daysUntilRenewal: input.daysUntilRenewal ?? null,
    daysSinceRenewalComms: lastComms ? Math.max(0, daysBetween(now, lastComms)) : null,
  };
}

export function ratingsFromReviews(rows: HealthReviewRow[]): RatingsInput {
  const ratings = rows
    .filter((row) => !row.skipped && row.stars != null && row.stars >= 1 && row.stars <= 5)
    .map((row) => row.stars as number);
  const average =
    ratings.length === 0 ? null : ratings.reduce((sum, star) => sum + star, 0) / ratings.length;
  return { ratings, average };
}

export function openRiskFromSignals(input: {
  daysUntilRenewal?: number | null;
  daysSinceComms?: number | null;
  deals: HealthDealRow[];
  comms: HealthCommsRow[];
  alerts: HealthAlertRow[];
  policyStatus?: string | null;
  now?: Date;
}): OpenRiskInput {
  const now = input.now ?? deskNow();
  const under30Silence =
    input.daysUntilRenewal != null &&
    input.daysUntilRenewal < 30 &&
    (input.daysSinceComms == null || input.daysSinceComms > 7);
  let coldOpenDeals = 0;
  for (const deal of input.deals) {
    if (deal.boundAt || deal.wonAt || deal.archivedAt) continue;
    const last = input.comms
      .filter((row) => row.dealId === deal.id || (!row.dealId && row.contactId === deal.contactId))
      .map((row) => asDate(row.occurredAt))
      .filter((row): row is Date => Boolean(row))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const age = last ? daysBetween(now, last) : daysBetween(now, asDate(deal.createdAt) ?? now);
    if (age >= COLD_DEAL_DAYS) coldOpenDeals += 1;
  }
  const highAlertCount = input.alerts.filter(
    (row) => !row.readAt && HIGH_ALERT_SEVERITIES.has((row.severity || "").toLowerCase()),
  ).length;
  return {
    under30Silence,
    coldOpenDeals,
    highAlertCount,
    cancelOrLapse: input.policyStatus ? isEndedStatus(input.policyStatus) : false,
    paymentOverdue: null,
  };
}

export function deskSignalsFromPolicy(input: {
  daysUntilRenewal?: number | null;
  premiumDelta?: number | null;
  premium?: number | null;
  status?: string | null;
}): DeskSignalsInput {
  return {
    daysUntilRenewal: input.daysUntilRenewal ?? null,
    premiumDelta: input.premiumDelta ?? null,
    premium: input.premium ?? null,
    inForce: input.status ? isInForceStatus(input.status) : true,
  };
}

export type ClientHealthFacts = {
  contactId: string | null;
  accountId: string | null;
  ownerId: string | null;
  ownerName: string;
  policies: HealthPolicyRow[];
  deals: HealthDealRow[];
  leads: HealthLeadRow[];
  comms: HealthCommsRow[];
  reviews: HealthReviewRow[];
  alerts: HealthAlertRow[];
  renewalDaysByPolicy?: Record<string, number>;
  premiumDeltaByPolicy?: Record<string, number | null>;
  now?: Date;
};

export function assemblePolicyHealth(
  facts: ClientHealthFacts,
  policyId: string,
): HealthScore {
  const policy = facts.policies.find((row) => row.id === policyId);
  const policyComms = filterEntityComms(facts.comms, {
    policyId,
    contactId: facts.contactId,
    accountId: facts.accountId,
    dealId: policy?.dealId,
  });
  const clientDeals = facts.deals.filter(
    (deal) =>
      deal.id === policy?.dealId ||
      (facts.contactId && deal.contactId === facts.contactId) ||
      (facts.accountId && deal.accountId === facts.accountId),
  );
  const daysUntil = facts.renewalDaysByPolicy?.[policyId] ?? null;
  const engagement = engagementFromComms(policyComms, facts.now);
  return computePolicyHealth({
    engagement,
    bookShape: bookShapeFromPolicies(facts.policies, facts.now),
    velocity: velocityFromRecords({
      leads: facts.leads,
      deals: clientDeals,
      comms: policyComms,
      daysUntilRenewal: daysUntil,
      now: facts.now,
    }),
    ratings: ratingsFromReviews(
      facts.reviews.filter((row) => row.policyId === policyId || row.contactId === facts.contactId),
    ),
    openRisk: openRiskFromSignals({
      daysUntilRenewal: daysUntil,
      daysSinceComms: engagement.lastCommsDaysAgo,
      deals: clientDeals,
      comms: facts.comms,
      alerts: facts.alerts.filter(
        (row) =>
          row.entityId === policyId ||
          row.entityId === facts.contactId ||
          clientDeals.some((deal) => deal.id === row.entityId),
      ),
      policyStatus: policy?.status,
      now: facts.now,
    }),
    deskSignals: deskSignalsFromPolicy({
      daysUntilRenewal: daysUntil,
      premiumDelta: facts.premiumDeltaByPolicy?.[policyId] ?? null,
      premium: policy?.premium != null ? Number(policy.premium) : null,
      status: policy?.status,
    }),
  });
}

export function assembleClientHealth(facts: ClientHealthFacts): HealthScore {
  const comms = filterEntityComms(facts.comms, {
    contactId: facts.contactId,
    accountId: facts.accountId,
  });
  const nearestRenewal = facts.policies
    .map((policy) => facts.renewalDaysByPolicy?.[policy.id])
    .filter((days): days is number => days != null)
    .sort((a, b) => a - b)[0];
  const engagement = engagementFromComms(comms, facts.now);
  const policyScores = facts.policies
    .filter((policy) => isInForceStatus(policy.status) || facts.renewalDaysByPolicy?.[policy.id] != null)
    .map((policy) => assemblePolicyHealth(facts, policy.id).score);
  return computeClientHealth({
    engagement,
    bookShape: bookShapeFromPolicies(facts.policies, facts.now),
    velocity: velocityFromRecords({
      leads: facts.leads,
      deals: facts.deals,
      comms,
      daysUntilRenewal: nearestRenewal ?? null,
      now: facts.now,
    }),
    ratings: ratingsFromReviews(facts.reviews),
    openRisk: openRiskFromSignals({
      daysUntilRenewal: nearestRenewal ?? null,
      daysSinceComms: engagement.lastCommsDaysAgo,
      deals: facts.deals,
      comms: facts.comms,
      alerts: facts.alerts,
      now: facts.now,
    }),
    policyScores,
  });
}

export function assembleClientPair(facts: ClientHealthFacts): {
  client: HealthChipView;
  policies: Record<string, HealthChipView>;
} {
  const client = toHealthChip(assembleClientHealth(facts));
  const policies: Record<string, HealthChipView> = {};
  for (const policy of facts.policies) {
    policies[policy.id] = toHealthChip(assemblePolicyHealth(facts, policy.id));
  }
  return { client, policies };
}
