import { describe, expect, it } from "vitest";
import { fieldsForLine, legacySheetFormValue } from "./catalog";
import { emptySheetValues } from "./catalog";
import { applyExtractedToSheet } from "./apply";
import { applyMasterSheetDefaults } from "./sheet-defaults";
import {
  BCEG_OPTIONS,
  BUILDING_CODE_OPTIONS,
  CLAIMS_5YR_OPTIONS,
  FLOOD_ZONE_OPTIONS,
  FOUR_POINT_UPDATE_TYPE_OPTIONS,
  INSURANCE_SCORE_RANGE_OPTIONS,
  OPENING_PROTECTION_OPTIONS,
  POOL_TYPE_OPTIONS,
  PROTECTION_CLASS_OPTIONS,
  ROOF_COVERING_OPTIONS,
  ROOF_DECK_ATTACHMENT_OPTIONS,
  ROOF_SHAPE_OPTIONS,
  ROOF_TO_WALL_OPTIONS,
  ROOF_UPDATE_TYPE_OPTIONS,
  STORIES_OPTIONS,
  STRUCTURE_TYPE_OPTIONS,
  TERRAIN_OPTIONS,
  WATER_BACKUP_OPTIONS,
  WATER_HEATER_LOCATION_OPTIONS,
  WIND_SPEED_OPTIONS,
  YES_NO_UNKNOWN_OPTIONS,
  normalizeBuildingCode,
  normalizeClaims5yr,
  normalizeInsuranceScoreRange,
  normalizeRoofCovering,
  normalizeRoofDeckAttachment,
  normalizeRoofToWall,
  normalizeSecondaryWater,
  normalizeStories,
  normalizeWaterBackup,
  normalizeWindSpeed,
} from "./sheet-defaults";

