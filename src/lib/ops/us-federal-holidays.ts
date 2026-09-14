/** US federal holidays — computed observed dates (weekend observance). Reference only. */

export type UsFederalHoliday = {
  /** Observed date YYYY-MM-DD (local calendar date). */
  date: string;
  name: string;
  /** True when the observed date differs from the statutory date. */
  observed: boolean;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toHolidayDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ymd(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day);
}

/** If Sat → previous Friday; if Sun → following Monday; else same day. */
export function observeFederal(date: Date): Date {
  const day = date.getDay();
  if (day === 6) return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  if (day === 0) return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function nthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, n: number): Date {
  const first = ymd(year, monthIndex, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return ymd(year, monthIndex, 1 + offset + (n - 1) * 7);
}

function lastWeekdayOfMonth(year: number, monthIndex: number, weekday: number): Date {
  const last = ymd(year, monthIndex + 1, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return ymd(year, monthIndex, last.getDate() - offset);
}

function entry(name: string, statutory: Date): UsFederalHoliday {
  const observedDate = observeFederal(statutory);
  const observed =
    observedDate.getFullYear() !== statutory.getFullYear() ||
    observedDate.getMonth() !== statutory.getMonth() ||
    observedDate.getDate() !== statutory.getDate();
  return {
    date: toHolidayDateKey(observedDate),
    name: observed ? `${name} (Observed)` : name,
    observed,
  };
}

/**
 * Eleven US federal holidays for a calendar year (observed dates).
 * New Year / Christmas / Independence / Veterans / Juneteenth use weekend observance.
 * Floating Mondays/Thursday are already weekday statutory dates.
 */
export function usFederalHolidaysForYear(year: number): UsFederalHoliday[] {
  const rows: UsFederalHoliday[] = [
    entry("New Year's Day", ymd(year, 0, 1)),
    {
      date: toHolidayDateKey(nthWeekdayOfMonth(year, 0, 1, 3)),
      name: "Martin Luther King Jr. Day",
      observed: false,
    },
    {
      date: toHolidayDateKey(nthWeekdayOfMonth(year, 1, 1, 3)),
      name: "Washington's Birthday",
      observed: false,
    },
    {
      date: toHolidayDateKey(lastWeekdayOfMonth(year, 4, 1)),
      name: "Memorial Day",
      observed: false,
    },
    entry("Juneteenth", ymd(year, 5, 19)),
    entry("Independence Day", ymd(year, 6, 4)),
    {
      date: toHolidayDateKey(nthWeekdayOfMonth(year, 8, 1, 1)),
      name: "Labor Day",
      observed: false,
    },
    {
      date: toHolidayDateKey(nthWeekdayOfMonth(year, 9, 1, 2)),
      name: "Columbus Day",
      observed: false,
    },
    entry("Veterans Day", ymd(year, 10, 11)),
    {
      date: toHolidayDateKey(nthWeekdayOfMonth(year, 10, 4, 4)),
      name: "Thanksgiving Day",
      observed: false,
    },
    entry("Christmas Day", ymd(year, 11, 25)),
  ];
  // Stable chronological order (observed New Year may land in prior year — keep list as-is for the year table).
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

/** Holidays whose observed date falls in [from, to] inclusive (local dates). */
export function usFederalHolidaysInRange(from: Date, to: Date): UsFederalHoliday[] {
  const years = new Set<number>();
  years.add(from.getFullYear());
  years.add(to.getFullYear());
  // Observed New Year can land Dec 31 of prior year when Jan 1 is Saturday.
  years.add(from.getFullYear() - 1);
  years.add(to.getFullYear() + 1);
  const fromKey = toHolidayDateKey(from);
  const toKey = toHolidayDateKey(to);
  const out: UsFederalHoliday[] = [];
  const seen = new Set<string>();
  for (const year of [...years].sort((a, b) => a - b)) {
    for (const h of usFederalHolidaysForYear(year)) {
      if (h.date < fromKey || h.date > toKey) continue;
      const key = `${h.date}:${h.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(h);
    }
  }
  return out;
}

export function holidayOnDay(
  holidays: UsFederalHoliday[],
  day: Date,
): UsFederalHoliday | undefined {
  const key = toHolidayDateKey(day);
  return holidays.find((h) => h.date === key);
}
