import { describe, expect, it } from "vitest";
import {
  bookHeatFromDeal,
  bookHeatFromRenewal,
  daysSince,
  dealHeatShares,
  heatShares,
  truthLine,
  waveformTicks,
} from "./truth-strip";

describe("one-desk truth strip", () => {
  it("maps renewals to hot / cooling / cold without a name-shame board", () => {
    expect(bookHeatFromRenewal({ daysUntil: 12, healthStars: 4 })).toBe("hot");
    expect(bookHeatFromRenewal({ daysUntil: 80, healthFlagged: true })).toBe("hot");
    expect(bookHeatFromRenewal({ daysUntil: 80, healthStars: 2 })).toBe("hot");
    expect(bookHeatFromRenewal({ daysUntil: 45, healthStars: 4 })).toBe("cooling");
    expect(bookHeatFromRenewal({ daysUntil: 80, healthStars: 4, lastContactDays: 12 })).toBe("cooling");
    expect(bookHeatFromRenewal({ daysUntil: 80, healthStars: 4, lastContactDays: 2 })).toBe("cold");
  });

  it("maps deal silence to the 3 / 14 day clocks", () => {
    expect(bookHeatFromDeal(1)).toBe("hot");
    expect(bookHeatFromDeal(8)).toBe("cooling");
    expect(bookHeatFromDeal(14)).toBe("cold");
    expect(bookHeatFromDeal(null)).toBe("cooling");
  });

  it("writes a glance line agents can read in one breath", () => {
    const heat = heatShares(["hot", "hot", "cooling", "cold"]);
    expect(heat.map((row) => row.pct).reduce((sum, pct) => sum + pct, 0)).toBe(100);
    expect(truthLine({ heat, flagged: 1, clients: 4, surface: "renewals" })).toMatch(/hot/);
    expect(truthLine({ heat: heatShares([]), clients: 0, surface: "deals" })).toMatch(/No open shops/);
    expect(waveformTicks(heat, 8)).toHaveLength(8);
    const asOf = new Date("2026-09-19T13:00:00.000Z");
    expect(daysSince("2026-09-17T13:00:00.000Z", asOf)).toBe(2);
    expect(dealHeatShares(["2026-09-18T13:00:00.000Z", "2026-09-01T13:00:00.000Z"], asOf)[0]?.level).toBe(
      "hot",
    );
  });
});
