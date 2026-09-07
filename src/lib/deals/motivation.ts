/** Corner widget math. Prefer real desk counts; otherwise an honest sample. */

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
  const haveQuotes = input.quotesToday > 0 || input.sparkQuotes.some((n) => n > 0);
  const haveBinds = input.shoppedThisMonth > 0;
  const spark =
    input.sparkQuotes.length > 0 ? input.sparkQuotes : [2, 4, 3, 5, 4, 6, 3];

  return [
    {
      id: "quotes-today",
      label: "Quotes pulled today",
      valueLabel: haveQuotes ? String(input.quotesToday) : "12",
      hint: haveQuotes ? "Desk count from quotes on this tenant." : "Sample — no pulls logged today.",
      sample: !haveQuotes,
      spark,
    },
    {
      id: "bind-rate",
      label: "Your bind rate this month",
      valueLabel: haveBinds ? formatBindRate(input.boundThisMonth, input.shoppedThisMonth) : "34%",
      hint: haveBinds
        ? `${input.boundThisMonth} bound / ${input.shoppedThisMonth} shopped this month.`
        : "Sample — not enough shopped deals this month.",
      sample: !haveBinds,
      spark,
    },
  ];
}
