import { CHART_SERIES_COLORS } from "@/lib/home/chart-colors";
import { formatHonestPct } from "@/lib/metrics/honest-rate";

/** Corner widget math from real desk counts only. Never invent a percent. */

export type MotivationStat = {
  id: string;
  label: string;
  valueLabel: string;
  hint: string;
  sample: boolean;
  spark: number[];
  /** Raw count behind valueLabel. */
  count: number;
  /** Deals shopped this month. Set on bound-this-month. */
  shoppedCount?: number;
};

/** Bound slice uses the desk green; the remainder uses the desk orange. */
export const QUOTE_CLOSE_BOUND_COLOR = CHART_SERIES_COLORS[2];
export const QUOTE_CLOSE_OPEN_COLOR = CHART_SERIES_COLORS[1];

export type QuoteCloseSlice = {
  key: "bound" | "open";
  label: string;
  count: number;
  /** Arc weight. Zero when a percent would be invented. */
  share: number;
  color: string;
};

export type QuoteCloseChart = {
  bound: number;
  shopped: number;
  open: number;
  rateLabel: string;
  slices: QuoteCloseSlice[];
};

export function buildQuoteCloseChart(bound: number, shopped: number): QuoteCloseChart {
  const boundCount = Number.isFinite(bound) ? Math.max(0, Math.trunc(bound)) : 0;
  const shoppedCount = Number.isFinite(shopped) ? Math.max(0, Math.trunc(shopped)) : 0;
  const rateLabel = formatBindRate(boundCount, shoppedCount);
  const canShare = shoppedCount > 0 && boundCount <= shoppedCount;
  const open = canShare ? shoppedCount - boundCount : 0;

  return {
    bound: boundCount,
    shopped: shoppedCount,
    open,
    rateLabel,
    slices: [
      {
        key: "bound",
        label: "Bound",
        count: boundCount,
        share: canShare ? boundCount : 0,
        color: QUOTE_CLOSE_BOUND_COLOR,
      },
      {
        key: "open",
        label: canShare ? "Open" : "Shopped",
        count: canShare ? open : shoppedCount,
        share: canShare ? open : 0,
        color: QUOTE_CLOSE_OPEN_COLOR,
      },
    ],
  };
}

export function quoteCloseFromStats(stats: MotivationStat[]): QuoteCloseChart | null {
  const bound = stats.find((stat) => stat.id === "bound-this-month");
  if (!bound || bound.shoppedCount == null) return null;
  return buildQuoteCloseChart(bound.count, bound.shoppedCount);
}

export function formatBindRate(bound: number, shopped: number): string {
  return formatHonestPct(bound, shopped);
}

export function buildMotivationStats(input: {
  quotesToday: number;
  boundThisMonth: number;
  shoppedThisMonth: number;
  sparkQuotes: number[];
}): MotivationStat[] {
  const spark = input.sparkQuotes.length > 0 ? input.sparkQuotes : [0, 0, 0, 0, 0, 0, 0];
  const rateLabel = formatBindRate(input.boundThisMonth, input.shoppedThisMonth);

  return [
    {
      id: "quotes-today",
      label: "Quotes pulled today",
      valueLabel: String(input.quotesToday),
      hint: "Quotes created today on this tenant.",
      sample: false,
      spark,
      count: input.quotesToday,
    },
    {
      id: "bound-this-month",
      label: "Bound this month",
      valueLabel: String(input.boundThisMonth),
      hint:
        rateLabel === "—"
          ? `${input.boundThisMonth} bound this month.`
          : `${input.boundThisMonth} bound / ${input.shoppedThisMonth} shopped this month.`,
      sample: false,
      spark,
      count: input.boundThisMonth,
      shoppedCount: input.shoppedThisMonth,
    },
  ];
}
