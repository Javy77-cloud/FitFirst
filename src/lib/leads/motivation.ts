import { formatHonestPct } from "@/lib/metrics/honest-rate";

/** Corner widget math from real lead desk counts only. Never invent a percent. */

export type LeadMotivationStat = {
  id: string;
  label: string;
  valueLabel: string;
  hint: string;
  sample: boolean;
  spark: number[];
};

export function formatConvertRate(converted: number, created: number): string {
  return formatHonestPct(converted, created);
}

export function buildLeadMotivationStats(input: {
  leadsToday: number;
  convertedThisMonth: number;
  createdThisMonth: number;
  sparkLeads: number[];
}): LeadMotivationStat[] {
  const spark = input.sparkLeads.length > 0 ? input.sparkLeads : [0, 0, 0, 0, 0, 0, 0];
  const rateLabel = formatConvertRate(input.convertedThisMonth, input.createdThisMonth);

  return [
    {
      id: "leads-today",
      label: "New leads today",
      valueLabel: String(input.leadsToday),
      hint: "Leads created today.",
      sample: false,
      spark,
    },
    {
      id: "converted-this-month",
      label: "Converted this month",
      valueLabel: String(input.convertedThisMonth),
      hint:
        rateLabel === "—"
          ? `${input.convertedThisMonth} converted this month.`
          : `${input.convertedThisMonth} converted / ${input.createdThisMonth} new this month.`,
      sample: false,
      spark,
    },
  ];
}
