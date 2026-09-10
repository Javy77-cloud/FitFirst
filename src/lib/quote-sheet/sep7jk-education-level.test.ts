import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import { EDUCATION_LEVEL_OPTIONS } from "./applicant-core";
import { MASTER_SHEET_EMPTY_DEFAULTS } from "./sheet-defaults";
import { fieldsForUnit, isRepeatableSheetKey, type RepeatableKind } from "./repeatable-units";

describe("Auto education level picklist (sep7jk / Geico standing)", () => {
  it("fieldsForLine(auto) includes applicant_education_level + driver_1_education_level", () => {
    const fields = fieldsForLine("auto");
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));

    expect(byKey.applicant_education_level?.label).toBe("Education level");
    expect(byKey.applicant_education_level?.group).toBe("Applicant");
    expect(byKey.applicant_education_level?.input).toBe("select");
    expect(byKey.applicant_education_level?.options).toEqual([...EDUCATION_LEVEL_OPTIONS]);

    expect(byKey.driver_1_education_level?.label).toBe("Driver 1 education level");
    expect(byKey.driver_1_education_level?.group).toBe("Drivers");
    expect(byKey.driver_1_education_level?.input).toBe("select");
    expect(byKey.driver_1_education_level?.options).toEqual([...EDUCATION_LEVEL_OPTIONS]);
  });

  it("education options are Geico-like FL Auto portal levels", () => {
    expect([...EDUCATION_LEVEL_OPTIONS]).toEqual([
      "Less than high school",
      "High school",
      "Some college",
      "Associate",
      "Bachelor",
      "Master",
      "Doctorate",
      "Trade/vocational",
    ]);
  });

  it("no empty defaults (Heather left blank — waiting on Javy)", () => {
    expect(MASTER_SHEET_EMPTY_DEFAULTS.applicant_education_level).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.driver_1_education_level).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.education_level).toBeUndefined();
  });

  it("repeatable drivers expose education_level", () => {
    const slots = fieldsForUnit("driver" as RepeatableKind, 1);
    expect(slots.map((s) => s.suffix)).toEqual(expect.arrayContaining(["education_level"]));
    expect(slots.find((s) => s.suffix === "education_level")?.options).toEqual([
      ...EDUCATION_LEVEL_OPTIONS,
    ]);
    expect(isRepeatableSheetKey("driver_1_education_level")).toBe(true);
    expect(isRepeatableSheetKey("driver_2_education_level")).toBe(true);
  });

  it("applicant_education_level is on all LOBs via APPLICANT_CORE", () => {
    for (const line of ["auto", "home", "flood"] as const) {
      const fields =
        line === "home" ? fieldsForLine("home", "homeowners") : fieldsForLine(line);
      expect(fields.some((f) => f.key === "applicant_education_level")).toBe(true);
    }
    expect(fieldsForLine("home", "homeowners").some((f) => f.key === "driver_1_education_level")).toBe(
      false,
    );
  });
});
