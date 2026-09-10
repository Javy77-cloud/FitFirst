import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import {
  COMMUTE_DAYS_WEEK_OPTIONS,
  MASTER_SHEET_EMPTY_DEFAULTS,
  VEHICLE_OWNERSHIP_LENGTH_OPTIONS,
} from "./sheet-defaults";
import {
  fieldsForUnit,
  isRepeatableSheetKey,
  repeatableFieldKey,
  type RepeatableKind,
} from "./repeatable-units";

describe("Auto ownership_length / commute_days_week / lienholder_other (sep7iz)", () => {
  it("catalog exposes Length of ownership with Geico-style brackets", () => {
    const fields = fieldsForLine("auto");
    const field = fields.find((f) => f.key === "vehicle_ownership_length");
    expect(field?.group).toBe("Vehicle");
    expect(field?.input).toBe("select");
    expect(field?.options).toEqual([...VEHICLE_OWNERSHIP_LENGTH_OPTIONS]);
    expect(VEHICLE_OWNERSHIP_LENGTH_OPTIONS).toContain("Less than 1 month");
    expect(VEHICLE_OWNERSHIP_LENGTH_OPTIONS).toContain("5+ years");
  });

  it("catalog exposes Commute days / week 0–7 and lienholder other text", () => {
    const fields = fieldsForLine("auto");
    const commute = fields.find((f) => f.key === "commute_days_week");
    expect(commute?.group).toBe("Vehicle");
    expect(commute?.input).toBe("select");
    expect(commute?.options).toEqual(["0", "1", "2", "3", "4", "5", "6", "7"]);
    expect([...COMMUTE_DAYS_WEEK_OPTIONS]).toEqual(["0", "1", "2", "3", "4", "5", "6", "7"]);

    const other = fields.find((f) => f.key === "vehicle_lienholder_other");
    expect(other?.group).toBe("Vehicle");
    expect(other?.input ?? "text").toBe("text");
    expect(other?.options).toBeUndefined();
  });

  it("repeatable vehicles map #1 keys and vehicle_N_* after", () => {
    expect(repeatableFieldKey("vehicle", 1, "ownership_length")).toBe(
      "vehicle_ownership_length",
    );
    expect(repeatableFieldKey("vehicle", 2, "ownership_length")).toBe(
      "vehicle_2_ownership_length",
    );
    expect(repeatableFieldKey("vehicle", 1, "commute_days_week")).toBe("commute_days_week");
    expect(repeatableFieldKey("vehicle", 2, "commute_days_week")).toBe(
      "vehicle_2_commute_days_week",
    );
    expect(repeatableFieldKey("vehicle", 1, "lienholder_other")).toBe(
      "vehicle_lienholder_other",
    );
    expect(repeatableFieldKey("vehicle", 2, "lienholder_other")).toBe(
      "vehicle_2_lienholder_other",
    );

    const slots = fieldsForUnit("vehicle" as RepeatableKind, 1);
    expect(slots.map((s) => s.key)).toEqual(
      expect.arrayContaining([
        "vehicle_ownership_length",
        "commute_days_week",
        "vehicle_lienholder_other",
      ]),
    );
    expect(slots.find((s) => s.suffix === "ownership_length")?.options).toEqual([
      ...VEHICLE_OWNERSHIP_LENGTH_OPTIONS,
    ]);
    expect(slots.find((s) => s.suffix === "commute_days_week")?.options).toEqual([
      ...COMMUTE_DAYS_WEEK_OPTIONS,
    ]);

    expect(isRepeatableSheetKey("vehicle_ownership_length")).toBe(true);
    expect(isRepeatableSheetKey("vehicle_1_ownership_length")).toBe(true);
    expect(isRepeatableSheetKey("vehicle_2_ownership_length")).toBe(true);
    expect(isRepeatableSheetKey("commute_days_week")).toBe(true);
    expect(isRepeatableSheetKey("vehicle_2_commute_days_week")).toBe(true);
    expect(isRepeatableSheetKey("vehicle_lienholder_other")).toBe(true);
    expect(isRepeatableSheetKey("vehicle_2_lienholder_other")).toBe(true);
  });

  it("no empty defaults (leave Heather blank until Javy answers)", () => {
    expect(MASTER_SHEET_EMPTY_DEFAULTS.vehicle_ownership_length).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.vehicle_1_ownership_length).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.commute_days_week).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.vehicle_lienholder_other).toBeUndefined();
  });
});
