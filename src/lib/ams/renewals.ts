import { isInForceStatus } from "@/lib/policy/status";
import { addUtcDays, DESK_AS_OF } from "@/lib/home/as-of";
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

export function daysUntilExpiration(expiration: Date, asOf = DESK_AS_OF): number {
  const start = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());
  const end = Date.UTC(
    expiration.getUTCFullYear(),
    expiration.getUTCMonth(),
    expiration.getUTCDate(),
  );
  return Math.round((end - start) / 86_400_000);
}

export function isUpcomingRenewal(
  policy: Pick<RenewalPolicy, "status" | "expirationDate">,
  windowDays = 60,
  asOf = DESK_AS_OF,
): boolean {
  if (!isInForceStatus(policy.status)) return false;
  const exp = expirationDay(policy.expirationDate);
  if (!exp) return false;
  const days = daysUntilExpiration(exp, asOf);
  return days >= 0 && days <= windowDays;
}

export function upcomingHorizon(windowDays = 60, asOf = DESK_AS_OF): Date {
  return addUtcDays(asOf, windowDays);
}

export function buildRenewalRow(
  policy: RenewalPolicy,
  asOf = DESK_AS_OF,
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
