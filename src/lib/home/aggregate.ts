import { addUtcDays, sameUtcMonth } from "./as-of";
import { attentionPriority, attentionStatus } from "./attention-window";
import {
  birthdayBuckets,
  turning65Buckets,
  type BirthdayRow,
  type HomeContactDob,
} from "./birthdays";
import {
  activeLeadCount,
  bookRatios,
  cancelledInMonth,
  cancelledOrTerminatedCount,
  carrierCount,
  lapseCount,
  monthCompareFor,
  openDealCount,
  writingsInMonth,
  type HomeLead,
} from "./kpis";
import { leaderboardPair, type HomeAgent, type LeaderRow } from "./leaderboard";
import { HOME_LINE_KEYS, HOME_LINE_LABEL, homeLineKey, type HomeLineKey } from "./lines";

export const IN_FORCE_STATUSES = new Set(["active", "bound"]);
export const LAPSE_STATUSES = new Set(["lapsed", "lapse", "cancelled", "canceled", "expired"]);
export const OPEN_QUOTE_STAGES = new Set([
  "shopping",
  "quoting",
  "comparing",
  "prospect",
  "contacted",
  "negotiation",
]);
export const QUOTE_SENT_STAGES = new Set(["quote_sent", "quotesent", "quote sent"]);
export const WON_STAGES = new Set(["bound", "closed_won", "won", "closed won"]);
export const LOST_STAGES = new Set(["lost", "closed_lost"]);

export type HomePolicy = {
  id: string;
  contactId: string;
  accountId?: string | null;
  dealId?: string | null;
  carrierId: string | null;
  carrierName: string | null;
  contactName: string;
  policyNumber: string;
  lineOfBusiness: string;
  status: string;
  premium: number;
  effectiveDate: Date;
  expirationDate: Date;
  originalEffectiveDate?: Date | null;
  endedAt?: Date | null;
  ownerId?: string | null;
};

export type HomeDeal = {
  id: string;
  title: string;
  pipelineStage: string;
  lineOfBusiness: string;
  boundAt: Date | null;
  updatedAt: Date;
  contactId: string | null;
  ownerId?: string | null;
};

export type HomeTask = {
  id: string;
  title: string;
  dueDate: Date;
  kind: string;
  dealId: string | null;
  policyId: string | null;
  contactId: string | null;
};

export type MixSlice = {
  key: string;
  label: string;
  count: number;
  premium: number;
};

export type MonthCompare = {
  thisMonth: { count: number; premium: number };
  lastMonth: { count: number; premium: number };
};

export type RenewalWindow = {
  days: 30 | 60;
  count: number;
  premium: number;
};

export type AttentionItem = {
  id: string;
  kind: "task" | "lapse" | "bound_pending";
  title: string;
  detail: string;
  href: string;
  dueAt: Date;
  priority: "Highest" | "High" | "Normal" | "Low";
  status: string;
};

export type CrossSellGap = {
  contactId: string;
  name: string;
  missing: string[];
};

export type BookHolder = {
  contactId: string;
  name: string;
  href: string;
  has: HomeLineKey[];
};

export type CommissionTotals = {
  pending: number;
  paid: number;
} | null;

function money(value: number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}

export function isInForce(policy: Pick<HomePolicy, "status">): boolean {
  return IN_FORCE_STATUSES.has(policy.status.toLowerCase());
}

export function isLapse(policy: Pick<HomePolicy, "status">): boolean {
  return LAPSE_STATUSES.has(policy.status.toLowerCase());
}

export function inForcePolicies(policies: HomePolicy[]): HomePolicy[] {
  return policies.filter(isInForce);
}

export function writtenInMonth(policies: HomePolicy[], asOf: Date): HomePolicy[] {
  return inForcePolicies(policies).filter((policy) => sameUtcMonth(policy.effectiveDate, asOf));
}

