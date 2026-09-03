import type { PolicyStatus } from "@/lib/domain";

export type PolicyStatusFilter = PolicyStatus | "all";

export function normalizePolicyStatus(status: string): PolicyStatus | "other" {
  const s = status.trim().toLowerCase();
  if (s === "active" || s === "pending" || s === "inactive" || s === "cancelled") return s;
  return "other";
}

export function policyStatusCounts(policies: { status: string }[]) {
  const counts = { lifetime: policies.length, active: 0, pending: 0, inactive: 0, cancelled: 0, other: 0 };
  for (const policy of policies) {
    const key = normalizePolicyStatus(policy.status);
    if (key === "other") counts.other += 1;
    else counts[key] += 1;
  }
  return counts;
}

export function filterPoliciesByStatus<T extends { status: string }>(
  policies: T[],
  filter: PolicyStatusFilter,
): T[] {
  if (filter === "all") return policies;
  return policies.filter((p) => normalizePolicyStatus(p.status) === filter);
}
