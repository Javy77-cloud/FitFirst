import { commissionAmount, toNumber } from "@/lib/commissions/math";
import { homeLineKey } from "@/lib/home/lines";

export const LINE_FAMILIES = [
  "pc",
  "life",
  "health_marketplace",
  "medicare_advantage",
  "other_health",
] as const;
export type LineFamily = (typeof LINE_FAMILIES)[number];

export const LINE_FAMILY_LABEL: Record<LineFamily, string> = {
  pc: "P&C",
  life: "Life",
  health_marketplace: "Health Marketplace",
  medicare_advantage: "Medicare Advantage",
  other_health: "Other health / Supplemental",
};

export type CommissionRates = {
  pcRatePct: number | null;
  lifeRatePct: number | null;
  marketplacePerPersonMonth: number | null;
  otherHealthRatePct: number | null;
};

export type CommissionPreview = {
  family: LineFamily;
  gwp: number;
  commission4: number | null;
  premiumFrequency: string;
  numberOfInsured: number;
  initialCommission: number;
  deferredCommission: number;
  monthlyCommission: number;
  totalAnnualCommission: number;
  amount: number | null;
  schedule: string;
  detail: string;
  needsRate: boolean;
};

export function inferLineFamily(
  lineOfBusiness: string,
  stored?: string | null,
  subType?: string | null,
): LineFamily {
  if (stored && (LINE_FAMILIES as readonly string[]).includes(stored)) return stored as LineFamily;
  const blob = `${lineOfBusiness} ${subType ?? ""}`.toLowerCase();
  if (blob.includes("marketplace") || blob.includes("aca") || blob.includes("on-exchange")) {
    return "health_marketplace";
  }
  if (blob.includes("medicare advantage") || blob.includes("mapd") || /\bma\b/.test(blob)) {
    return "medicare_advantage";
  }
  const key = homeLineKey(lineOfBusiness);
  if (key === "LIFE") return "life";
  if (key === "HEALTH" || blob.includes("medigap") || blob.includes("supplement")) return "other_health";
  return "pc";
}

function money(n: number) {
  return Math.round(n * 100) / 100;
}

