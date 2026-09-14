import { describe, expect, it } from "vitest";
import { missingRenewalCrossSellLines } from "./cross-sell";

describe("renewal cross-sell", () => {
  it("suggests missing companions from held lines", () => {
    const gaps = missingRenewalCrossSellLines(["HO"]);
    expect(gaps.map((g) => g.line)).toEqual(["AUTO", "FLOOD"]);
    expect(gaps[0]?.copy.toLowerCase()).toContain("auto");
  });

  it("returns nothing when household has no personal lines yet", () => {
    expect(missingRenewalCrossSellLines(["GL"])).toEqual([]);
    expect(missingRenewalCrossSellLines([])).toEqual([]);
  });
});
