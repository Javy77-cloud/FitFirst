import { describe, expect, it } from "vitest";
import { buildMotivationStats, formatBindRate } from "./motivation";

describe("deal motivation stats", () => {
  it("uses real desk counts and never invents a bind percent", () => {
    expect(formatBindRate(2, 6)).toBe("33%");
    expect(formatBindRate(0, 0)).toBe("—");
    expect(formatBindRate(4, 2)).toBe("—");

    const live = buildMotivationStats({
      quotesToday: 12,
      boundThisMonth: 3,
      shoppedThisMonth: 9,
      sparkQuotes: [1, 2, 3, 2, 4, 3, 12],
    });
    expect(live[0]?.sample).toBe(false);
    expect(live[0]?.id).toBe("quotes-today");
    expect(live[0]?.valueLabel).toBe("12");
    expect(live[1]?.id).toBe("bound-this-month");
    expect(live[1]?.valueLabel).toBe("3");
    expect(live[1]?.hint).toMatch(/3 bound \/ 9 shopped/);

    const empty = buildMotivationStats({
      quotesToday: 0,
      boundThisMonth: 0,
      shoppedThisMonth: 0,
      sparkQuotes: [0, 0, 0, 0, 0, 0, 0],
    });
    expect(empty[0]?.sample).toBe(false);
    expect(empty[0]?.valueLabel).toBe("0");
    expect(empty[1]?.valueLabel).toBe("0");
    expect(empty[1]?.hint).not.toMatch(/%/);
  });
});
