import { addUtcDays, addUtcMonths, endOfUtcMonth, startOfUtcMonth } from "./as-of";

export type HomeContactDob = {
  id: string;
  name: string;
  dateOfBirth: string | null;
  href: string;
  ownerId?: string | null;
};

export type BirthdayRow = {
  id: string;
  name: string;
  href: string;
  dateOfBirth: string;
  turns: number;
  on: string;
};

function parseDob(raw: string | null | undefined): { month: number; day: number; year: number } | null {
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function utcYmd(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function nextBirthdayOn(dob: { month: number; day: number; year: number }, asOf: Date): Date {
  const thisYear = utcYmd(asOf.getUTCFullYear(), dob.month, dob.day);
  const asOfDay = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());
  if (thisYear.getTime() >= asOfDay) return thisYear;
  return utcYmd(asOf.getUTCFullYear() + 1, dob.month, dob.day);
}

function ageOn(dob: { year: number; month: number; day: number }, on: Date): number {
  let age = on.getUTCFullYear() - dob.year;
  const hadBirthday =
    on.getUTCMonth() + 1 > dob.month ||
    (on.getUTCMonth() + 1 === dob.month && on.getUTCDate() >= dob.day);
  if (!hadBirthday) age -= 1;
  return age;
}

function toRow(contact: HomeContactDob, on: Date, dob: { year: number; month: number; day: number }): BirthdayRow {
  return {
    id: contact.id,
    name: contact.name,
    href: contact.href,
    dateOfBirth: contact.dateOfBirth ?? iso(utcYmd(dob.year, dob.month, dob.day)),
    turns: ageOn(dob, on) + (iso(on) === iso(utcYmd(on.getUTCFullYear(), dob.month, dob.day)) ? 0 : 0),
    on: iso(on),
  };
}

/** Age the contact will be on that birthday date. */
function turnsOnBirthday(dob: { year: number }, on: Date): number {
  return on.getUTCFullYear() - dob.year;
}

export function birthdayBuckets(contacts: HomeContactDob[], asOf: Date) {
  const todayStart = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());
  const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
  const weekEnd = addUtcDays(new Date(todayStart), 7).getTime() - 1;
  const nextMonthStart = startOfUtcMonth(addUtcMonths(asOf, 1)).getTime();
  const nextMonthEnd = endOfUtcMonth(addUtcMonths(asOf, 1)).getTime();

  const today: BirthdayRow[] = [];
  const nextWeek: BirthdayRow[] = [];
  const nextMonth: BirthdayRow[] = [];

  for (const contact of contacts) {
    const dob = parseDob(contact.dateOfBirth);
    if (!dob) continue;
    const on = nextBirthdayOn(dob, asOf);
    const row: BirthdayRow = {
      id: contact.id,
      name: contact.name,
      href: contact.href,
      dateOfBirth: contact.dateOfBirth as string,
      turns: turnsOnBirthday(dob, on),
      on: iso(on),
    };
    const t = on.getTime();
    if (t >= todayStart && t <= todayEnd) today.push(row);
    else if (t > todayEnd && t <= weekEnd) nextWeek.push(row);
    if (t >= nextMonthStart && t <= nextMonthEnd) nextMonth.push(row);
  }

  const byName = (a: BirthdayRow, b: BirthdayRow) => a.on.localeCompare(b.on) || a.name.localeCompare(b.name);
  return {
    today: today.sort(byName),
    nextWeek: nextWeek.sort(byName),
    nextMonth: nextMonth.sort(byName),
  };
}

/** Medicare prep: contacts who turn 65 next month or sometime next calendar year. */
export function turning65Buckets(contacts: HomeContactDob[], asOf: Date) {
  const nextMonth = addUtcMonths(startOfUtcMonth(asOf), 1);
  const nextYear = asOf.getUTCFullYear() + 1;
  const nextMonthRows: BirthdayRow[] = [];
  const nextYearRows: BirthdayRow[] = [];

  for (const contact of contacts) {
    const dob = parseDob(contact.dateOfBirth);
    if (!dob) continue;
    const sixtyFifth = utcYmd(dob.year + 65, dob.month, dob.day);
    const row = toRow(contact, sixtyFifth, dob);
    row.turns = 65;
    row.on = iso(sixtyFifth);
    if (
      sixtyFifth.getUTCFullYear() === nextMonth.getUTCFullYear() &&
      sixtyFifth.getUTCMonth() === nextMonth.getUTCMonth()
    ) {
      nextMonthRows.push(row);
    }
    if (sixtyFifth.getUTCFullYear() === nextYear) {
      nextYearRows.push(row);
    }
  }

  const byDate = (a: BirthdayRow, b: BirthdayRow) => a.on.localeCompare(b.on) || a.name.localeCompare(b.name);
  return {
    nextMonth: nextMonthRows.sort(byDate),
    nextYear: nextYearRows.sort(byDate),
  };
}
