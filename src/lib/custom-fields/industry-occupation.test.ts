import { describe, expect, it } from "vitest";
import {
  INDUSTRY_OPTIONS,
  INDUSTRY_RETIRE,
  isIndustryCascadeParent,
  isOccupationCascadeChild,
  occupationIndustryParentKey,
  occupationValueAfterIndustryChange,
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
    expect(occupationsForIndustry("Retired")).toEqual(["Retire"]);
  });

  it("uses Javy 2026-09-16 locked lists and aliases his section titles", () => {
    expect(occupationsForIndustry("Agriculture / Forestry / Fishing")).toEqual([
      "Farmworker",
      "Rancher",
      "Logger",
      "Fisher",
      "Agricultural Inspector",
      "Forester",
      "Greenhouse Manager",
      "Animal Breeder",
      "Logging Equipment Operator",
      "Farm Equipment Operator",
      "Aquaculture Technician",
      "Crop Scout",
      "Forest Conservation Worker",
      "Agricultural Sales Rep",
      "Irrigation Specialist",
      "Other",
    ]);
    expect(occupationsForIndustry("Agriculture, Forestry, Fishing")).toEqual(
      occupationsForIndustry("Agriculture / Forestry / Fishing"),
    );
    expect(occupationsForIndustry("Art / Design / Media")).toEqual(
      expect.arrayContaining(["Graphic Designer", "UX/UI Designer", "Copywriter", "Other"]),
    );
    expect(occupationsForIndustry("Art, Design, Media")).toEqual(
      occupationsForIndustry("Art / Design / Media"),
    );
    expect(occupationsForIndustry("Information Technology")).toEqual(
      expect.arrayContaining(["Software Developer", "Help Desk Technician", "Other"]),
    );
    expect(occupationsForIndustry("Insurance")).toEqual(
      expect.arrayContaining(["Claims Adjuster", "Insurance Agent", "Actuary", "Other"]),
    );
    expect(occupationsForIndustry("Unemployed")).toEqual(["Unemployed"]);
    expect(occupationsForIndustry("Student")).toEqual(["Student"]);
    expect(occupationsForIndustry("")).toEqual([]);
    expect(occupationsForIndustry("Agriculture/Forestry/Fishing")).toEqual(
      occupationsForIndustry("Agriculture / Forestry / Fishing"),
    );
    expect(occupationsForIndustry("Other")).toEqual([
      "Retired",
      "Student",
      "Homemaker",
      "Unemployed",
      "Self-Employed",
      "Volunteer",
      "Caregiver",
      "Entrepreneur",
      "Consultant",
      "Freelancer",
    ]);
    expect(occupationsForIndustry("Not a real industry")).toEqual(
      occupationsForIndustry("Other"),
    );
  });

  it("clears occupation when it is not on the new industry list", () => {
    expect(occupationValueAfterIndustryChange("Retire", "Farmworker")).toBe("");
    expect(occupationValueAfterIndustryChange("Agriculture / Forestry / Fishing", "Farmworker")).toBe(
      "Farmworker",
    );
    expect(occupationValueAfterIndustryChange("Information Technology", "Farmworker")).toBe("");
    expect(occupationValueAfterIndustryChange("Other", "Student")).toBe("Student");
  });

  it("keeps industries Javy did not paste on a short subset or status lock", () => {
    expect(occupationsForIndustry("Business / Sales / Office")).toEqual(
      expect.arrayContaining(["Sales Representative", "Office Manager", "Other"]),
    );
    expect(occupationsForIndustry("Home / Homemaker / Houseperson")).toEqual(
      expect.arrayContaining(["Homemaker", "Houseperson"]),
    );
    expect(occupationsForIndustry("Disabled")).toEqual(["Disabled"]);
    expect(occupationsForIndustry("Sports and Recreation")).toEqual(
      expect.arrayContaining(["Coach", "Fitness Instructor", "Other"]),
    );
    expect(occupationsForIndustry("Travel / Transportation / Warehousing")).toEqual(
      expect.arrayContaining(["Truck Driver", "Warehouse Worker", "Other"]),
    );
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
