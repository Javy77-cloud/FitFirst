import { describe, expect, it } from "vitest";
import { cellSortText, rowSortValue, type ColumnRow } from "./column-table";

describe("shared list table sort values", () => {
  it("reads explicit sort keys and falls back to cell text", () => {
    const row: ColumnRow = {
      key: "1",
      cells: { name: "Zed", status: "new", extra: 12 },
      sort: { name: "Alpha" },
    };
    expect(rowSortValue(row, "name")).toBe("Alpha");
    expect(rowSortValue(row, "status")).toBe("new");
    expect(rowSortValue(row, "extra")).toBe("12");
    expect(cellSortText(["Last", "First"])).toBe("Last First");
  });
});
