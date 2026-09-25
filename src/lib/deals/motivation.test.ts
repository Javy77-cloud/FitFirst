import { describe, expect, it } from "vitest";
import {
  buildMotivationStats,
  buildQuoteCloseChart,
  formatBindRate,
  QUOTE_CLOSE_BOUND_COLOR,
  QUOTE_CLOSE_OPEN_COLOR,
  quoteCloseFromStats,
} from "./motivation";

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
    expect(live[1]?.count).toBe(3);
    expect(live[1]?.shoppedCount).toBe(9);
    expect(live[1]?.hint).toMatch(/3 bound \/ 9 shopped/);

    const close = quoteCloseFromStats(live);
    expect(close?.rateLabel).toBe("33%");
    expect(close?.slices.map((slice) => [slice.label, slice.count, slice.color])).toEqual([
      ["Bound", 3, QUOTE_CLOSE_BOUND_COLOR],
      ["Open", 6, QUOTE_CLOSE_OPEN_COLOR],
    ]);

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

    const blank = buildQuoteCloseChart(0, 0);
    expect(blank.rateLabel).toBe("—");
    expect(blank.slices.every((slice) => slice.share === 0)).toBe(true);
    expect(blank.slices.map((slice) => slice.count)).toEqual([0, 0]);

    const over = buildQuoteCloseChart(4, 2);
    expect(over.rateLabel).toBe("—");
    expect(over.slices.map((slice) => [slice.label, slice.count, slice.share])).toEqual([
      ["Bound", 4, 0],
      ["Shopped", 2, 0],
    ]);
  });
});
