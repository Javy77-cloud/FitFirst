import { formatMoney } from "@/lib/domain";
import { formatSignedMoney } from "@/lib/renewal/compare";
import type { RenewalClockAnchor } from "@/lib/renewal/days-to-renewal";

export const RENEWAL_URGENCY_BANDS = ["under30", "30to60", "60to90", "90plus"] as const;
export type RenewalUrgencyBand = (typeof RENEWAL_URGENCY_BANDS)[number];

export type RenewalRiskLevel = "high" | "medium" | "low";

export const RENEWAL_URGENCY_META: Record<
  RenewalUrgencyBand,
  { label: string; shortLabel: string; tone: "terracotta" | "amber" | "navy" | "gray" }
> = {
  under30: { label: "Under 30 days", shortLabel: "Under 30", tone: "terracotta" },
  "30to60": { label: "30–60 days", shortLabel: "30–60", tone: "amber" },
  "60to90": { label: "60–90 days", shortLabel: "60–90", tone: "navy" },
  "90plus": { label: "90+ days", shortLabel: "90+", tone: "gray" },
};

export const RENEWAL_RISK_LABEL: Record<RenewalRiskLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/**
 * Days-out (Under 30 / 90+) and risk are different columns.
 * 90+ can still be Medium when premium, silence, or lapse is elevated.
 */
export function renewalRiskHover(level: RenewalRiskLevel): string {
  return `${RENEWAL_RISK_LABEL[level]} risk comes from premium change, silence, and lapse — not days left, so a 90+ renewal can still be Medium.`;
}

/** Same heartbeat as Deals Stack: soon is hot, far out is barely-moving cold. */
export function renewalStackHeat(band: RenewalUrgencyBand): "hot" | "cooling" | "near_cold" | "cold" {
  if (band === "under30") return "hot";
  if (band === "30to60") return "cooling";
  if (band === "60to90") return "near_cold";
  return "cold";
}

/** Urgency bands for the visual board. Overdue sits in Under 30. */
export function renewalUrgencyBand(daysUntil: number): RenewalUrgencyBand {
  if (daysUntil < 30) return "under30";
  if (daysUntil < 60) return "30to60";
  if (daysUntil < 90) return "60to90";
  return "90plus";
}

/** Stub scoring until the composite model lands. */
export function stubRenewalRisk(band: RenewalUrgencyBand): RenewalRiskLevel {
  if (band === "under30") return "high";
  if (band === "30to60") return "medium";
  return "low";
}

export function stubRenewalRiskFromDays(daysUntil: number): RenewalRiskLevel {
  return stubRenewalRisk(renewalUrgencyBand(daysUntil));
}

export function renewalDaysPhrase(daysUntil: number): string {
  if (daysUntil < 0) {
    const days = Math.abs(daysUntil);
    return days === 1 ? "1 day overdue" : `${days} days overdue`;
  }
  if (daysUntil === 0) return "Expires today";
  if (daysUntil === 1) return "Expires in 1 day";
  return `Expires in ${daysUntil} days`;
}

/** Board why-line. Renew-into dates say "Renews", in-force expirations say "Expires". */
export function renewalClockPhrase(days: number, anchor: RenewalClockAnchor): string {
  if (anchor !== "renew_into_effective") return renewalDaysPhrase(days);
  if (days < 0) {
    const overdue = Math.abs(days);
    return overdue === 1 ? "Renewed 1 day ago" : `Renewed ${overdue} days ago`;
  }
  if (days === 0) return "Renews today";
  if (days === 1) return "Renews in 1 day";
  return `Renews in ${days} days`;
}

export function renewalDeltaPhrase(premiumDelta: number | null | undefined): string | null {
  if (premiumDelta == null || !Number.isFinite(premiumDelta)) return null;
  if (premiumDelta > 0) return `premium up ${formatSignedMoney(premiumDelta)}`;
  if (premiumDelta < 0) return `premium down ${formatMoney(Math.abs(premiumDelta))}`;
  return "premium unchanged";
}

/** One-line why — days + delta, plus the top composite-risk note when present. */
export function renewalWhyLine(input: {
  daysUntil: number;
  premiumDelta?: number | null;
  whyExtra?: string | null;
  clockAnchor?: RenewalClockAnchor;
}): string {
  const days = input.clockAnchor
    ? renewalClockPhrase(input.daysUntil, input.clockAnchor)
    : renewalDaysPhrase(input.daysUntil);
  const delta = renewalDeltaPhrase(input.premiumDelta);
  const extra = input.whyExtra?.trim() || null;
  return [days, delta, extra].filter(Boolean).join(" · ");
}

export type UrgencyPulseShare = {
  band: RenewalUrgencyBand;
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

/** Priority stack order: soonest first, then risk, then name. */
export function rankRenewalCards<
  T extends { daysUntil: number; riskScore: number; clientName: string },
>(cards: T[]): T[] {
  return [...cards].sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    if (a.riskScore !== b.riskScore) return b.riskScore - a.riskScore;
    return a.clientName.localeCompare(b.clientName);
  });
}

/** % of the current book in each urgency band. Percents always sum to 0 or 100. */
export function urgencyPulseShares(daysUntil: number[]): UrgencyPulseShare[] {
  const counts: Record<RenewalUrgencyBand, number> = {
    under30: 0,
    "30to60": 0,
    "60to90": 0,
    "90plus": 0,
  };
  for (const days of daysUntil) {
    counts[renewalUrgencyBand(days)] += 1;
  }
  const ordered = RENEWAL_URGENCY_BANDS.map((band) => counts[band]);
  const pcts = largestRemainderPercents(ordered, daysUntil.length);
  return RENEWAL_URGENCY_BANDS.map((band, index) => ({
    band,
    count: counts[band],
    pct: pcts[index] ?? 0,
  }));
}
