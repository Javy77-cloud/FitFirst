import { formatHonestPct } from "@/lib/metrics/honest-rate";

/** Corner widget math from real desk counts only. Never invent a percent. */

export type MotivationStat = {
  id: string;
  label: string;
  valueLabel: string;
  hint: string;
  sample: boolean;
  spark: number[];
};

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
    },
  ];
}
