import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fieldsForLine } from "@/lib/quote-sheet/catalog";
import {
  fillSheetFromDealDetails,
  formatDobForSheet,
} from "@/lib/quote-sheet/fill-from-deal";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import {
  applyMasterSheetDefaults,
  MASTER_SHEET_EMPTY_DEFAULTS,
  MONTHS_OCCUPIED_OPTIONS,
  DISTANCE_TO_HYDRANT_OPTIONS,
  DISTANCE_TO_STATION_OPTIONS,
  USAGE_OPTIONS,
  normalizeDistanceToHydrant,
  normalizeDistanceToStation,
  normalizeMonthsOccupied,
  normalizeUsage,
} from "@/lib/quote-sheet/sheet-defaults";
import { MASTER_FILL_BUSY_COPY } from "@/lib/quote-sheet/master-fill";
import { sheetKeysForGeminiKey, mapGeminiJsonToFields } from "@/lib/extraction/gemini/map";
import { GEMINI_EXTRACT_JSON_KEYS } from "@/lib/extraction/gemini/prompt";
import { applyExtractedToSheet } from "@/lib/quote-sheet/apply";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7fu Fill gaps + defaults + popup; Fill stays on Documents", () => {
  it("Fill stays on Documents (no Markets redirect) and shows busy hold-on copy", () => {
    const button = source("src/components/deal/master-sheet-fill-button.tsx");
    expect(button).not.toMatch(/tab=markets/);
    expect(button).not.toMatch(/withFlash/);
    expect(button).toMatch(/flashAction\(toast\)/);
    expect(button).toMatch(/router\.refresh\(\)/);
    expect(button).toMatch(/data-ff-master-fill-busy/);
    expect(button).toMatch(/MASTER_FILL_BUSY_COPY/);
    expect(MASTER_FILL_BUSY_COPY).toMatch(/20 seconds/);
    expect(button).toMatch(/Deal → Property → Docs/);
  });

  it("copies applicant_dob from Deal Details date_of_birth (formatted)", () => {
    expect(formatDobForSheet("1985-09-09")).toBe("9/9/1985");
    const existing = emptySheetValues("home");
    const result = fillSheetFromDealDetails(
      {
        stored: { date_of_birth: "1985-09-09" },
      },
      existing,
    );
    expect(result.values.applicant_dob.value).toBe("9/9/1985");
    expect(result.values.applicant_dob.status).toBe("check");
    expect(result.filledKeys).toContain("applicant_dob");
  });

  it("maps date_inspected from Gemini and falls back from four_point_date", () => {
    expect(GEMINI_EXTRACT_JSON_KEYS).toContain("date_inspected");
    expect(sheetKeysForGeminiKey("date_inspected")).toEqual(["date_inspected"]);
    const withInspected = mapGeminiJsonToFields(
      { date_inspected: { value: "2/7/2026", confidence: 0.95 } },
      "four_point",
    );
    expect(withInspected.fields.find((f) => f.fieldKey === "date_inspected")?.normalizedValue).toBe(
      "2/7/2026",
    );

    const fallback = mapGeminiJsonToFields(
      { four_point_date: { value: "1/26/2023", confidence: 0.9 } },
      "four_point",
    );
    expect(fallback.fields.find((f) => f.fieldKey === "four_point_date")?.normalizedValue).toBe(
      "1/26/2023",
    );
    expect(fallback.fields.find((f) => f.fieldKey === "date_inspected")?.normalizedValue).toBe(
      "1/26/2023",
    );
  });

  it("applies empty-only defaults and normalizes months_occupied picklist", () => {
    expect([...MONTHS_OCCUPIED_OPTIONS]).toEqual([
      "0 to 3 months",
      "4 to 8 months",
      "9 months or more",
    ]);
    expect([...USAGE_OPTIONS]).toEqual([
      "Primary",
      "Secondary",
      "Seasonal",
      "Rental",
      "Vacant",
    ]);
    expect(normalizeMonthsOccupied("12")).toBe("9 months or more");
    expect(normalizeMonthsOccupied("8")).toBe("4 to 8 months");
    expect(normalizeMonthsOccupied("2")).toBe("0 to 3 months");
    expect(normalizeMonthsOccupied("9-12")).toBe("9 months or more");
    expect(normalizeUsage("tenant occupied")).toBe("Rental");
    expect(normalizeUsage("primary")).toBe("Primary");

    const blank = emptySheetValues("home");
    const applied = applyMasterSheetDefaults(blank);
    expect(applied.values.deadbolts.value).toBe("yes");
    expect(applied.values.central_alarm.value).toBe("no");
    expect(applied.values.smoke_detectors.value).toBe("no");
    expect(applied.values.sprinkler.value).toBe("no");
    expect(applied.values.pool.value).toBe("no");
    expect(applied.values.animals.value).toBe(MASTER_SHEET_EMPTY_DEFAULTS.animals);
    expect(applied.filledKeys).toContain("deadbolts");

    // Never overwrite confirmed agent cells
    blank.deadbolts = { value: "no", status: "confirmed", source: "agent" };
    const again = applyMasterSheetDefaults(blank);
    expect(again.values.deadbolts.value).toBe("no");
    expect(again.filledKeys).not.toContain("deadbolts");
  });

  it("catalog drops claims_3yr and exposes picklists for months/exterior/foundation/deductibles", () => {
    const home = fieldsForLine("home", "homeowners");
    expect(home.find((f) => f.key === "claims_3yr")).toBeUndefined();
    expect(home.find((f) => f.key === "claims_5yr")).toBeTruthy();
    expect(home.find((f) => f.key === "months_occupied")?.options).toEqual([
      "0 to 3 months",
      "4 to 8 months",
      "9 months or more",
    ]);
    expect(home.find((f) => f.key === "usage")?.options).toEqual([
      "Primary",
      "Secondary",
      "Seasonal",
      "Rental",
      "Vacant",
    ]);
    expect(home.find((f) => f.key === "hydrant")?.label).toBe("Distance to hydrant");
    expect(home.find((f) => f.key === "hydrant")?.options).toEqual([...DISTANCE_TO_HYDRANT_OPTIONS]);
    expect(home.find((f) => f.key === "miles_to_fire_station")?.label).toBe("Distance to station");
    expect(home.find((f) => f.key === "miles_to_fire_station")?.options).toEqual([
      ...DISTANCE_TO_STATION_OPTIONS,
    ]);
    expect(normalizeDistanceToHydrant("yes")).toBe("Within 1,000 feet");
    expect(normalizeDistanceToHydrant("1200")).toBe("More than 1,000 feet");
    expect(normalizeDistanceToStation("3")).toBe("Within 5 miles");
    expect(normalizeDistanceToStation("8")).toBe("More than 5 miles");
    expect(home.find((f) => f.key === "exterior")?.options).toEqual([
      "Masonry",
      "Frame",
      "Mixed Masonry-Frame",
    ]);
    expect(home.find((f) => f.key === "foundation")?.options).toEqual([
      "Slab",
      "Open foundation",
      "Crawl space 25%",
      "Crawl space 50%",
      "Crawl space 100%",
      "Piers (elevated)",
      "Basement",
    ]);
    expect(home.find((f) => f.key === "construction")?.options).toEqual([
      "Frame",
      "Frame-Stucco",
      "Aluminum siding",
      "Vinyl siding",
      "Wood siding",
      "Hardy plank siding",
      "Masonry veneer",
      "Brick veneer",
      "Stone veneer",
      "Logs",
      "Asbestos",
    ]);
    expect(home.find((f) => f.key === "basement")?.options).toEqual(["yes", "no"]);
    expect(home.find((f) => f.key === "wind_hail_deductible")?.options).toEqual([
      "1000",
      "2000",
      "2500",
    ]);
    expect(home.find((f) => f.key === "hurricane_deductible")?.options).toEqual([
      "1%",
      "2%",
      "3%",
      "4%",
      "5%",
    ]);
    expect(source("src/components/deal/quote-sheet-form.tsx")).toMatch(/data-ff-sheet-picklist/);
  });

  it("normalizes months_occupied on extract apply and maps wind_speed / carrier / mortgagee_address", () => {
    expect(sheetKeysForGeminiKey("design_wind_speed")).toContain("wind_speed");
    expect(sheetKeysForGeminiKey("current_carrier")).toEqual(["current_carrier"]);
    expect(sheetKeysForGeminiKey("mortgagee_address")).toEqual(["mortgagee_address"]);
    expect(GEMINI_EXTRACT_JSON_KEYS).toContain("current_carrier");
    expect(GEMINI_EXTRACT_JSON_KEYS).toContain("mortgagee_address");

    const applied = applyExtractedToSheet("home", emptySheetValues("home"), [
      { fieldKey: "months_occupied", normalizedValue: "12", sourceLabel: "dec page" },
    ]);
    expect(applied.values.months_occupied.value).toBe("9 months or more");
  });

  it("synonyms prefer Date Inspected for date_inspected", () => {
    const syn = source("src/lib/extraction/legacy_extraction/synonyms.ts");
    const idx = syn.indexOf('fieldKey: "date_inspected"');
    expect(idx).toBeGreaterThan(-1);
    const block = syn.slice(idx, idx + 350);
    expect(block).toMatch(/Date Inspected/);
    expect(block).toMatch(/Date of Inspection/);
  });
});
