import { describe, expect, it } from "vitest";
import { formatHonestPct, formatHonestPctTenth, honestRate } from "./honest-rate";

describe("honestRate", () => {
  it("returns a real 0–1 ratio and never invents a percent", () => {
    expect(honestRate(1, 4)).toBe(0.25);
    expect(honestRate(0, 4)).toBe(0);
    expect(honestRate(0, 0)).toBeNull();
    expect(honestRate(4, 2)).toBeNull();
    expect(formatHonestPct(2, 6)).toBe("33%");
    expect(formatHonestPct(0, 0)).toBe("—");
    expect(formatHonestPct(8, 4)).toBe("—");
    expect(formatHonestPctTenth(1, 3)).toBe(33.3);
    expect(formatHonestPctTenth(0, 0)).toBeNull();
  });
});
