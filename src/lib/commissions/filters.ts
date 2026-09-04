import { bookFamily, isPcSubLine, type BookFamily } from "@/lib/desk/policy-line";
import { DESK_AS_OF } from "@/lib/home/as-of";
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

export type CommissionBookFilter = {
  family?: string;
  sub?: string;
  range?: string;
};

export type CommissionFilterRow = {
  lineOfBusiness?: string | null;
  policyLineOfBusiness?: string | null;
  policySubType?: string | null;
  status: string;
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

export function subfiltersFor(family: string | undefined) {
  if (family === "life") return LIFE_SUBFILTERS;
  if (family === "health") return HEALTH_SUBFILTERS;
  if (family === "pc") return PC_SUBFILTERS;
  return [];
}

export function commissionLine(row: CommissionFilterRow): string {
  return (row.lineOfBusiness || row.policyLineOfBusiness || "").trim();
}

export function matchesCommissionBook(
  row: CommissionFilterRow,
  family?: string,
  sub?: string,
): boolean {
  const line = commissionLine(row);
  const book = bookFamily(line || "HO");
  if (family && family !== "all" && book !== family) return false;
  if (!sub || sub === "all") return true;
  if (book === "pc" || family === "pc") return isPcSubLine(line, sub);
  const hay = `${row.policySubType ?? ""} ${line}`.toLowerCase();
  const needles =
    book === "life" || family === "life" ? LIFE_SUB_MATCH[sub] : HEALTH_SUB_MATCH[sub];
  if (!needles) return false;
  return needles.some((needle) => hay.includes(needle));
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
  now: Date = DESK_AS_OF,
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
  now: Date = DESK_AS_OF,
): T[] {
  return rows.filter(
    (row) =>
      matchesCommissionBook(row, filter.family, filter.sub) &&
      matchesCommissionRange(row, filter.range, now),
  );
}

export function resolveCommissionFamily(value: string | undefined): BookFamily | undefined {
  if (value === "pc" || value === "life" || value === "health") return value;
  return undefined;
}
