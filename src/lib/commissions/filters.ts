import { isPcSubLine, type BookFamily } from "@/lib/desk/policy-line";
import { insuranceFamilyFromPolicy } from "@/lib/desk/policy-family";
import { deskNow } from "@/lib/home/as-of";
import type { CommissionRange } from "@/lib/domain";
import { rangeWindow, type DateWindow } from "./windows";

export const COMMISSION_PERIODS = [
  "all",
  "last_year",
  "last_6_months",
  "last_3_months",
  "last_month",
  "last_quarter",
  "next_month",
  "next_3_months",
  "next_6_months",
  "next_quarter",
  "next_year",
] as const;

export type CommissionPeriod = (typeof COMMISSION_PERIODS)[number];

export const COMMISSION_PERIOD_LABEL: Record<CommissionPeriod, string> = {
  all: "All dates",
  last_year: "Last year",
  last_6_months: "Last 6 months",
  last_3_months: "Last 3 months",
  last_month: "Last month",
  last_quarter: "Last quarter",
  next_month: "Next month",
  next_3_months: "Next 3 months",
  next_6_months: "Next 6 months",
  next_quarter: "Next quarter",
  next_year: "Next year",
};

export const COMMISSION_BOOKS = [
  { value: "pc", label: "P&C" },
  { value: "life", label: "Life" },
  { value: "health", label: "Health" },
] as const;

export const PC_SUBFILTERS = [
  { value: "home", label: "Home" },
  { value: "auto", label: "Auto" },
  { value: "flood", label: "Flood" },
  { value: "commercial", label: "Commercial" },
] as const;

export const LIFE_SUBFILTERS = [
  { value: "term", label: "Term" },
  { value: "whole", label: "Whole life" },
  { value: "universal", label: "Universal / IUL" },
  { value: "final_expense", label: "Final expense" },
  { value: "accidental", label: "Accidental death" },
] as const;

export const HEALTH_SUBFILTERS = [
  { value: "individual", label: "Individual" },
  { value: "marketplace", label: "Marketplace" },
  { value: "medicare", label: "Medicare" },
  { value: "supplemental", label: "Supplemental" },
  { value: "dental", label: "Dental" },
  { value: "vision", label: "Vision" },
] as const;

export const COMMISSION_STATUS_TABS = ["all", "pending", "paid"] as const;
export type CommissionStatusTab = (typeof COMMISSION_STATUS_TABS)[number];

export const COMMISSION_STATUS_TAB_LABEL: Record<CommissionStatusTab, string> = {
  all: "My commissions",
  pending: "Pending",
  paid: "Paid",
};

export type CommissionBookFilter = {
  family?: string;
  sub?: string;
  range?: string;
  status?: string;
};

export type CommissionFilterRow = {
  lineOfBusiness?: string | null;
  policyLineOfBusiness?: string | null;
  insuranceType?: string | null;
  policyType?: string | null;
  policySubType?: string | null;
  status: string;
  agentId?: string | null;
  dueDate?: Date | string | null;
  paidDate?: Date | string | null;
  createdAt?: Date | string | null;
};

const LIFE_SUB_MATCH: Record<string, string[]> = {
  term: ["term"],
  whole: ["whole"],
  universal: ["universal", "iul"],
  final_expense: ["final expense", "final_expense"],
  accidental: ["accidental"],
};

const HEALTH_SUB_MATCH: Record<string, string[]> = {
  individual: ["individual"],
  marketplace: ["marketplace"],
  medicare: ["medicare", "medigap", "part d", "part_d"],
  supplemental: ["supplemental"],
  dental: ["dental"],
  vision: ["vision"],
};

export function isCommissionPeriod(value: string | undefined): value is CommissionPeriod {
  return Boolean(value && (COMMISSION_PERIODS as readonly string[]).includes(value));
}

export function isCommissionStatusTab(value: string | undefined): value is CommissionStatusTab {
  return Boolean(value && (COMMISSION_STATUS_TABS as readonly string[]).includes(value));
}

export function isPendingCommissionStatus(status: string): boolean {
  return status !== "paid";
}

export function matchesCommissionStatus(status: string, tab?: string): boolean {
  const key = isCommissionStatusTab(tab) ? tab : "all";
  if (key === "all") return true;
  if (key === "paid") return status === "paid";
  return isPendingCommissionStatus(status);
}

