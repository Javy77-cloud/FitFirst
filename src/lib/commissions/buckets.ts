export const PENDING_COMMISSION_STATUSES = ["pending", "payable", "held"] as const;
export const PAID_COMMISSION_STATUS = "paid" as const;

export type CommissionBucket = "pending" | "paid";

export function commissionBucket(status: string): CommissionBucket {
  return status === PAID_COMMISSION_STATUS ? "paid" : "pending";
}

export function isPendingCommission(status: string): boolean {
  return commissionBucket(status) === "pending";
}

export function isPaidCommission(status: string): boolean {
  return status === PAID_COMMISSION_STATUS;
}

export function commissionBucketLabel(status: string): string {
  if (status === "paid") return "Paid";
  if (status === "payable") return "Payable (still pending)";
  if (status === "held") return "Held (still pending)";
  return "Pending";
}

export function pendingPaidTotals(
  rows: Array<{ status: string; amount: number | string | null | undefined }>,
): { pending: number; paid: number; pendingCount: number; paidCount: number } {
  let pending = 0;
  let paid = 0;
  let pendingCount = 0;
  let paidCount = 0;
  for (const row of rows) {
    const amount = Number(row.amount ?? 0);
    const value = Number.isFinite(amount) ? amount : 0;
    if (isPaidCommission(row.status)) {
      paid += value;
      paidCount += 1;
    } else {
      pending += value;
      pendingCount += 1;
    }
  }
  return { pending, paid, pendingCount, paidCount };
}
