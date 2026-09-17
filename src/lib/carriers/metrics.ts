/** Carrier KPI / scorecard helpers (hit rate, days to bind, commission). */

export type CarrierKpiSnapshot = {
  quotesRequested: number;
  quotesBound: number;
  hitRate: number | null;
  avgDaysToBind: number | null;
  avgDaysToBindPrevQuarter: number | null;
  daysTrend: "up" | "down" | "flat" | null;
  commissionEarned: number;
  commissionByLine: { lob: string; amount: number }[];
  commissionSpark: number[];
};

export function computeHitRate(requested: number, bound: number): number | null {
  if (requested <= 0 || bound < 0) return null;
  if (bound > requested) return null;
  return bound / requested;
}

export function daysTrendArrow(
  current: number | null,
  previous: number | null,
): "up" | "down" | "flat" | null {
  if (current == null || previous == null) return null;
  const delta = current - previous;
  if (Math.abs(delta) < 0.5) return "flat";
  // Lower days-to-bind is better → "down" is good; keep raw direction for UI arrow.
  return delta > 0 ? "up" : "down";
}

export function formatHitRatePct(rate: number | null): string {
  if (rate == null) return "—";
  return `${Math.round(rate * 1000) / 10}%`;
}

export function formatDays(days: number | null): string {
  if (days == null || Number.isNaN(days)) return "—";
  return `${Math.round(days * 10) / 10}`;
}

/** Tiny sparkline series from monthly commission totals (oldest → newest). */
export function normalizeSparkSeries(values: number[], buckets = 8): number[] {
  const cleaned = values.map((v) => (Number.isFinite(v) ? Math.max(0, v) : 0));
  if (cleaned.length >= buckets) return cleaned.slice(-buckets);
  return [...Array(buckets - cleaned.length).fill(0), ...cleaned];
}

export function emptyCarrierKpi(): CarrierKpiSnapshot {
  return {
    quotesRequested: 0,
    quotesBound: 0,
    hitRate: null,
    avgDaysToBind: null,
    avgDaysToBindPrevQuarter: null,
    daysTrend: null,
    commissionEarned: 0,
    commissionByLine: [],
    commissionSpark: normalizeSparkSeries([]),
  };
}

export function buildCarrierKpi(input: {
  quotesRequested: number;
  quotesBound: number;
  avgDaysToBind: number | null;
  avgDaysToBindPrevQuarter: number | null;
  commissionEarned: number;
  commissionByLine: { lob: string; amount: number }[];
  commissionSpark: number[];
}): CarrierKpiSnapshot {
  const hitRate = computeHitRate(input.quotesRequested, input.quotesBound);
  return {
    quotesRequested: input.quotesRequested,
    quotesBound: input.quotesBound,
    hitRate,
    avgDaysToBind: input.avgDaysToBind,
    avgDaysToBindPrevQuarter: input.avgDaysToBindPrevQuarter,
    daysTrend: daysTrendArrow(input.avgDaysToBind, input.avgDaysToBindPrevQuarter),
    commissionEarned: input.commissionEarned,
    commissionByLine: input.commissionByLine,
    commissionSpark: normalizeSparkSeries(input.commissionSpark),
  };
}
