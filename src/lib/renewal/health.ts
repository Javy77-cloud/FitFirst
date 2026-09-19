import type { RenewalRiskLevel } from "@/lib/renewal/urgency";
import type { RenewalRiskBand, RenewalRiskScore } from "@/lib/renewal-risk/score";

export const HEALTH_MIX_LEVELS = ["healthy", "watch", "atrisk"] as const;
export type HealthMixLevel = (typeof HEALTH_MIX_LEVELS)[number];

export const HEALTH_MIX_META: Record<
  HealthMixLevel,
  { label: string; shortLabel: string; tone: "green" | "amber" | "terracotta" }
> = {
  healthy: { label: "Healthy", shortLabel: "Healthy", tone: "green" },
  watch: { label: "Watch", shortLabel: "Watch", tone: "amber" },
  atrisk: { label: "At risk", shortLabel: "At risk", tone: "terracotta" },
};

/** Map the household risk model onto the card High / Medium / Low badge. */
export function riskLevelFromScore(score: Pick<RenewalRiskScore, "band">): RenewalRiskLevel {
  if (score.band === "critical" || score.band === "high") return "high";
  if (score.band === "elevated") return "medium";
  return "low";
}

export function riskLevelFromBand(band: RenewalRiskBand): RenewalRiskLevel {
  return riskLevelFromScore({ band });
}

/** 1–5 client health when no mini-review ratings exist yet. Higher is healthier. */
export function derivedHealthStars(score: number): number {
  if (!Number.isFinite(score)) return 4;
  if (score >= 81) return 1;
  if (score >= 61) return 2;
  if (score >= 41) return 3;
  if (score >= 21) return 4;
  return 5;
}

export function healthMixFromCard(input: {
  risk: RenewalRiskLevel;
  healthFlagged?: boolean;
  healthStars?: number | null;
}): HealthMixLevel {
  if (input.healthFlagged || input.risk === "high" || (input.healthStars != null && input.healthStars <= 2)) {
    return "atrisk";
  }
  if (input.risk === "medium" || input.healthStars === 3) return "watch";
  return "healthy";
}

export type HealthPulseShare = {
  level: HealthMixLevel;
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

/** % of the current book in each health mix bucket. Percents sum to 0 or 100. */
export function healthPulseShares(levels: HealthMixLevel[]): HealthPulseShare[] {
  const counts: Record<HealthMixLevel, number> = { healthy: 0, watch: 0, atrisk: 0 };
  for (const level of levels) counts[level] += 1;
  const ordered = HEALTH_MIX_LEVELS.map((level) => counts[level]);
  const pcts = largestRemainderPercents(ordered, levels.length);
  return HEALTH_MIX_LEVELS.map((level, index) => ({
    level,
    count: counts[level],
    pct: pcts[index] ?? 0,
  }));
}

export function lastContactPhrase(days: number | null | undefined): string {
  if (days == null || !Number.isFinite(days)) return "Never talked";
  if (days <= 0) return "Talked today";
  if (days === 1) return "Last talk yesterday";
  return `Last talk ${days}d ago`;
}

export function healthFlagFromRatings(ratingsUnder3: number): boolean {
  return ratingsUnder3 >= 2;
}

export function averageHealthStars(scores: number[]): number | null {
  const valid = scores.filter((score) => Number.isFinite(score) && score >= 1 && score <= 5);
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((sum, score) => sum + score, 0) / valid.length) * 10) / 10;
}
