import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import {
  AUTO_HOUSEHOLD_EXCLUDE_REASON_OPTIONS,
  AUTO_HOUSEHOLD_SEPARATE_POLICY_STATUS_OPTIONS,
  YES_NO_OPTIONS,
} from "./sheet-defaults";
import { fieldsForUnit, isRepeatableSheetKey, type RepeatableKind } from "./repeatable-units";

describe("Auto household exclusion fields (sep7iu)", () => {
  it("catalog exposes Non-Rated/Excluded picklists on household_1", () => {
    const fields = fieldsForLine("auto");
    const reason = fields.find((f) => f.key === "household_1_exclude_reason");
    expect(reason?.options).toEqual([...AUTO_HOUSEHOLD_EXCLUDE_REASON_OPTIONS]);
    expect(AUTO_HOUSEHOLD_EXCLUDE_REASON_OPTIONS).toContain("Separately insured");
    expect(AUTO_HOUSEHOLD_EXCLUDE_REASON_OPTIONS).toContain(
      "Other (Non-Rated/Excluded reason)",
    );
    const sep = fields.find((f) => f.key === "household_1_separate_auto_policy");
    expect(sep?.options).toEqual([...YES_NO_OPTIONS]);
    const status = fields.find((f) => f.key === "household_1_separate_policy_status");
    expect(status?.options).toEqual([...AUTO_HOUSEHOLD_SEPARATE_POLICY_STATUS_OPTIONS]);
    expect(fields.some((f) => f.key === "household_1_age_first_licensed")).toBe(true);
    const susp = fields.find((f) => f.key === "household_1_suspension_5yr");
    expect(susp?.options).toEqual([...YES_NO_OPTIONS]);
  });

  it("repeatable units expose exclusion suffixes and recognize keys", () => {
    const slots = fieldsForUnit("household" as RepeatableKind, 2);
    expect(slots.map((s) => s.key)).toContain("household_2_exclude_reason");
    expect(slots.map((s) => s.key)).toContain("household_2_suspension_5yr");
    expect(isRepeatableSheetKey("household_3_exclude_reason")).toBe(true);
    expect(isRepeatableSheetKey("household_1_separate_policy_status")).toBe(true);
    expect(isRepeatableSheetKey("household_4_age_first_licensed")).toBe(true);
  });
});
