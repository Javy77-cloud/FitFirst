import { isInForceStatus } from "@/lib/policy/status";
import { addUtcDays, deskNow } from "@/lib/home/as-of";
import { daysLeftEt, resolveCurrentTerm } from "@/lib/policies/current-term";
import { parseMoney, premiumChange } from "@/lib/renewal/compare";

export type RenewalPolicy = {
  id: string;
  policyNumber: string;
  status: string;
  lineOfBusiness: string;
  expirationDate: Date | string | null;
  premium: string | null;
  partyName: string;
  carrierName: string;
  currentPremium?: string | null;
  proposedPremium?: string | null;
};

export type RenewalRow = RenewalPolicy & {
  daysUntil: number;
  currentPremium: string | null;
  proposedPremium: string | null;
  delta: number | null;
  pct: number | null;
};

export function expirationDay(value: Date | string | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysUntilExpiration(expiration: Date, asOf = deskNow()): number {
  return daysLeftEt(expiration, asOf) ?? 0;
}

export function isUpcomingRenewal(
  policy: Pick<RenewalPolicy, "status" | "expirationDate"> & {
    effectiveDate?: Date | string | null;
    lineOfBusiness?: string | null;
    policyNumber?: string | null;
    premium?: string | null;
  },
  windowDays = 60,
  asOf = deskNow(),
): boolean {
  if (!isInForceStatus(policy.status)) return false;
  const resolved = resolveCurrentTerm(
    {
      status: policy.status,
      expirationDate: policy.expirationDate,
      effectiveDate: policy.effectiveDate,
      lineOfBusiness: policy.lineOfBusiness,
      policyNumber: policy.policyNumber,
      premium: policy.premium,
    },
    asOf,
  );
  if (!resolved.countsAsInForce) return false;
  const days = resolved.daysLeft;
  return days != null && days >= 0 && days <= windowDays;
}

export function upcomingHorizon(windowDays = 60, asOf = deskNow()): Date {
  return addUtcDays(asOf, windowDays);
}

export function buildRenewalRow(
  policy: RenewalPolicy,
  asOf = deskNow(),
): RenewalRow | null {
  const exp = expirationDay(policy.expirationDate);
  if (!exp) return null;
  const current = policy.currentPremium ?? policy.premium;
  const proposed = policy.proposedPremium ?? null;
  const currentN = parseMoney(current);
  const proposedN = parseMoney(proposed);
  const change =
    currentN != null && proposedN != null ? premiumChange(currentN, proposedN) : null;
  return {
    ...policy,
    daysUntil: daysUntilExpiration(exp, asOf),
    currentPremium: current ?? null,
    proposedPremium: proposed,
    delta: change?.delta ?? null,
    pct: change?.pct ?? null,
  };
}

export function sortRenewalRows(rows: RenewalRow[]): RenewalRow[] {
  return [...rows].sort(
    (a, b) => a.daysUntil - b.daysUntil || a.policyNumber.localeCompare(b.policyNumber),
  );
}

export type RenewalBand = "30" | "60" | "90" | "later" | "overdue";

export function renewalBand(daysUntil: number): RenewalBand {
  if (daysUntil < 0) return "overdue";
  if (daysUntil <= 30) return "30";
  if (daysUntil <= 60) return "60";
  if (daysUntil <= 90) return "90";
  return "later";
}

export type RenewalBuckets<T extends { daysUntil: number }> = {
  due30: T[];
  due60: T[];
  due90: T[];
};

export function bucketRenewalRows<T extends { daysUntil: number }>(rows: T[]): RenewalBuckets<T> {
  const due30: T[] = [];
  const due60: T[] = [];
  const due90: T[] = [];
  for (const row of rows) {
    const band = renewalBand(row.daysUntil);
    if (band === "30" || band === "overdue") due30.push(row);
    else if (band === "60") due60.push(row);
    else if (band === "90") due90.push(row);
  }
  return { due30, due60, due90 };
}

export function renewalFollowupTitle(policyNumber: string): string {
  return `Renewal follow-up · ${policyNumber}`;
}

export function renewalFollowupBody(input: {
  policyNumber: string;
  partyName: string;
  daysUntil: number;
  currentPremium: string | null;
  proposedPremium: string | null;
}): string {
  const premium =
    input.currentPremium && input.proposedPremium
      ? `Current ${input.currentPremium} vs proposed ${input.proposedPremium}.`
      : input.currentPremium
        ? `Current premium ${input.currentPremium}. No proposed term on file.`
        : "Premium compare needs current and proposed terms.";
  return `${input.partyName} · ${input.policyNumber} renews in ${input.daysUntil} days. ${premium} In-desk only — no email.`;
}
