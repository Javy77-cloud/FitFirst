/** Corner widget math from real lead desk counts only. */

export type LeadMotivationStat = {
  id: string;
  label: string;
  valueLabel: string;
  hint: string;
  sample: boolean;
  spark: number[];
};

export function formatConvertRate(converted: number, created: number): string {
  if (created <= 0) return "—";
  return `${Math.round((converted / created) * 100)}%`;
}

export function buildLeadMotivationStats(input: {
  leadsToday: number;
  convertedThisMonth: number;
  createdThisMonth: number;
  sparkLeads: number[];
}): LeadMotivationStat[] {
  const spark = input.sparkLeads.length > 0 ? input.sparkLeads : [0, 0, 0, 0, 0, 0, 0];

  return [
    {
      id: "leads-today",
      label: "New leads today",
      valueLabel: String(input.leadsToday),
      hint: "Desk count from leads created today.",
      sample: false,
      spark,
    },
    {
      id: "convert-rate",
      label: "Your convert rate this month",
      valueLabel: formatConvertRate(input.convertedThisMonth, input.createdThisMonth),
      hint: `${input.convertedThisMonth} converted / ${input.createdThisMonth} new this month.`,
      sample: false,
      spark,
    },
  ];
}
