import { describe, expect, it } from "vitest";
import { computeHitRate, formatHitRatePct } from "./metrics";

describe("carrier hit rate", () => {
  it("never invents a percent when quotes are missing or bound exceeds requested", () => {
    expect(computeHitRate(0, 0)).toBeNull();
    expect(computeHitRate(4, 1)).toBe(0.25);
    expect(computeHitRate(2, 4)).toBeNull();
    expect(formatHitRatePct(null)).toBe("—");
    expect(formatHitRatePct(0.25)).toBe("25%");
  });
});
