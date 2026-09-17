import { describe, expect, it } from "vitest";
import { buildLeadMotivationStats, formatConvertRate } from "./motivation";

describe("lead motivation stats", () => {
  it("formats convert rate from real desk counts and never invents a percent", () => {
    expect(formatConvertRate(2, 8)).toBe("25%");
    expect(formatConvertRate(0, 0)).toBe("—");
    expect(formatConvertRate(5, 2)).toBe("—");
    const live = buildLeadMotivationStats({
      leadsToday: 4,
      convertedThisMonth: 2,
      createdThisMonth: 8,
      sparkLeads: [1, 0, 2, 1, 3, 2, 4],
    });
    expect(live[0]?.id).toBe("leads-today");
    expect(live[0]?.valueLabel).toBe("4");
    expect(live[1]?.id).toBe("converted-this-month");
    expect(live[1]?.valueLabel).toBe("2");
    expect(live[1]?.sample).toBe(false);
    expect(live[1]?.hint).toMatch(/2 converted \/ 8 new/);
  });
});
