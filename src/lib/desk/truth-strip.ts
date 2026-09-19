import {
  healthMixFromCard,
  healthPulseShares,
  type HealthPulseShare,
} from "@/lib/renewal/health";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";

export const HEAT_LEVELS = ["hot", "cooling", "cold"] as const;
export type HeatLevel = (typeof HEAT_LEVELS)[number];

export const HEAT_META: Record<
  HeatLevel,
  { label: string; shortLabel: string; tone: "terracotta" | "amber" | "navy" }
> = {
  hot: { label: "Hot", shortLabel: "Hot", tone: "terracotta" },
  cooling: { label: "Cooling", shortLabel: "Cooling", tone: "amber" },
  cold: { label: "Cold", shortLabel: "Cold", tone: "navy" },
};

export type HeatShare = {
  level: HeatLevel;
  count: number;
  pct: number;
};

function largestRemainderPercents(counts: number[], total: number): number[] {
  if (total <= 0) return counts.map(() => 0);
  const raw = counts.map((count) => (count / total) * 100);
  const floored = raw.map((value) => Math.floor(value));
  let leftover = 100 - floored.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);
  const pcts = [...floored];
  for (const item of order) {
    if (leftover <= 0) break;
    pcts[item.index] += 1;
    leftover -= 1;
  }
  return pcts;
}

export function heatShares(levels: HeatLevel[]): HeatShare[] {
  const counts: Record<HeatLevel, number> = { hot: 0, cooling: 0, cold: 0 };
  for (const level of levels) counts[level] += 1;
  const ordered = HEAT_LEVELS.map((level) => counts[level]);
  const pcts = largestRemainderPercents(ordered, levels.length);
  return HEAT_LEVELS.map((level, index) => ({
    level,
    count: counts[level],
    pct: pcts[index] ?? 0,
  }));
}

/** Renewals heat: fire drill vs sliding vs later — not a name-shame board. */
export function bookHeatFromRenewal(card: {
  daysUntil: number;
  healthFlagged?: boolean;
  healthStars?: number | null;
  lastContactDays?: number | null;
}): HeatLevel {
  if (card.healthFlagged || card.daysUntil < 30 || (card.healthStars != null && card.healthStars <= 2)) {
    return "hot";
  }
  if (
    card.daysUntil < 60 ||
    card.healthStars === 3 ||
    (card.lastContactDays != null && card.lastContactDays >= 7)
  ) {
    return "cooling";
  }
  return "cold";
}

/** Deals heat: recent motion / sliding / 14d cold — matches the Radar cold clock. */
export function bookHeatFromDeal(daysSinceUpdate: number | null): HeatLevel {
  if (daysSinceUpdate == null || !Number.isFinite(daysSinceUpdate)) return "cooling";
  if (daysSinceUpdate < 3) return "hot";
  if (daysSinceUpdate < 14) return "cooling";
  return "cold";
}

export function daysSince(iso: string | Date | null | undefined, asOf: Date): number | null {
  if (!iso) return null;
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((asOf.getTime() - date.getTime()) / 86_400_000));
}

export function renewalHeatShares(cards: Array<Parameters<typeof bookHeatFromRenewal>[0]>): HeatShare[] {
  return heatShares(cards.map(bookHeatFromRenewal));
}

export function renewalHealthShares(
  cards: Array<Parameters<typeof healthMixFromCard>[0]>,
): HealthPulseShare[] {
  return healthPulseShares(cards.map(healthMixFromCard));
}

export function dealHeatShares(
  updatedAt: Array<string | Date | null | undefined>,
  asOf: Date,
): HeatShare[] {
  return heatShares(updatedAt.map((value) => bookHeatFromDeal(daysSince(value, asOf))));
}

export function truthLine(input: {
  heat: HeatShare[];
  flagged?: number;
  clients: number;
  surface: "renewals" | "deals";
}): string {
  if (input.clients === 0) {
    return input.surface === "deals" ? "No open shops on this book yet." : "No renewals on this book yet.";
  }
  const hot = input.heat.find((row) => row.level === "hot")?.count ?? 0;
  const cooling = input.heat.find((row) => row.level === "cooling")?.count ?? 0;
  const cold = input.heat.find((row) => row.level === "cold")?.count ?? 0;
  const noun = input.surface === "deals" ? "shops" : "renewals";
  const flag =
    input.flagged && input.flagged > 0
      ? ` · ${input.flagged} flagged`
      : "";
  if (hot >= cooling && hot >= cold) {
    return `${hot} hot · ${cooling} cooling · ${cold} cold${flag} — the ${noun} are running hot.`;
  }
  if (cold > hot && cold >= cooling) {
    return `${cold} cold · ${cooling} cooling · ${hot} hot${flag} — most of the book can wait.`;
  }
  return `${cooling} cooling · ${hot} hot · ${cold} cold${flag} — watch the slide.`;
}

export function waveformTicks(shares: HeatShare[], totalTicks = 36): HeatLevel[] {
  const ticks: HeatLevel[] = [];
  for (const share of shares) {
    const n = Math.round((share.pct / 100) * totalTicks);
    for (let i = 0; i < n; i += 1) ticks.push(share.level);
  }
  while (ticks.length < totalTicks) ticks.push("cold");
  return ticks.slice(0, totalTicks);
}

export function flaggedClientCount(cards: Array<{ healthFlagged?: boolean; partyKey?: string; policyId?: string }>): number {
  const seen = new Set<string>();
  let flagged = 0;
  for (const card of cards) {
    const key = card.partyKey || card.policyId || "";
    if (seen.has(key)) continue;
    seen.add(key);
    if (card.healthFlagged) flagged += 1;
  }
  return flagged;
}

export function uniqueRenewalClients(cards: RenewalBoardCard[]): number {
  return new Set(cards.map((card) => card.partyKey || card.policyId)).size;
}
