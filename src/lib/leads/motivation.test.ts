import { describe, expect, it } from "vitest";
import { buildLeadMotivationStats, formatConvertRate } from "./motivation";

describe("lead motivation stats", () => {
  it("formats convert rate from real desk counts", () => {
    expect(formatConvertRate(2, 8)).toBe("25%");
    expect(formatConvertRate(0, 0)).toBe("—");
    const live = buildLeadMotivationStats({
      leadsToday: 4,
      convertedThisMonth: 2,
      createdThisMonth: 8,
      sparkLeads: [1, 0, 2, 1, 3, 2, 4],
    });
    expect(live[0]?.id).toBe("leads-today");
    expect(live[0]?.valueLabel).toBe("4");
    expect(live[1]?.id).toBe("convert-rate");
    expect(live[1]?.valueLabel).toBe("25%");
    expect(live[1]?.sample).toBe(false);
  });
});
