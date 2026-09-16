import { describe, expect, it } from "vitest";
import {
  compareExceedsMax,
  QUOTE_COMPARE_MAX,
  sortByPremiumAsc,
  toggleCompareSelection,
} from "./compare-selection";

describe("quote compare selection", () => {
  it("lets the agent pick more than 3; Compare alone enforces the cap", () => {
    expect(toggleCompareSelection([], "a")).toEqual(["a"]);
    expect(toggleCompareSelection(["a", "b", "c"], "d")).toEqual(["a", "b", "c", "d"]);
    expect(toggleCompareSelection(["a", "b", "c"], "b")).toEqual(["a", "c"]);
    expect(compareExceedsMax(3)).toBe(false);
    expect(compareExceedsMax(4)).toBe(true);
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
