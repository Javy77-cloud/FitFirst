import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import { AUTO_HOUSEHOLD_EXCLUDE_REASON_OPTIONS } from "./sheet-defaults";
import { fieldsForUnit, isRepeatableSheetKey, type RepeatableKind } from "./repeatable-units";

describe("Auto exclusion fields live on drivers (sep7iu)", () => {
  it("catalog exposes Non-Rated/Excluded picklists on driver_1, not household_1", () => {
    const fields = fieldsForLine("auto");
    expect(fields.find((f) => f.key === "household_1_exclude_reason")).toBeUndefined();
    expect(fields.find((f) => f.key === "household_1_separate_auto_policy")).toBeUndefined();
    expect(fields.find((f) => f.key === "household_1_separate_policy_status")).toBeUndefined();
    const reason = fields.find((f) => f.key === "driver_1_exclude_reason");
    expect(reason?.options).toEqual([...AUTO_HOUSEHOLD_EXCLUDE_REASON_OPTIONS]);
    expect(fields.some((f) => f.key === "driver_1_age_first_licensed")).toBe(true);
    expect(fields.find((f) => f.key === "driver_1_suspension_5yr")?.options).toEqual(["yes", "no"]);
  });

  it("repeatable drivers expose exclusion suffixes", () => {
    const slots = fieldsForUnit("driver" as RepeatableKind, 2);
    expect(slots.map((s) => s.key)).toContain("driver_2_exclude_reason");
    expect(slots.map((s) => s.key)).toContain("driver_2_suspension_5yr");
    expect(isRepeatableSheetKey("driver_3_exclude_reason")).toBe(true);
    expect(isRepeatableSheetKey("driver_4_age_first_licensed")).toBe(true);
    expect(isRepeatableSheetKey("household_1_separate_policy_status")).toBe(true);
  });
});
