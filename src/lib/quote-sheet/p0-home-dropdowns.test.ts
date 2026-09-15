import { describe, expect, it } from "vitest";
import { fieldsForLine, legacySheetFormValue } from "./catalog";
import { emptySheetValues } from "./catalog";
import { applyExtractedToSheet } from "./apply";
import { applyMasterSheetDefaults } from "./sheet-defaults";
import {
  BUILDING_CODE_OPTIONS,
  CLAIMS_5YR_OPTIONS,
  INSURANCE_SCORE_RANGE_OPTIONS,
  OPENING_PROTECTION_OPTIONS,
  ROOF_COVERING_OPTIONS,
  ROOF_DECK_ATTACHMENT_OPTIONS,
  ROOF_SHAPE_OPTIONS,
  ROOF_TO_WALL_OPTIONS,
  TERRAIN_OPTIONS,
  WATER_BACKUP_OPTIONS,
  WIND_SPEED_OPTIONS,
  YES_NO_UNKNOWN_OPTIONS,
  normalizeBuildingCode,
  normalizeClaims5yr,
  normalizeRoofToWall,
  normalizeSecondaryWater,
  normalizeWaterBackup,
  normalizeWindSpeed,
} from "./sheet-defaults";

describe("P0 home master-sheet dropdowns", () => {
  it("wires P0 fields as selects with approved options", () => {
    const home = fieldsForLine("home", "homeowners");
    const byKey = Object.fromEntries(home.map((field) => [field.key, field]));

    expect(byKey.form).toBeUndefined();
    expect(byKey.water_backup).toMatchObject({ input: "select" });
    expect(byKey.water_backup.options).toEqual([...WATER_BACKUP_OPTIONS]);
    expect(byKey.claims_5yr).toMatchObject({ input: "select" });
    expect(byKey.claims_5yr.options).toEqual([...CLAIMS_5YR_OPTIONS]);
    expect(byKey.years_with_carrier).toMatchObject({ input: "number" });
    expect(byKey.insurance_score_range.options).toEqual([...INSURANCE_SCORE_RANGE_OPTIONS]);
    expect(byKey.roof_to_wall.options).toEqual([...ROOF_TO_WALL_OPTIONS]);
    expect(byKey.secondary_water.options).toEqual([...YES_NO_UNKNOWN_OPTIONS]);
    expect(byKey.wind_speed.options).toEqual([...WIND_SPEED_OPTIONS]);
    expect(byKey.building_code.options).toEqual([...BUILDING_CODE_OPTIONS]);
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

  it("normalizes portal / OIR leftovers onto pasteable select values", () => {
    expect(normalizeWaterBackup("none")).toBe("None");
    expect(normalizeWaterBackup("$5,000")).toBe("5000");
    expect(normalizeClaims5yr("0")).toBe("No claims");
    expect(normalizeClaims5yr("no claims")).toBe("No claims");
    expect(normalizeClaims5yr("4")).toBe("4+");
    expect(normalizeRoofToWall("A. Toenails")).toBe("Toenails");
    expect(normalizeRoofToWall("clips")).toBe("Clips");
    expect(normalizeRoofToWall("H")).toBe("No attic access");
    expect(normalizeSecondaryWater("A")).toBe("Yes");
    expect(normalizeSecondaryWater("no")).toBe("No");
    expect(normalizeSecondaryWater("C")).toBe("Unknown");
    expect(normalizeWindSpeed("Region 1 ≥ 140")).toBe("140");
    expect(normalizeWindSpeed("hvhz")).toBe("HVHZ");
    expect(normalizeBuildingCode("B")).toBe("B. FBC 2007 and later");
    expect(normalizeBuildingCode("1994 SFBC")).toBe("C. SFBC-94 (HVHZ)");
  });

  it("applies extract values onto the select options", () => {
    const applied = applyExtractedToSheet("home", emptySheetValues("home", "homeowners"), [
      { fieldKey: "water_backup", normalizedValue: "10000" },
      { fieldKey: "roof_to_wall", normalizedValue: "D" },
      { fieldKey: "swr", normalizedValue: "B" },
      { fieldKey: "building_code", normalizedValue: "A" },
      { fieldKey: "wind_speed", normalizedValue: "120" },
      { fieldKey: "claims_5yr", normalizedValue: "0" },
    ]);
    expect(applied.values.water_backup.value).toBe("10000");
    expect(applied.values.roof_to_wall.value).toBe("Double wraps");
    expect(applied.values.secondary_water.value).toBe("No");
    expect(applied.values.building_code.value).toBe("A. FBC 2001 & 2004");
    expect(applied.values.wind_speed.value).toBe("120");
    expect(applied.values.claims_5yr.value).toBe("No claims");
  });

  it("preserves a stored form value after the catalog drop", () => {
    const existing = emptySheetValues("home", "homeowners");
    existing.form = { value: "HO3", status: "confirmed", source: "agent" };
    const applied = applyMasterSheetDefaults(existing);
    expect(legacySheetFormValue(applied.values)).toBe("HO3");
    expect(fieldsForLine("home", "homeowners").some((field) => field.key === "form")).toBe(false);
  });
});
