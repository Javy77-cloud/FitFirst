import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import {
  MASTER_SHEET_EMPTY_DEFAULTS,
  VEHICLE_OWNERSHIP_OPTIONS,
} from "./sheet-defaults";
import {
  fieldsForUnit,
  isRepeatableSheetKey,
  repeatableFieldKey,
  type RepeatableKind,
} from "./repeatable-units";

describe("Auto vehicle_ownership picklist (sep7ix)", () => {
  it("catalog exposes Ownership on Vehicle group", () => {
    const fields = fieldsForLine("auto");
    const field = fields.find((f) => f.key === "vehicle_ownership");
    expect(field?.group).toBe("Vehicle");
    expect(field?.input).toBe("select");
    expect(field?.options).toEqual(["Owned", "Financed", "Leased"]);
    expect([...VEHICLE_OWNERSHIP_OPTIONS]).toEqual(["Owned", "Financed", "Leased"]);
  });

  it("repeatable vehicles use vehicle_ownership for #1 and vehicle_N_ownership after", () => {
    expect(repeatableFieldKey("vehicle", 1, "ownership")).toBe("vehicle_ownership");
    expect(repeatableFieldKey("vehicle", 2, "ownership")).toBe("vehicle_2_ownership");
    const slots = fieldsForUnit("vehicle" as RepeatableKind, 1);
    expect(slots.map((s) => s.key)).toContain("vehicle_ownership");
    expect(slots.find((s) => s.suffix === "ownership")?.options).toEqual([
      ...VEHICLE_OWNERSHIP_OPTIONS,
    ]);
    expect(isRepeatableSheetKey("vehicle_ownership")).toBe(true);
    expect(isRepeatableSheetKey("vehicle_2_ownership")).toBe(true);
    expect(isRepeatableSheetKey("vehicle_1_ownership")).toBe(true);
  });

  it("no empty default for vehicle_ownership (leave Heather blank until Javy answers)", () => {
    expect(MASTER_SHEET_EMPTY_DEFAULTS.vehicle_ownership).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.vehicle_1_ownership).toBeUndefined();
  });
});
