import { toNumber } from "@/lib/commissions/math";
import { startOfUtcDay } from "@/lib/home/attention-window";

export const QUEUE_PRIORITIES = ["Highest", "High", "Normal", "Low"] as const;
export type QueuePriority = (typeof QUEUE_PRIORITIES)[number];

/** Book statuses that still have renewal $ at risk. Quotes are not policies. */
export const QUEUE_ELIGIBLE_STATUSES = [
  "active",
  "bound",
  "pending",
  "lapse",
  "lapsed",
] as const;

export type PriorityQueueInput = {
  id: string;
  policyNumber: string;
  status: string;
  renewalAt: Date;
  premium: number | string | null | undefined;
  accountName: string;
  href: string;
};

export type PriorityQueueRow = {
  id: string;
  policyNumber: string;
  status: string;
  accountName: string;
  href: string;
  dueAt: Date;
  priority: QueuePriority;
  dollarsAtRisk: number;
  daysToRenewal: number;
};

export function isQueueEligibleStatus(status: string): boolean {
  return (QUEUE_ELIGIBLE_STATUSES as readonly string[]).includes(status.toLowerCase());
}

export function renewalAt(policy: {
  renewalDate?: Date | null;
  expirationDate: Date;
}): Date {
  return policy.renewalDate ?? policy.expirationDate;
}

export function dollarsAtRisk(premium: number | string | null | undefined): number {
  return toNumber(premium);
}

export function accountLabel(
  contact?: { firstName: string; lastName: string } | null,
  account?: { name: string } | null,
): string {
  if (contact?.lastName || contact?.firstName) {
    const last = (contact.lastName ?? "").trim();
    const first = (contact.firstName ?? "").trim();
    if (last && first) return `${last}, ${first}`;
    return last || first;
  }
  const name = account?.name?.trim();
  return name || "—";
}

export function daysToRenewal(dueAt: Date, asOf: Date): number {
  const due = startOfUtcDay(dueAt).getTime();
  const now = startOfUtcDay(asOf).getTime();
  return Math.round((due - now) / 86_400_000);
}

/** Days to renewal first, then larger $ at risk ranks higher. */
export function queuePriority(input: {
  status: string;
  daysToRenewal: number;
  dollarsAtRisk: number;
}): QueuePriority {
  const status = input.status.toLowerCase();
  if (status === "lapse" || status === "lapsed") return "Highest";
  if (input.daysToRenewal <= 0) return "Highest";
  if (input.daysToRenewal <= 30) {
    return input.dollarsAtRisk >= 2500 ? "Highest" : "High";
  }
  if (input.daysToRenewal <= 60) {
    return input.dollarsAtRisk >= 5000 ? "High" : "Normal";
  }
  return input.dollarsAtRisk >= 10000 ? "Normal" : "Low";
}

export function comparePriorityQueue(a: PriorityQueueRow, b: PriorityQueueRow): number {
  const due = a.dueAt.getTime() - b.dueAt.getTime();
  if (due !== 0) return due;
  return b.dollarsAtRisk - a.dollarsAtRisk;
}

export function rankPriorityQueue(
  rows: PriorityQueueInput[],
  asOf: Date,
): PriorityQueueRow[] {
  const ranked: PriorityQueueRow[] = [];
  for (const row of rows) {
    if (!isQueueEligibleStatus(row.status)) continue;
    const dueAt = row.renewalAt;
    const dollars = dollarsAtRisk(row.premium);
    const days = daysToRenewal(dueAt, asOf);
    ranked.push({
      id: row.id,
      policyNumber: row.policyNumber,
      status: row.status,
      accountName: row.accountName,
      href: row.href,
      dueAt,
      dollarsAtRisk: dollars,
      daysToRenewal: days,
      priority: queuePriority({
        status: row.status,
        daysToRenewal: days,
        dollarsAtRisk: dollars,
      }),
    });
  }
  return ranked.sort(comparePriorityQueue);
}

export function queueTotals(rows: PriorityQueueRow[]): {
  count: number;
  dollarsAtRisk: number;
  highest: number;
  high: number;
} {
  return {
    count: rows.length,
    dollarsAtRisk: rows.reduce((sum, row) => sum + row.dollarsAtRisk, 0),
    highest: rows.filter((row) => row.priority === "Highest").length,
    high: rows.filter((row) => row.priority === "High").length,
  };
}
