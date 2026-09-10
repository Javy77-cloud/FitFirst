import { describe, expect, it } from "vitest";
import {
  SHEET_GROUP_HEADER_STYLE,
  isEmphasizedSheetGroup,
  sheetGroupHeaderClass,
} from "./sheet-group-style";

describe("sheet group header emphasis", () => {
  it("flags Roof / Wind / 4-point / Dwelling groups", () => {
    expect(isEmphasizedSheetGroup("Roof / wind")).toBe(true);
    expect(isEmphasizedSheetGroup("Dwelling")).toBe(true);
    expect(isEmphasizedSheetGroup("Vehicle")).toBe(false);
  });

  it("paints every section header black on white", () => {
    expect(sheetGroupHeaderClass("Vehicle")).toBe("ff-sheet-group-header");
    expect(sheetGroupHeaderClass("Drivers")).toBe("ff-sheet-group-header");
    expect(SHEET_GROUP_HEADER_STYLE).toEqual({ backgroundColor: "#ffffff", color: "#000000" });
  });
});
