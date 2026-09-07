import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("master sheet source column", () => {
  it("shows the source document tag, not the pulled question text", () => {
    const sheet = readFileSync("src/components/deal/master-sheet-compare.tsx", "utf8");
    expect(sheet).toMatch(/data-ff-sheet-source/);
    expect(sheet).toMatch(/sourceTag/);
    expect(sheet).not.toMatch(/extracted\?\.normalizedValue \|\| extracted\?\.rawValue/);
    expect(sheet).toMatch(/Confirm extracted/);
  });
});
