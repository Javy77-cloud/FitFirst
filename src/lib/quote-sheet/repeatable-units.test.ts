import { describe, expect, it } from "vitest";
import {
  PERSONAL_VEHICLE_CAP,
  canAddAnother,
  isRepeatableSheetKey,
  repeatableFieldKey,
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
});
