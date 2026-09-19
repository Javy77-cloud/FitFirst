import { formatMoney } from "@/lib/domain";
import { canonicalizePipelineSlug } from "@/lib/wire/pipeline";

/** No platform-logged communication for this many days → cold. */
export const COLD_COMM_DAYS = 14;
/** Flicker zone — approaching the 14-day cold rule. */
export const NEAR_COLD_DAYS = 10;
/** Dim / cooling after this many silent days. */
export const COOLING_DAYS = 5;
/** Radar X fills across this many days in the active phase. */
export const RADAR_X_DAYS = 21;
/** High-value band when Coverage A (or fallback premium) is at least this. */
export const HIGH_VALUE_COVERAGE_A = 250_000;

export const VELOCITY_PHASES = [
  "lead_to_deal",
  "details",
  "docs",
  "risk",
  "quotes",
  "post_quote_gap",
] as const;
export type VelocityPhase = (typeof VELOCITY_PHASES)[number];

export const HEAT_STATES = ["hot", "cooling", "near_cold", "cold"] as const;
export type HeatState = (typeof HEAT_STATES)[number];

export const PLATFORM_COMM_KINDS = ["call", "email", "sms", "meeting"] as const;

export const VELOCITY_PHASE_LABELS: Record<VelocityPhase, string> = {
  lead_to_deal: "Lead → deal",
  details: "Details",
  docs: "Docs",
  risk: "Risk",
  quotes: "Quotes",
  post_quote_gap: "Post-quote gap",
};

export const HEAT_LABELS: Record<HeatState, string> = {
  hot: "Hot",
  cooling: "Cooling",
  near_cold: "Near cold",
  cold: "Cold",
};

export type DeskEventKind = "comm" | "doc" | "risk" | "quote" | "details" | "stage" | "convert";

export type DeskEvent = {
  at: Date;
  kind: DeskEventKind;
  source: string;
};

export type VelocityClock = {
  phase: VelocityPhase;
  label: string;
  startedAt: Date | null;
  lastEventAt: Date | null;
  days: number;
  complete: boolean;
  diagnostic?: boolean;
};

export type DealValueMetric = "coverage_a" | "premium";

export type VelocityFacts = {
  createdAt: Date;
  updatedAt?: Date | null;
  leadCreatedAt?: Date | null;
  boundAt?: Date | null;
  archivedAt?: Date | null;
  pipelineStage?: string | null;
  pipelineStageSlug?: string | null;
  detailsReady: boolean;
  docsReady: boolean;
  riskReady: boolean;
  quotesReady: boolean;
  coverageA?: number | null;
  premium?: number | null;
  productCount?: number;
  lastCommAt?: Date | null;
  lastDocAt?: Date | null;
  lastRiskAt?: Date | null;
  lastQuoteAt?: Date | null;
  detailsReadyAt?: Date | null;
  now?: Date;
};

export type PrimaryDealAction = {
  label: string;
  href: string;
  tab: "details" | "documents" | "markets" | "quotes";
};

export function isPlatformCommKind(kind: string | null | undefined): boolean {
  const key = (kind ?? "").trim().toLowerCase();
  return (PLATFORM_COMM_KINDS as readonly string[]).includes(key);
}

