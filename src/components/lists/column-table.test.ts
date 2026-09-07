import { describe, expect, it } from "vitest";
import { sheetAttr } from "@/lib/desk/sheet-attr";
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
    expect(sheetAttr(rowSortValue(row, "missing"))).toBe("");
    expect(sheetAttr(null)).toBe("");
  });

  it("keeps an explicit empty sort string so action cells hydrate the same on server and client", () => {
    const row: ColumnRow = {
      key: "deal-1",
      cells: { comms: "Send quote Bind policy", pick: "on" },
      sort: { comms: "", pick: "" },
    };
    expect(rowSortValue(row, "comms")).toBe("");
    expect(rowSortValue(row, "pick")).toBe("");
    expect(sheetAttr(rowSortValue(row, "comms"))).toBe("");
  });
});
