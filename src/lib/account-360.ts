import type { PolicyStatus } from "@/lib/domain";

export type Account360Status = "active" | "pending" | "inactive" | "cancelled" | "other";
export type PolicyStatusFilter = PolicyStatus | "all";

export function normalizePolicyStatus(status: string): Account360Status {
  const s = status.trim().toLowerCase();
  if (s === "active" || s === "pending" || s === "inactive" || s === "cancelled") return s;
  if (s === "bound") return "active";
  if (s === "expired") return "inactive";
  return "other";
}

export function policyStatusCounts(policies: { status: string }[]) {
  const counts = { lifetime: policies.length, active: 0, pending: 0, inactive: 0, cancelled: 0, other: 0 };
  for (const policy of policies) {
    const key = normalizePolicyStatus(policy.status);
    counts[key] += 1;
  }
  return counts;
}

export function filterPoliciesByStatus<T extends { status: string }>(
  policies: T[],
  filter: PolicyStatusFilter,
): T[] {
  if (filter === "all") return policies;
  return policies.filter((p) => {
    const key = normalizePolicyStatus(p.status);
    if (filter === "bound") return p.status === "bound" || key === "active";
    if (filter === "expired") return p.status === "expired" || key === "inactive";
    return key === filter || p.status === filter;
  });
}
