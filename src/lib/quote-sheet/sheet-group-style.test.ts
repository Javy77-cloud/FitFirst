import { describe, expect, it } from "vitest";
import { isEmphasizedSheetGroup, sheetGroupHeaderClass } from "./sheet-group-style";

describe("sheet group header emphasis", () => {
  it("flags Roof / Wind / 4-point / Dwelling groups", () => {
    expect(isEmphasizedSheetGroup("Roof / wind")).toBe(true);
    expect(isEmphasizedSheetGroup("4-point")).toBe(true);
    expect(isEmphasizedSheetGroup("Dwelling")).toBe(true);
    expect(isEmphasizedSheetGroup("Coverages")).toBe(false);
    expect(isEmphasizedSheetGroup("Hazards")).toBe(false);
  });

  it("paints every section header black on white", () => {
    expect(sheetGroupHeaderClass("Roof / wind")).toBe("ff-sheet-group-header");
    expect(sheetGroupHeaderClass("Protection")).toBe("ff-sheet-group-header");
  });
});