export function monthCompare(policies: HomePolicy[], asOf: Date): MonthCompare {
  const last = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - 1, 15));
  const thisRows = writtenInMonth(policies, asOf);
  const lastRows = writtenInMonth(policies, last);
  return {
    thisMonth: {
      count: thisRows.length,
      premium: thisRows.reduce((sum, p) => sum + money(p.premium), 0),
    },
    lastMonth: {
      count: lastRows.length,
      premium: lastRows.reduce((sum, p) => sum + money(p.premium), 0),
    },
  };
}

export function renewalsDue(policies: HomePolicy[], asOf: Date, days: 30 | 60): HomePolicy[] {
  const end = addUtcDays(asOf, days);
  return inForcePolicies(policies).filter(
    (policy) => policy.expirationDate > asOf && policy.expirationDate <= end,
  );
}

export function renewalWindow(policies: HomePolicy[], asOf: Date, days: 30 | 60): RenewalWindow {
  const rows = renewalsDue(policies, asOf, days);
  return {
    days,
    count: rows.length,
    premium: rows.reduce((sum, p) => sum + money(p.premium), 0),
  };
}

export function lineMix(policies: HomePolicy[]): MixSlice[] {
  const map = new Map<HomeLineKey, MixSlice>();
  for (const key of HOME_LINE_KEYS) {
    map.set(key, { key, label: HOME_LINE_LABEL[key], count: 0, premium: 0 });
  }
  for (const policy of inForcePolicies(policies)) {
    const key = homeLineKey(policy.lineOfBusiness);
    if (!key) continue;
    const slice = map.get(key)!;
    slice.count += 1;
    slice.premium += money(policy.premium);
  }
  return HOME_LINE_KEYS.map((key) => map.get(key)!);
}

export function carrierMix(policies: HomePolicy[]): MixSlice[] {
  const map = new Map<string, MixSlice>();
  for (const policy of inForcePolicies(policies)) {
    const key = policy.carrierId ?? "unassigned";
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.premium += money(policy.premium);
    } else {
      map.set(key, {
        key,
        label: policy.carrierName ?? "Unassigned",
        count: 1,
        premium: money(policy.premium),
      });
    }
  }
  return [...map.values()].sort((a, b) => b.premium - a.premium || b.count - a.count);
}

export function pipelineCounts(deals: HomeDeal[], asOf: Date) {
  let openQuotes = 0;
  let quoteSent = 0;
  let closedWonThisMonth = 0;
  for (const deal of deals) {
    const stage = deal.pipelineStage.toLowerCase();
    if (OPEN_QUOTE_STAGES.has(stage)) openQuotes += 1;
    if (QUOTE_SENT_STAGES.has(stage)) quoteSent += 1;
    if (isClosedWonThisMonth(deal, asOf)) closedWonThisMonth += 1;
  }
  return { openQuotes, quoteSent, closedWonThisMonth };
}

export function isClosedWonThisMonth(deal: HomeDeal, asOf: Date): boolean {
  const stage = deal.pipelineStage.toLowerCase();
  if (!WON_STAGES.has(stage)) return false;
  const when = deal.boundAt ?? deal.updatedAt;
  return sameUtcMonth(when, asOf);
}

export function boundWaitingOnIssue(deals: HomeDeal[], policies: HomePolicy[]): HomeDeal[] {
  const issuedDealIds = new Set(
    policies.filter((p) => isInForce(p) && p.dealId).map((p) => p.dealId as string),
  );
  const policiesByDealContact = new Set(policies.map((p) => p.contactId).filter(Boolean));
  return deals.filter((deal) => {
    const stage = deal.pipelineStage.toLowerCase();
    if (!WON_STAGES.has(stage)) return false;
    if (issuedDealIds.has(deal.id)) return false;
    if (deal.contactId && policiesByDealContact.has(deal.contactId)) return false;
    return true;
  });
}

