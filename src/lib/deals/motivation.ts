/** Corner widget math from real desk counts only. */

export type MotivationStat = {
  id: string;
  label: string;
  valueLabel: string;
  hint: string;
  sample: boolean;
  spark: number[];
};

export function formatBindRate(bound: number, shopped: number): string {
  if (shopped <= 0) return "—";
  return `${Math.round((bound / shopped) * 100)}%`;
}

export function buildMotivationStats(input: {
  quotesToday: number;
  boundThisMonth: number;
  shoppedThisMonth: number;
  sparkQuotes: number[];
}): MotivationStat[] {
  const spark = input.sparkQuotes.length > 0 ? input.sparkQuotes : [0, 0, 0, 0, 0, 0, 0];

  return [
    {
      id: "quotes-today",
      label: "Quotes pulled today",
      valueLabel: String(input.quotesToday),
      hint: "Desk count from quotes on this tenant.",
      sample: false,
      spark,
    },
    {
      id: "bind-rate",
      label: "Your bind rate this month",
      valueLabel: formatBindRate(input.boundThisMonth, input.shoppedThisMonth),
      hint: `${input.boundThisMonth} bound / ${input.shoppedThisMonth} shopped this month.`,
      sample: false,
      spark,
    },
  ];
}
