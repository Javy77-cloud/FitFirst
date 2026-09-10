import { describe, expect, it } from "vitest";
import { SHEET_GROUP_HEADER_STYLE, sheetGroupHeaderClass } from "./sheet-group-style";

describe("sheet group header theme", () => {
  it("uses Old Glory blue + white", () => {
    expect(sheetGroupHeaderClass("Vehicle")).toBe("ff-sheet-group-header");
    expect(SHEET_GROUP_HEADER_STYLE.backgroundColor).toBe("#002868");
    expect(SHEET_GROUP_HEADER_STYLE.color).toBe("#ffffff");
  });
});