export function attentionItems(input: {
  tasks: HomeTask[];
  policies: HomePolicy[];
  deals: HomeDeal[];
  asOf?: Date;
}): AttentionItem[] {
  const asOf = input.asOf ?? new Date();
  const items: AttentionItem[] = [];

  for (const task of input.tasks) {
    items.push({
      id: `task-${task.id}`,
      kind: "task",
      title: task.title,
      detail: `Due ${task.dueDate.toISOString().slice(0, 10)} · ${task.kind.replaceAll("_", " ")}`,
      href: task.dealId ? `/deals/${task.dealId}` : task.policyId ? `/policies/${task.policyId}` : "/work-queue",
      dueAt: task.dueDate,
      priority: attentionPriority({ kind: "task", dueAt: task.dueDate, asOf }),
      status: attentionStatus("task"),
    });
  }

  for (const policy of input.policies.filter(isLapse)) {
    items.push({
      id: `lapse-${policy.id}`,
      kind: "lapse",
      title: `${policy.contactName} · ${policy.policyNumber} lapsed`,
      detail: `${policy.lineOfBusiness} · ${policy.expirationDate.toISOString().slice(0, 10)}`,
      href: `/policies/${policy.id}`,
      dueAt: policy.expirationDate,
      priority: attentionPriority({ kind: "lapse", dueAt: policy.expirationDate, asOf }),
      status: attentionStatus("lapse"),
    });
  }

  for (const deal of boundWaitingOnIssue(input.deals, input.policies)) {
    const dueAt = deal.updatedAt ?? asOf;
    items.push({
      id: `bound-${deal.id}`,
      kind: "bound_pending",
      title: `${deal.title} is bound, waiting on issue`,
      detail: "No in-force policy on the file yet",
      href: `/deals/${deal.id}`,
      dueAt,
      priority: attentionPriority({ kind: "bound_pending", dueAt, asOf }),
      status: attentionStatus("bound_pending"),
    });
  }

  return items;
}

const PERSONAL_COMPANIONS: HomeLineKey[] = ["HO", "AUTO", "FLOOD"];

export function crossSellGaps(policies: HomePolicy[]): CrossSellGap[] {
  const byContact = new Map<string, { name: string; lines: Set<HomeLineKey> }>();
  for (const policy of inForcePolicies(policies)) {
    const key = homeLineKey(policy.lineOfBusiness);
    if (!key || key === "COMMERCIAL" || key === "HEALTH" || key === "LIFE") continue;
    const existing = byContact.get(policy.contactId);
    if (existing) existing.lines.add(key);
    else byContact.set(policy.contactId, { name: policy.contactName, lines: new Set([key]) });
  }

  const gaps: CrossSellGap[] = [];
  for (const [contactId, row] of byContact) {
    const missing = PERSONAL_COMPANIONS.filter((line) => !row.lines.has(line)).map(
      (line) => HOME_LINE_LABEL[line],
    );
    if (missing.length > 0 && missing.length < PERSONAL_COMPANIONS.length) {
      gaps.push({ contactId, name: row.name, missing });
    }
  }
  return gaps.sort((a, b) => a.name.localeCompare(b.name));
}

