import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import { applyExtractedToSheet } from "./apply";
import { emptySheetValues } from "./catalog";
import { MARITAL_STATUS_OPTIONS } from "./applicant-core";
import {
  AUTO_BI_LIMIT_OPTIONS,
  AUTO_DRIVER_RELATIONSHIP_OPTIONS,
  AUTO_PD_LIMIT_OPTIONS,
  AUTO_PHYS_DAM_DEDUCTIBLE_OPTIONS,
  AUTO_PIP_OPTIONS,
  AUTO_UM_UIM_OPTIONS,
  FLOOD_BUILDING_TYPE_OPTIONS,
  FLOOD_DEDUCTIBLE_OPTIONS,
  FLOOD_OCCUPANCY_USE_OPTIONS,
  FLOOD_ZONE_OPTIONS,
  LICENSE_STATUS_OPTIONS,
  USAGE_OPTIONS,
  YES_NO_OPTIONS,
  normalizeAutoDollarLimit,
  normalizeAutoSplitLimit,
  normalizeFloodOccupancyUse,
  normalizeFloodZone,
  normalizeLicenseStatus,
} from "./sheet-defaults";
import {
  fieldsForUnit,
  isRepeatableSheetKey,
  type RepeatableKind,
} from "./repeatable-units";

describe("P0 Auto + Flood master-sheet dropdowns", () => {
  it("converts high-copy Auto coverages and license status to selects", () => {
    const auto = fieldsForLine("auto");
    const byKey = Object.fromEntries(auto.map((field) => [field.key, field]));

    expect(byKey.driver_1_status).toMatchObject({ input: "select" });
    expect(byKey.driver_1_status.options).toEqual([...LICENSE_STATUS_OPTIONS]);
    expect(byKey.driver_1_status.label.toLowerCase()).toMatch(/license status/);
    expect(byKey.driver_1_marital_status.options).toEqual([...MARITAL_STATUS_OPTIONS]);
    expect(byKey.driver_1_relationship).toBeUndefined();
    expect(AUTO_DRIVER_RELATIONSHIP_OPTIONS[0]).toBe("Named insured");
    expect(byKey.comp_deductible.label).toBe("Comprehensive deductible");
    expect(byKey.comp_deductible.label.toLowerCase()).not.toBe("comp deductible");

    expect(byKey.liability_bi.options).toEqual([...AUTO_BI_LIMIT_OPTIONS]);
    expect(byKey.liability_pd.options).toEqual([...AUTO_PD_LIMIT_OPTIONS]);
    expect(byKey.um_uim.options).toEqual([...AUTO_UM_UIM_OPTIONS]);
    expect(byKey.pip.options).toEqual([...AUTO_PIP_OPTIONS]);
    expect(byKey.comp_deductible.options).toEqual([...AUTO_PHYS_DAM_DEDUCTIBLE_OPTIONS]);
    expect(byKey.collision_deductible.options).toEqual([...AUTO_PHYS_DAM_DEDUCTIBLE_OPTIONS]);
    expect(AUTO_BI_LIMIT_OPTIONS).toEqual(expect.arrayContaining(["10/20", "50/100"]));
    expect(AUTO_UM_UIM_OPTIONS).toEqual(expect.arrayContaining(["None", "Rejected"]));
    expect(AUTO_PHYS_DAM_DEDUCTIBLE_OPTIONS).toContain("250");
    expect(AUTO_PHYS_DAM_DEDUCTIBLE_OPTIONS).toContain("1000");

    expect(byKey.garaging_at_residence).toMatchObject({ input: "select" });
    expect(byKey.garaging_at_residence.options).toEqual([...YES_NO_OPTIONS]);
    expect(byKey.endorsed_rider.options).toEqual([...YES_NO_OPTIONS]);
  });

  it("repeatable drivers/vehicles expose the new Auto selects", () => {
    const drivers = fieldsForUnit("driver" as RepeatableKind, 1);
    expect(drivers.find((slot) => slot.suffix === "status")?.options).toEqual([
      ...LICENSE_STATUS_OPTIONS,
    ]);
    expect(drivers.find((slot) => slot.suffix === "marital_status")?.options).toEqual([
      ...MARITAL_STATUS_OPTIONS,
    ]);
    expect(drivers.find((slot) => slot.suffix === "relationship")).toBeUndefined();
    expect(
      fieldsForUnit("driver" as RepeatableKind, 2).find((slot) => slot.suffix === "relationship")
        ?.options,
    ).toEqual([...AUTO_DRIVER_RELATIONSHIP_OPTIONS]);
    expect(isRepeatableSheetKey("driver_2_marital_status")).toBe(true);
    expect(isRepeatableSheetKey("driver_2_relationship")).toBe(true);
    expect(isRepeatableSheetKey("driver_3_status")).toBe(true);

    const vehicles = fieldsForUnit("vehicle" as RepeatableKind, 1);
    expect(vehicles.find((slot) => slot.suffix === "garaging_at_residence")?.options).toEqual([
      ...YES_NO_OPTIONS,
    ]);
    expect(isRepeatableSheetKey("garaging_at_residence")).toBe(true);
    expect(isRepeatableSheetKey("vehicle_2_garaging_at_residence")).toBe(true);
  });

  it("Flood zone + deductibles + occupancy use match Home / named constants", () => {
    const flood = fieldsForLine("flood");
    const byKey = Object.fromEntries(flood.map((field) => [field.key, field]));
    const home = Object.fromEntries(
      fieldsForLine("home", "homeowners").map((field) => [field.key, field]),
    );

    expect(byKey.flood_zone).toMatchObject({ input: "select" });
    expect(byKey.flood_zone.options).toEqual([...FLOOD_ZONE_OPTIONS]);
    expect(byKey.flood_zone.options).toEqual(home.flood_zone.options);

    expect(byKey.occupancy_use.options).toEqual([...FLOOD_OCCUPANCY_USE_OPTIONS]);
    expect(FLOOD_OCCUPANCY_USE_OPTIONS).toEqual([...USAGE_OPTIONS, "Other"]);
    expect(byKey.dwelling_type.options).toEqual([...FLOOD_BUILDING_TYPE_OPTIONS]);
    expect(byKey.building_type.options).toEqual([...FLOOD_BUILDING_TYPE_OPTIONS]);

    expect(byKey.building_deductible).toMatchObject({ input: "select" });
    expect(byKey.building_deductible.options).toEqual([...FLOOD_DEDUCTIBLE_OPTIONS]);
    expect(byKey.contents_deductible.options).toEqual([...FLOOD_DEDUCTIBLE_OPTIONS]);
    expect(FLOOD_DEDUCTIBLE_OPTIONS).toContain("1000");
    expect(FLOOD_DEDUCTIBLE_OPTIONS).toContain("10000");
  });

  it("normalizes portal leftovers onto the new select values", () => {
    expect(normalizeLicenseStatus("active")).toBe("Valid");
    expect(normalizeLicenseStatus("license suspended")).toBe("Suspended");
    expect(normalizeLicenseStatus("never licensed")).toBe("Never licensed");
    expect(normalizeAutoSplitLimit("10-20")).toBe("10/20");
    expect(normalizeAutoSplitLimit("rejected")).toBe("Rejected");
    expect(normalizeAutoDollarLimit("10k")).toBe("10000");
    expect(normalizeAutoDollarLimit("$1,000")).toBe("1000");
    expect(normalizeFloodOccupancyUse("Primary / Owner")).toBe("Primary");
    expect(normalizeFloodZone("x shaded")).toBe("X-Shaded");
  });

  it("applies extract values onto Auto/Flood select options", () => {
    const auto = applyExtractedToSheet("auto", emptySheetValues("auto"), [
      { fieldKey: "driver_1_status", normalizedValue: "suspended" },
      { fieldKey: "liability_bi", normalizedValue: "50-100" },
      { fieldKey: "pip", normalizedValue: "10k" },
      { fieldKey: "comp_deductible", normalizedValue: "$1,000" },
    ]);
    expect(auto.values.driver_1_status.value).toBe("Suspended");
    expect(auto.values.liability_bi.value).toBe("50/100");
    expect(auto.values.pip.value).toBe("10000");
    expect(auto.values.comp_deductible.value).toBe("1000");

    const flood = applyExtractedToSheet("flood", emptySheetValues("flood"), [
      { fieldKey: "flood_zone", normalizedValue: "ae" },
      { fieldKey: "occupancy_use", normalizedValue: "Primary / Owner" },
      { fieldKey: "building_deductible", normalizedValue: "1,000" },
    ]);
    expect(flood.values.flood_zone.value).toBe("AE");
    expect(flood.values.occupancy_use.value).toBe("Primary");
    expect(flood.values.building_deductible.value).toBe("1000");
  });
});
