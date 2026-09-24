import { describe, expect, it } from "vitest";
import {
  etDateKey,
  etTodayDateKey,
  etWallToUtc,
  formatEtWeekdayMonthDay,
  normalizeTaskPriority,
  parseEtDateTimeLocal,
  sameEtDay,
  toEtDateTimeLocal,
  urgencyFromTaskPriority,
  zonedLocalToUtc,
} from "./et";

describe("et wall clock ↔ UTC", () => {
  it("maps Thu Sep 24 2026 2:30 PM ET to the correct UTC instant", () => {
    expect(etWallToUtc("2026-09-24", "14:30")?.toISOString()).toBe("2026-09-24T18:30:00.000Z");
  });

  it("keeps evening times after 8 PM ET on the same Eastern day (UTC rolls next day)", () => {
    const due = etWallToUtc("2026-09-24", "21:00");
    expect(due?.toISOString()).toBe("2026-09-25T01:00:00.000Z");
    expect(etDateKey(due!)).toBe("2026-09-24");
    expect(formatEtWeekdayMonthDay(due!)).toBe("Thu, Sep 24");
  });

  it("handles Eastern standard time in winter", () => {
    expect(etWallToUtc("2026-01-16", "19:00")?.toISOString()).toBe("2026-01-17T00:00:00.000Z");
  });

  it("handles DST spring-forward boundary (2026-03-08 2am skipped)", () => {
    // 1:30 AM EST still exists before spring forward
    expect(etWallToUtc("2026-03-08", "01:30")?.toISOString()).toBe("2026-03-08T06:30:00.000Z");
    // 3:00 AM EDT after spring forward
    expect(etWallToUtc("2026-03-08", "03:00")?.toISOString()).toBe("2026-03-08T07:00:00.000Z");
  });

  it("handles DST fall-back boundary", () => {
    expect(etWallToUtc("2026-11-01", "01:30")?.toISOString()).toMatch(/^2026-11-01T0[56]:30:00\.000Z$/);
  });

  it("parses datetime-local as Eastern wall clock, not UTC", () => {
    expect(parseEtDateTimeLocal("2026-09-24T14:30")?.toISOString()).toBe("2026-09-24T18:30:00.000Z");
  });

  it("never uses toISOString slice for today key at evening ET", () => {
    // 9 PM ET Sep 24 = 1 AM UTC Sep 25 — ISO slice would wrongly say Sep 25
    const evening = new Date("2026-09-25T01:00:00.000Z");
    expect(evening.toISOString().slice(0, 10)).toBe("2026-09-25");
    expect(etTodayDateKey(evening)).toBe("2026-09-24");
  });

  it("sameEtDay compares Eastern calendar days", () => {
    const a = new Date("2026-09-25T01:00:00.000Z"); // Wed Sep 24 9pm ET
    const b = new Date("2026-09-24T16:00:00.000Z"); // Wed Sep 24 noon ET
    expect(sameEtDay(a, b)).toBe(true);
    expect(etDateKey(a)).toBe("2026-09-24");
  });
});

describe("priority → notification urgency round-trip", () => {
  it("chosen HIGH always wins over time-based medium", () => {
    expect(normalizeTaskPriority("high")).toBe("high");
    expect(urgencyFromTaskPriority("high", "medium")).toBe("high");
    expect(urgencyFromTaskPriority("high", null)).toBe("high");
  });

  it("chosen LOW wins over time-based high", () => {
    expect(urgencyFromTaskPriority("low", "high")).toBe("low");
  });

  it("normal without time window still surfaces medium (no silent drop)", () => {
    expect(urgencyFromTaskPriority("normal", null)).toBe("medium");
    expect(urgencyFromTaskPriority("none", "medium")).toBe("medium");
    expect(urgencyFromTaskPriority(null, "medium")).toBe("medium");
  });

  it("accepts urgent/critical aliases as high", () => {
    expect(normalizeTaskPriority("urgent")).toBe("high");
    expect(normalizeTaskPriority("CRITICAL")).toBe("high");
  });
});

describe("zonedLocalToUtc stability", () => {
  it("round-trips a known EDT offset", () => {
    const utc = zonedLocalToUtc("2026-09-24T14:30:00", "America/New_York");
    expect(utc.toISOString()).toBe("2026-09-24T18:30:00.000Z");
  });
});

describe("datetime-local ET round-trip", () => {
  it("afternoon 2:30 PM ET open+save does not move the instant", () => {
    const stored = new Date("2026-09-24T18:30:00.000Z");
    const local = toEtDateTimeLocal(stored);
    expect(local).toBe("2026-09-24T14:30");
    expect(parseEtDateTimeLocal(local)?.toISOString()).toBe(stored.toISOString());
  });

  it("after 8 PM ET stays on the Eastern calendar day through round-trip", () => {
    const stored = new Date("2026-09-25T01:00:00.000Z"); // Thu Sep 24 9:00 PM ET
    const local = toEtDateTimeLocal(stored);
    expect(local).toBe("2026-09-24T21:00");
    expect(parseEtDateTimeLocal(local)?.toISOString()).toBe(stored.toISOString());
    expect(etDateKey(parseEtDateTimeLocal(local)!)).toBe("2026-09-24");
  });

  it("accepts ISO-with-Z input the same as Date for the edit modal", () => {
    expect(toEtDateTimeLocal("2026-09-24T18:30:00.000Z")).toBe("2026-09-24T14:30");
  });
});
