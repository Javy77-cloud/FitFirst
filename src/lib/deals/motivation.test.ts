import { describe, expect, it } from "vitest";
import { buildMotivationStats, formatBindRate } from "./motivation";

describe("deal motivation stats", () => {
  it("uses real desk counts when present and labels samples when not", () => {
    expect(formatBindRate(2, 6)).toBe("33%");
    const live = buildMotivationStats({
      quotesToday: 12,
      boundThisMonth: 3,
      shoppedThisMonth: 9,
      sparkQuotes: [1, 2, 3, 2, 4, 3, 12],
    });
    expect(live[0]?.sample).toBe(false);
    expect(live[0]?.valueLabel).toBe("12");
    expect(live[1]?.valueLabel).toBe("33%");

    const sample = buildMotivationStats({
      quotesToday: 0,
      boundThisMonth: 0,
      shoppedThisMonth: 0,
      sparkQuotes: [0, 0, 0, 0, 0, 0, 0],
    });
    expect(sample[0]?.sample).toBe(true);
    expect(sample[0]?.hint).toMatch(/Sample/);
    expect(sample[1]?.valueLabel).toBe("34%");
  });
});
