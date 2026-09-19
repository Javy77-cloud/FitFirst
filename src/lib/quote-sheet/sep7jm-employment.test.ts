import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import { INDUSTRY_OPTIONS } from "@/lib/custom-fields/industry-occupation";
import { MASTER_SHEET_EMPTY_DEFAULTS } from "./sheet-defaults";
import { fieldsForUnit, isRepeatableSheetKey, type RepeatableKind } from "./repeatable-units";
import { APPLICANT_CORE_FIELDS, CO_APPLICANT_FIELDS } from "./applicant-core";
import { APPLICANT_SECTION_FIELD_KEYS } from "@/lib/custom-fields/applicant-fields";
import { CO_APPLICANT_SECTION_FIELD_KEYS } from "@/lib/custom-fields/co-applicant-fields";

describe("Employment removed — Industry + Occupation (sep7jm)", () => {
  it("Auto drivers have industry then occupation and no employment", () => {
    const fields = fieldsForLine("auto");
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
    expect(byKey.driver_1_employment).toBeUndefined();
    expect(byKey.applicant_employment).toBeUndefined();
    expect(byKey.driver_1_industry?.label).toBe("Industry");
    expect(byKey.driver_1_occupation?.label).toBe("Occupation");
    expect(byKey.driver_1_industry?.options).toEqual([...INDUSTRY_OPTIONS]);
    const industryIdx = fields.findIndex((f) => f.key === "driver_1_industry");
    const occupationIdx = fields.findIndex((f) => f.key === "driver_1_occupation");
    expect(industryIdx).toBeGreaterThan(-1);
    expect(occupationIdx).toBe(industryIdx + 1);
  });

  it("repeatable drivers expose industry + occupation, never employment", () => {
    const slots = fieldsForUnit("driver" as RepeatableKind, 1);
    expect(slots.map((s) => s.suffix)).toEqual(expect.arrayContaining(["industry", "occupation"]));
    expect(slots.map((s) => s.suffix)).not.toContain("employment");
    expect(slots.find((s) => s.suffix === "industry")?.label).toBe("Industry");
    expect(slots.find((s) => s.suffix === "occupation")?.label).toBe("Occupation");
    expect(isRepeatableSheetKey("driver_1_industry")).toBe(true);
    expect(isRepeatableSheetKey("driver_2_occupation")).toBe(true);
    expect(isRepeatableSheetKey("driver_1_employment")).toBe(false);
  });

  it("Deal Details + applicant-core have industry then occupation and no employment", () => {
    expect(APPLICANT_SECTION_FIELD_KEYS).not.toContain("applicant_employment");
    expect(APPLICANT_SECTION_FIELD_KEYS.indexOf("applicant_occupation")).toBe(
      APPLICANT_SECTION_FIELD_KEYS.indexOf("applicant_industry") + 1,
    );
    expect(CO_APPLICANT_SECTION_FIELD_KEYS).not.toContain("co_applicant_employment");
    expect(APPLICANT_CORE_FIELDS.some((f) => f.key === "applicant_employment")).toBe(false);
    expect(CO_APPLICANT_FIELDS.some((f) => f.key === "co_applicant_employment")).toBe(false);
    expect(APPLICANT_CORE_FIELDS.find((f) => f.key === "applicant_industry")?.label).toBe("Industry");
    expect(APPLICANT_CORE_FIELDS.find((f) => f.key === "applicant_occupation")?.label).toBe(
      "Occupation",
    );
  });

  it("no empty defaults for removed employment keys", () => {
    expect(MASTER_SHEET_EMPTY_DEFAULTS.applicant_employment).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.driver_1_employment).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.employment).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.employment_status).toBeUndefined();
  });

  it("Home / Auto / Flood / Life / Health / Commercial have no personal employment keys", () => {
    const lines = [
      "auto",
      "home",
      "flood",
      "life",
      "health",
      "general_liability",
      "workers_comp",
      "rec_rv",
    ] as const;
    for (const line of lines) {
      const fields = line === "home" ? fieldsForLine("home", "homeowners") : fieldsForLine(line);
      expect(fields.some((f) => /employment/i.test(f.key) || /employment/i.test(f.label))).toBe(
        false,
      );
    }
    expect(fieldsForLine("rec_rv").some((f) => f.key === "applicant_industry")).toBe(true);
    expect(fieldsForLine("rec_rv").some((f) => f.key === "applicant_occupation")).toBe(true);
    const recIndustry = fieldsForLine("rec_rv").findIndex((f) => f.key === "applicant_industry");
    const recOccupation = fieldsForLine("rec_rv").findIndex((f) => f.key === "applicant_occupation");
    expect(recOccupation).toBe(recIndustry + 1);
    expect(fieldsForLine("workers_comp").some((f) => f.key === "class_code")).toBe(true);
    expect(fieldsForLine("workers_comp").some((f) => f.key === "employee_count")).toBe(true);
  });
});
