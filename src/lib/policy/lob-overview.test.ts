import { describe, expect, it } from "vitest";
import {
  buildLobOverviewSections,
  resolveLobOverviewFamily,
} from "./lob-overview";

describe("LOB overview templates", () => {
  it("maps lines to families", () => {
    expect(resolveLobOverviewFamily({ lineOfBusiness: "PA" })).toBe("auto");
    expect(resolveLobOverviewFamily({ lineOfBusiness: "HO3" })).toBe("homeowners");
    expect(resolveLobOverviewFamily({ lineOfBusiness: "LIFE", insuranceType: "Life" })).toBe(
      "life",
    );
    expect(resolveLobOverviewFamily({ lineOfBusiness: "HEALTH" })).toBe("health");
    expect(resolveLobOverviewFamily({ lineOfBusiness: "WC" })).toBe("wc");
    expect(resolveLobOverviewFamily({ lineOfBusiness: "GL" })).toBe("gl");
    expect(resolveLobOverviewFamily({ lineOfBusiness: "BOP" })).toBe("bop");
    expect(
      resolveLobOverviewFamily({
        lineOfBusiness: "GL",
        formType: "Errors & Omissions",
        policySubType: "Errors & Omissions",
      }),
    ).toBe("gl");
  });

  it("homeowners keeps dwelling open and leaves roof to the collapsed inspection block", () => {
    const sections = buildLobOverviewSections({
      policyId: "p1",
      lineOfBusiness: "HO3",
      coverageA: 321000,
      yearBuilt: 1992,
      mortgageeCount: 0,
    });
    expect(sections.map((s) => s.id)).toEqual(["dwelling", "mortgagee"]);
    expect(sections.find((s) => s.id === "mortgagee")?.pointer?.href).toContain("tab=coverage");
    const dwelling = sections.find((s) => s.id === "dwelling")?.fields ?? [];
    expect(dwelling.map((f) => f.key)).toEqual(["coverageA", "yearBuilt", "construction"]);
    expect(dwelling.find((f) => f.key === "yearBuilt")?.value).toBe("1992");
    expect(dwelling.some((f) => f.key === "premises" || f.key === "roofYear")).toBe(false);
  });

  it("shows printed rating facts on the dwelling section", () => {
    const sections = buildLobOverviewSections({
      policyId: "p1",
      lineOfBusiness: "HO3",
      coverageA: 337000,
      yearBuilt: 2024,
      roofYear: 2024,
      construction: "Masonry",
      occupancy: "Owner",
      dwellingType: "Single Family",
      typeOfResidence: "Owner Occupied",
      monthsOccupied: "9 to 12 Months",
    });
    const dwelling = sections.find((s) => s.id === "dwelling")?.fields ?? [];
    expect(dwelling.find((f) => f.key === "construction")?.value).toBe("Masonry");
    expect(dwelling.find((f) => f.key === "yearBuilt")?.value).toBe("2024");
    expect(dwelling.find((f) => f.key === "roofYear")?.value).toBe("2024");
    expect(dwelling.find((f) => f.key === "occupancy")?.label).toBe("Occupancy");
    expect(dwelling.find((f) => f.key === "occupancy")?.value).toBe("Owner");
    expect(dwelling.find((f) => f.key === "dwellingType")?.value).toBe("Single Family");
    expect(dwelling.find((f) => f.key === "typeOfResidence")?.value).toBe("Owner Occupied");
    expect(dwelling.find((f) => f.key === "monthsOccupied")?.value).toBe("9 to 12 Months");
    expect(dwelling.find((f) => f.key === "occupancy")?.hint).toBeUndefined();
  });

  it("treats DP, manufactured home, and rentals as home lines", () => {
    expect(resolveLobOverviewFamily({ lineOfBusiness: "DP3" })).toBe("homeowners");
    expect(resolveLobOverviewFamily({ lineOfBusiness: "HO4" })).toBe("homeowners");
    expect(resolveLobOverviewFamily({ lineOfBusiness: "MHO" })).toBe("homeowners");
    expect(resolveLobOverviewFamily({ lineOfBusiness: "RENTERS" })).toBe("homeowners");
    expect(resolveLobOverviewFamily({ lineOfBusiness: "LANDLORD" })).toBe("homeowners");
    expect(resolveLobOverviewFamily({ formType: "Manufactured Home", lineOfBusiness: "HO" })).toBe(
      "homeowners",
    );
    expect(resolveLobOverviewFamily({ formType: "Dwelling Fire", lineOfBusiness: "DP" })).toBe(
      "homeowners",
    );
    expect(
      resolveLobOverviewFamily({
        lineOfBusiness: "HEALTH",
        policySubType: "HMO",
        insuranceType: "Health",
      }),
    ).toBe("health");
  });

  it("life shows honest empties for beneficiary and riders", () => {
    const sections = buildLobOverviewSections({
      policyId: "p1",
      lineOfBusiness: "LIFE",
      insuranceType: "Life",
      faceAmount: "250000",
    });
    const life = sections[0];
    expect(life.title).toBe("Life");
    expect(life.fields.find((f) => f.key === "beneficiary")?.empty).toBe(true);
    expect(life.fields.find((f) => f.key === "faceAmount")?.empty).toBe(false);
    expect(life.fields.find((f) => f.key === "riders")?.empty).toBe(true);
  });

  it("wc pulls class code and payroll from account when present", () => {
    const sections = buildLobOverviewSections({
      policyId: "p1",
      lineOfBusiness: "WC",
      account: { wcClassCode: "8742", payrollTotal: "1200000" },
    });
    const wc = sections[0].fields;
    expect(wc.find((f) => f.key === "classCodes")?.value).toBe("8742");
    expect(wc.find((f) => f.key === "payroll")?.empty).toBe(false);
    expect(wc.find((f) => f.key === "emod")?.empty).toBe(true);
  });
});
