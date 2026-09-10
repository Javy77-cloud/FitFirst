import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import {
  MASTER_SHEET_EMPTY_DEFAULTS,
  VEHICLE_LIENHOLDER_OPTIONS,
} from "./sheet-defaults";
import {
  fieldsForUnit,
  isRepeatableSheetKey,
  repeatableFieldKey,
  type RepeatableKind,
} from "./repeatable-units";

describe("Auto vehicle_lienholder picklist (sep7iy)", () => {
  it("catalog exposes Lienholder on Vehicle group with FL lenders", () => {
    const fields = fieldsForLine("auto");
    const field = fields.find((f) => f.key === "vehicle_lienholder");
    expect(field?.group).toBe("Vehicle");
    expect(field?.input).toBe("select");
    expect(field?.options).toContain("Acura Financial Services");
    expect(field?.options).toEqual([...VEHICLE_LIENHOLDER_OPTIONS]);
    expect(VEHICLE_LIENHOLDER_OPTIONS).toContain("Acura Financial Services");
  });

  it("repeatable vehicles use vehicle_lienholder for #1 and vehicle_N_lienholder after", () => {
    expect(repeatableFieldKey("vehicle", 1, "lienholder")).toBe("vehicle_lienholder");
    expect(repeatableFieldKey("vehicle", 2, "lienholder")).toBe("vehicle_2_lienholder");
    const slots = fieldsForUnit("vehicle" as RepeatableKind, 1);
    expect(slots.map((s) => s.key)).toContain("vehicle_lienholder");
    expect(slots.find((s) => s.suffix === "lienholder")?.options).toEqual([
      ...VEHICLE_LIENHOLDER_OPTIONS,
    ]);
    expect(isRepeatableSheetKey("vehicle_lienholder")).toBe(true);
    expect(isRepeatableSheetKey("vehicle_2_lienholder")).toBe(true);
    expect(isRepeatableSheetKey("vehicle_1_lienholder")).toBe(true);
  });

  it("no empty default for vehicle_lienholder (set per deal)", () => {
    expect(MASTER_SHEET_EMPTY_DEFAULTS.vehicle_lienholder).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.vehicle_1_lienholder).toBeUndefined();
  });
});