describe("P0 home master-sheet dropdowns", () => {
  it("wires P0 fields as selects with QuoteRUSH 2026-09-15 options", () => {
    const home = fieldsForLine("home", "homeowners");
    const byKey = Object.fromEntries(home.map((field) => [field.key, field]));

    expect(byKey.form).toBeUndefined();
    expect(byKey.water_backup).toMatchObject({ input: "select" });
    expect(byKey.water_backup.options).toEqual([...WATER_BACKUP_OPTIONS]);
    expect(WATER_BACKUP_OPTIONS).toEqual([
      "$2,000",
      "$5,000",
      "$10,000",
      "$15,000",
      "$20,000",
      "$25,000",
      "$30,000",
      "$50,000",
    ]);
    expect(byKey.claims_5yr).toMatchObject({ input: "select" });
    expect(byKey.claims_5yr.options).toEqual([...CLAIMS_5YR_OPTIONS]);
    expect(byKey.years_with_carrier).toMatchObject({ input: "number" });
    expect(byKey.insurance_score_range.options).toEqual([...INSURANCE_SCORE_RANGE_OPTIONS]);
    expect(INSURANCE_SCORE_RANGE_OPTIONS).toEqual([
      "Average",
      "Below Average",
      "Excellent",
      "Poor",
      "Very Good",
    ]);
    expect(byKey.roof_to_wall.options).toEqual([...ROOF_TO_WALL_OPTIONS]);
    expect(ROOF_TO_WALL_OPTIONS).toEqual([
      "Clips",
      "Double Wraps",
      "N/A",
      "Single Wraps",
      "Structural",
      "Toe Nails",
      "Unknown",
    ]);
    expect(byKey.secondary_water.options).toEqual([...YES_NO_UNKNOWN_OPTIONS]);
    expect(byKey.wind_speed.options).toEqual([...WIND_SPEED_OPTIONS]);
    expect(WIND_SPEED_OPTIONS.slice(0, 3)).toEqual(["100", "110", "120"]);
    expect(WIND_SPEED_OPTIONS).toContain("HVHZ");
    expect(byKey.building_code.options).toEqual([...BUILDING_CODE_OPTIONS]);
    expect(BUILDING_CODE_OPTIONS).toEqual(["A", "B", "C", "D"]);
    expect(byKey.roof_covering.options).toEqual([...ROOF_COVERING_OPTIONS]);
    expect(byKey.roof_shape.options).toEqual([...ROOF_SHAPE_OPTIONS]);
    expect(byKey.roof_deck.options).toEqual([...ROOF_DECK_ATTACHMENT_OPTIONS]);
    expect(byKey.roof_deck_attachment.options).toEqual([...ROOF_DECK_ATTACHMENT_OPTIONS]);
    expect(byKey.opening_protection.options).toEqual([...OPENING_PROTECTION_OPTIONS]);
    expect(byKey.terrain.options).toEqual([...TERRAIN_OPTIONS]);
    expect(byKey.construction).toBeTruthy();
    expect(byKey.exterior).toBeTruthy();
    expect(byKey.construction.key).not.toBe(byKey.exterior.key);
  });

  it("adds Super-Copy home selects when missing from the prior catalog", () => {
    const home = fieldsForLine("home", "homeowners");
    const byKey = Object.fromEntries(home.map((field) => [field.key, field]));

    expect(byKey.structure_type.options).toEqual([...STRUCTURE_TYPE_OPTIONS]);
    expect(byKey.stories).toMatchObject({ input: "select" });
    expect(byKey.stories.options).toEqual([...STORIES_OPTIONS]);
    expect(STORIES_OPTIONS).toEqual(expect.arrayContaining(["Bi-Level", "Tri-Level"]));
    expect(byKey.pool_type.options).toEqual([...POOL_TYPE_OPTIONS]);
    expect(byKey.bceg_grade.options).toEqual([...BCEG_OPTIONS]);
    expect(byKey.protection_class.options).toEqual([...PROTECTION_CLASS_OPTIONS]);
    expect(byKey.flood_zone).toMatchObject({ input: "select" });
    expect(byKey.flood_zone.options).toEqual([...FLOOD_ZONE_OPTIONS]);
    expect(byKey.electrical_update_type.options).toEqual([...FOUR_POINT_UPDATE_TYPE_OPTIONS]);
    expect(byKey.plumbing_update_type.options).toEqual([...FOUR_POINT_UPDATE_TYPE_OPTIONS]);
    expect(byKey.heat_update_type.options).toEqual([...FOUR_POINT_UPDATE_TYPE_OPTIONS]);
    expect(byKey.roof_update_type.options).toEqual([...ROOF_UPDATE_TYPE_OPTIONS]);
    expect(byKey.water_heater_location.options).toEqual([...WATER_HEATER_LOCATION_OPTIONS]);
  });

  it("normalizes portal / OIR leftovers onto QuoteRUSH select values", () => {
    expect(normalizeWaterBackup("none")).toBe("none");
    expect(normalizeWaterBackup("$5,000")).toBe("$5,000");
    expect(normalizeWaterBackup("5000")).toBe("$5,000");
    expect(normalizeWaterBackup("10000")).toBe("$10,000");
    expect(normalizeClaims5yr("0")).toBe("No claims");
    expect(normalizeClaims5yr("no claims")).toBe("No claims");
    expect(normalizeClaims5yr("4")).toBe("4+");
    expect(normalizeInsuranceScoreRange("Above Average")).toBe("Excellent");
    expect(normalizeInsuranceScoreRange("very good")).toBe("Very Good");
    expect(normalizeRoofToWall("A. Toenails")).toBe("Toe Nails");
    expect(normalizeRoofToWall("clips")).toBe("Clips");
    expect(normalizeRoofToWall("H")).toBe("N/A");
    expect(normalizeSecondaryWater("A")).toBe("Yes");
    expect(normalizeSecondaryWater("no")).toBe("No");
    expect(normalizeSecondaryWater("C")).toBe("Unknown");
    expect(normalizeWindSpeed("Region 1 ≥ 140")).toBe("140");
    expect(normalizeWindSpeed("hvhz")).toBe("HVHZ");
    expect(normalizeWindSpeed("100 mph")).toBe("100");
    expect(normalizeBuildingCode("B")).toBe("B");
    expect(normalizeBuildingCode("B. FBC 2007 and later")).toBe("B");
    expect(normalizeBuildingCode("1994 SFBC")).toBe("1994 SFBC");
    expect(normalizeBuildingCode("does not meet")).toBe("D");
    expect(normalizeRoofCovering("Meets FBC 2001")).toBe("Meets FBC 2001");
    expect(normalizeRoofCovering("FBC 1994")).toBe("Meets FBC 1994");
    expect(normalizeRoofCovering("A")).toBe("Meets FBC 2001");
    expect(normalizeRoofCovering("B")).toBe("Meets FBC 1994");
    expect(normalizeRoofCovering("C")).toBe("Non-FBC");
    expect(normalizeRoofCovering("D")).toBe("Unknown");
    expect(normalizeRoofCovering("A. All roof coverings meet the FBC")).toBe("Meets FBC 2001");
    expect(normalizeRoofDeckAttachment("C")).toBe("Level C");
    expect(normalizeStories("bi-level")).toBe("Bi-Level");
  });

  it("applies extract values onto the select options", () => {
    const applied = applyExtractedToSheet("home", emptySheetValues("home", "homeowners"), [
      { fieldKey: "water_backup", normalizedValue: "10000" },
      { fieldKey: "roof_to_wall", normalizedValue: "D" },
      { fieldKey: "swr", normalizedValue: "B" },
      { fieldKey: "building_code", normalizedValue: "A" },
      { fieldKey: "wind_speed", normalizedValue: "120" },
      { fieldKey: "claims_5yr", normalizedValue: "0" },
      { fieldKey: "insurance_score_range", normalizedValue: "Above Average" },
    ]);
    expect(applied.values.water_backup.value).toBe("$10,000");
    expect(applied.values.roof_to_wall.value).toBe("Double Wraps");
    expect(applied.values.secondary_water.value).toBe("No");
    expect(applied.values.building_code.value).toBe("A");
    expect(applied.values.wind_speed.value).toBe("120");
    expect(applied.values.claims_5yr.value).toBe("No claims");
    expect(applied.values.insurance_score_range.value).toBe("Excellent");
  });

  it("preserves a stored form value after the catalog drop", () => {
    const existing = emptySheetValues("home", "homeowners");
    existing.form = { value: "HO3", status: "confirmed", source: "agent" };
    const applied = applyMasterSheetDefaults(existing);
    expect(legacySheetFormValue(applied.values)).toBe("HO3");
    expect(fieldsForLine("home", "homeowners").some((field) => field.key === "form")).toBe(false);
  });
});
