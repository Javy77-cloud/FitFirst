import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LobOverviewSections } from "@/components/policy/lob-overview-sections";
import {
  buildLobOverviewSections,
  resolveLobOverviewFamily,
} from "./lob-overview";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) =>
    createElement("a", { href }, children),
}));

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
    expect(dwelling.map((f) => f.key)).toEqual(["coverageA", "yearBuilt", "occupancy"]);
    expect(dwelling.find((f) => f.key === "yearBuilt")?.label).toBe("Year built");
    expect(dwelling.find((f) => f.key === "yearBuilt")?.value).toBe("1992");
    expect(dwelling.find((f) => f.key === "occupancy")?.label).toBe("Occupancy");
    expect(dwelling.find((f) => f.key === "occupancy")?.value).toBe("—");
    expect(dwelling.some((f) => f.key === "construction" || f.label === "Construction")).toBe(false);
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
    expect(dwelling.find((f) => f.key === "yearBuilt")?.label).toBe("Year built");
    expect(dwelling.find((f) => f.key === "yearBuilt")?.value).toBe("2024");
    expect(dwelling.some((f) => f.label === "Year of Construction")).toBe(false);
    expect(dwelling.some((f) => f.key === "construction" || f.label === "Construction")).toBe(false);
    expect(dwelling.some((f) => f.value === "Masonry")).toBe(false);
    expect(dwelling.find((f) => f.key === "roofYear")?.value).toBe("2024");
    expect(dwelling.find((f) => f.key === "occupancy")?.label).toBe("Occupancy");
    expect(dwelling.find((f) => f.key === "occupancy")?.value).toBe("Owner");
    expect(dwelling.find((f) => f.key === "dwellingType")?.label).toBe("Dwelling type");
    expect(dwelling.find((f) => f.key === "dwellingType")?.value).toBe("Single Family");
    expect(dwelling.find((f) => f.key === "typeOfResidence")?.value).toBe("Owner Occupied");
    expect(dwelling.find((f) => f.key === "monthsOccupied")?.value).toBe("9 to 12 Months");
    expect(dwelling.find((f) => f.key === "occupancy")?.hint).toBeUndefined();
    expect(dwelling.every((f) => !f.hint)).toBe(true);

    const html = renderToStaticMarkup(
      createElement(LobOverviewSections, {
        input: {
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
        },
      }),
    );
    expect(html).toContain("Year built");
    expect(html).toContain("2024");
    expect(html).toContain("Occupancy");
    expect(html).toContain("Owner");
    expect(html).toContain("Dwelling type");
    expect(html).toContain("Single Family");
    expect(html).not.toContain("Year of Construction");
    expect(html).not.toContain(">Construction<");
    expect(html).not.toContain("Masonry");
    expect(html).not.toContain("Not on file");
    expect(html).toContain("sm:grid-cols-2 lg:grid-cols-3");
    expect(html).not.toContain("1fr");
  });

  it("normalizes Owner Occupied and Tenant into the occupancy slot", () => {
    const fromResidence = buildLobOverviewSections({
      policyId: "p1",
      lineOfBusiness: "HO3",
      typeOfResidence: "Owner Occupied",
    });
    const residenceFields = fromResidence.find((s) => s.id === "dwelling")?.fields ?? [];
    expect(residenceFields.find((f) => f.key === "occupancy")?.value).toBe("Owner");
    expect(residenceFields.find((f) => f.key === "typeOfResidence")?.value).toBe("Owner Occupied");

    const tenant = buildLobOverviewSections({
      policyId: "p1",
      lineOfBusiness: "HO3",
      occupancy: "Tenant",
      typeOfResidence: "Owner Occupied",
    });
    expect(
      tenant.find((s) => s.id === "dwelling")?.fields.find((f) => f.key === "occupancy")?.value,
    ).toBe("Tenant");

    const printed = buildLobOverviewSections({
      policyId: "p1",
      lineOfBusiness: "HO3",
      occupancy: "Owner Occupied",
    });
    expect(
      printed.find((s) => s.id === "dwelling")?.fields.find((f) => f.key === "occupancy")?.value,
    ).toBe("Owner");
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
