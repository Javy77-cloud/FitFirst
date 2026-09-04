import type { HomePolicy } from "./aggregate";
import { isNewBusiness, writingsInMonth } from "./kpis";
import { priorMonth, sameUtcMonth } from "./as-of";

export type HomeAgent = {
  id: string;
  name: string;
};

export type LeaderRow = {
  userId: string;
  name: string;
  premium: number;
  policyCount: number;
  rank: number;
};

function money(value: number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}

export function productionInMonth(policies: HomePolicy[], asOf: Date): HomePolicy[] {
  return policies.filter((policy) => {
    const status = policy.status.toLowerCase();
    if (status === "quoted" || status === "shopping") return false;
    if (status === "cancelled" || status === "canceled" || status === "terminated") return false;
    return sameUtcMonth(policy.effectiveDate, asOf);
  });
}

export function rankAgents(
  policies: HomePolicy[],
  agents: HomeAgent[],
  asOf: Date,
  kind: "month" | "contest" = "month",
  contest?: { metric: "premium" | "policy_count"; startsAt: Date; endsAt: Date },
): LeaderRow[] {
  const names = new Map(agents.map((agent) => [agent.id, agent.name]));
  const byAgent = new Map<string, { premium: number; policyCount: number }>();

  const rows =
    kind === "contest" && contest
      ? policies.filter((policy) => {
          const t = policy.effectiveDate.getTime();
          const status = policy.status.toLowerCase();
          if (status === "quoted" || status === "shopping") return false;
          return t >= contest.startsAt.getTime() && t <= contest.endsAt.getTime();
        })
      : productionInMonth(policies, asOf);

  for (const policy of rows) {
    const id = policy.ownerId;
    if (!id) continue;
    const existing = byAgent.get(id) ?? { premium: 0, policyCount: 0 };
    existing.premium += money(policy.premium);
    existing.policyCount += 1;
    byAgent.set(id, existing);
  }

  const metric = contest?.metric ?? "premium";
  const ranked = [...byAgent.entries()]
    .map(([userId, stats]) => ({
      userId,
      name: names.get(userId) ?? "Unknown agent",
      premium: stats.premium,
      policyCount: stats.policyCount,
    }))
    .sort((a, b) =>
      metric === "policy_count"
        ? b.policyCount - a.policyCount || b.premium - a.premium || a.name.localeCompare(b.name)
        : b.premium - a.premium || b.policyCount - a.policyCount || a.name.localeCompare(b.name),
    )
    .slice(0, 10)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return ranked;
}

export function leaderboardPair(policies: HomePolicy[], agents: HomeAgent[], asOf: Date) {
  return {
    thisMonth: rankAgents(policies, agents, asOf),
    lastMonth: rankAgents(policies, agents, priorMonth(asOf)),
  };
}

export { isNewBusiness, writingsInMonth };