export function subfiltersFor(family: string | undefined) {
  if (family === "life") return LIFE_SUBFILTERS;
  if (family === "health") return HEALTH_SUBFILTERS;
  if (family === "pc") return PC_SUBFILTERS;
  return [];
}

export function commissionLine(row: CommissionFilterRow): string {
  return (row.lineOfBusiness || row.policyLineOfBusiness || "").trim();
}

export function commissionBookFamily(row: CommissionFilterRow): BookFamily {
  const fromType = insuranceFamilyFromPolicy({
    insuranceType: row.insuranceType,
    lineOfBusiness: commissionLine(row),
    policySubType: row.policySubType,
  });
  if (fromType === "Life") return "life";
  if (fromType === "Health") return "health";
  return "pc";
}

function subtypeHaystack(row: CommissionFilterRow): string {
  return [
    row.policySubType,
    row.policyType,
    row.insuranceType,
    commissionLine(row),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesPcSubtype(row: CommissionFilterRow, sub: string): boolean {
  const line = commissionLine(row);
  if (isPcSubLine(line, sub)) return true;
  const hay = subtypeHaystack(row);
  if (sub === "home") {
    return /\bho\d|homeowner|home\b|dp\d|renter|condo|landlord/.test(hay);
  }
  if (sub === "auto") {
    return /\bauto\b|motorcycle|rideshare|classic\/collection/.test(hay);
  }
  if (sub === "flood") {
    return /\bflood\b|\bnfip\b/.test(hay);
  }
  if (sub === "commercial") {
    return /\bcommercial\b|\bgl\b|\bbop\b|workers|workers'\s*comp|\bcpp\b|\bcgl\b|\bwc\b|cyber|professional liability/.test(
      hay,
    );
  }
  return false;
}

export function matchesCommissionBook(
  row: CommissionFilterRow,
  family?: string,
  sub?: string,
): boolean {
  const book = commissionBookFamily(row);
  if (family && family !== "all" && book !== family) return false;
  if (!sub || sub === "all") return true;
  if (book === "pc" || family === "pc") return matchesPcSubtype(row, sub);
  const hay = subtypeHaystack(row);
  const needles =
    book === "life" || family === "life" ? LIFE_SUB_MATCH[sub] : HEALTH_SUB_MATCH[sub];
  if (!needles) return false;
  return needles.some((needle) => hay.includes(needle));
}

export function scopeCommissionRows<T extends { agentId?: string | null }>(
  rows: T[],
  opts: { isAdmin: boolean; viewerId: string | null },
): T[] {
  if (opts.isAdmin || !opts.viewerId) return rows;
  return rows.filter((row) => row.agentId === opts.viewerId);
}

export function commissionsHref(
  params: { status?: string; family?: string; sub?: string; range?: string },
  base = "/commissions",
): string {
  const query = new URLSearchParams();
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.family) query.set("family", params.family);
  if (params.sub) query.set("sub", params.sub);
  if (params.range && params.range !== "all") query.set("range", params.range);
  const qs = query.toString();
  return qs ? `${base}?${qs}` : base;
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function commissionFilterDate(row: CommissionFilterRow, window: DateWindow): Date | null {
  if (window.upcoming) return asDate(row.dueDate) ?? asDate(row.createdAt);
  return asDate(row.paidDate) ?? asDate(row.dueDate) ?? asDate(row.createdAt);
}

export function matchesCommissionRange(
  row: CommissionFilterRow,
  range?: string,
  now: Date = deskNow(),
): boolean {
  const key = (range && range !== "all" ? range : "all") as CommissionRange;
  const window = rangeWindow(key, now);
  if (window.statuses && !window.statuses.includes(row.status as (typeof window.statuses)[number])) {
    return false;
  }
  if (!window.start && !window.end) return true;
  const date = commissionFilterDate(row, window);
  if (!date) return false;
  if (window.start && date < window.start) return false;
  if (window.end && date >= window.end) return false;
  return true;
}

export function filterCommissionRows<T extends CommissionFilterRow>(
  rows: T[],
  filter: CommissionBookFilter,
  now: Date = deskNow(),
): T[] {
  return rows.filter(
    (row) =>
      matchesCommissionBook(row, filter.family, filter.sub) &&
      matchesCommissionRange(row, filter.range, now) &&
      matchesCommissionStatus(row.status, filter.status),
  );
}

export function resolveCommissionFamily(value: string | undefined): BookFamily | undefined {
  if (value === "pc" || value === "life" || value === "health") return value;
  return undefined;
}
