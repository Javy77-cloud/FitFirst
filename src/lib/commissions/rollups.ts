import { toNumber } from "./math";

export type CommissionRollupRow = {
  agentId: string;
  agentName: string;
  carrierId: string | null;
  carrierName: string;
  lineOfBusiness: string;
  premium: number | string;
  amount: number | string;
  agencyAmount?: number | string | null;
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

export type EarningsTotals = {
  pendingAgency: number;
  paidAgency: number;
  pendingProducer: number;
  paidProducer: number;
  pendingCount: number;
  paidCount: number;
};

/** Pending = not paid (pending / payable / held). Paid is status paid only. */
export function earningsTotals(
  rows: Array<{
    amount: number | string;
    agencyAmount?: number | string | null;
    status: string;
  }>,
): EarningsTotals {
  const totals: EarningsTotals = {
    pendingAgency: 0,
    paidAgency: 0,
    pendingProducer: 0,
    paidProducer: 0,
    pendingCount: 0,
    paidCount: 0,
  };
  for (const row of rows) {
    const producer = toNumber(row.amount);
    const agency = toNumber(row.agencyAmount ?? row.amount);
    if (row.status === "paid") {
      totals.paidProducer += producer;
      totals.paidAgency += agency;
      totals.paidCount += 1;
    } else {
      totals.pendingProducer += producer;
      totals.pendingAgency += agency;
      totals.pendingCount += 1;
    }
  }
  return totals;
}

export type PendingPaidTotal = {
  key: string;
  label: string;
  pending: number;
  paid: number;
  pendingCount: number;
  paidCount: number;
};

export function rollupPendingPaidBy(
  rows: CommissionRollupRow[],
  keyOf: (row: CommissionRollupRow) => { key: string; label: string },
): PendingPaidTotal[] {
  const map = new Map<string, PendingPaidTotal>();
  for (const row of rows) {
    const { key, label } = keyOf(row);
    const current = map.get(key) ?? {
      key,
      label,
      pending: 0,
      paid: 0,
      pendingCount: 0,
      paidCount: 0,
    };
    const value = toNumber(row.amount);
    if (row.status === "paid") {
      current.paid += value;
      current.paidCount += 1;
    } else {
      current.pending += value;
      current.pendingCount += 1;
    }
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.paid + b.pending - (a.paid + a.pending));
}

export type CarrierGoalInput = {
  carrierId: string;
  carrierName: string;
  year: number;
  premiumGoal: number | string;
  policyGoal: number | null;
};

export type GoalProgressRow = {
  carrierId: string;
  label: string;
  year: number;
  premiumGoal: number;
  writtenPremium: number;
  policyGoal: number | null;
  writtenPolicies: number;
};

export function goalProgress(
  rows: Array<{
    carrierId: string | null;
    premium: number | string;
  }>,
  goals: CarrierGoalInput[],
): GoalProgressRow[] {
  if (goals.length === 0) return [];
  return goals.map((goal) => {
    const matching = rows.filter((row) => row.carrierId === goal.carrierId);
    return {
      carrierId: goal.carrierId,
      label: goal.carrierName,
      year: goal.year,
      premiumGoal: toNumber(goal.premiumGoal),
      writtenPremium: matching.reduce((sum, row) => sum + toNumber(row.premium), 0),
      policyGoal: goal.policyGoal,
      writtenPolicies: matching.length,
    };
  });
}
