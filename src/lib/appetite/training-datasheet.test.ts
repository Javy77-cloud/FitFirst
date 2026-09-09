import { describe, expect, it } from "vitest";
import {
  DEFAULT_APPETITE_LINE,
  filtersToSearchParams,
  lineOfBusinessValuesForSheet,
  normalizeAppetiteLine,
  parseAppetiteDatasheetFilters,
} from "./training-datasheet";

describe("appetite training line partition", () => {
  it("defaults to Home (HO)", () => {
    expect(normalizeAppetiteLine(undefined)).toBe("HO");
    expect(normalizeAppetiteLine("")).toBe(DEFAULT_APPETITE_LINE);
    expect(parseAppetiteDatasheetFilters({}).line).toBe("HO");
  });

  it("maps aliases onto the right sheet", () => {
    expect(normalizeAppetiteLine("HO3")).toBe("HO");
    expect(normalizeAppetiteLine("homeowners")).toBe("HO");
    expect(normalizeAppetiteLine("PA")).toBe("AUTO");
    expect(normalizeAppetiteLine("boat")).toBe("BOAT");
    expect(normalizeAppetiteLine("NFIP")).toBe("FLOOD");
    expect(normalizeAppetiteLine("RV")).toBe("RV");
  });

  it("exposes line_of_business values for SQL filter", () => {
    expect(lineOfBusinessValuesForSheet("HO")).toContain("HO");
    expect(lineOfBusinessValuesForSheet("HO")).toContain("HO3");
    expect(lineOfBusinessValuesForSheet("AUTO")).toContain("AUTO");
  });

  it("always puts line in search params", () => {
    expect(filtersToSearchParams({ line: "AUTO" })).toBe("?line=AUTO");
    expect(filtersToSearchParams(parseAppetiteDatasheetFilters({ line: "flood", county: "Lee" }))).toContain(
      "line=FLOOD",
    );
  });
});
