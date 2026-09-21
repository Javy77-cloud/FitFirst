import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PERSONAL_VEHICLE_CAP,
  canAddAnother,
  isRepeatableSheetKey,
  removeRepeatableUnit,
  repeatableFieldKey,
  visibleUnitCount,
} from "./repeatable-units";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";

function cell(value: string): QuoteSheetFieldValue {
  return { value, status: "confirmed", source: "agent" };
}

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

  it("removes a unit and packs later keys down, clearing driver 1 relationship", () => {
    const values = {
      driver_1_name: cell("Ada"),
      driver_1_relationship: cell("Self"),
      driver_2_name: cell("Ben"),
      driver_2_relationship: cell("Spouse"),
      driver_3_name: cell("Cara"),
      driver_3_relationship: cell("Child"),
    };
    const packed = removeRepeatableUnit(values, "driver", 1);
    expect(packed.driver_1_name.value).toBe("Ben");
    expect(packed.driver_1_relationship.value).toBe("");
    expect(packed.driver_2_name.value).toBe("Cara");
    expect(packed.driver_2_relationship.value).toBe("Child");
    expect(packed.driver_3_name.value).toBe("");
    expect(visibleUnitCount(packed, "driver")).toBe(2);

    const vehicles = {
      vin: cell("1HGCM82633A004352"),
      vehicle_year: cell("2018"),
      vehicle_2_vin: cell("5J8TC2H40SL034711"),
      vehicle_2_year: cell("2025"),
    };
    const afterVehicle = removeRepeatableUnit(vehicles, "vehicle", 1);
    expect(afterVehicle.vin.value).toBe("5J8TC2H40SL034711");
    expect(afterVehicle.vehicle_year.value).toBe("2025");
    expect(afterVehicle.vehicle_2_vin.value).toBe("");
    expect(visibleUnitCount(afterVehicle, "vehicle")).toBe(1);
  });

  it("Risk Profile rows expose Remove driver / Remove vehicle (not Delete)", () => {
    const ui = readFileSync("src/components/deal/repeatable-unit-blocks.tsx", "utf8");
    expect(ui).toMatch(/Remove driver/);
    expect(ui).toMatch(/Remove vehicle/);
    expect(ui).toMatch(/removeRepeatableSheetUnit/);
    expect(ui).not.toMatch(/Delete driver/);
    expect(ui).not.toMatch(/Delete vehicle/);
    const action = readFileSync("src/app/actions/quote-sheet.ts", "utf8");
    expect(action).toMatch(/export async function removeRepeatableSheetUnit/);
    expect(action).toMatch(/removeRepeatableUnit/);
  });
});
