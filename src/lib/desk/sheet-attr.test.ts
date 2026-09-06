import { describe, expect, it } from "vitest";
import { sheetAttr, sheetCellProps } from "./sheet-attr";

describe("sheetAttr", () => {
  it("always returns a string and never null", () => {
    expect(sheetAttr(null)).toBe("");
    expect(sheetAttr(undefined)).toBe("");
    expect(sheetAttr("")).toBe("");
    expect(sheetAttr(0)).toBe("0");
    expect(sheetAttr(1840)).toBe("1840");
    expect(sheetAttr("quote_sent")).toBe("quote_sent");
    expect(Object.values({ a: sheetAttr(null) }).every((value) => typeof value === "string")).toBe(
      true,
    );
  });

  it("stamps deals/pipeline cells with string sheet attrs", () => {
    expect(sheetCellProps("deals", null)).toEqual({
      "data-sheet-cell": "",
      "data-sheet-table-tax": "",
    });
    expect(sheetCellProps("deals", 402000)["data-sheet-cell"]).toBe("402000");
    expect(sheetCellProps("leads", "x")).toEqual({});
  });
});
