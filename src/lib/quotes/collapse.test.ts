import { describe, expect, it } from "vitest";
import {
  quoteCardDefaultOpen,
  sheetGroupNeedsAttention,
  sheetGroupSummary,
  shopSectionOpen,
} from "./collapse";

describe("quote section collapse", () => {
  it("keeps a focused shop open and folds skip-only shops on the board", () => {
    expect(shopSectionOpen({ quotedCount: 0, declinedCount: 0, boundCount: 0 }, true)).toBe(true);
    expect(shopSectionOpen({ quotedCount: 0, declinedCount: 0, boundCount: 0 })).toBe(false);
    expect(shopSectionOpen({ quotedCount: 1, declinedCount: 3, boundCount: 0 })).toBe(true);
    expect(quoteCardDefaultOpen({ status: "quoted" })).toBe(false);
    expect(quoteCardDefaultOpen({ status: "quoted" }, true)).toBe(true);
    expect(quoteCardDefaultOpen({ status: "skip" }, true)).toBe(false);
  });

  it("opens sheet groups that still have blanks or CHECK", () => {
    const fields = [{ key: "coverage_a" }, { key: "city" }];
    expect(
      sheetGroupNeedsAttention(fields, {
        coverage_a: { value: "321000", status: "confirmed", source: "javy" },
        city: { value: "Palm Bay", status: "confirmed", source: "seed" },
      }),
    ).toBe(false);
    expect(
      sheetGroupNeedsAttention(fields, {
        coverage_a: { value: "321000", status: "confirmed", source: "javy" },
        city: { value: "", status: "missing", source: "blank" },
      }),
    ).toBe(true);
    expect(
      sheetGroupSummary(fields, {
        coverage_a: { value: "321000", status: "confirmed", source: "javy" },
        city: { value: "Melbourne", status: "check", source: "extracted" },
      }),
    ).toBe("0 missing · 1 CHECK · 1 confirmed");
  });
});
