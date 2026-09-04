import type { CommissionRange } from "@/lib/domain";

export type DateWindow = {
  start: Date | null;
  end: Date | null;
  statuses?: Array<"pending" | "payable" | "paid" | "held">;
  upcoming: boolean;
};

export function fiscalYearBounds(now: Date, fiscalYearStartMonth = 1): { start: Date; end: Date } {
  const month = clampMonth(fiscalYearStartMonth);
  const year =
    now.getUTCMonth() + 1 >= month ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year + 1, month - 1, 1, 0, 0, 0));
  return { start, end };
}

export function lastCalendarQuarter(now: Date): { start: Date; end: Date } {
  const currentQ = Math.floor(now.getUTCMonth() / 3);
  const lastQ = currentQ === 0 ? 3 : currentQ - 1;
  const year = currentQ === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const start = new Date(Date.UTC(year, lastQ * 3, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, lastQ * 3 + 3, 1, 0, 0, 0));
  return { start, end };
}

export function nextCalendarQuarter(now: Date): { start: Date; end: Date } {
  const currentQ = Math.floor(now.getUTCMonth() / 3);
  const nextQ = currentQ === 3 ? 0 : currentQ + 1;
  const year = currentQ === 3 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  const start = new Date(Date.UTC(year, nextQ * 3, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, nextQ * 3 + 3, 1, 0, 0, 0));
  return { start, end };
}

function monthStart(now: Date, monthDelta: number): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthDelta, 1, 0, 0, 0));
}

function calendarYear(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1, 0, 0, 0)),
    end: new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0)),
  };
}

export function rangeWindow(
  range: CommissionRange,
  now = new Date(),
  fiscalYearStartMonth = 1,
): DateWindow {
  if (range === "pending") {
    return { start: null, end: null, statuses: ["pending"], upcoming: false };
  }
  if (range === "paid") {
    return { start: null, end: null, statuses: ["paid"], upcoming: false };
  }
  if (range === "last_30") {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start, end: now, statuses: ["paid"], upcoming: false };
  }
  if (range === "last_quarter") {
    const q = lastCalendarQuarter(now);
    return { start: q.start, end: q.end, upcoming: false };
  }
  if (range === "fiscal_year") {
    const y = fiscalYearBounds(now, fiscalYearStartMonth);
    return { start: y.start, end: y.end, upcoming: false };
  }
  if (range === "upcoming") {
    return { start: now, end: null, statuses: ["pending", "payable"], upcoming: true };
  }
  if (range === "last_year") {
    const y = calendarYear(now.getUTCFullYear() - 1);
    return { start: y.start, end: y.end, upcoming: false };
  }
  if (range === "last_6_months") {
    return { start: monthStart(now, -6), end: now, upcoming: false };
  }
  if (range === "last_3_months") {
    return { start: monthStart(now, -3), end: now, upcoming: false };
  }
  if (range === "last_month") {
    return { start: monthStart(now, -1), end: monthStart(now, 0), upcoming: false };
  }
  if (range === "next_month") {
    return { start: monthStart(now, 1), end: monthStart(now, 2), upcoming: true };
  }
  if (range === "next_3_months") {
    return { start: monthStart(now, 1), end: monthStart(now, 4), upcoming: true };
  }
  if (range === "next_6_months") {
    return { start: monthStart(now, 1), end: monthStart(now, 7), upcoming: true };
  }
  if (range === "next_quarter") {
    const q = nextCalendarQuarter(now);
    return { start: q.start, end: q.end, upcoming: true };
  }
  if (range === "next_year") {
    const y = calendarYear(now.getUTCFullYear() + 1);
    return { start: y.start, end: y.end, upcoming: true };
  }
  return { start: null, end: null, upcoming: false };
}

function clampMonth(month: number): number {
  if (!Number.isFinite(month)) return 1;
  return Math.min(12, Math.max(1, Math.round(month)));
}
