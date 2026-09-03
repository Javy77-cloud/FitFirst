/** Desk clock for owner-home KPIs. Matches the Ana shop week so seed math is stable. */
export const DESK_AS_OF = new Date("2026-09-03T16:00:00.000Z");

export function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function endOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()));
}

export function sameUtcMonth(date: Date, asOf: Date): boolean {
  return date.getUTCFullYear() === asOf.getUTCFullYear() && date.getUTCMonth() === asOf.getUTCMonth();
}

export function priorMonth(asOf: Date): Date {
  return addUtcMonths(asOf, -1);
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
