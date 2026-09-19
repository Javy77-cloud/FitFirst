export type BusinessHealth = "green" | "yellow" | "red";

/**
 * Business health for header dot:
 * green  = active policies + recent activity (≤30d)
 * yellow = policies but quiet (<90d since last activity)
 * red    = no policies, or no activity in 90 days
 */
export function businessHealthScore(input: {
  activePolicyCount: number;
  policyCount?: number;
  lastActivityAt?: Date | string | null;
  now?: Date;
}): { level: BusinessHealth; tip: string } {
  const now = input.now ?? new Date();
  const raw = input.lastActivityAt ? new Date(input.lastActivityAt).getTime() : null;
  const days =
    raw && Number.isFinite(raw) ? Math.floor((now.getTime() - raw) / (24 * 60 * 60 * 1000)) : null;
  const active = input.activePolicyCount ?? 0;
  const lifetime = input.policyCount ?? active;
  const hasPolicies = active > 0 || lifetime > 0;
  const recent = days != null && days <= 30;
  const within90 = days != null && days < 90;

  if (active > 0 && recent) {
    return { level: "green", tip: "Active policies and recent activity." };
  }
  if (hasPolicies && within90) {
    return {
      level: "yellow",
      tip: "Has policies but quiet — no activity in the last 30 days.",
    };
  }
  if (!hasPolicies) {
    return {
      level: "red",
      tip: "No policies on this account.",
    };
  }
  return {
    level: "red",
    tip: "No activity in the last 90 days.",
  };
}
