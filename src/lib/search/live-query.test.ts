import { describe, expect, it } from "vitest";
import { haystack, kindLabel, matchesContains } from "./live-query";

describe("live contains match", () => {
  it("matches a substring across joined fields", () => {
    expect(matchesContains("len", "Elena", "Ruiz")).toBe(true);
    expect(matchesContains("321-555", "Elena", "321-555-0100")).toBe(true);
    expect(matchesContains("heritage", "HO3-ELENA-2026", "Heritage")).toBe(true);
    expect(matchesContains("miami", "Elena", "Palm Bay")).toBe(false);
  });

  it("empty query keeps every row", () => {
    expect(matchesContains("", "Elena")).toBe(true);
    expect(matchesContains("   ")).toBe(true);
  });

  it("builds a haystack and labels kinds", () => {
    expect(haystack(["Elena", null, "Ruiz", ""])).toBe("Elena Ruiz");
    expect(kindLabel("carrier")).toBe("Carrier");
    expect(kindLabel("business")).toBe("Business");
  });
});
