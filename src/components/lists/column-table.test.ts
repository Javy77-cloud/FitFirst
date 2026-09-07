import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { sheetAttr, sheetCellProps } from "@/lib/desk/sheet-attr";
import { TagChips } from "@/components/tags/tag-chips";
import { tagSortText } from "@/lib/tags/module-tags";
import { cellSortText, rowSortValue, type ColumnRow } from "./column-table";

describe("shared list table sort values", () => {
  it("reads explicit sort keys and falls back to primitive cell text", () => {
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

  it("does not walk TagChips trees — SSR children are empty, CSR expands to High Risk", () => {
    const chips = createElement(TagChips, { tags: ["high-risk"] });
    const expanded = createElement(
      "span",
      { "data-ff-tag-chips": "" },
      createElement("span", { "data-ff-tag-chip": "high-risk" }, "High Risk"),
    );
    expect(cellSortText(chips)).toBe("");
    expect(cellSortText(expanded)).toBe("");
    const withoutSort: ColumnRow = { key: "1", cells: { tags: chips } };
    expect(rowSortValue(withoutSort, "tags")).toBe("");
    expect(sheetAttr(rowSortValue(withoutSort, "tags"))).toBe("");
    const withSort: ColumnRow = {
      key: "1",
      cells: { tags: chips },
      sort: { tags: tagSortText(["high-risk"]) },
    };
    expect(rowSortValue(withSort, "tags")).toBe("High Risk");
    expect(sheetAttr(rowSortValue(withSort, "tags"))).toBe("High Risk");
    expect(sheetCellProps("deals", rowSortValue(withSort, "tags"))["data-sheet-cell"]).toBe(
      "High Risk",
    );
  });
});
