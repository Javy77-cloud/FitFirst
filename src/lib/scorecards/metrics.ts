import {
  IN_FORCE_STATUSES,
  LAPSE_STATUSES,
  LOST_STAGES,
  OPEN_QUOTE_STAGES,
  QUOTE_SENT_STAGES,
  WON_STAGES,
} from "@/lib/home/aggregate";
import { ratio } from "@/lib/home/kpis";
import type { AccessStatus } from "@/lib/people/status";
import {
  parseScorecardSort,
  type ProducerScorecard,
  type ScorecardDeal,
  type ScorecardPolicy,
  type ScorecardProducer,
  type ScorecardSort,
} from "./types";

export { parseScorecardSort };

function money(value: number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}

export function dealOutcome(
  stage: string,
  boundAt: Date | null | undefined,
): "shop" | "won" | "lost" | "other" {
  if (boundAt) return "won";
  const s = stage.toLowerCase();
  if (WON_STAGES.has(s)) return "won";
  if (LOST_STAGES.has(s)) return "lost";
  if (OPEN_QUOTE_STAGES.has(s) || QUOTE_SENT_STAGES.has(s)) return "shop";
  return "other";
}

/** Quotes / shopping statuses are not binds. Policies exist only after accept. */
export function isBindPolicy(status: string): boolean {
  const s = status.toLowerCase();
  if (s === "quoted" || s === "shopping" || s === "quote") return false;
  return IN_FORCE_STATUSES.has(s) || s === "pending";
}

export function isInForcePolicy(status: string): boolean {
  return IN_FORCE_STATUSES.has(status.toLowerCase());
}

export function isLapsedPolicy(status: string): boolean {
  return LAPSE_STATUSES.has(status.toLowerCase());
}

export function scoreForProducer(
  producer: ScorecardProducer,
  deals: ScorecardDeal[],
  policies: ScorecardPolicy[],
): Omit<ProducerScorecard, "rank"> {
  const mineDeals = deals.filter((deal) => deal.ownerId === producer.id && !deal.archivedAt);
  const minePolicies = policies.filter((policy) => policy.ownerId === producer.id);

  let shops = 0;
  let lost = 0;
  const wonDealIds = new Set<string>();
  for (const deal of mineDeals) {
    const outcome = dealOutcome(deal.pipelineStage, deal.boundAt);
    if (outcome === "shop") shops += 1;
    if (outcome === "lost") lost += 1;
    if (outcome === "won") wonDealIds.add(deal.id);
  }

  const bindPolicies = minePolicies.filter((policy) => isBindPolicy(policy.status));
  const orphanBinds = bindPolicies.filter((policy) => !policy.dealId || !wonDealIds.has(policy.dealId));
  const binds = wonDealIds.size + orphanBinds.length;

  const inForce = minePolicies.filter((policy) => isInForcePolicy(policy.status));
  const lapsed = minePolicies.filter((policy) => isLapsedPolicy(policy.status));
  const premium = inForce.reduce((sum, policy) => sum + money(policy.premium), 0);

  return {
    userId: producer.id,
    name: producer.name,
    role: producer.role,
    status: producer.status,
    shops,
    lost,
    binds,
    conversion: ratio(binds, binds + shops + lost),
    inForce: inForce.length,
    lapsed: lapsed.length,
    retention: ratio(inForce.length, inForce.length + lapsed.length),
    premium,
  };
}

function sortValue(row: Omit<ProducerScorecard, "rank">, sort: ScorecardSort): number {
  if (sort === "conversion") return row.conversion;
  if (sort === "retention") return row.retention;
  if (sort === "binds") return row.binds;
  return row.premium;
}

export function rankScorecards(
  producers: ScorecardProducer[],
  deals: ScorecardDeal[],
  policies: ScorecardPolicy[],
  sort: ScorecardSort = "premium",
): ProducerScorecard[] {
  return producers
    .map((producer) => scoreForProducer(producer, deals, policies))
    .sort((a, b) => {
      const diff = sortValue(b, sort) - sortValue(a, sort);
      if (diff !== 0) return diff;
      if (b.premium !== a.premium) return b.premium - a.premium;
      if (b.binds !== a.binds) return b.binds - a.binds;
      return a.name.localeCompare(b.name);
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function visibleScorecards(
  ranked: ProducerScorecard[],
  opts: { isAdmin: boolean; userId: string | null },
): ProducerScorecard[] {
  if (opts.isAdmin) return ranked;
  if (!opts.userId) return [];
  return ranked.filter((row) => row.userId === opts.userId);
}

export function scorecardHref(userId: string): string {
  return `/scorecards/${userId}`;
}

export function producerStatusLabel(status: AccessStatus): string {
  if (status === "frozen") return "Frozen";
  if (status === "removed") return "Removed";
  return "Active";
}
