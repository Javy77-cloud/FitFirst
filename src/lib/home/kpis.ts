import { inForcePolicies, isInForce, isLapse, type HomePolicy, type MonthCompare } from "./aggregate";
import { priorMonth, sameUtcMonth, startOfUtcMonth } from "./as-of";

export const ACTIVE_ACCOUNT_STATUSES = new Set(["active", "bound", "pending"]);
export const CANCELLED_STATUSES = new Set(["cancelled", "canceled", "terminated"]);
export const TERMINATED_STATUSES = new Set(["terminated", "expired"]);
export const ACTIVE_LEAD_STATUSES = new Set(["new", "contacted", "qualified"]);
export const OPEN_DEAL_STAGES = new Set([
  "shopping",
  "quoting",
  "comparing",
  "prospect",
  "contacted",
  "negotiation",
  "quote_sent",
  "quotesent",
  "quote sent",
]);

export type HomeLead = {
  id: string;
  status: string;
  ownerId?: string | null;
};

function money(value: number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}

export function isActiveAccountPolicy(policy: Pick<HomePolicy, "status">): boolean {
  return ACTIVE_ACCOUNT_STATUSES.has(policy.status.toLowerCase());
}

export function isCancelledStatus(status: string): boolean {
  return CANCELLED_STATUSES.has(status.toLowerCase());
}

export function isTerminatedStatus(status: string): boolean {
  return TERMINATED_STATUSES.has(status.toLowerCase());
}

export function accountKey(policy: Pick<HomePolicy, "contactId" | "accountId">): string | null {
  if (policy.accountId) return `a:${policy.accountId}`;
  if (policy.contactId) return `c:${policy.contactId}`;
  return null;
}

export function activeAccountCount(policies: HomePolicy[]): number {
  const keys = new Set<string>();
  for (const policy of policies) {
    if (!isActiveAccountPolicy(policy)) continue;
    const key = accountKey(policy);
    if (key) keys.add(key);
  }
  return keys.size;
}

export function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

export function isNewBusiness(policy: HomePolicy): boolean {
  if (!policy.originalEffectiveDate) return true;
  const orig = startOfUtcMonth(policy.originalEffectiveDate);
  const eff = startOfUtcMonth(policy.effectiveDate);
  return orig.getTime() >= eff.getTime();
}

export function writingsInMonth(
  policies: HomePolicy[],
  asOf: Date,
  kind: "new" | "renewal",
): HomePolicy[] {
  return inForcePolicies(policies).filter((policy) => {
    if (!sameUtcMonth(policy.effectiveDate, asOf)) return false;
    return kind === "new" ? isNewBusiness(policy) : !isNewBusiness(policy);
  });
}

export function monthCompareFor(
  policies: HomePolicy[],
  asOf: Date,
  pick: (rows: HomePolicy[], when: Date) => HomePolicy[],
): MonthCompare {
  const last = priorMonth(asOf);
  const thisRows = pick(policies, asOf);
  const lastRows = pick(policies, last);
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

export function cancellationDate(policy: HomePolicy): Date {
  return policy.endedAt ?? policy.expirationDate;
}

export function cancelledInMonth(policies: HomePolicy[], asOf: Date): HomePolicy[] {
  return policies.filter(
    (policy) => isCancelledStatus(policy.status) && sameUtcMonth(cancellationDate(policy), asOf),
  );
}

export function carrierCount(policies: HomePolicy[]): number {
  const ids = new Set<string>();
  for (const policy of inForcePolicies(policies)) {
    if (policy.carrierId) ids.add(policy.carrierId);
  }
  return ids.size;
}

export function cancelledOrTerminatedCount(policies: HomePolicy[]): {
  cancelled: number;
  terminated: number;
} {
  let cancelled = 0;
  let terminated = 0;
  for (const policy of policies) {
    if (isCancelledStatus(policy.status)) cancelled += 1;
    if (isTerminatedStatus(policy.status)) terminated += 1;
  }
  return { cancelled, terminated };
}

export function activeLeadCount(leads: HomeLead[]): number {
  return leads.filter((lead) => ACTIVE_LEAD_STATUSES.has(lead.status.toLowerCase())).length;
}

export function openDealCount(stages: string[]): number {
  return stages.filter((stage) => OPEN_DEAL_STAGES.has(stage.toLowerCase())).length;
}

export function lapseCount(policies: HomePolicy[]): number {
  return policies.filter(isLapse).length;
}

export function bookRatios(policies: HomePolicy[]) {
  const inForce = inForcePolicies(policies);
  const premium = inForce.reduce((sum, p) => sum + money(p.premium), 0);
  const accounts = activeAccountCount(policies);
  return {
    activeAccounts: accounts,
    inForceCount: inForce.length,
    inForcePremium: premium,
    premiumPerAccount: ratio(premium, accounts),
    premiumPerPolicy: ratio(premium, inForce.length),
    policiesPerAccount: ratio(inForce.length, accounts),
    carrierCount: carrierCount(policies),
  };
}

export function momDelta(thisVal: number, lastVal: number): { change: number; pct: number | null } {
  if (lastVal === 0) return { change: thisVal - lastVal, pct: null };
  return { change: thisVal - lastVal, pct: Math.round(((thisVal - lastVal) / lastVal) * 100) };
}

export { isInForce };
