import { describe, expect, it } from "vitest";
import {
  buildPropertyProtectionDisplay,
  buildPropertyProtectionSnapshot,
  mergePropertyProtection,
  parsePropertyProtectionSnapshot,
  propertyProtectionFromGemini,
  propertyProtectionFromSheet,
  propertyProtectionHasData,
  PROPERTY_PROTECTION_FIELDS,
} from "./property-protection";

describe("propertyProtectionFromSheet", () => {
  it("copies wind / 4-point / protection Home keys only", () => {
    const values = propertyProtectionFromSheet({
      roof_year: { value: "2019" },
      plumbing_year: { value: "2005" },
      central_alarm: { value: "Yes" },
      bi_limit: { value: "100/300" },
      coverage_a: { value: "350000" },
      bodily_injury: { value: "100000" },
    });
    expect(values).toEqual({
      roof_year: "2019",
      plumbing_year: "2005",
      central_alarm: "Yes",
    });
    expect(values.bi_limit).toBeUndefined();
    expect(values.coverage_a).toBeUndefined();
    expect(values.bodily_injury).toBeUndefined();
  });

  it("skips blank cells", () => {
    expect(propertyProtectionFromSheet({ roof_year: { value: "  " } })).toEqual({});
  });
});

describe("propertyProtectionFromGemini", () => {
  it("maps Gemini aliases onto sheet keys and ignores Auto junk", () => {
    const values = propertyProtectionFromGemini([
      { fieldKey: "roof_age", normalizedValue: "2018" },
      { fieldKey: "swr", normalizedValue: "Yes" },
      { fieldKey: "bodily_injury", normalizedValue: "100/300" },
      { fieldKey: "pd_limit", rawValue: "50000" },
      { fieldKey: "hvac_year", normalizedValue: "2016" },
    ]);
    expect(values).toEqual({
      roof_year: "2018",
      secondary_water: "Yes",
      hvac_year: "2016",
    });
  });
});

describe("mergePropertyProtection", () => {
  it("fills blanks and never overwrites existing values", () => {
    const merged = mergePropertyProtection(
      { roof_year: "2015", central_alarm: "No" },
      { roof_year: "2019", plumbing_year: "2008", central_alarm: "Yes" },
      { hvac_year: "2012", plumbing_year: "2010" },
    );
    expect(merged).toEqual({
      roof_year: "2015",
      central_alarm: "No",
      plumbing_year: "2008",
      hvac_year: "2012",
    });
  });
});

describe("buildPropertyProtectionSnapshot", () => {
  it("prefers existing, then sheet, then Gemini; stamps source", () => {
    const snap = buildPropertyProtectionSnapshot({
      existing: { values: { roof_year: "2014" } },
      sheet: {
        roof_year: { value: "2019" },
        opening_protection: { value: "Shutters" },
      },
      gemini: [
        { fieldKey: "opening_protection", normalizedValue: "Impact glass" },
        { fieldKey: "four_point_date", normalizedValue: "2024-01-15" },
      ],
      source: "mint",
      now: new Date("2026-09-22T12:00:00.000Z"),
    });
    expect(snap.source).toBe("mint");
    expect(snap.updatedAt).toBe("2026-09-22T12:00:00.000Z");
    expect(snap.values).toEqual({
      roof_year: "2014",
      opening_protection: "Shutters",
      four_point_date: "2024-01-15",
    });
  });
});

describe("buildPropertyProtectionDisplay", () => {
  it("returns empty when snapshot absent or hollow", () => {
    expect(buildPropertyProtectionDisplay(null)).toEqual([]);
    expect(buildPropertyProtectionDisplay({ values: {} })).toEqual([]);
    expect(propertyProtectionHasData(null)).toBe(false);
  });

  it("groups filled fields for the collapsed section", () => {
    const groups = buildPropertyProtectionDisplay({
      values: {
        roof_year: "2019",
        plumbing_year: "2005",
        hvac_year: "2016",
        fire_alarm: "Yes",
      },
    });
    expect(groups.map((g) => g.id)).toEqual(["wind", "four_point", "protection"]);
    expect(groups[0].fields.map((f) => f.key)).toContain("roof_year");
    expect(groups[1].fields.map((f) => f.key)).toEqual(
      expect.arrayContaining(["plumbing_year", "hvac_year"]),
    );
    expect(groups[2].fields[0]).toMatchObject({ key: "fire_alarm", value: "Yes" });
  });
});

describe("parsePropertyProtectionSnapshot", () => {
  it("strips unknown / Auto keys from stored JSON", () => {
    const parsed = parsePropertyProtectionSnapshot({
      values: { roof_year: "2017", bi_limit: "100/300", "" : "x" },
      updatedAt: "2026-09-22T00:00:00.000Z",
      source: "mint",
    });
    expect(parsed?.values).toEqual({ roof_year: "2017" });
    expect(parsed?.source).toBe("mint");
  });
});

describe("PROPERTY_PROTECTION_FIELDS", () => {
  it("covers wind, four-point, and protection without coverage/auto keys", () => {
    const keys = new Set(PROPERTY_PROTECTION_FIELDS.map((f) => f.key));
    expect(keys.has("roof_year")).toBe(true);
    expect(keys.has("plumbing_year")).toBe(true);
    expect(keys.has("central_alarm")).toBe(true);
    expect(keys.has("coverage_a")).toBe(false);
    expect(keys.has("bodily_injury")).toBe(false);
    expect(keys.has("bi_pd")).toBe(false);
  });
});