export function previewCommission(input: {
  family: LineFamily;
  gwp: number;
  premium?: number;
  commission4?: number | null;
  rates?: CommissionRates;
  existingRatePct?: number | null;
  frequency?: string | null;
  insuredCount?: number;
  memberCount?: number;
}): CommissionPreview {
  const gwp = Number.isFinite(input.gwp) ? input.gwp : Number(input.premium ?? 0);
  const frequency = (input.frequency ?? "annual").toLowerCase();
  const insured = Math.max(1, input.insuredCount ?? input.memberCount ?? 1);
  const fromPolicy = input.commission4 ?? input.existingRatePct ?? null;
  const rates = input.rates ?? emptyRates();

  if (input.family === "life") {
    const pct = fromPolicy ?? rates.lifeRatePct;
    if (pct == null) {
      return blankPreview(input.family, gwp, frequency, insured, "Life Commission4 % lives on the policy (BackNine sample 80). No org-wide rate.");
    }
    const tac = money(commissionAmount(gwp, pct));
    const initial = money((tac * 9) / 12);
    const deferred = money((tac * 3) / 12);
    return {
      family: input.family,
      gwp,
      commission4: pct,
      premiumFrequency: frequency,
      numberOfInsured: insured,
      initialCommission: initial,
      deferredCommission: deferred,
      monthlyCommission: 0,
      totalAnnualCommission: tac,
      amount: tac,
      schedule: "once a year",
      detail: `Life: TAC = GWP × ${pct}% = ${tac}. Initial 9/12 = ${initial}; deferred 3/12 = ${deferred}. Monthly = 0.`,
      needsRate: false,
    };
  }

  if (input.family === "health_marketplace") {
    const monthly = money(gwp * insured);
    const tac = money(monthly * 12);
    return {
      family: input.family,
      gwp,
      commission4: null,
      premiumFrequency: "monthly",
      numberOfInsured: insured,
      initialCommission: 0,
      deferredCommission: 0,
      monthlyCommission: monthly,
      totalAnnualCommission: tac,
      amount: tac,
      schedule: "monthly",
      detail: `Marketplace: GWP is per-person monthly $${gwp} on this policy. Monthly = ${insured} × ${gwp} = ${monthly}. TAC = monthly × 12 = ${tac}. Commission4 is null.`,
      needsRate: false,
    };
  }

  if (input.family === "medicare_advantage") {
    return {
      family: input.family,
      gwp,
      commission4: null,
      premiumFrequency: frequency,
      numberOfInsured: insured,
      initialCommission: 0,
      deferredCommission: 0,
      monthlyCommission: 0,
      totalAnnualCommission: money(gwp),
      amount: money(gwp),
      schedule: "one-time",
      detail: `Medicare Advantage: one-time TAC = GWP (${gwp}). Monthly = 0. Commission4 is null. There is no New vs Renewal field.`,
      needsRate: false,
    };
  }

  if (input.family === "other_health") {
    const pct = fromPolicy ?? rates.otherHealthRatePct;
    if (pct == null) {
      return blankPreview(input.family, gwp, frequency, insured, "Supplemental Commission4 % lives on the policy (sample 25).");
    }
    const monthly = money(commissionAmount(gwp, pct));
    const tac = money(monthly * 12);
    return {
      family: input.family,
      gwp,
      commission4: pct,
      premiumFrequency: frequency,
      numberOfInsured: insured,
      initialCommission: 0,
      deferredCommission: 0,
      monthlyCommission: monthly,
      totalAnnualCommission: tac,
      amount: tac,
      schedule: "monthly",
      detail: `Other health: Monthly = GWP × ${pct}% = ${monthly}. TAC = monthly × 12 = ${tac}.`,
      needsRate: false,
    };
  }

  const pct = fromPolicy ?? rates.pcRatePct;
  if (pct == null) {
    return blankPreview(input.family, gwp, frequency, insured, "P&C Commission4 % lives on the policy. No carrier vendor P_C_Comm lookup.");
  }
  const tac = money(commissionAmount(gwp, pct));
  const monthly = frequency.includes("month") ? money(tac / 12) : 0;
  return {
    family: input.family,
    gwp,
    commission4: pct,
    premiumFrequency: frequency,
    numberOfInsured: insured,
    initialCommission: 0,
    deferredCommission: 0,
    monthlyCommission: monthly,
    totalAnnualCommission: tac,
    amount: tac,
    schedule: frequency.includes("month") ? "monthly" : "per term",
    detail: `P&C: TAC = GWP × ${pct}% = ${tac}. Initial/Deferred = 0. Monthly = ${monthly} (${frequency}).`,
    needsRate: false,
  };
}

function blankPreview(
  family: LineFamily,
  gwp: number,
  frequency: string,
  insured: number,
  detail: string,
): CommissionPreview {
  return {
    family,
    gwp,
    commission4: null,
    premiumFrequency: frequency,
    numberOfInsured: insured,
    initialCommission: 0,
    deferredCommission: 0,
    monthlyCommission: 0,
    totalAnnualCommission: 0,
    amount: null,
    schedule: "—",
    detail,
    needsRate: true,
  };
}

export function emptyRates(): CommissionRates {
  return {
    pcRatePct: null,
    lifeRatePct: null,
    marketplacePerPersonMonth: null,
    otherHealthRatePct: null,
  };
}

export function ratesFromRows(
  rows: Array<{
    lineFamily: string;
    ratePct: string | null;
    perPersonMonth: string | null;
    medicareNew?: string | null;
    medicareRenewal?: string | null;
  }>,
): CommissionRates {
  const rates = emptyRates();
  for (const row of rows) {
    if (row.lineFamily === "pc") rates.pcRatePct = row.ratePct == null ? null : toNumber(row.ratePct);
    if (row.lineFamily === "life") rates.lifeRatePct = row.ratePct == null ? null : toNumber(row.ratePct);
    if (row.lineFamily === "health_marketplace") {
      rates.marketplacePerPersonMonth = row.perPersonMonth == null ? null : toNumber(row.perPersonMonth);
    }
    if (row.lineFamily === "other_health") {
      rates.otherHealthRatePct = row.ratePct == null ? null : toNumber(row.ratePct);
    }
  }
  return rates;
}

export function isOepLine(family: LineFamily, subType?: string | null): boolean {
  if (family === "health_marketplace" || family === "medicare_advantage") return true;
  const blob = (subType ?? "").toLowerCase();
  return family === "other_health" && (blob.includes("medigap") || blob.includes("supplement") || blob.includes("medicare"));
}
