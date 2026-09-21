import { describe, expect, it } from "vitest";
import { mergeAgentEdits } from "./apply";
import {
  PERSONAL_VEHICLE_CAP,
  canAddAnother,
  canRemoveUnit,
  isRepeatableSheetKey,
  repeatableFieldKey,
  repeatableRemovalWrites,
  visibleUnitCount,
} from "./repeatable-units";

describe("repeatable vehicle and driver blocks", () => {
  it("starts at vehicle 1 using the existing sheet keys", () => {
    expect(repeatableFieldKey("vehicle", 1, "vin")).toBe("vin");
    expect(repeatableFieldKey("vehicle", 1, "year")).toBe("vehicle_year");
    expect(repeatableFieldKey("vehicle", 1, "garaging_zip")).toBe("garaging_zip");
    expect(repeatableFieldKey("vehicle", 1, "garaging_address")).toBe("garaging_address");
    expect(repeatableFieldKey("vehicle", 2, "vin")).toBe("vehicle_2_vin");
    expect(repeatableFieldKey("driver", 1, "name")).toBe("driver_1_name");
    expect(visibleUnitCount({}, "vehicle")).toBe(1);
    expect(visibleUnitCount({}, "driver")).toBe(1);
  });

  it("does not open on vehicle 2 when vehicle 1 is empty", () => {
    const values = {
      vehicle_2_vin: { value: "1FT", status: "confirmed" as const, source: "agent" as const },
    };
    expect(visibleUnitCount(values, "vehicle")).toBe(2);
    expect(repeatableFieldKey("vehicle", 1, "vin")).not.toBe("vehicle_2_vin");
  });

  it("caps personal lines at five and leaves commercial uncapped in the UI", () => {
    expect(PERSONAL_VEHICLE_CAP).toBe(4);
    expect(canAddAnother(4, "auto")).toBe(false);
    expect(canAddAnother(3, "auto")).toBe(true);
    expect(canAddAnother(5, "commercial_auto")).toBe(true);
    expect(canAddAnother(12, "commercial_auto")).toBe(true);
    expect(isRepeatableSheetKey("vin")).toBe(true);
    expect(isRepeatableSheetKey("vehicle_3_make")).toBe(true);
    expect(isRepeatableSheetKey("coverage_a")).toBe(false);
  });

  it("keeps the last vehicle or driver and compacts a removed middle card", () => {
    expect(canRemoveUnit(1)).toBe(false);
    expect(canRemoveUnit(2)).toBe(true);
    expect(repeatableRemovalWrites("driver", 1, 1, [undefined, { name: "Ana" }])).toBeNull();

    const shifted = repeatableRemovalWrites("driver", 4, 3, [
      undefined,
      { name: "Ana" },
      { name: "Bob" },
      { name: "Bob" },
      { name: "Cara" },
    ]);
    expect(shifted?.driver_3_name).toBe("Cara");
    expect(shifted?.driver_4_name).toBe("");
    expect(shifted?.driver_1_name).toBeUndefined();
    expect(shifted?.driver_2_name).toBeUndefined();

    const vehicleShift = repeatableRemovalWrites("vehicle", 2, 1, [
      undefined,
      { vin: "AAA", year: "2010" },
      { vin: "BBB", year: "2020" },
    ]);
    expect(vehicleShift?.vin).toBe("BBB");
    expect(vehicleShift?.vehicle_year).toBe("2020");
    expect(vehicleShift?.vehicle_2_vin).toBe("");
    expect(vehicleShift?.vehicle_2_year).toBe("");
  });

  it("blanks a removed extra vehicle so save does not reopen the slot", () => {
    const existing = {
      vin: { value: "AAA", status: "confirmed" as const, source: "agent" as const },
      vehicle_2_vin: { value: "BBB", status: "confirmed" as const, source: "agent" as const },
      vehicle_2_make: { value: "Ford", status: "confirmed" as const, source: "agent" as const },
    };
    expect(visibleUnitCount(existing, "vehicle")).toBe(2);
    const writes = repeatableRemovalWrites("vehicle", 2, 2, [
      undefined,
      { vin: "AAA" },
      { vin: "BBB", make: "Ford" },
    ]);
    expect(writes?.vehicle_2_vin).toBe("");
    expect(writes?.vehicle_2_make).toBe("");
    expect(writes?.vin).toBeUndefined();
    const merged = mergeAgentEdits(existing, writes ?? {}, "auto", "auto");
    expect(merged.vehicle_2_vin).toMatchObject({ value: "", status: "missing" });
    expect(merged.vehicle_2_make).toMatchObject({ value: "", status: "missing" });
    expect(merged.vin.value).toBe("AAA");
    expect(visibleUnitCount(merged, "vehicle")).toBe(1);
  });
});
