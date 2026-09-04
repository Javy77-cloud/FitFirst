import { describe, expect, it } from "vitest";
import { sheetIndexValue } from "./sheet-index";

describe("sheetIndexValue", () => {
  it("uses the map index when React did not set one", () => {
    expect(sheetIndexValue(undefined, 0)).toBe("0");
    expect(sheetIndexValue(null, 2)).toBe("2");
    expect(sheetIndexValue("", 4)).toBe("4");
  });

  it("keeps a server-rendered index, including zero", () => {
    expect(sheetIndexValue("0", 9)).toBe("0");
    expect(sheetIndexValue(0, 9)).toBe("0");
    expect(sheetIndexValue("3", 0)).toBe("3");
  });
});
