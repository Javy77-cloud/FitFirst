import { describe, expect, it } from "vitest";
import { dwellingFactsFromSheet, parsePropertyYear, resolveDwellingFacts } from "./dwelling-facts";

describe("dwelling facts from sheet / risk", () => {
  it("parses year built and roof year from the master sheet", () => {
    expect(parsePropertyYear("1998")).toBe(1998);
    expect(parsePropertyYear("roof 2018")).toBe(2018);
    expect(parsePropertyYear("12 years")).toBe(new Date().getUTCFullYear() - 12);
    expect(parsePropertyYear("24", 2026)).toBe(2024);
    expect(parsePropertyYear("'24", 2026)).toBe(2024);
    expect(parsePropertyYear("2024", 2026)).toBe(2024);
    expect(parsePropertyYear("85", 2026)).toBe(1985);
    expect(dwellingFactsFromSheet({
      year_built: { value: "2004" },
      roof_year: { value: "2019" },
      construction: { value: "masonry" },
    })).toEqual({
      yearBuilt: 2004,
      roofYear: 2019,
      construction: "masonry",
    });
  });

  it("falls back to the sheet when Rosa risk is null", () => {
    const facts = resolveDwellingFacts({
      risk: null,
      sheet: {
        year_built: { value: "1992" },
        roof_age: { value: "2014" },
      },
    });
    expect(facts.yearBuilt).toBe(1992);
    expect(facts.roofYear).toBe(2014);
  });

  it("reads Year of Construction when year built is blank on the sheet", () => {
    expect(
      dwellingFactsFromSheet({
        year_of_construction: { value: "24" },
        construction_type: { value: "Masonry" },
      }),
    ).toEqual({
      yearBuilt: 2024,
      roofYear: null,
      construction: "Masonry",
    });
  });

  it("prefers risk values when present", () => {
    const facts = resolveDwellingFacts({
      risk: { yearBuilt: 2001, roofYear: 2010, construction: "CBS" },
      sheet: { year_built: { value: "1992" }, roof_year: { value: "2014" } },
    });
    expect(facts.yearBuilt).toBe(2001);
    expect(facts.roofYear).toBe(2010);
    expect(facts.construction).toBe("CBS");
  });
});
