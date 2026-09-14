import { describe, expect, it } from "vitest";
import {
  canAddToCompare,
  QUOTE_COMPARE_MAX,
  sortByPremiumAsc,
  toggleCompareSelection,
} from "./compare-selection";

describe("quote compare selection", () => {
  it("caps at three and toggles off", () => {
    expect(toggleCompareSelection([], "a")).toEqual(["a"]);
    expect(toggleCompareSelection(["a", "b", "c"], "d")).toEqual(["a", "b", "c"]);
    expect(toggleCompareSelection(["a", "b", "c"], "b")).toEqual(["a", "c"]);
    expect(canAddToCompare(["a", "b", "c"], "d")).toBe(false);
    expect(canAddToCompare(["a", "b", "c"], "a")).toBe(true);
    expect(QUOTE_COMPARE_MAX).toBe(3);
  });

  it("sorts cheapest to the left", () => {
    const sorted = sortByPremiumAsc(
      [
        { id: "hi", premium: "2400" },
        { id: "lo", premium: 900 },
        { id: "mid", premium: "$1,200.00" },
        { id: "none", premium: null },
      ],
      (row) => row.premium,
    );
    expect(sorted.map((r) => r.id)).toEqual(["lo", "mid", "hi", "none"]);
  });
});
