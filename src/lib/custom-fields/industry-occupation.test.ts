import { describe, expect, it } from "vitest";
import {
  INDUSTRY_OPTIONS,
  INDUSTRY_RETIRE,
  isIndustryCascadeParent,
  isOccupationCascadeChild,
  occupationIndustryParentKey,
  occupationsForIndustry,
} from "./industry-occupation";

describe("industry → occupation cascade", () => {
  it("lists QuoteRush industry labels in audit order", () => {
    expect(INDUSTRY_OPTIONS[0]).toBe("Agriculture / Forestry / Fishing");
    expect(INDUSTRY_OPTIONS).toContain("Retire");
    expect(INDUSTRY_OPTIONS).toContain("Other");
    expect(INDUSTRY_OPTIONS.at(-1)).toBe("Other");
  });

  it("locks Retire → Retire only", () => {
    expect(occupationsForIndustry(INDUSTRY_RETIRE)).toEqual(["Retire"]);
  });

  it("uses Javy agriculture + art lists and fills remaining industries", () => {
    expect(occupationsForIndustry("Agriculture / Forestry / Fishing")).toEqual(
      expect.arrayContaining(["Farm Ranch Owner", "Landscaper", "Logger", "Other"]),
    );
    expect(occupationsForIndustry("Art / Design / Media")).toEqual(
      expect.arrayContaining(["Actor", "Designer", "Journalist or Reporter", "Other"]),
    );
    expect(occupationsForIndustry("Information Technology")).toEqual(
      expect.arrayContaining(["Software Developer", "Help Desk", "Other"]),
    );
    expect(occupationsForIndustry("Unemployed")).toEqual(["Unemployed"]);
    expect(occupationsForIndustry("Student")).toEqual(["Student"]);
    expect(occupationsForIndustry("")).toEqual([]);
    expect(occupationsForIndustry("Not a real industry")).toEqual(["Other"]);
  });

  it("maps applicant, co-applicant, and driver occupation keys to industry", () => {
    expect(occupationIndustryParentKey("applicant_occupation")).toBe("applicant_industry");
    expect(occupationIndustryParentKey("co_applicant_occupation")).toBe("co_applicant_industry");
    expect(occupationIndustryParentKey("driver_2_occupation")).toBe("driver_2_industry");
    expect(occupationIndustryParentKey("applicant_employment")).toBeNull();
    expect(isOccupationCascadeChild("applicant_occupation")).toBe(true);
    expect(isIndustryCascadeParent("applicant_industry")).toBe(true);
    expect(isIndustryCascadeParent("driver_1_industry")).toBe(true);
  });
});
