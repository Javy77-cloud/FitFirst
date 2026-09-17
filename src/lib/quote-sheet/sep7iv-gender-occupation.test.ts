import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import { GENDER_OPTIONS, OCCUPATION_OPTIONS } from "./applicant-core";
import { MASTER_SHEET_EMPTY_DEFAULTS, normalizeGender } from "./sheet-defaults";
import { fieldsForUnit, isRepeatableSheetKey, type RepeatableKind } from "./repeatable-units";

describe("Auto gender + occupation picklists (sep7iv)", () => {
  it("driver_1 gender is Male/Female only; applicant gender stays on Deal Details", () => {
    const fields = fieldsForLine("auto");
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
    expect(byKey.applicant_gender).toBeUndefined();
    expect(byKey.driver_1_gender?.options).toEqual(["Male", "Female"]);
    expect([...GENDER_OPTIONS]).toEqual(["Male", "Female"]);
    expect(normalizeGender("M")).toBe("Male");
    expect(normalizeGender("f")).toBe("Female");
  });

  it("driver_1 occupation uses portal-mapped FL/Allstate categories", () => {
    const fields = fieldsForLine("auto");
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
    expect(byKey.applicant_occupation).toBeUndefined();
    expect(byKey.driver_1_occupation?.input).toBe("select");
    expect(byKey.driver_1_occupation?.options).toEqual([...OCCUPATION_OPTIONS]);
    expect(OCCUPATION_OPTIONS).toContain("Employed");
    expect(OCCUPATION_OPTIONS).toContain("Administrative");
    expect(OCCUPATION_OPTIONS).toContain("Professional");
    expect(OCCUPATION_OPTIONS.at(-1)).toBe("Other");
  });

  it("no empty defaults for gender/occupation (Heather left blank)", () => {
    expect(MASTER_SHEET_EMPTY_DEFAULTS.applicant_gender).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.driver_1_gender).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.applicant_occupation).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.driver_1_occupation).toBeUndefined();
  });

  it("repeatable drivers expose gender + occupation", () => {
    const slots = fieldsForUnit("driver" as RepeatableKind, 1);
    expect(slots.map((s) => s.suffix)).toEqual(
      expect.arrayContaining(["gender", "occupation"]),
    );
    expect(slots.find((s) => s.suffix === "gender")?.options).toEqual([...GENDER_OPTIONS]);
    expect(isRepeatableSheetKey("driver_2_gender")).toBe(true);
    expect(isRepeatableSheetKey("driver_3_occupation")).toBe(true);
  });
});