export function bookHolders(policies: HomePolicy[]): BookHolder[] {
  const byContact = new Map<string, { name: string; lines: Set<HomeLineKey> }>();
  for (const policy of inForcePolicies(policies)) {
    const key = homeLineKey(policy.lineOfBusiness);
    if (!key || !policy.contactId) continue;
    const existing = byContact.get(policy.contactId);
    if (existing) existing.lines.add(key);
    else byContact.set(policy.contactId, { name: policy.contactName, lines: new Set([key]) });
  }
  return [...byContact.entries()]
    .map(([contactId, row]) => ({
      contactId,
      name: row.name,
      href: `/contacts/${contactId}`,
      has: HOME_LINE_KEYS.filter((k) => row.lines.has(k)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function filterByAssignee<T extends { ownerId?: string | null }>(
  rows: T[],
  agentUserId: string | null,
  hasAssignee: boolean,
): T[] {
  if (!agentUserId || !hasAssignee) return rows;
  return rows.filter((row) => row.ownerId === agentUserId);
}

export type OwnerHomeSnapshot = {
  asOf: Date;
  inForceCount: number;
  inForcePremium: number;
  written: MonthCompare;
  commissions: CommissionTotals;
  pipeline: ReturnType<typeof pipelineCounts>;
  renewals30: RenewalWindow;
  renewals60: RenewalWindow;
  lineMix: MixSlice[];
  carrierMix: MixSlice[];
  attention: AttentionItem[];
  gaps: CrossSellGap[];
  gapCount: number;
  holders: BookHolder[];
  activeAccounts: number;
  premiumPerAccount: number;
  premiumPerPolicy: number;
  policiesPerAccount: number;
  carrierCount: number;
  newBusiness: MonthCompare;
  renewalsWritten: MonthCompare;
  cancellations: MonthCompare;
  strip: {
    activeLeads: number;
    openDeals: number;
    lapseCount: number;
    boundPending: number;
    cancelledCount: number;
    terminatedCount: number;
  };
  leaderboardThisMonth: LeaderRow[];
  leaderboardLastMonth: LeaderRow[];
  birthdays: { today: BirthdayRow[]; nextWeek: BirthdayRow[]; nextMonth: BirthdayRow[] };
  turning65: { nextMonth: BirthdayRow[]; nextYear: BirthdayRow[] };
};

export function buildOwnerHome(input: {
  asOf: Date;
  policies: HomePolicy[];
  deals: HomeDeal[];
  tasks: HomeTask[];
  commissions?: CommissionTotals;
  leads?: HomeLead[];
  contacts?: HomeContactDob[];
  agents?: HomeAgent[];
}): OwnerHomeSnapshot {
  const inForce = inForcePolicies(input.policies);
  const ratios = bookRatios(input.policies);
  const ended = cancelledOrTerminatedCount(input.policies);
  const board = leaderboardPair(input.policies, input.agents ?? [], input.asOf);
  return {
    asOf: input.asOf,
    inForceCount: inForce.length,
    inForcePremium: inForce.reduce((sum, p) => sum + money(p.premium), 0),
    written: monthCompare(input.policies, input.asOf),
    commissions: input.commissions ?? null,
    pipeline: pipelineCounts(input.deals, input.asOf),
    renewals30: renewalWindow(input.policies, input.asOf, 30),
    renewals60: renewalWindow(input.policies, input.asOf, 60),
    lineMix: lineMix(input.policies),
    carrierMix: carrierMix(input.policies),
    attention: attentionItems({
      tasks: input.tasks,
      policies: input.policies,
      deals: input.deals,
      asOf: input.asOf,
    }),
    gaps: crossSellGaps(input.policies),
    gapCount: crossSellGaps(input.policies).length,
    holders: bookHolders(input.policies),
    activeAccounts: ratios.activeAccounts,
    premiumPerAccount: ratios.premiumPerAccount,
    premiumPerPolicy: ratios.premiumPerPolicy,
    policiesPerAccount: ratios.policiesPerAccount,
    carrierCount: carrierCount(input.policies),
    newBusiness: monthCompareFor(input.policies, input.asOf, (rows, when) =>
      writingsInMonth(rows, when, "new"),
    ),
    renewalsWritten: monthCompareFor(input.policies, input.asOf, (rows, when) =>
      writingsInMonth(rows, when, "renewal"),
    ),
    cancellations: monthCompareFor(input.policies, input.asOf, cancelledInMonth),
    strip: {
      activeLeads: activeLeadCount(input.leads ?? []),
      openDeals: openDealCount(input.deals.map((deal) => deal.pipelineStage)),
      lapseCount: lapseCount(input.policies),
      boundPending: boundWaitingOnIssue(input.deals, input.policies).length,
      cancelledCount: ended.cancelled,
      terminatedCount: ended.terminated,
    },
    leaderboardThisMonth: board.thisMonth,
    leaderboardLastMonth: board.lastMonth,
    birthdays: birthdayBuckets(input.contacts ?? [], input.asOf),
    turning65: turning65Buckets(input.contacts ?? [], input.asOf),
  };
}
