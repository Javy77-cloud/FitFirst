import { describe, expect, it } from "vitest";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { sourceTag } from "@/lib/quote-sheet/apply";
import { applyPropertyRecordsToSheet, isDocumentSourced, mismatchLine } from "./apply";
import { factsFromFloridaParcel } from "./map";
import { PROPERTY_RECORDS_LABEL, PROPERTY_RECORDS_SOURCE } from "./map";

const SAMPLE_HIT = {
  parcel_id: "192829-5040-001000-0010",
  county_name: "Hillsborough",
  owner_name: "SMITH JOHN A",
  year_built: 1982,
  construction_type: "masonry",
  living_area: 1840,
  roof_type: "shingle",
  stories: 1,
  assessed_value: 412300,
};

describe("Fill from property records — empty-only apply", () => {
  it("fills blank cells and tags them property records", () => {
    const facts = factsFromFloridaParcel(SAMPLE_HIT);
    const result = applyPropertyRecordsToSheet("home", emptySheetValues("home"), facts);
    expect(result.values.year_built.value).toBe("1982");
    expect(result.values.construction.value).toBe("masonry");
    expect(result.values.square_feet.value).toBe("1840");
    expect(result.values.roof_covering.value).toBe("shingle");
    expect(result.values.stories.value).toBe("1");
    expect(result.values.county.value).toBe("Hillsborough");
    expect(result.values.parcel_id.value).toBe("192829-5040-001000-0010");
    expect(result.values.assessed_value.value).toBe("412300");
    expect(result.values.applicant_name).toBeUndefined();
    expect(result.values.named_insured.value).toBe("SMITH JOHN A");
    expect(result.values.year_built.source).toBe(PROPERTY_RECORDS_SOURCE);
    expect(result.values.year_built.sourceLabel).toBe(PROPERTY_RECORDS_LABEL);
    expect(sourceTag(result.values.year_built)).toBe("property records");
    expect(result.values.coverage_a.value).toBe("");
    expect(result.filledKeys).toEqual(
      expect.arrayContaining([
        "year_built",
        "construction",
        "square_feet",
        "roof_covering",
        "stories",
        "county",
        "parcel_id",
        "assessed_value",
        "named_insured",
      ]),
    );
  });

  it("never overwrites four-point, wind mit, or dec values", () => {
    const existing = emptySheetValues("home");
    existing.year_built = { value: "1978", status: "check", source: "extracted", sourceLabel: "4-point" };
    existing.roof_covering = { value: "tile", status: "check", source: "extracted", sourceLabel: "Wind mit" };
    existing.construction = { value: "frame", status: "check", source: "extracted", sourceLabel: "Uploaded dec" };
    existing.applicant_name = { value: "Ana Dib", status: "confirmed", source: "extracted", sourceLabel: "Uploaded dec" };
    expect(isDocumentSourced(existing.year_built)).toBe(true);
    expect(isDocumentSourced(existing.roof_covering)).toBe(true);
    expect(isDocumentSourced(existing.construction)).toBe(true);

    const result = applyPropertyRecordsToSheet("home", existing, factsFromFloridaParcel(SAMPLE_HIT));
    expect(result.values.year_built.value).toBe("1978");
    expect(result.values.year_built.source).toBe("extracted");
    expect(result.values.roof_covering.value).toBe("tile");
    expect(result.values.construction.value).toBe("frame");
    expect(result.values.applicant_name.value).toBe("Ana Dib");
    expect(result.skippedKeys).toEqual(expect.arrayContaining(["year_built", "roof_covering", "construction"]));
    expect(result.filledKeys).not.toContain("applicant_name");
    expect(result.filledKeys).not.toContain("year_built");
    expect(result.filledKeys).toContain("parcel_id");
    expect(result.values.parcel_id.source).toBe(PROPERTY_RECORDS_SOURCE);
  });

  it("logs mismatches in Records check and does not overwrite the sheet value", () => {
    const existing = emptySheetValues("home");
    existing.year_built = { value: "1978", status: "check", source: "extracted", sourceLabel: "4-point" };
    const result = applyPropertyRecordsToSheet("home", existing, factsFromFloridaParcel({ year_built: 1982 }));
    expect(result.values.year_built.value).toBe("1978");
    expect(result.values.records_check.value).toBe(
      mismatchLine("Year built", "1982", "1978", "4pt"),
    );
    expect(result.values.records_check.value).toMatch(/API says 1982, sheet says 1978 \(from 4pt\)\./);
    expect(result.values.records_check.source).toBe(PROPERTY_RECORDS_SOURCE);
  });

  it("maps owner onto applicant/insured only when those cells are empty", () => {
    const existing = emptySheetValues("home");
    existing.applicant_name = { value: "Ana Dib", status: "confirmed", source: "extracted", sourceLabel: "Uploaded dec" };
    const result = applyPropertyRecordsToSheet("home", existing, factsFromFloridaParcel({ owner_name: "SMITH JOHN A" }));
    expect(result.values.applicant_name.value).toBe("Ana Dib");
    expect(result.values.named_insured.value).toBe("SMITH JOHN A");
    expect(result.values.named_insured.source).toBe(PROPERTY_RECORDS_SOURCE);
  });
});

describe("Flood property fill — Home key aliases", () => {
  it("maps construction / sqft / stories onto Flood catalog keys", () => {
    const facts = factsFromFloridaParcel(SAMPLE_HIT);
    const result = applyPropertyRecordsToSheet("flood", emptySheetValues("flood"), facts);
    expect(result.values.construction_type.value).toBe("masonry");
    expect(result.values.building_sqft.value).toBe("1840");
    expect(result.values.number_of_floors.value).toBe("1");
    expect(result.values.year_built.value).toBe("1982");
    expect(result.values.county.value).toBe("Hillsborough");
    expect(result.values.parcel_id.value).toBe("192829-5040-001000-0010");
    expect(result.values.assessed_value.value).toBe("412300");
    expect(result.filledKeys).toEqual(
      expect.arrayContaining([
        "construction_type",
        "building_sqft",
        "number_of_floors",
        "year_built",
        "county",
        "parcel_id",
        "assessed_value",
      ]),
    );
    // Home-only keys must not land as orphans on Flood
    expect(result.values.construction).toBeUndefined();
    expect(result.values.square_feet).toBeUndefined();
    expect(result.values.stories).toBeUndefined();
    expect(result.values.roof_covering).toBeUndefined();
    expect(result.values.named_insured).toBeUndefined();
    expect(result.values.applicant_name).toBeUndefined();
  });

  it("empty-only: keeps existing Flood construction_type", () => {
    const existing = emptySheetValues("flood");
    existing.construction_type = {
      value: "Frame-Stucco",
      status: "confirmed",
      source: "manual",
      sourceLabel: "agent",
    };
    const result = applyPropertyRecordsToSheet("flood", existing, factsFromFloridaParcel(SAMPLE_HIT));
    expect(result.values.construction_type.value).toBe("Frame-Stucco");
    expect(result.skippedKeys).toContain("construction_type");
    expect(result.filledKeys).toContain("building_sqft");
  });
});

