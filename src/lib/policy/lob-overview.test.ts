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
  });

  it("homeowners shows dwelling, roof, mortgagee pointer", () => {
    const sections = buildLobOverviewSections({
      policyId: "p1",
      lineOfBusiness: "HO3",
      coverageA: 321000,
      yearBuilt: 1992,
      roofYear: 2018,
      mortgageeCount: 0,
    });
    expect(sections.map((s) => s.id)).toEqual(["dwelling", "roof", "mortgagee"]);
    expect(sections.find((s) => s.id === "mortgagee")?.pointer?.href).toContain("tab=coverage");
    const dwelling = sections.find((s) => s.id === "dwelling")?.fields ?? [];
    expect(dwelling.map((f) => f.key)).toEqual(["coverageA", "yearBuilt", "construction"]);
    expect(dwelling.find((f) => f.key === "yearBuilt")?.value).toBe("1992");
    expect(dwelling.some((f) => f.key === "premises")).toBe(false);
    const roof = sections.find((s) => s.id === "roof")?.fields.find((f) => f.key === "roofAge");
    expect(roof?.empty).toBe(false);
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
