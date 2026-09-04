import { describe, expect, it } from "vitest";
import { DESK_AS_OF } from "./as-of";
import { birthdayBuckets, turning65Buckets } from "./birthdays";

const asOf = DESK_AS_OF; // 2026-09-03

function contact(id: string, name: string, dateOfBirth: string) {
  return { id, name, dateOfBirth, href: `/contacts/${id}` };
}

describe("birthday and turning-65 widgets", () => {
  it("buckets today, next week, and next month from Contact DOB", () => {
    const rows = [
      contact("today", "Hale, Nora", "1968-09-03"),
      contact("week", "Bell, Otis", "1974-09-09"),
      contact("month", "Shah, Priya", "1988-10-12"),
      contact("later", "Reed, Ken", "1990-12-01"),
    ];
    const buckets = birthdayBuckets(rows, asOf);
    expect(buckets.today.map((r) => r.id)).toEqual(["today"]);
    expect(buckets.nextWeek.map((r) => r.id)).toEqual(["week"]);
    expect(buckets.nextMonth.map((r) => r.id)).toEqual(["month"]);
    expect(buckets.today[0]?.turns).toBe(58);
  });

  it("flags Life/Medicare contacts turning 65 next month and next year", () => {
    const rows = [
      contact("oct", "Reed, Ken", "1961-10-22"),
      contact("yr", "Nair, Dev", "1962-03-15"),
      contact("too-soon", "Young, Pat", "1961-09-01"),
    ];
    const buckets = turning65Buckets(rows, asOf);
    expect(buckets.nextMonth.map((r) => r.id)).toEqual(["oct"]);
    expect(buckets.nextYear.map((r) => r.id)).toEqual(["yr"]);
    expect(buckets.nextMonth[0]?.turns).toBe(65);
  });
});
