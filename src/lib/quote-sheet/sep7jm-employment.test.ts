import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import { EMPLOYMENT_STATUS_OPTIONS, OCCUPATION_OPTIONS } from "./applicant-core";
import { MASTER_SHEET_EMPTY_DEFAULTS } from "./sheet-defaults";
import { fieldsForUnit, isRepeatableSheetKey, type RepeatableKind } from "./repeatable-units";

describe("Auto employment picklist (sep7jm / Progressive Employment)", () => {
  it("fieldsForLine(auto) includes applicant_employment + driver_1_employment", () => {
    const fields = fieldsForLine("auto");
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));

    expect(byKey.applicant_employment?.label).toBe("Employment");
    expect(byKey.applicant_employment?.group).toBe("Applicant");
    expect(byKey.applicant_employment?.input).toBe("select");
    expect(byKey.applicant_employment?.options).toEqual([...EMPLOYMENT_STATUS_OPTIONS]);

    expect(byKey.driver_1_employment?.label).toBe("Driver 1 employment");
    expect(byKey.driver_1_employment?.group).toBe("Drivers");
    expect(byKey.driver_1_employment?.input).toBe("select");
    expect(byKey.driver_1_employment?.options).toEqual([...EMPLOYMENT_STATUS_OPTIONS]);
  });

  it("does not reuse applicant_occupation for Progressive Employment", () => {
    const fields = fieldsForLine("auto");
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
    // Occupation stays (Allstate-style status+job mix); Employment is Progressive status-only.
    expect(byKey.applicant_occupation).toBeDefined();
    expect(byKey.applicant_occupation?.label).toBe("Occupation / job category");
    expect(byKey.applicant_occupation?.options).toEqual([...OCCUPATION_OPTIONS]);
    expect(byKey.applicant_employment?.key).toBe("applicant_employment");
    expect(EMPLOYMENT_STATUS_OPTIONS).not.toEqual(OCCUPATION_OPTIONS);
  });

  it("employment options are Progressive-like status categories", () => {
    expect([...EMPLOYMENT_STATUS_OPTIONS]).toEqual([
      "Employed",
      "Self-employed",
      "Retired",
      "Homemaker",
      "Student",
      "Unemployed",
      "Disabled",
      "Military",
      "Other",
    ]);
  });

  it("no empty defaults (Heather left blank — waiting on Javy)", () => {
    expect(MASTER_SHEET_EMPTY_DEFAULTS.applicant_employment).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.driver_1_employment).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.employment).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.employment_status).toBeUndefined();
  });

  it("repeatable drivers expose employment", () => {
    const slots = fieldsForUnit("driver" as RepeatableKind, 1);
    expect(slots.map((s) => s.suffix)).toEqual(expect.arrayContaining(["employment"]));
    expect(slots.find((s) => s.suffix === "employment")?.options).toEqual([
      ...EMPLOYMENT_STATUS_OPTIONS,
    ]);
    expect(isRepeatableSheetKey("driver_1_employment")).toBe(true);
    expect(isRepeatableSheetKey("driver_2_employment")).toBe(true);
  });

  it("applicant_employment is on all LOBs via APPLICANT_CORE", () => {
    for (const line of ["auto", "home", "flood"] as const) {
      const fields =
        line === "home" ? fieldsForLine("home", "homeowners") : fieldsForLine(line);
      expect(fields.some((f) => f.key === "applicant_employment")).toBe(true);
    }
    expect(fieldsForLine("home", "homeowners").some((f) => f.key === "driver_1_employment")).toBe(
      false,
    );
  });
});
