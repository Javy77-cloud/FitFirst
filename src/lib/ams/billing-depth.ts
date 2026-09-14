import { DESK_AS_OF } from "@/lib/home/as-of";

export type InstallmentDisplayStatus = "paid" | "due" | "overdue" | "scheduled" | "waived" | "cancelled";

export function installmentDisplayStatus(
  row: {
    status: string;
    dueOn: Date | string;
    receivedAt?: Date | string | null;
  },
  asOf: Date = DESK_AS_OF,
): InstallmentDisplayStatus {
  if (row.receivedAt || row.status === "received" || row.status === "paid") return "paid";
  if (row.status === "waived") return "waived";
  if (row.status === "cancelled") return "cancelled";
  if (row.status === "past_due" || row.status === "overdue") return "overdue";
  const due = row.dueOn instanceof Date ? row.dueOn : new Date(row.dueOn);
  if (Number.isNaN(due.getTime())) return "scheduled";
  const startOfAsOf = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());
  const startOfDue = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  if (startOfDue < startOfAsOf) return "overdue";
  if (startOfDue === startOfAsOf) return "due";
  return "scheduled";
}

export function installmentDisplayLabel(status: InstallmentDisplayStatus): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "due":
      return "Due";
    case "overdue":
      return "Overdue";
    case "waived":
      return "Waived";
    case "cancelled":
      return "Cancelled";
    default:
      return "Scheduled";
  }
}

/** Earned vs unearned premium from term dates (pro-rata). Honest null when dates/premium missing. */
export function earnedUnearnedPremium(input: {
  premium: string | number | null | undefined;
  effectiveDate: Date | string | null | undefined;
  expirationDate: Date | string | null | undefined;
  asOf?: Date;
}): { earned: number | null; unearned: number | null; pctEarned: number | null } {
  const premium =
    input.premium == null || input.premium === ""
      ? null
      : typeof input.premium === "number"
        ? input.premium
        : Number(input.premium);
  if (premium == null || !Number.isFinite(premium)) {
    return { earned: null, unearned: null, pctEarned: null };
  }
  const eff = input.effectiveDate
    ? input.effectiveDate instanceof Date
      ? input.effectiveDate
      : new Date(input.effectiveDate)
    : null;
  const exp = input.expirationDate
    ? input.expirationDate instanceof Date
      ? input.expirationDate
      : new Date(input.expirationDate)
    : null;
  if (!eff || !exp || Number.isNaN(eff.getTime()) || Number.isNaN(exp.getTime())) {
    return { earned: null, unearned: null, pctEarned: null };
  }
  const asOf = input.asOf ?? DESK_AS_OF;
  const total = exp.getTime() - eff.getTime();
  if (total <= 0) return { earned: premium, unearned: 0, pctEarned: 1 };
  const elapsed = Math.min(Math.max(asOf.getTime() - eff.getTime(), 0), total);
  const pct = elapsed / total;
  const earned = Math.round(premium * pct * 100) / 100;
  const unearned = Math.round((premium - earned) * 100) / 100;
  return { earned, unearned, pctEarned: pct };
}

export function commissionEarnedPending(input: {
  premium: string | number | null | undefined;
  ratePct: string | number | null | undefined;
  /** When true, treat full commission as earned (e.g. paid commission row). */
  fullyEarned?: boolean;
  earnedPct?: number | null;
}): { earned: number | null; pending: number | null; total: number | null } {
  const premium =
    input.premium == null || input.premium === ""
      ? null
      : typeof input.premium === "number"
        ? input.premium
        : Number(input.premium);
  const rate =
    input.ratePct == null || input.ratePct === ""
      ? null
      : typeof input.ratePct === "number"
        ? input.ratePct
        : Number(input.ratePct);
  if (premium == null || rate == null || !Number.isFinite(premium) || !Number.isFinite(rate)) {
    return { earned: null, pending: null, total: null };
  }
  const total = Math.round(premium * (rate / 100) * 100) / 100;
  if (input.fullyEarned) return { earned: total, pending: 0, total };
  const pct = input.earnedPct != null && Number.isFinite(input.earnedPct) ? input.earnedPct : 0;
  const earned = Math.round(total * pct * 100) / 100;
  const pending = Math.round((total - earned) * 100) / 100;
  return { earned, pending, total };
}
