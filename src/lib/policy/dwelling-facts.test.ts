import { describe, expect, it } from "vitest";
import { buildLobOverviewSections } from "./lob-overview";
import {
  dwellingFactsFromSheet,
  overviewDwellingSheet,
  parsePropertyYear,
  propertyProtectionWithDwelling,
  resolveDwellingFacts,
} from "./dwelling-facts";

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
      occupancy: null,
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
    expect(facts.occupancy).toBeNull();
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
      occupancy: null,
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
    expect(facts.occupancy).toBeNull();
  });

  it("shows Gloria's sheet year_built and construction on Overview when the risk row is empty", () => {
    const facts = resolveDwellingFacts({
      risk: { yearBuilt: null, construction: null, occupancy: "Owner" },
      sheet: {
        year_built: { value: "2000" },
        construction: { value: "masonry" },
        occupancy: { value: "Owner" },
        construction_type: { value: "" },
      },
    });
    expect(facts.yearBuilt).toBe(2000);
    expect(facts.construction).toBe("Masonry");
    expect(facts.occupancy).toBe("Owner");

    const dwelling =
      buildLobOverviewSections({
        policyId: "03dccdd7-db06-4c89-9b7a-cf0a2064d044",
        lineOfBusiness: "HO3",
        coverageA: 533000,
        yearBuilt: facts.yearBuilt,
        construction: facts.construction,
        occupancy: facts.occupancy,
      }).find((section) => section.id === "dwelling")?.fields ?? [];
    expect(dwelling.find((field) => field.key === "yearBuilt")?.value).toBe("2000");
    expect(dwelling.find((field) => field.key === "construction")?.label).toBe("Construction type");
    expect(dwelling.find((field) => field.key === "construction")?.value).toBe("Masonry");
    expect(dwelling.find((field) => field.key === "occupancy")?.value).toBe("Owner");
  });

  it("shows Occupancy from sheet occupancy when the risk occupancy is blank", () => {
    const facts = resolveDwellingFacts({
      risk: { yearBuilt: null, construction: null, occupancy: null },
      sheet: {
        year_built: { value: "1998" },
        construction: { value: "masonry" },
        occupancy: { value: "Owner" },
      },
    });
    expect(facts.yearBuilt).toBe(1998);
    expect(facts.construction).toBe("Masonry");
    expect(facts.occupancy).toBe("Owner");

    const dwelling =
      buildLobOverviewSections({
        policyId: "49e212ee-94fc-42c8-8877-c36988b0c1f2",
        lineOfBusiness: "HO",
        formType: "HO3",
        coverageA: 442000,
        yearBuilt: facts.yearBuilt,
        construction: facts.construction,
        occupancy: facts.occupancy,
      }).find((section) => section.id === "dwelling")?.fields ?? [];
    expect(dwelling.find((field) => field.key === "yearBuilt")?.value).toBe("1998");
    expect(dwelling.find((field) => field.key === "construction")?.label).toBe("Construction type");
    expect(dwelling.find((field) => field.key === "construction")?.value).toBe("Masonry");
    expect(dwelling.find((field) => field.key === "occupancy")?.label).toBe("Occupancy");
    expect(dwelling.find((field) => field.key === "occupancy")?.value).toBe("Owner");
  });

  it("reads occupancy, year built, and construction for a book policy with no quote sheet", () => {
    const saved = propertyProtectionWithDwelling(null, {
      yearBuilt: 1988,
      construction: "masonry",
      occupancy: "Owner",
      updatedAt: "2026-09-25T22:48:55.000Z",
    });
    const sheet = overviewDwellingSheet({
      sheet: null,
      protection: saved,
      extracted: [
        { fieldKey: "occupancy", normalizedValue: "Tenant", createdAt: "2026-09-25T22:00:00.000Z" },
        { fieldKey: "coverage_a", normalizedValue: "442000", createdAt: "2026-09-25T22:48:55.000Z" },
      ],
    });
    const facts = resolveDwellingFacts({ risk: null, sheet });
    expect(facts.yearBuilt).toBe(1988);
    expect(facts.construction).toBe("Masonry");
    expect(facts.occupancy).toBe("Owner");
    expect(saved?.dwelling).toEqual({
      year_built: "1988",
      construction: "masonry",
      occupancy: "Owner",
    });
  });

  it("fills a blank sheet occupancy from the declaration extract", () => {
    const sheet = overviewDwellingSheet({
      sheet: {
        year_built: { value: "2004" },
        construction: { value: "Frame" },
        occupancy: { value: "" },
      },
      extracted: [
        { fieldKey: "occupancy", normalizedValue: "Owner", createdAt: "2026-09-25T22:48:55.000Z" },
        { fieldKey: "construction_type", normalizedValue: "Masonry", createdAt: "2026-09-25T22:48:55.000Z" },
      ],
    });
    const facts = resolveDwellingFacts({ risk: null, sheet });
    expect(facts.yearBuilt).toBe(2004);
    expect(facts.construction).toBe("Frame");
    expect(facts.occupancy).toBe("Owner");
  });
});
