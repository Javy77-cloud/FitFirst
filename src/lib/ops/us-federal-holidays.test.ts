import { describe, expect, it } from "vitest";
import {
  holidayOnDay,
  observeFederal,
  toHolidayDateKey,
  usFederalHolidaysForYear,
  usFederalHolidaysInRange,
} from "./us-federal-holidays";

describe("us federal holidays", () => {
  it("computes known 2026 observed dates", () => {
    const byName = Object.fromEntries(
      usFederalHolidaysForYear(2026).map((h) => [h.name.replace(" (Observed)", ""), h]),
    );
    expect(byName["New Year's Day"].date).toBe("2026-01-01");
    expect(byName["Martin Luther King Jr. Day"].date).toBe("2026-01-19");
    expect(byName["Washington's Birthday"].date).toBe("2026-02-16");
    expect(byName["Memorial Day"].date).toBe("2026-05-25");
    expect(byName["Juneteenth"].date).toBe("2026-06-19");
    expect(byName["Independence Day"].date).toBe("2026-07-03");
    expect(byName["Independence Day"].observed).toBe(true);
    expect(byName["Independence Day"].name).toBe("Independence Day (Observed)");
    expect(byName["Labor Day"].date).toBe("2026-09-07");
    expect(byName["Columbus Day"].date).toBe("2026-10-12");
    expect(byName["Veterans Day"].date).toBe("2026-11-11");
    expect(byName["Thanksgiving Day"].date).toBe("2026-11-26");
    expect(byName["Christmas Day"].date).toBe("2026-12-25");
  });

  it("observes Saturday→Friday and Sunday→Monday", () => {
    // Jul 4 2026 is Saturday → Fri Jul 3
    expect(toHolidayDateKey(observeFederal(new Date(2026, 6, 4)))).toBe("2026-07-03");
    // Nov 11 2029 is Sunday → Mon Nov 12
    expect(toHolidayDateKey(observeFederal(new Date(2029, 10, 11)))).toBe("2029-11-12");
  });

  it("returns Labor Day on Sep 7 2026 in September range", () => {
    const rows = usFederalHolidaysInRange(new Date(2026, 8, 1), new Date(2026, 8, 30));
    expect(rows.map((r) => r.date)).toEqual(["2026-09-07"]);
    expect(rows[0].name).toBe("Labor Day");
    expect(holidayOnDay(rows, new Date(2026, 8, 7))?.name).toBe("Labor Day");
    expect(holidayOnDay(rows, new Date(2026, 8, 8))).toBeUndefined();
  });

  it("ships eleven holidays per year", () => {
    expect(usFederalHolidaysForYear(2026)).toHaveLength(11);
    expect(usFederalHolidaysForYear(2025)).toHaveLength(11);
  });
});
