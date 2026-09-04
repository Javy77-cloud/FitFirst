import { describe, expect, it } from "vitest";
import { CHART_SERIES_COLORS, chartColor } from "./chart-colors";

describe("home chart series colors", () => {
  it("uses a bright distinct hex set, not washed navy/gray", () => {
    expect(CHART_SERIES_COLORS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(CHART_SERIES_COLORS).size).toBe(CHART_SERIES_COLORS.length);
    for (const color of CHART_SERIES_COLORS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(CHART_SERIES_COLORS).not.toContain("var(--ff-sidebar-muted)");
    expect(CHART_SERIES_COLORS).not.toContain("var(--ff-navy)");
    expect(chartColor(0)).toBe("#1d8cff");
    expect(chartColor(1)).toBe("#f26522");
    expect(chartColor(8)).toBe(chartColor(0));
  });
});
