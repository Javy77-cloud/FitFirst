import { describe, expect, it } from "vitest";
import { sheetForLine } from "./sheet-for-line";

describe("sheetForLine", () => {
  it("returns the requested line and never the first sheet of another line", () => {
    const sheets = [
      { line: "auto", id: "auto-1" },
      { line: "home", id: "home-1" },
    ];
    expect(sheetForLine(sheets, "home")?.id).toBe("home-1");
    expect(sheetForLine(sheets, "auto")?.id).toBe("auto-1");
    expect(sheetForLine(sheets, "flood")).toBeNull();
  });
});