export function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysBetween(from: Date | null | undefined, to: Date): number {
  const start = parseDate(from);
  if (!start) return 0;
  return Math.max(0, (to.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export function commGapDays(input: {
  lastCommAt?: Date | null;
  openedAt: Date;
  now: Date;
}): number {
  return daysBetween(input.lastCommAt ?? input.openedAt, input.now);
}

export function heatFromCommGap(days: number): HeatState {
  if (days >= COLD_COMM_DAYS) return "cold";
  if (days >= NEAR_COLD_DAYS) return "near_cold";
  if (days >= COOLING_DAYS) return "cooling";
  return "hot";
}

export function isClosedShoppingDeal(input: {
  boundAt?: Date | string | null;
  archivedAt?: Date | string | null;
  pipelineStage?: string | null;
  pipelineStageSlug?: string | null;
}): boolean {
  if (input.archivedAt) return true;
  if (input.boundAt) return true;
  const key = canonicalizePipelineSlug(input.pipelineStageSlug || input.pipelineStage);
  return (
    key === "bound" ||
    key === "policy_issued" ||
    key === "closed_won" ||
    key === "closed_lost" ||
    key === "archive"
  );
}

export function resolveActivePhase(facts: Pick<
  VelocityFacts,
  "detailsReady" | "docsReady" | "riskReady" | "quotesReady"
>): Exclude<VelocityPhase, "lead_to_deal"> {
  if (!facts.detailsReady) return "details";
  if (!facts.docsReady) return "docs";
  if (!facts.riskReady) return "risk";
  if (!facts.quotesReady) return "quotes";
  return "post_quote_gap";
}

export function dealValue(coverageA?: number | null, premium?: number | null): {
  amount: number;
  metric: DealValueMetric;
} {
  const cov = Number(coverageA);
  if (Number.isFinite(cov) && cov > 0) return { amount: cov, metric: "coverage_a" };
  const prem = Number(premium);
  if (Number.isFinite(prem) && prem > 0) return { amount: prem, metric: "premium" };
  return { amount: 0, metric: "coverage_a" };
}

export function formatDealValue(amount: number, metric: DealValueMetric): string {
  if (!amount) return "—";
  return metric === "premium" ? formatMoney(amount) : formatMoney(amount);
}

export function valueAxisLabel(metric: DealValueMetric): string {
  return metric === "premium" ? "Quoted premium" : "Coverage A";
}

function latest(...stamps: Array<Date | null | undefined>): Date | null {
  let best: Date | null = null;
  for (const stamp of stamps) {
    const date = parseDate(stamp);
    if (!date) continue;
    if (!best || date.getTime() > best.getTime()) best = date;
  }
  return best;
}

export function buildVelocityClocks(facts: VelocityFacts): Record<VelocityPhase, VelocityClock> {
  const now = facts.now ?? new Date();
  const created = facts.createdAt;
  const leadStart = facts.leadCreatedAt ?? null;
  const detailsAt = facts.detailsReady ? (facts.detailsReadyAt ?? facts.updatedAt ?? created) : null;
  const docsAt = facts.docsReady ? (facts.lastDocAt ?? detailsAt ?? created) : null;
  const riskAt = facts.riskReady ? (facts.lastRiskAt ?? docsAt ?? created) : null;
  const quoteAt = facts.quotesReady ? (facts.lastQuoteAt ?? riskAt ?? created) : null;

  const leadDays = leadStart ? daysBetween(leadStart, created) : 0;
  const detailsStart = created;
  const docsStart = detailsAt ?? created;
  const riskStart = docsAt ?? created;
  const quotesStart = riskAt ?? created;
  const gapStart = quoteAt ?? created;

  return {
    lead_to_deal: {
      phase: "lead_to_deal",
      label: VELOCITY_PHASE_LABELS.lead_to_deal,
      startedAt: leadStart,
      lastEventAt: leadStart ? created : null,
      days: leadDays,
      complete: Boolean(leadStart),
      diagnostic: true,
    },
    details: {
      phase: "details",
      label: VELOCITY_PHASE_LABELS.details,
      startedAt: detailsStart,
      lastEventAt: detailsAt,
      days: daysBetween(detailsStart, detailsAt ?? now),
      complete: facts.detailsReady,
    },
    docs: {
      phase: "docs",
      label: VELOCITY_PHASE_LABELS.docs,
      startedAt: docsStart,
      lastEventAt: docsAt,
      days: daysBetween(docsStart, docsAt ?? now),
      complete: facts.docsReady,
    },
    risk: {
      phase: "risk",
      label: VELOCITY_PHASE_LABELS.risk,
      startedAt: riskStart,
      lastEventAt: riskAt,
      days: daysBetween(riskStart, riskAt ?? now),
      complete: facts.riskReady,
    },
    quotes: {
      phase: "quotes",
      label: VELOCITY_PHASE_LABELS.quotes,
      startedAt: quotesStart,
      lastEventAt: quoteAt,
      days: daysBetween(quotesStart, quoteAt ?? now),
      complete: facts.quotesReady,
    },
    post_quote_gap: {
      phase: "post_quote_gap",
      label: VELOCITY_PHASE_LABELS.post_quote_gap,
      startedAt: facts.quotesReady ? gapStart : null,
      lastEventAt: facts.lastCommAt ?? (facts.quotesReady ? quoteAt : null),
      days: facts.quotesReady ? commGapDays({ lastCommAt: facts.lastCommAt ?? null, openedAt: gapStart, now }) : 0,
      complete: false,
    },
  };
}

export function activeClock(clocks: Record<VelocityPhase, VelocityClock>, phase: VelocityPhase): VelocityClock {
  return clocks[phase];
}

export function heatForDeal(input: {
  commGapDays: number;
  closed?: boolean;
  value?: number;
  daysInPhase?: number;
}): HeatState {
  if (input.closed) {
    if (input.commGapDays >= COLD_COMM_DAYS) return "cold";
    return "cooling";
  }
  const heat = heatFromCommGap(input.commGapDays);
  if (heat === "hot" && (input.daysInPhase ?? 0) >= COOLING_DAYS && (input.value ?? 0) < HIGH_VALUE_COVERAGE_A) {
    return "cooling";
  }
  return heat;
}

export function urgencyScore(input: {
  heat: HeatState;
  commGapDays: number;
  daysInPhase: number;
  value: number;
  phase: VelocityPhase;
  productCount?: number;
  closed?: boolean;
}): number {
  if (input.closed) return Math.min(40, input.commGapDays);
  let score = 0;
  if (input.heat === "cold") score += 1000;
  else if (input.heat === "near_cold") score += 700;
  else if (input.heat === "cooling") score += 280;
  else score += 80;
  score += input.commGapDays * 12;
  score += input.daysInPhase * 6;
  if (input.phase === "post_quote_gap") score += 90;
  if (input.phase === "quotes") score += 40;
  score += Math.min(input.value / 5_000, 80);
  if ((input.productCount ?? 1) > 1) score += 12;
  return Math.round(score);
}

export function primaryDealAction(input: {
  dealId: string;
  phase: VelocityPhase;
  heat: HeatState;
}): PrimaryDealAction {
  if (input.heat === "cold" || input.phase === "post_quote_gap") {
    return { label: "Chase", href: `/deals/${input.dealId}?tab=quotes`, tab: "quotes" };
  }
  if (input.phase === "details") {
    return { label: "Open details", href: `/deals/${input.dealId}?tab=details`, tab: "details" };
  }
  if (input.phase === "docs") {
    return { label: "Upload docs", href: `/deals/${input.dealId}?tab=documents`, tab: "documents" };
  }
  if (input.phase === "risk") {
    return { label: "Review risk", href: `/deals/${input.dealId}?tab=documents`, tab: "documents" };
  }
  if (input.phase === "quotes") {
    return { label: "Open quotes", href: `/deals/${input.dealId}?tab=quotes`, tab: "quotes" };
  }
  return { label: "Open deal", href: `/deals/${input.dealId}`, tab: "details" };
}

/** Client health 0–100 from comm recency + phase progress. */
export function clientHealthScore(input: {
  commGapDays: number;
  detailsReady: boolean;
  docsReady: boolean;
  quotesReady: boolean;
}): number {
  let score = 100;
  score -= Math.min(input.commGapDays * 4, 55);
  if (!input.detailsReady) score -= 12;
  if (!input.docsReady) score -= 10;
  if (!input.quotesReady) score -= 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Policy / shop health 0–100 from readiness of the shopping file. */
export function policyHealthScore(input: {
  detailsReady: boolean;
  docsReady: boolean;
  riskReady: boolean;
  quotesReady: boolean;
  commGapDays: number;
}): number {
  let score = 20;
  if (input.detailsReady) score += 20;
  if (input.docsReady) score += 20;
  if (input.riskReady) score += 20;
  if (input.quotesReady) score += 20;
  score -= Math.min(input.commGapDays * 2, 30);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function radarPosition(input: { daysInPhase: number; value: number; maxValue: number }): {
  x: number;
  y: number;
} {
  const x = Math.max(0, Math.min(1, input.daysInPhase / RADAR_X_DAYS));
  const max = Math.max(input.maxValue, 1);
  const y = Math.max(0, Math.min(1, input.value / max));
  return { x, y };
}

export function formatClockDays(days: number): string {
  if (days < 1) {
    const hours = Math.max(1, Math.round(days * 24));
    return hours === 1 ? "1h" : `${hours}h`;
  }
  const whole = Math.round(days);
  return whole === 1 ? "1d" : `${whole}d`;
}

export function privateRankLabel(position: number, total: number): string {
  const n = Math.max(1, position);
  const m = Math.max(n, total);
  const topPct = Math.max(1, Math.round((n / m) * 100));
  return `${n} of ${m}, top ${topPct}%`;
}

export function rankByScore(scores: number[], selfScore: number): { position: number; total: number; label: string } {
  const sorted = [...scores].sort((a, b) => a - b);
  const total = Math.max(1, sorted.length);
  const position = sorted.findIndex((score) => score >= selfScore) + 1 || total;
  return { position, total, label: privateRankLabel(position, total) };
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1]! + sorted[mid]!) / 2;
  return sorted[mid]!;
}

export function heatPulseShares(heats: HeatState[]): Array<{ heat: HeatState; count: number; pct: number }> {
  const counts: Record<HeatState, number> = { hot: 0, cooling: 0, near_cold: 0, cold: 0 };
  for (const heat of heats) counts[heat] += 1;
  const total = heats.length;
  return HEAT_STATES.map((heat) => ({
    heat,
    count: counts[heat],
    pct: total === 0 ? 0 : Math.round((counts[heat] / total) * 100),
  }));
}

export function latestCommAt(events: DeskEvent[]): Date | null {
  return latest(...events.filter((event) => event.kind === "comm").map((event) => event.at));
}

export function eventsFromTouches(input: {
  comms?: Array<{ at: Date | string | null; kind?: string | null }>;
  docs?: Array<{ at: Date | string | null }>;
  quotes?: Array<{ at: Date | string | null }>;
  convertedAt?: Date | string | null;
}): DeskEvent[] {
  const events: DeskEvent[] = [];
  for (const row of input.comms ?? []) {
    const at = parseDate(row.at);
    if (!at || !isPlatformCommKind(row.kind)) continue;
    events.push({ at, kind: "comm", source: row.kind ?? "comm" });
  }
  for (const row of input.docs ?? []) {
    const at = parseDate(row.at);
    if (!at) continue;
    events.push({ at, kind: "doc", source: "upload" });
  }
  for (const row of input.quotes ?? []) {
    const at = parseDate(row.at);
    if (!at) continue;
    events.push({ at, kind: "quote", source: "quote" });
  }
  const converted = parseDate(input.convertedAt);
  if (converted) events.push({ at: converted, kind: "convert", source: "convert" });
  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}
