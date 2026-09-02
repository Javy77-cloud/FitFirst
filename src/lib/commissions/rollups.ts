import { toNumber } from "./math";

export type CommissionRollupRow = {
  agentId: string;
  agentName: string;
  carrierId: string | null;
  carrierName: string;
  lineOfBusiness: string;
  premium: number | string;
  amount: number | string;
  status: string;
};

export type NamedTotal = {
  key: string;
  label: string;
  premium: number;
  commission: number;
  count: number;
};

export function rollupBy(
  rows: CommissionRollupRow[],
  keyOf: (row: CommissionRollupRow) => { key: string; label: string },
): NamedTotal[] {
  const map = new Map<string, NamedTotal>();
  for (const row of rows) {
    const { key, label } = keyOf(row);
    const current = map.get(key) ?? { key, label, premium: 0, commission: 0, count: 0 };
    current.premium += toNumber(row.premium);
    current.commission += toNumber(row.amount);
    current.count += 1;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.commission - a.commission);
}

export function rollupByAgent(rows: CommissionRollupRow[]): NamedTotal[] {
  return rollupBy(rows, (row) => ({ key: row.agentId, label: row.agentName }));
}

export function rollupByCarrier(rows: CommissionRollupRow[]): NamedTotal[] {
  return rollupBy(rows, (row) => ({
    key: row.carrierId ?? "none",
    label: row.carrierName || "Unassigned",
  }));
}

export function rollupByLine(rows: CommissionRollupRow[]): NamedTotal[] {
  return rollupBy(rows, (row) => ({ key: row.lineOfBusiness, label: row.lineOfBusiness }));
}

export function widgetTotals(
  rows: Array<{
    amount: number | string;
    status: string;
    dueDate: Date | string | null;
    paidDate: Date | string | null;
  }>,
  now = new Date(),
): { pending: number; paidLast30: number; upcoming: number } {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  let pending = 0;
  let paidLast30 = 0;
  let upcoming = 0;
  for (const row of rows) {
    const amount = toNumber(row.amount);
    if (row.status === "pending") pending += amount;
    if (row.status === "paid" && row.paidDate) {
      const paid = row.paidDate instanceof Date ? row.paidDate : new Date(row.paidDate);
      if (paid >= cutoff && paid <= now) paidLast30 += amount;
    }
    if ((row.status === "pending" || row.status === "payable") && row.dueDate) {
      const due = row.dueDate instanceof Date ? row.dueDate : new Date(row.dueDate);
      if (due >= now) upcoming += amount;
    }
  }
  return { pending, paidLast30, upcoming };
}
